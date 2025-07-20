import type { NextApiRequest, NextApiResponse } from "next";
import { serialize } from "cookie";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).end();
  }

  const opts = {
    path: "/",
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
  };

  res.setHeader("Set-Cookie", [
    serialize("jira_meta", "", { ...opts, maxAge: 0 }),
    serialize("jira_access", "", { ...opts, maxAge: 0, httpOnly: true }),
    serialize("jira_refresh", "", { ...opts, maxAge: 0, httpOnly: true }),
  ]);

  res.status(204).end();
}
