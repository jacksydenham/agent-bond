// bot/speechAzure.ts
import {
  EndBehaviorType,
  joinVoiceChannel,
  getVoiceConnection,
  VoiceReceiver,
  AudioReceiveStream,
  entersState,
  VoiceConnectionStatus,
} from "@discordjs/voice";
import prism from "prism-media";
import * as sdk from "microsoft-cognitiveservices-speech-sdk";
import { VoiceBasedChannel } from "discord.js";

// joinVoice returns the receiver so caller can listen
export async function joinVoice(channel: VoiceBasedChannel): Promise<VoiceReceiver> {
  // Re‑use connection if already connected
  const existing = getVoiceConnection(channel.guild.id);
  const connection =
    existing ??
    joinVoiceChannel({
      channelId: channel.id,
      guildId: channel.guild.id,
      adapterCreator: channel.guild.voiceAdapterCreator,
      selfDeaf: false,
    });

  // Wait until Ready
  await entersState(connection, VoiceConnectionStatus.Ready, 20_000);
  return connection.receiver;
}

// listenAndTranscribe takes the receiver + a callback for every sentence
export function listenAndTranscribe(
  receiver: VoiceReceiver,
  onSentence: (text: string) => void
) {
  receiver.speaking.on("start", (userId) => {
    const opusStream: AudioReceiveStream = receiver.subscribe(userId, {
      end: {
        behavior: EndBehaviorType.AfterSilence,
        duration: 1000,
      },
    });

    const pcmStream = opusStream.pipe(
      new prism.opus.Decoder({ channels: 2, rate: 48000, frameSize: 960 })
    );

    const pushStream = sdk.AudioInputStream.createPushStream();
    pcmStream.on("data", (buffer) => {
      pushStream.write(buffer);
    });
    pcmStream.on("end", () => {
      pushStream.close();
    });

    const speechConfig = sdk.SpeechConfig.fromSubscription(
      process.env.AZURE_KEY!,
      process.env.AZURE_REGION!
    );
    speechConfig.speechRecognitionLanguage = "en-AU";

    const audioConfig = sdk.AudioConfig.fromStreamInput(pushStream);
    const recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);

    recognizer.recognized = (_s, e) => {
      if (e.result.reason === sdk.ResultReason.RecognizedSpeech) {
        const text = e.result.text.trim();
        if (text) onSentence(text);
      }
    };

    recognizer.startContinuousRecognitionAsync();
  });
}
