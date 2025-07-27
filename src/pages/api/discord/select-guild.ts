import type { NextApiRequest, NextApiResponse } from "next";
import { serialize, parse } from "cookie";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const { guildId } = req.body;
  if (!guildId) return res.status(400).json({ error: "Missing guildId" });

  // read existing cookies
  const cookies = parse(req.headers.cookie || "");
  const meta = cookies.discord_meta ? JSON.parse(cookies.discord_meta) : {};

  // overwrite meta with chosen guildId
  const newMeta = { ...meta, guildId };

  res.setHeader("Set-Cookie", [
    serialize("discord_meta", JSON.stringify(newMeta), {
      httpOnly: false,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 30,
    }),
  ]);

  res.status(200).end();
}
