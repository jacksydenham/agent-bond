/* eslint-disable @typescript-eslint/no-explicit-any */
import type { NextApiRequest, NextApiResponse } from "next";
import { ensureAccess, getMeta } from "src/app/lib/jira";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") return res.status(405).end();
  try {
    const meta = getMeta(req);
    const token = await ensureAccess(req, res);
    if (!meta.boardId) throw new Error("No board selected");

    // get column setup
    const base = `https://api.atlassian.com/ex/jira/${meta.cloudId}`;

    const cfg = await fetch(
      `${base}/rest/agile/1.0/board/${meta.boardId}/configuration`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      }
    ).then((r) => r.json());

    // map
    const statusToCol: Record<string, string> = {};
    const colToStatusId: Record<string, string> = {};
    const cols: Record<string, { id: string; title: string }[]> = {};
    for (const c of cfg.columnConfig.columns) {
      cols[c.name] = [];
      for (const s of c.statuses) {
        if (!colToStatusId[c.name]) colToStatusId[c.name] = s.id;
        statusToCol[s.name] = c.name;
      }
    }

    // fetch issues
    const issues = await fetch(
      `${base}/rest/agile/1.0/board/${meta.boardId}/issue?maxResults=200`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      }
    )
      .then((r) => r.json())
      .then((j) => j.issues);

    // assign issues to columns
    for (const issue of issues) {
      const col =
        statusToCol[issue.fields.status.name] ?? issue.fields.status.name;
      cols[col] ||= [];
      cols[col].push({ id: issue.key, title: issue.fields.summary });
    }

    res.status(200).json({ columns: cols, colToStatusId });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
}
