import type { NextApiRequest, NextApiResponse } from "next";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const params = new URLSearchParams({
    audience: "api.atlassian.com",
    client_id: process.env.JIRA_CLIENT_ID!,
    scope: "read:jira-user read:jira-work write:jira-work offline_access",
    redirect_uri: process.env.JIRA_REDIRECT_URI!,
    response_type: "code",
    prompt: "consent",
  });

  res.redirect(`https://auth.atlassian.com/authorize?${params.toString()}`);
}
