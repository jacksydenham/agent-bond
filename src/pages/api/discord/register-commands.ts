import type { NextApiRequest, NextApiResponse } from "next";
import { parse } from "cookie";
import { REST, Routes, SlashCommandBuilder } from "discord.js";

const commands = [
  new SlashCommandBuilder()
    .setName("bondjoin")
    .setDescription("Agent Bond joins your voice channel")
    .toJSON(),
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end("Method Not Allowed");
  }

  // read guildId from cookie
  const cookies = parse(req.headers.cookie || "");
  const meta = cookies.discord_meta ? JSON.parse(cookies.discord_meta) : {};
  const guildId = meta.guildId;
  if (!guildId) return res.status(400).json({ error: "No guild selected" });

  // register the slash command to chosen guild
  const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN!);
  await rest.put(
    Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID!, guildId),
    { body: commands }
  );

  console.log(`Registered commands to guild ${guildId}`);
  res.status(200).json({ success: true });
}
