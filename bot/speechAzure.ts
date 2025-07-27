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

export async function joinVoice(
  channel: VoiceBasedChannel
): Promise<VoiceReceiver> {
  const existing = getVoiceConnection(channel.guild.id);
  const connection =
    existing ??
    joinVoiceChannel({
      channelId: channel.id,
      guildId: channel.guild.id,
      adapterCreator: channel.guild.voiceAdapterCreator,
      selfDeaf: false,
    });

  await entersState(connection, VoiceConnectionStatus.Ready, 20_000);
  return connection.receiver;
}

export function listenAndTranscribe(
  receiver: VoiceReceiver,
  onSentence: (t: string) => void,
  onEnd?: () => void
) {
  receiver.speaking.on("start", (userId) => {
    console.log(`[VOICE] ${userId} started speaking`);

    // opus stream dec
    const opusStream: AudioReceiveStream = receiver.subscribe(userId, {
      end: { behavior: EndBehaviorType.AfterSilence, duration: 1000 },
    });

    opusStream.on("error", (e) => console.error("[VOICE] opus error", e));
    opusStream.on("close", () => {
      console.log("[VOICE] opus closed");
      onEnd?.();
    });
    // decode opus
    const pcmStream = opusStream.pipe(
      new prism.opus.Decoder({ channels: 1, rate: 16000, frameSize: 320 })
    );

    // send stream to azure
    pcmStream.on("data", (b) => pushStream.write(b));
    pcmStream.on("error", (e) => console.error("[PCM] error", e));
    pcmStream.on("end", () => {
      pushStream.close();
      onEnd?.();
    });
    const speechConfig = sdk.SpeechConfig.fromSubscription(
      process.env.AZURE_KEY!,
      process.env.AZURE_REGION!
    );
    speechConfig.speechRecognitionLanguage = "en-AU";

    // declare sent format and push
    const format = sdk.AudioStreamFormat.getWaveFormatPCM(16000, 16, 1);
    const pushStream = sdk.AudioInputStream.createPushStream(format);
    pcmStream.on("data", (b) => pushStream.write(b));
    pcmStream.on("end", () => pushStream.close());

    // pass stream to AudioConfig
    const audioConfig = sdk.AudioConfig.fromStreamInput(pushStream);

    const recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);

    // partial reps (lol)
    recognizer.sessionStarted = () => console.log("[STT] session started");
    recognizer.recognizing = (_s, e) =>
      console.log("[STT] partial:", e.result.text);

    recognizer.recognized = (_s, e) => {
      if (e.result.reason === sdk.ResultReason.RecognizedSpeech) {
        const text = e.result.text.trim();
        console.log("[STT] final:", text);
        if (text) onSentence(text);
      }
    };

    recognizer.canceled = (_s, e) =>
      console.error("[STT] canceled:", e.errorDetails);

    recognizer.startContinuousRecognitionAsync();
  });
}
