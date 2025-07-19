// src/pages/api/auth/session.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { parse } from "cookie";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const cookie = req.headers.cookie;
  if (!cookie) return res.status(401).json({ error: "No cookies" });

  const { jira_session } = parse(cookie);
  if (!jira_session) return res.status(401).json({ error: "No Jira session" });

  try {
    const session = JSON.parse(jira_session);
    return res.status(200).json(session);
  } catch {
    return res.status(400).json({ error: "Malformed session" });
  }
}
