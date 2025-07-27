import type { NextApiRequest, NextApiResponse } from "next";
import { parse } from "cookie";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const cookies = parse(req.headers.cookie || "");

  // Jira session
  const jiraMeta = cookies.jira_meta ? JSON.parse(cookies.jira_meta) : null;
  // Discord session
  const discordMeta = cookies.discord_meta ? JSON.parse(cookies.discord_meta) : null;

  if (!jiraMeta && !discordMeta) {
    // no connection
    return res.status(401).end();
  }

  res.status(200).json({
    jira: jiraMeta && {
      cloudUrl: jiraMeta.cloudUrl,
      boardId: jiraMeta.boardId,
    },
    discord: discordMeta && {
      userId: discordMeta.userId,
      guildId: discordMeta.guildId,
    },
  });
}
