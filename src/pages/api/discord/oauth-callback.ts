import type { NextApiRequest, NextApiResponse } from "next";
import { serialize } from "cookie";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const code = req.query.code as string;
  if (!code) return res.status(400).send("Missing code");

  // exchange code for tokens
  const params = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: process.env.DISCORD_CLIENT_ID!,
    client_secret: process.env.DISCORD_CLIENT_SECRET!,
    code,
    redirect_uri: process.env.DISCORD_REDIRECT_URI!,
    scope: "identify guilds",
  });

  const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
  const td = await tokenRes.json();
  if (!td.access_token) {
    return res
      .status(500)
      .json({ error: "Discord token exchange failed", details: td });
  }

  // fetch basic user info for meta
  const userRes = await fetch("https://discord.com/api/users/@me", {
    headers: { Authorization: `Bearer ${td.access_token}` },
  });
  const user = await userRes.json();
  if (!user.id) {
    return res
      .status(500)
      .json({ error: "Failed fetching Discord user", details: user });
  }

  // set cookies
  const opts = {
    httpOnly: true,
    path: "/",
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
  };

  res.setHeader("Set-Cookie", [
    // meta for React to read Discord user and chosen guild later
    serialize(
      "discord_meta",
      JSON.stringify({ userId: user.id, guildId: null }),
      { ...opts, httpOnly: false, maxAge: 60 * 60 * 24 * 30 }
    ),
    // access token
    serialize("discord_access", td.access_token, {
      ...opts,
      maxAge: td.expires_in,
    }),
    // refresh token
    serialize("discord_refresh", td.refresh_token, {
      ...opts,
      maxAge: 60 * 60 * 24 * 30,
    }),
  ]);
  res.redirect("/");
}
