import type { NextApiRequest, NextApiResponse } from "next";
import { serialize } from "cookie";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const code = req.query.code as string;
  if (!code) return res.status(400).send("Missing code");

  // token handshake
  const td = await fetch("https://auth.atlassian.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "authorization_code",
      client_id: process.env.JIRA_CLIENT_ID,
      client_secret: process.env.JIRA_CLIENT_SECRET,
      code,
      redirect_uri: process.env.JIRA_REDIRECT_URI,
    }),
  }).then((r) => r.json());

  if (!td.access_token)
    return res
      .status(500)
      .json({ error: "Token exchange failed", details: td });

  // fetch user cloud (id)
  const resources = await fetch(
    "https://api.atlassian.com/oauth/token/accessible-resources",
    { headers: { Authorization: `Bearer ${td.access_token}` } }
  ).then((r) => r.json());

  if (!resources[0])
    return res.status(500).json({ error: "No Jira resources for user" });
  const { id: cloudId, url: cloudUrl } = resources[0];

  // 3 small cookies bc sizing limits
  const opts = {
    httpOnly: true,
    path: "/",
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
  };

  res.setHeader("Set-Cookie", [
    // meta for react to read jira
    serialize(
      "jira_meta",
      JSON.stringify({ cloudId, cloudUrl, boardId: null }),
      { ...opts, httpOnly: false, maxAge: 60 * 60 * 24 * 30 }
    ),
    // access token
    serialize("jira_access", td.access_token, {
      ...opts,
      maxAge: td.expires_in,
    }),
    // refresh token
    serialize("jira_refresh", td.refresh_token, {
      ...opts,
      maxAge: 60 * 60 * 24 * 30,
    }),
  ]);
  res.redirect("/");
}
