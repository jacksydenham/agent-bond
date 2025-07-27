/* eslint-disable @typescript-eslint/no-explicit-any */
import type { NextApiRequest, NextApiResponse } from "next";
import { ensureAccess, getMeta } from "src/app/lib/jira";

// adf structure to plain text
function extractTextFromADF(body: any): string {
  if (typeof body === "string") {
    return body;
  }

  if (!body || !Array.isArray(body.content)) return "";
  let out = "";
  for (const block of body.content) {
    if (Array.isArray(block.content)) {
      for (const child of block.content) {
        if (child.text) out += child.text;
      }
      out += "\n";
    }
  }
  return out.trim();
}


export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // only allow GETs
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).end();
  }

  try {
    const meta = getMeta(req);
    const token = await ensureAccess(req, res);
    if (!meta.boardId) {
      return res.status(400).json({ error: "No board selected" });
    }

    const base = `https://api.atlassian.com/ex/jira/${meta.cloudId}`;

    // fetch columns
    const cfgRes = await fetch(
      `${base}/rest/agile/1.0/board/${meta.boardId}/configuration`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      }
    );
    if (!cfgRes.ok) {
      const text = await cfgRes.text();
      return res.status(cfgRes.status).json({
        error: `Failed to fetch board configuration (${cfgRes.status})`,
        details: text,
      });
    }
    const cfg = await cfgRes.json();

    const statusToCol: Record<string, string> = {};
    const colToStatusId: Record<string, string> = {};
    const columns: Record<
      string,
      { id: string; title: string; comments: string[] }[]
    > = {};

    for (const col of cfg.columnConfig.columns) {
      columns[col.name] = [];
      for (const st of col.statuses) {
        // map statusName to columnId
        statusToCol[st.name] = col.name;
        // map columnId to a associated statusId
        if (!colToStatusId[col.name]) colToStatusId[col.name] = st.id;
      }
    }

    // fetch comments
    const fields = ["summary", "status", "comment"].join(",");
    const issuesRes = await fetch(
      `${base}/rest/agile/1.0/board/${meta.boardId}/issue?maxResults=200&fields=${fields}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      }
    );
    if (!issuesRes.ok) {
      const text = await issuesRes.text();
      return res.status(issuesRes.status).json({
        error: `Failed to fetch issues (${issuesRes.status})`,
        details: text,
      });
    }
    const issuesJson = await issuesRes.json();
    const issues = Array.isArray(issuesJson.issues) ? issuesJson.issues : [];

    for (const issue of issues) {
      const col =
        statusToCol[issue.fields.status.name] ?? issue.fields.status.name;
      if (!columns[col]) columns[col] = [];

      const rawComments: any[] =
        issue.fields.comment?.comments ?? [];
      const comments = rawComments.map((c) =>
        extractTextFromADF(c.body)
      );

      columns[col].push({
        id: issue.key,
        title: issue.fields.summary,
        comments,
      });
    }

    return res.status(200).json({ columns, colToStatusId });
  } catch (err: any) {
    console.error("[board] Error:", err);
    return res.status(500).json({
      error: err.message || "Unknown error",
      stack:
        process.env.NODE_ENV === "development" ? err.stack : undefined,
    });
  }
}
