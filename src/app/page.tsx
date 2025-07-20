"use client";

import { useEffect, useState } from "react";
import Board from "./components/kanban/Board";
import BezelLine from "./components/ui/BezelLine";
import { greatVibes } from "./layout";
import { LuLink2Off } from "react-icons/lu";

type JiraSession = { cloudUrl: string; boardId: string | null };

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

export default function Home() {
  const [isLive, setIsLive] = useState(false);
  const [session, setSession] = useState<JiraSession | null>(null);
  const [boards, setBoards] = useState<Array<{ id: string; name: string }>>([]);
  const [loadingBoards, setLoadingBoards] = useState(false);

  // read cookie
  useEffect(() => {
    safeJson("/api/auth/session")
      .then(setSession)
      .catch(() => setSession(null));
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

  async function severConnection() {
    await fetch("/api/auth/logout", { method: "POST" });
    setSession(null);
    setIsLive(false);
    location.reload();
  }

  const jiraHost = session?.cloudUrl?.replace(/^https?:\/\//, "") || "Jira";

  return (
    <main className="bg-black min-h-screen overflow-visible">
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

        {/* connected line */}
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

        {/* buttons line */}
        <div className="mt-2 flex flex-wrap items-center justify-center gap-4">
          {!session && (
            <button
              className="px-6 py-2 rounded bg-[#D4AF37]/80 hover:bg-[#D4AF37] font-semibold text-black"
              onClick={() => (window.location.href = "/api/auth/jira")}
            >
              Connect your Jira account
            </button>
          )}

          {/* dropdown */}
          {session && (
            <>
              {loadingBoards ? (
                <span className="text-gray-300">Loading boards…</span>
              ) : boards.length === 0 ? (
                <span className="text-gray-400">No boards found</span>
              ) : (
                <select
                  className="h-6 bg-gray-600 text-white px-3 rounded flex items-center"
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

          {/* switch */}
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
