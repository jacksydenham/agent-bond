/* eslint-disable @typescript-eslint/no-explicit-any */
// src/pages/api/jira/move.ts
import type { NextApiRequest, NextApiResponse } from "next";

type MoveBody = {
  issueKey: string;     // e.g. "PROJ-123"
  toStatus: string;     // e.g. "In Progress"
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).end("Method Not Allowed");
  }

  const { issueKey, toStatus } = req.body as MoveBody;
  const {
    JIRA_BASE_URL,
    JIRA_EMAIL,
    JIRA_API_TOKEN,
  } = process.env;

  if (!JIRA_BASE_URL || !JIRA_EMAIL || !JIRA_API_TOKEN) {
    return res
      .status(500)
      .json({ error: "Missing JIRA_BASE_URL, JIRA_EMAIL or JIRA_API_TOKEN" });
  }

  const auth = Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString(
    "base64"
  );

  try {
    // 1) Fetch available transitions for this issue
    const transitionsRes = await fetch(
      `${JIRA_BASE_URL}/rest/api/3/issue/${issueKey}/transitions`,
      {
        headers: {
          Authorization: `Basic ${auth}`,
          Accept: "application/json",
        },
      }
    );
    const { transitions } = await transitionsRes.json() as {
      transitions: Array<{ id: string; to: { name: string } }>;
    };

    // 2) Find the transition ID whose target status matches toStatus
    const match = transitions.find((t) => t.to.name === toStatus);
    if (!match) {
      return res
        .status(400)
        .json({ error: `No transition found to status "${toStatus}"` });
    }

    // 3) Perform the transition
    const doRes = await fetch(
      `${JIRA_BASE_URL}/rest/api/3/issue/${issueKey}/transitions`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ transition: { id: match.id } }),
      }
    );

    if (!doRes.ok) {
      const text = await doRes.text();
      return res
        .status(doRes.status)
        .json({ error: `Jira move failed: ${text}` });
    }

    return res.status(200).json({ success: true });
  } catch (err: any) {
    console.error("Jira move error:", err);
    return res.status(500).json({ error: err.message || err });
  }
}
