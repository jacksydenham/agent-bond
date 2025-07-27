/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import Board from "./components/kanban/Board";
import BezelLine from "./components/ui/BezelLine";
import { greatVibes } from "./layout";
import { LuLink2Off } from "react-icons/lu";
import { MdSmartToy } from "react-icons/md";

type JiraSession = { cloudUrl: string; boardId: string | null };
type DiscordSession = { userId: string; guildId: string | null };
type BotStatus = { online: boolean; listening: boolean };

const DISCORD_INVITE =
  `https://discord.com/oauth2/authorize?` +
  `client_id=${process.env.DISCORD_CLIENT_ID}` +
  `&permissions=8` +
  `&scope=bot%20applications.commands`;

// json or null
async function safeJson(url: string) {
  const r = await fetch(url);
  if (!r.ok) return null;
  const txt = await r.text();
  if (!txt) return null;
  try {
    return JSON.parse(txt);
  } catch {
    return null;
  }
}

// custom toast
function showConfirmToast(confirmLabel: string, cmd: any) {
  toast(
    (t) => (
      <div
        className="
          relative overflow-hidden
          bg-black text-white
          border border-[#D4AF37] ring-2 ring-[#D4AF37] ring-opacity-40
          rounded-lg shadow-lg p-4 w-60
        "
      >
        {/* yellow glare */}
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="
              absolute top-0 left-[-300%]
              w-[400%] h-full
              bg-[rgba(212,175,55,0.3)]
              filter blur-xl
              transform rotate-[20deg]
            "
          />
        </div>

        <BezelLine
          ticks={32}
          viewBoxWidth={320}
          height={6}
          stroke="#D4AF37"
          minorLen={4}
          majorLen={8}
          className="mb-3"
        />

        <div>{confirmLabel}</div>
        <div className="mt-4 flex justify-end">
          <button
            className={`font-semibold px-4 py-1 border border-[#D4AF37] rounded hover:bg-[#D4AF37]/20 transition`}
            onClick={async () => {
              toast.dismiss(t.id);
              const exec = await fetch("/api/jira/execute", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ cmd }),
              }).then((r) => r.json());

              if (exec.success) {
                toast.success(exec.message);
                window.dispatchEvent(
                  new CustomEvent("ai-move", { detail: exec.message })
                );
              } else {
                toast.error(exec.error || "Execution failed");
              }
            }}
          >
            Approve
          </button>
        </div>
        <button
          className="absolute top-2 right-2 text-[#D4AF37] text-xl hover:opacity-80"
          onClick={() => toast.dismiss(t.id)}
        >
          &times;
        </button>
      </div>
    ),
    {
      duration: Infinity,
      position: "top-right",
      style: { background: "transparent", boxShadow: "none" },
    }
  );
}

export default function Home() {
  const [isLive, setIsLive] = useState(false);
  const [session, setSession] = useState<JiraSession | null>(null);
  const [discord, setDiscord] = useState<DiscordSession | null>(null);
  const [boards, setBoards] = useState<Array<{ id: string; name: string }>>([]);
  const [loadingBoards, setLoadingBoards] = useState(false);
  const [guilds, setGuilds] = useState<Array<{ id: string; name: string }>>([]);
  const [loadingGuilds, setLoadingGuilds] = useState(false);
  const [bot, setBot] = useState<BotStatus | null>(null);

  // poll Bond’s status every 5s when disc connected
  useEffect(() => {
    if (!discord?.guildId) return;
    const poll = async () => {
      const s = await safeJson("/api/discord/status");
      if (s) setBot(s);
    };
    poll();
    const id = setInterval(poll, 5000);
    return () => clearInterval(id);
  }, [discord?.guildId]);

  // read cookie
  useEffect(() => {
    safeJson("/api/auth/session")
      .then((s: any) => {
        setSession(s?.jira ?? null);
        setDiscord(s?.discord ?? null);
      })
      .catch(() => {
        setSession(null);
        setDiscord(null);
      });
  }, []);

  // fetch boards
  useEffect(() => {
    if (!session) return;
    setLoadingBoards(true);
    safeJson("/api/jira/boards")
      .then(async (v) => {
        const list = v ?? [];
        setBoards(list);
        if (list.length && !session.boardId) {
          await fetch("/api/jira/select-board", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ boardId: list[0].id }),
          });
          setSession((s) => (s ? { ...s, boardId: list[0].id } : s));
        }
      })
      .finally(() => setLoadingBoards(false));
  }, [session]);

  async function handleSelectBoard(boardId: string) {
    await fetch("/api/jira/select-board", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ boardId }),
    });
    setSession((s) => (s ? { ...s, boardId } : s));
    setIsLive(false);
  }

  async function handleSelectGuild(guildId: string) {
    // disc cookie
    await fetch("/api/discord/select-guild", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ guildId }),
    });

    await fetch("/api/discord/register-commands", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    const s: any = await safeJson("/api/auth/session");
    setDiscord(s?.discord ?? null);
  }

  async function severConnection() {
    await fetch("/api/auth/logout", { method: "POST" });
    setSession(null);
    setIsLive(false);
    location.reload();
  }

  useEffect(() => {
    if (bot?.listening) {
      setIsLive(true);
    }
  }, [bot?.listening]);

  useEffect(() => {
    if (!discord?.userId || discord.guildId) return;
    setLoadingGuilds(true);
    safeJson("/api/discord/guilds")
      .then((list: any[]) => setGuilds(list || []))
      .finally(() => setLoadingGuilds(false));
  }, [discord?.userId, discord?.guildId]);

  useEffect(() => {
    if (!session?.boardId || !isLive) return;
    const id = setInterval(async () => {
      const sentences: string[] = await fetch("/api/discord/queue")
        .then((r) => r.json())
        .catch(() => []);
      for (const s of sentences) {
        await handleSentence(s);
      }
    }, 3000);
    return () => clearInterval(id);
  }, [session?.boardId, isLive]);

  async function handleSentence(sentence: string) {
    console.log("[UI] got sentence:", sentence);
    const res = await fetch("/api/discord/transcript", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sentence }),
    });
    const data = await res.json().catch(() => null);

    if (!data?.success) {
      toast.error(data?.error || "AI parse failed");
      console.log("[UI] Transcript error:", data);
      return;
    }

    const { cmd } = data as {
      success: true;
      message: string;
      cmd: { action: string; issueKey?: string; summary?: string };
    };

    if (cmd.action === "none") {
      console.log("[UI] No action suggested for:", sentence);
      return;
    }

    let confirmLabel = "";
    if (cmd.action === "move" && cmd.issueKey) {
      confirmLabel = `Move ${cmd.issueKey}?`;
    } else if (cmd.action === "create" && cmd.summary) {
      confirmLabel = `Create "${cmd.summary}"?`;
    }

    showConfirmToast(confirmLabel, cmd);
  }

  const jiraHost = session?.cloudUrl.replace(/^https?:\/\//, "") || "Jira";

  return (
    <main className="bg-black min-h-screen overflow-visible">
      <Toaster
        toastOptions={{
          style: {
            background: "#000",
            color: "#fff",
          },
          success: {
            iconTheme: { primary: "#D4AF37", secondary: "#000" },
          },
          error: {
            iconTheme: { primary: "#D4AF37", secondary: "#000" },
          },
        }}
      />

      <header className="max-w-7xl mx-auto px-6 py-8 text-center">
        <h1
          className={`
            ${greatVibes.className}
            text-6xl lg:text-7xl bg-clip-text text-transparent
            bg-gradient-to-r from-[#D4AF37] via-[#C0C0C0] to-white
            font-black tracking-tight leading-snug py-4
          `}
        >
          Agent Bond Dashboard
        </h1>

        <div className="flex items-center justify-center space-x-6 px-6">
          <div className="flex-1 h-3">
            <BezelLine
              ticks={60}
              viewBoxWidth={600}
              height={2}
              stroke="#D4AF37"
              minorLen={10}
              majorLen={14}
            />
          </div>
          <p className="text-base lg:text-lg italic tracking-wide text-white/60">
            Your mission control for tracking tasks in style.
          </p>
          <div className="flex-1 h-3">
            <BezelLine
              ticks={60}
              viewBoxWidth={600}
              height={2}
              stroke="#D4AF37"
              minorLen={10}
              majorLen={14}
            />
          </div>
        </div>

        {session && (
          <div className="mt-2 flex items-center justify-center gap-2 text-green-400">
            <span className="inline-block w-2 h-2 rounded-full bg-green-400" />
            <span className="font-semibold">Connected to {jiraHost}</span>
            <button
              title="Sever connection"
              onClick={severConnection}
              className="text-green-200 hover:text-red-400 transition-colors"
            >
              <LuLink2Off size={16} strokeWidth={2} />
            </button>
          </div>
        )}

        <div className="mt-2 flex flex-wrap items-center justify-center gap-4">
          {!session && (
            <button
              className="px-6 py-0 rounded bg-[#1868DB] hover:bg-[#1868DB]/80 font-semibold"
              onClick={() => (window.location.href = "/api/auth/jira")}
            >
              Connect your Jira account
            </button>
          )}

          {!discord?.userId ? (
            <button
              className="px-6 py-0 rounded bg-[#5865F2] hover:bg-[#5865F2]/80 font-semibold text-white ml-4"
              onClick={() => (window.location.href = "/api/discord/oauth")}
            >
              Connect your Discord
            </button>
          ) : !discord.guildId ? (
            <>
              {loadingGuilds ? (
                <span className="text-gray-300">Loading servers…</span>
              ) : guilds.length === 0 ? (
                <span className="text-gray-400">No servers found</span>
              ) : (
                <select
                  className="h-6 bg-gray-600 text-white px-3 rounded ml-4"
                  value={discord.guildId || ""}
                  onChange={(e) => handleSelectGuild(e.target.value)}
                >
                  <option value="" disabled>
                    Select your Discord server
                  </option>
                  {guilds.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              )}
            </>
          ) : null}

          {session && (
            <>
              {loadingBoards ? (
                <span className="text-gray-300">Loading boards…</span>
              ) : boards.length === 0 ? (
                <span className="text-gray-400">No boards found</span>
              ) : (
                <select
                  className="h-6 bg-gray-600 text-white px-3 rounded"
                  value={session.boardId ?? boards[0].id}
                  onChange={(e) => handleSelectBoard(e.target.value)}
                >
                  {boards.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              )}
            </>
          )}

          {session?.boardId && (
            <label className="relative inline-block w-20 h-6 select-none">
              <input
                type="checkbox"
                checked={isLive}
                onChange={() => setIsLive(!isLive)}
                className="sr-only peer"
              />
              <span className="absolute inset-0 rounded-full bg-gray-600 peer-checked:bg-green-500 transition-colors" />
              <span className="absolute inset-y-0 left-3.5 flex items-center font-extrabold text-xs text-white opacity-0 peer-checked:opacity-100 transition-opacity">
                LIVE
              </span>
              <span className="absolute inset-y-0 right-2.5 flex items-center font-extrabold text-xs text-white opacity-100 peer-checked:opacity-0 transition-opacity">
                DEMO
              </span>
              <span className="absolute top-0.5 left-1 w-5 h-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-[52px]" />
            </label>
          )}

          {discord?.guildId && !bot?.online && (
            <a
              href={DISCORD_INVITE}
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-0 rounded bg-[#5865F2] hover:bg-[#5865F2]/80 font-semibold text-white"
            >
              Invite Bond Bot to Discord
            </a>
          )}

          {bot && (
            <span
              className={`flex items-center gap-2 ${
                bot.online ? "text-green-400" : "text-gray-400"
              }`}
            >
              <MdSmartToy
                size={16}
                className={bot.online ? "" : "animate-pulse"}
              />
              <span className="font-semibold">
                {bot.online
                  ? bot.listening
                    ? "Listening"
                    : "Online"
                  : "Offline"}
              </span>
            </span>
          )}
        </div>
      </header>

      {session?.boardId && (
        <section className="max-w-7xl mx-auto px-6 pb-16">
          <Board key={session.boardId} isLive={isLive} />
        </section>
      )}
    </main>
  );
}
