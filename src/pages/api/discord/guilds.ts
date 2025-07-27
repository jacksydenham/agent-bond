// src/pages/api/discord/guilds.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { parse } from "cookie";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const cookies = parse(req.headers.cookie || "");
  const token = cookies.discord_access;
  if (!token) return res.status(401).json({ error: "Not authenticated" });

  const guilds = await fetch("https://discord.com/api/users/@me/guilds", {
    headers: { Authorization: `Bearer ${token}` },
  }).then((r) => r.json());

  return res.status(200).json(guilds);
}
