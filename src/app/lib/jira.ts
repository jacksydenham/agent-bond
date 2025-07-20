// lib/jira.ts
import { parse, serialize } from "cookie";
import type { NextApiRequest, NextApiResponse } from "next";

export interface JiraMeta {
  cloudId: string;
  cloudUrl: string;
  boardId: string | null;
}

export function getMeta(req: NextApiRequest): JiraMeta {
  const { jira_meta } = parse(req.headers.cookie ?? "");
  if (!jira_meta) throw new Error("Not connected to Jira");
  return JSON.parse(jira_meta) as JiraMeta;
}

export function setMeta(meta: JiraMeta, res: NextApiResponse) {
  res.setHeader(
    "Set-Cookie",
    serialize("jira_meta", JSON.stringify(meta), {
      httpOnly: false,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 30
    })
  );
}

export function getAccess(req: NextApiRequest): string | null {
  return parse(req.headers.cookie ?? "").jira_access ?? null;
}

export function getRefresh(req: NextApiRequest): string | null {
  return parse(req.headers.cookie ?? "").jira_refresh ?? null;
}

export async function ensureAccess(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<string> {
  const access = getAccess(req);
  if (access) return access;

  const refresh = getRefresh(req);
  if (!refresh) throw new Error("Session expired... reconnect Jira");

  // Refresh link
  const td = await fetch("https://auth.atlassian.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "refresh_token",
      client_id: process.env.JIRA_CLIENT_ID,
      client_secret: process.env.JIRA_CLIENT_SECRET,
      refresh_token: refresh
    })
  }).then(r => r.json());

  if (!td.access_token) {
    throw new Error("Failed to refresh Jira token");
  }

  // let atlassian cycle refresh tokens
  res.setHeader(
    "Set-Cookie",
    [
      serialize("jira_access", td.access_token, {
        httpOnly: true,
        path: "/",
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: td.expires_in
      }),
      td.refresh_token
        ? serialize("jira_refresh", td.refresh_token, {
            httpOnly: true,
            path: "/",
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
            maxAge: 60 * 60 * 24 * 30
          })
        : ""
    ].filter(Boolean)
  );

  return td.access_token;
}
