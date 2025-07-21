import "dotenv/config";
import { REST, Routes, SlashCommandBuilder } from "discord.js";

const commands = [
  new SlashCommandBuilder()
    .setName("bondjoin")
    .setDescription("Agent Bond joins your voice channel")
    .toJSON(),
];

async function main() {
  const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN!);

  // Guild you want to install slash‑commands into
  const guildId = process.env.TEST_GUILD_ID!;
  const appId   = process.env.DISCORD_CLIENT_ID!;

  console.log("🔄 Registering /bondjoin …");
  await rest.put(
    Routes.applicationGuildCommands(appId, guildId),
    { body: commands }
  );
  console.log("✅ Slash command registered.");
}
main().catch(console.error);
