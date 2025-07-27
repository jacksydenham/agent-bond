/* eslint-disable @typescript-eslint/no-explicit-any */
import "dotenv/config";
import express from "express";
import fetch from "node-fetch";
import {
  Client,
  IntentsBitField,
  VoiceBasedChannel,
  GuildMember,
} from "discord.js";
import { joinVoice, listenAndTranscribe } from "./speechAzure";

const NEXT_API_URL = process.env.NEXT_API_URL || "http://localhost:3000";

// shared mem bot status
export interface BotStatus {
  online: boolean;
  listening: boolean;
}
const status: BotStatus = { online: false, listening: false };
export const getBotStatus = () => status;

// start disc
const client = new Client({
  intents: [
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildVoiceStates,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.MessageContent,
  ],
});

client.once("ready", () => {
  console.log(`Bond Bot Logged in as ${client.user!.tag}`);
  status.online = true;
});

client.on("interactionCreate", async (i) => {
  if (!i.isChatInputCommand()) return;
  if (i.commandName !== "bondjoin") return;

  const member = i.member as GuildMember;
  const ch: VoiceBasedChannel | null = member.voice.channel;
  if (!ch) {
    return i.reply({ content: "Join a voice channel first.", ephemeral: true });
  }

  await i.reply("Bond is now listening…");
  const receiver = await joinVoice(ch);
  console.log(`[JOIN] Connected to voice channel: ${ch.name}`);
  status.listening = true;

  listenAndTranscribe(
    receiver,
    async (sentence: string) => {
      console.log("Said: ", sentence);
      try {
        await fetch(`${NEXT_API_URL}/api/discord/queue`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sentence }),
        });
      } catch (e) {
        console.error("Failed to POST transcript to Next.js:", e);
      }

    },
    () => {
      status.listening = false;
    }
  );
});

client.login(process.env.DISCORD_TOKEN!);

// http endpoint for status
const api = express();
api.get("/status", (_req: any, res: any) => {
  res.json(status);
});

api.listen(4000, () =>
  console.log(
    "Bond‑status HTTP server listening on http://localhost:4000/status"
  )
);
