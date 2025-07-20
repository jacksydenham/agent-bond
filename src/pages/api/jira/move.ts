/* eslint-disable @typescript-eslint/no-explicit-any */
import type { NextApiRequest, NextApiResponse } from "next";
import { ensureAccess, getMeta } from "src/app/lib/jira";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).end();
  }

  try {
    const meta = getMeta(req);
    const token = await ensureAccess(req, res);
    if (!meta.boardId) throw new Error("No board selected");

    const { issueKey, toStatusId } = req.body as {
      issueKey?: string;
      toStatusId?: string;
    };
    if (!issueKey || !toStatusId) {
      return res.status(400).json({ error: "Missing issueKey or toStatusId" });
    }

    const base = `https://api.atlassian.com/ex/jira/${meta.cloudId}`;

    // get transitions for held issue
    const listRes = await fetch(
      `${base}/rest/api/3/issue/${issueKey}/transitions`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      }
    );

    if (!listRes.ok) {
      const text = await listRes.text();
      return res
        .status(500)
        .json({
          error: `Failed to list transitions (${listRes.status})`,
          text,
        });
    }

    const { transitions = [] } = await listRes.json();
    const transition = transitions.find((t: any) => t.to?.id === toStatusId);

    if (!transition) {
      return res
        .status(400)
        .json({ error: `No transition to statusId "${toStatusId}"` });
    }

    // move
    const doRes = await fetch(
      `${base}/rest/api/3/issue/${issueKey}/transitions`,
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
      const text = await doRes.text();
      return res
        .status(500)
        .json({ error: `Transition failed (${doRes.status})`, text });
    }

    return res.status(204).end();
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
}
