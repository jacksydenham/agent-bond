"use client";

import { useEffect, useState } from "react";
import Board from "./components/kanban/Board";
import BezelLine from "./components/ui/BezelLine";
import { greatVibes } from "./layout";

type JiraSession = {
  cloudUrl: string;
  boardId: string | null;
};

// helper — GET → json or null
async function safeJson(url: string) {
  const res = await fetch(url);
  if (!res.ok) return null;

  // 204 No‑Content or empty body? → return null
  const text = await res.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return null;                        // silently ignore bad JSON
  }
}

export default function Home() {
  // live / demo toggle
  const [isLive, setIsLive] = useState(false);

  // jira auth session
  const [session, setSession] = useState<JiraSession | null>(null);
  const [boards, setBoards] = useState<Array<{ id: string; name: string }>>([]);
  const [loadingBoards, setLoadingBoards] = useState(false);

  /* ────────────────────────────
     1. on mount → check cookie
  ──────────────────────────── */
  useEffect(() => {
    safeJson("/api/auth/session").then(setSession).catch(() => setSession(null));
  }, []);

  /* ────────────────────────────
     2. if logged‑in but no board → fetch boards
  ──────────────────────────── */
  useEffect(() => {
    if (!session || session.boardId) return;
    setLoadingBoards(true);
    safeJson("/api/jira/boards")
      .then((v) => (v ? setBoards(v) : setBoards([])))
      .finally(() => setLoadingBoards(false));
  }, [session]);

  /* ────────────────────────────
     3. handlers
  ──────────────────────────── */
  async function handleSelectBoard(boardId: string) {
    await fetch("/api/jira/select-board", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ boardId }),
    });
    setSession((s) => (s ? { ...s, boardId } : s));
  }

  const jiraHost =
    session?.cloudUrl?.replace(/^https?:\/\//, "") || "Jira";

  /* ────────────────────────────
     UI
  ──────────────────────────── */
  return (
    <main className="bg-black min-h-screen overflow-visible">
      <header className="max-w-7xl mx-auto px-6 py-8 text-center overflow-visible">
        <h1
          className={`
            ${greatVibes.className}
            text-6xl lg:text-7xl  
            font-black tracking-tight  
            bg-clip-text text-transparent  
            bg-gradient-to-r from-[#D4AF37] via-[#C0C0C0] to-white  
            leading-snug py-4
          `}
        >
          Agent Bond Dashboard
        </h1>

        {/* fancy golden bezel + sub‑title */}
        <div className="flex items-center justify-center space-x-6 px-6">
          <div className="flex-1 h-3">
            <BezelLine ticks={60} viewBoxWidth={600} height={2} stroke="#D4AF37" minorLen={10} majorLen={14} />
          </div>

          <p className="text-base lg:text-lg italic tracking-wide text-white/60">
            Your mission control for tracking tasks in style.
          </p>

          <div className="flex-1 h-3">
            <BezelLine ticks={60} viewBoxWidth={600} height={2} stroke="#D4AF37" minorLen={10} majorLen={14} />
          </div>
        </div>

        {/* ───── connection controls ───── */}
        <div className="max-w-7xl mx-auto px-6 mt-8">
          {/* 0) NOT CONNECTED  */}
          {!session && (
            <button
              className="px-6 py-2 rounded bg-[#D4AF37]/80 hover:bg-[#D4AF37] font-semibold text-black"
              onClick={() => (window.location.href = "/api/auth/jira")}
            >
              Connect your Jira account
            </button>
          )}

          {/* 1) CONNECTED BUT NO BOARD  */}
          {session && !session.boardId && (
            <div className="flex items-center space-x-4">
              {loadingBoards ? (
                <span className="text-gray-300">Loading boards…</span>
              ) : (
                <>
                  <select
                    className="bg-gray-800 text-white px-3 py-2 rounded"
                    defaultValue=""
                    onChange={(e) => handleSelectBoard(e.target.value)}
                  >
                    <option value="">Choose a board…</option>
                    {boards.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                  <span className="text-gray-400">from {jiraHost}</span>
                </>
              )}
            </div>
          )}

          {/* 2) FULLY READY  */}
          {session && session.boardId && (
            <div className="flex items-center space-x-4">
              {/* toggle */}
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isLive}
                  onChange={() => setIsLive((x) => !x)}
                  className="sr-only peer"
                />
                <div className="w-12 h-6 bg-gray-600 rounded-full peer-checked:bg-green-500 transition-colors duration-200" />
                <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full peer-checked:translate-x-6 transition-transform duration-200" />
              </label>

              {/* status label */}
              {isLive ? (
                <>
                  <span className="inline-block w-2 h-2 bg-green-400 rounded-full" />
                  <span className="font-semibold text-green-400">Connected</span>
                  <span className="text-gray-300">to {jiraHost}</span>
                </>
              ) : (
                <span className="text-sm font-medium text-gray-400">Demo mode</span>
              )}
            </div>
          )}
        </div>
      </header>

      {/* board only shows when user picked a board */}
      {session && session.boardId && (
        <section className="max-w-7xl mx-auto px-6 pb-16">
          {/* key forces remount when board changes */}
          <Board key={session.boardId} isLive={isLive} />
        </section>
      )}
    </main>
  );
}
