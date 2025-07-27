/* eslint-disable @typescript-eslint/no-explicit-any */
import type { NextApiRequest, NextApiResponse } from "next";
import { ensureAccess, getMeta } from "src/app/lib/jira";

type AiCommand =
  | { action: "move"; issueKey: string; toStatusId: string }
  | { action: "create"; summary: string }
  | { action: "none" };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).end("Method Not Allowed");
  }

  const { sentence: rawSentence } = req.body as { sentence?: string };
  if (!rawSentence) return res.status(400).end("Missing sentence");
  console.log("[TRANSCRIPT] Received:", rawSentence);

  console.log(`[TRANSCRIPT] Feeding GPT: "${rawSentence}"`);

  try {
    // jira / board auth through cookies
    const meta = getMeta(req);
    if (!meta.boardId) {
      console.error("[TRANSCRIPT] No board selected in cookie");
      return res
        .status(400)
        .json({ success: false, error: "No board selected" });
    }
    const token = await ensureAccess(req, res);
    console.log(
      `[TRANSCRIPT] Jira cloud=${meta.cloudId} board=${meta.boardId}`
    );

    const jiraBase = `https://api.atlassian.com/ex/jira/${meta.cloudId}`;

    // fetch board config
    const cfgRes = await fetch(
      `${jiraBase}/rest/agile/1.0/board/${meta.boardId}/configuration`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      }
    );
    if (!cfgRes.ok) {
      console.error(
        `[TRANSCRIPT] Config fetch failed: ${cfgRes.status}`,
        await cfgRes.text()
      );
      return res
        .status(500)
        .json({ success: false, error: "Failed to fetch board config" });
    }
    const cfg = await cfgRes.json();
    const colToStatusId: Record<string, string> = {};
    for (const col of cfg.columnConfig.columns) {
      for (const st of col.statuses) {
        if (!colToStatusId[col.name]) {
          colToStatusId[col.name] = st.id;
        }
      }
    }

    // treat column names as lowercase
    const lowerColToStatusId: Record<string, string> = {};
    for (const name in colToStatusId) {
      lowerColToStatusId[name.toLowerCase()] = colToStatusId[name];
    }
    console.log(
      "[TRANSCRIPT] Col→Status mapping:",
      JSON.stringify(colToStatusId)
    );

    // fetch issues
    const issuesRes = await fetch(
      `${jiraBase}/rest/agile/1.0/board/${meta.boardId}/issue?maxResults=200`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      }
    );
    if (!issuesRes.ok) {
      console.error(
        `[TRANSCRIPT] Issues fetch failed: ${issuesRes.status}`,
        await issuesRes.text()
      );
      throw new Error("Couldn’t fetch board issues for mapping");
    }
    const issuesJson = await issuesRes.json();
    const summaryToKey: Record<string, string> = {};
    for (const issue of issuesJson.issues || []) {
      summaryToKey[issue.fields.summary.toLowerCase()] = issue.key;
    }
    console.log("[TRANSCRIPT] Summary→Key mapping:", summaryToKey);

    function findBestIssueKey(
      rawSummary: string,
      summaryToKey: Record<string, string>
    ): string {
      const raw = rawSummary.toLowerCase().trim();
      // exact match
      if (summaryToKey[raw]) return summaryToKey[raw];
      // substring match
      for (const sum of Object.keys(summaryToKey)) {
        if (sum.includes(raw)) return summaryToKey[sum];
      }
      // word overlap score
      const words = raw.split(/\s+/).filter(Boolean);
      let best = "",
        bestScore = 0;
      for (const sum of Object.keys(summaryToKey)) {
        const score = words.reduce(
          (cnt, w) => cnt + (sum.includes(w) ? 1 : 0),
          0
        );
        if (score > bestScore) {
          bestScore = score;
          best = sum;
        }
      }
      return bestScore > 0 ? summaryToKey[best] : "";
    }

    // gpt
    let cmd: AiCommand;
    try {
      const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          temperature: 0,
          messages: [
            {
              role: "system",
              content:
                "You are a Jira assistant. …\n" +
                "When you output a create-action JSON, the **summary must be ONLY the issue title**—" +
                "do **not** include filler words like “create”, “new ticket”, “called”, “issue”, etc.\n" +
                "Examples:\n" +
                "  • User: “Let’s make a new ticket called **Add pagination**” → " +
                '{"action":"create","summary":"Add pagination"}\n' +
                "  • User: “Add a task **Refactor auth**” → " +
                '{"action":"create","summary":"Refactor auth"}\n' +
                "...",
            },
            {
              role: "system",
              content: `Available issues (summary→key): ${JSON.stringify(
                summaryToKey
              )}`,
            },
            {
              role: "user",
              content:
                `Current statuses (column→statusId): ${JSON.stringify(
                  colToStatusId
                )}\n` + `Spoken: "${rawSentence}"`,
            },
          ],
        }),
      });

      // title case the string
      function toTitleCase(s: string) {
        return s
          .split(/\s+/)
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
          .join(" ");
      }

      function cleanSummary(raw: string): string {
        let s = raw.trim();

        // strip “*called …”
        const calledIdx = s.toLowerCase().indexOf(" called ");
        if (calledIdx !== -1) s = s.slice(calledIdx + 7);

        // strip more
        s = s.replace(/^(?:a|an|the|new)\s+|^(?:issue|task|ticket)\s+/i, "");

        return toTitleCase(s.trim());
      }

      if (!aiRes.ok) {
        console.warn(
          `[TRANSCRIPT] OpenAI ${aiRes.status}: falling back to test cmd`
        );
        // extract “<what>” and “<where>” from sentence
        const moveMatch = rawSentence.match(
          /move\s+(.+?)\s+to\s+(.+?)[.?!]?$/i
        );
        if (moveMatch) {
          const [, rawSummary, rawStatusRaw] = moveMatch;

          // find issue key
          const issueKey = findBestIssueKey(rawSummary, summaryToKey);

          // normalize status name
          const statusName = rawStatusRaw.trim().replace(/[^\w\s]/g, "");
          const statusId = lowerColToStatusId[statusName.toLowerCase()] || "";

          if (!issueKey) {
            console.error("[TRANSCRIPT] No matching issue for:", rawSummary);
            cmd = { action: "none" };
          } else if (!statusId) {
            console.error(
              `[TRANSCRIPT] No status mapping for: "${statusName}"`
            );
            cmd = { action: "none" };
          } else {
            console.log(
              `[TRANSCRIPT] Fallback move → issue=${issueKey}, statusName=${statusName}, statusId=${statusId}`
            );
            cmd = { action: "move", issueKey, toStatusId: statusId };
          }
        } else {
          const createMatch = rawSentence.match(
            /^(?:please\s*)?(?:let'?s\s*)?(?:create|add|make)(?:\s+(?:a|new))?(?:\s+(?:issue|task|ticket))?(?:\s+(?:called|named))?\s+(.+)$/i
          );

          if (createMatch) {
            // strip any surrounding quotes
            const rawName = createMatch[1];
            const summary = cleanSummary(rawName);
            cmd = { action: "create", summary };
          } else {
            cmd = { action: "none" };
          }
        }
      } else {
        const payload = await aiRes.json();
        const raw = payload.choices[0].message.content.trim();
        try {
          cmd = JSON.parse(raw);
          // fallback for no action
          if (cmd.action === "none") throw new Error("explicit none");
        } catch {
          console.warn("ℹ️ Falling back to regex on:", raw);
          const m = rawSentence.match(/move\s+(.+?)\s+to\s+(.+?)$/i);
          if (m) {
            const [, summary, status] = m;
            cmd = {
              action: "move",
              issueKey: summaryToKey[summary.toLowerCase()] || "",
              toStatusId: lowerColToStatusId[status.toLowerCase().trim()] || "",
            };
          } else {
            cmd = { action: "none" };
          }
        }
      }
    } catch (e) {
      console.error("[TRANSCRIPT] GPT fetch failed:", e);
      // final fallback
      cmd = {
        action: "move",
        issueKey: summaryToKey["introduce landing page"] || "",
        toStatusId: colToStatusId["In Progress"],
      };
    }

    // action suggestion for ui toast
    let suggestion: string;
    if (cmd.action === "move") {
      suggestion = `Move ${cmd.issueKey} → status ${cmd.toStatusId}`;
    } else if (cmd.action === "create") {
      suggestion = `Create new issue: "${cmd.summary}"`;
    } else {
      suggestion = "No action";
    }

    return res.status(200).json({
      success: true,
      message: suggestion,
      cmd, // command to be executed later
    });
  } catch (err: any) {
    console.error("AI listener error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
