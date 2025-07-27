/* eslint-disable @typescript-eslint/no-explicit-any */
import type { NextApiRequest, NextApiResponse } from "next";
import { ensureAccess, getMeta } from "src/app/lib/jira";

type MoveCmd = { action: "move"; issueKey: string; toStatusId: string };
type CreateCmd = { action: "create"; summary: string };
type NoneCmd = { action: "none" };
type AiCommand = MoveCmd | CreateCmd | NoneCmd;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).end("Method Not Allowed");
  }

  const { cmd } = req.body as { cmd: AiCommand };

  try {
    // Jira auth and meta
    const meta = getMeta(req);
    if (!meta.boardId) {
      return res
        .status(400)
        .json({ success: false, error: "No board selected" });
    }
    const token = await ensureAccess(req, res);
    const jiraBase = `https://api.atlassian.com/ex/jira/${meta.cloudId}`;

    if (cmd.action === "move") {
      // list available transitions
      const listRes = await fetch(
        `${jiraBase}/rest/api/3/issue/${cmd.issueKey}/transitions`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        }
      );
      if (!listRes.ok) {
        const txt = await listRes.text();
        throw new Error(`List transitions failed: ${listRes.status} — ${txt}`);
      }
      const { transitions = [] } = await listRes.json();
      const transition = transitions.find(
        (t: any) => t.to.id === cmd.toStatusId
      );
      if (!transition) {
        return res.status(400).json({
          success: false,
          error: `No transition available to status ${cmd.toStatusId}`,
        });
      }

      // do the move
      const doRes = await fetch(
        `${jiraBase}/rest/api/3/issue/${cmd.issueKey}/transitions`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ transition: { id: transition.id } }),
        }
      );
      if (!doRes.ok) {
        const txt = await doRes.text();
        throw new Error(
          `Transition POST failed: ${doRes.status} — ${txt}`
        );
      }

      return res
        .status(200)
        .json({ success: true, message: `Moved ${cmd.issueKey}` });
    }

    if (cmd.action === "create") {
      const sampleRes = await fetch(
        `${jiraBase}/rest/agile/1.0/board/${meta.boardId}/issue?maxResults=1`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        }
      );
      if (!sampleRes.ok) {
        const txt = await sampleRes.text();
        throw new Error(
          `Fetch sample issue failed: ${sampleRes.status} — ${txt}`
        );
      }
      const sampleJson = await sampleRes.json();
      const anyKey: string = sampleJson.issues?.[0]?.key;
      const projectKey = anyKey?.split("-")[0] ?? "";
      if (!projectKey) {
        return res
          .status(400)
          .json({ success: false, error: "Could not derive project key" });
      }

      // create issue
      const createRes = await fetch(`${jiraBase}/rest/api/3/issue`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fields: {
            project: { key: projectKey },
            summary: cmd.summary,
            issuetype: { name: "Task" },
          },
        }),
      });
      if (!createRes.ok) {
        const txt = await createRes.text();
        throw new Error(`Issue create failed: ${createRes.status} — ${txt}`);
      }
      const createdJson = await createRes.json();
      return res.status(200).json({
        success: true,
        message: `Created ${createdJson.key}`,
        issueKey: createdJson.key,
      });
    }

    return res
      .status(200)
      .json({ success: true, message: "No action performed" });
  } catch (err: any) {
    console.error("[execute] Error:", err);
    return res
      .status(500)
      .json({ success: false, error: err.message || "Unknown error" });
  }
}
