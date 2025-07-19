import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const code = req.query.code as string;

  if (!code) return res.status(400).send("Missing code");

  const tokenRes = await fetch("https://auth.atlassian.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "authorization_code",
      client_id: process.env.JIRA_CLIENT_ID,
      client_secret: process.env.JIRA_CLIENT_SECRET,
      code,
      redirect_uri: process.env.JIRA_REDIRECT_URI,
    }),
  });

  const tokenData = await tokenRes.json();

  if (!tokenData.access_token) {
    return res.status(500).json({ error: "Failed to retrieve access token", details: tokenData });
  }

  // For now: Just show raw token info
  return res.status(200).json(tokenData);
}
