import type { NextApiRequest, NextApiResponse } from "next";
import { parse } from "cookie";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const { jira_meta } = parse(req.headers.cookie ?? "");
  if (!jira_meta) return res.status(401).end();
  res.status(200).json(JSON.parse(jira_meta));
}
