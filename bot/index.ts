// bot/index.ts
import "dotenv/config";
import {
  Client,
  IntentsBitField,
  VoiceBasedChannel,
  GuildMember,
} from "discord.js";
import { joinVoice, listenAndTranscribe } from "./speechAzure";

import dotenv from "dotenv";
dotenv.config();

const client = new Client({
  intents: [
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildVoiceStates,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.MessageContent,
  ],
});

client.once("ready", () => {
  console.log(`🤖  Logged in as ${client.user!.tag}`);
});

client.on("interactionCreate", async (i) => {
  if (!i.isChatInputCommand()) return;
  if (i.commandName !== "bondjoin") return;

  const member = i.member as GuildMember;
  const ch: VoiceBasedChannel | null = member.voice.channel;
  if (!ch) {
    return i.reply({ content: "Join a voice channel first.", ephemeral: true });
  }

  await i.reply("🎙️ Bond is now listening…");
  const receiver = await joinVoice(ch);
  console.log(`[JOIN] Connected to voice channel: ${ch.name}`);

  listenAndTranscribe(receiver, async (sentence: string) => {
    console.log("🗣", sentence);

    await i.followUp(`🗣 **${member.displayName}:** ${sentence}`);

    // ai shit here once transcript working

  });
});


client.login(process.env.DISCORD_TOKEN!);
