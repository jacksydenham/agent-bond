import type { NextApiRequest, NextApiResponse } from "next";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const params = new URLSearchParams({
    client_id: process.env.DISCORD_CLIENT_ID!,
    redirect_uri: process.env.DISCORD_REDIRECT_URI!,
    response_type: "code",
    scope: "identify guilds bot applications.commands",
    prompt: "consent",
  });
  res.redirect(`https://discord.com/api/oauth2/authorize?${params}`);
}
