// pages/api/auth/jira.ts
import type { NextApiRequest, NextApiResponse } from "next";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const params = new URLSearchParams({
    audience: "api.atlassian.com",
    client_id: process.env.JIRA_CLIENT_ID!,

    // idek if we need the granulars but it works so dont touch
    scope: [
      "offline_access",
      "read:jira-user",
      "read:project:jira",
      "read:board-scope:jira-software",
      "read:board-scope.admin:jira-software",
      "read:issue-details:jira",
      "read:jira-work",
      "write:jira-work",
    ].join(" "),
    redirect_uri: process.env.JIRA_REDIRECT_URI!,
    response_type: "code",
    prompt: "consent",
  });

  res.redirect(`https://auth.atlassian.com/authorize?${params.toString()}`);
}
