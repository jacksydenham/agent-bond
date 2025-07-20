/* eslint-disable @typescript-eslint/no-explicit-any */
import type { NextApiRequest, NextApiResponse } from "next";
import { ensureAccess, getMeta } from "src/app/lib/jira";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).end();
  }

  try {
    const meta = getMeta(req);
    const token = await ensureAccess(req, res);
    const url =
      `https://api.atlassian.com/ex/jira/${meta.cloudId}` +
      `/rest/agile/1.0/board?maxResults=100`;

    const { values = [] } = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    }).then((r) => r.json());

    res.status(200).json(values);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
}
