/* eslint-disable @typescript-eslint/no-explicit-any */
// src/pages/api/jira/board.ts
import type { NextApiRequest, NextApiResponse } from "next";

type JiraIssue = {
  key: string;
  fields: {
    summary: string;
    status: { name: string };
  };
};

type JiraBoardConfig = {
  columnConfig: {
    columns: Array<{
      name: string;
      statuses: Array<{ id: string; name: string }>;
    }>;
  };
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).end("Method Not Allowed");
  }

  const {
    JIRA_BASE_URL,
    JIRA_EMAIL,
    JIRA_API_TOKEN,
    JIRA_BOARD_ID,
  } = process.env;

  if (
    !JIRA_BASE_URL ||
    !JIRA_EMAIL ||
    !JIRA_API_TOKEN ||
    !JIRA_BOARD_ID
  ) {
    return res
      .status(500)
      .json({ error: "Missing one of JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN or JIRA_BOARD_ID" });
  }

  const auth = Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString(
    "base64"
  );
  const headers = {
    Authorization: `Basic ${auth}`,
    Accept: "application/json",
  };

  try {
    // 1) Fetch board configuration to get *all* columns
    const configRes = await fetch(
      `${JIRA_BASE_URL}/rest/agile/1.0/board/${JIRA_BOARD_ID}/configuration`,
      { headers }
    );
    if (!configRes.ok) {
      const txt = await configRes.text();
      throw new Error(`Config fetch failed: ${txt}`);
    }
    const configData = (await configRes.json()) as JiraBoardConfig;

    // Build status→column map and initialize empty columns in correct order
    const statusToColumn: Record<string, string> = {};
    const columns: Record<string, { id: string; title: string }[]> = {};
    for (const col of configData.columnConfig.columns) {
      columns[col.name] = [];                // init empty array for each column
      for (const st of col.statuses) {
        statusToColumn[st.name] = col.name; // map status name → column name
      }
    }

    // 2) Fetch all issues on the board
    const issuesRes = await fetch(
      `${JIRA_BASE_URL}/rest/agile/1.0/board/${JIRA_BOARD_ID}/issue?maxResults=200`,
      { headers }
    );
    if (!issuesRes.ok) {
      const txt = await issuesRes.text();
      throw new Error(`Issues fetch failed: ${txt}`);
    }
    const issuesData = (await issuesRes.json()) as { issues: JiraIssue[] };

    // 3) Place each issue into its column
    for (const issue of issuesData.issues) {
      const statusName = issue.fields.status.name;
      const colName = statusToColumn[statusName] ?? statusName;
      // If a status isn't mapped, we still create the column on the fly
      if (!columns[colName]) columns[colName] = [];
      columns[colName].push({
        id: issue.key,
        title: issue.fields.summary,
      });
    }

    return res.status(200).json({ columns });
  } catch (err: any) {
    console.error("Jira board error:", err);
    return res.status(500).json({ error: err.message || err });
  }
}
