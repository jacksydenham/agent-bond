"use client";
import { useState } from "react";
import Board from "./components/kanban/Board";
import BezelLine from "./components/ui/BezelLine";
import { greatVibes } from "./layout";

export default function Home() {
  const [isLive, setIsLive] = useState(false);
  // derive a friendly name from your Jira base URL:
  const jiraHost =
    process.env.NEXT_PUBLIC_JIRA_BASE_URL?.replace(/^https?:\/\//, "") ||
    "Jira";

  return (
    <main className="bg-black min-h-screen overflow-visible">
      <header className="max-w-7xl mx-auto px-6 py-8 text-center overflow-visible">
        <h1
          className={`
           ${greatVibes.className}
           text-6xl lg:text-7xl  
           font-black
           tracking-tight  
           bg-clip-text text-transparent  
           bg-gradient-to-r from-[#D4AF37] via-[#C0C0C0] to-white  
           leading-snug py-4 overflow-visible
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

          <p
            className="
           text-base lg:text-lg
           italic
           tracking-wide
           text-white/60
         "
          >
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
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center space-x-4">
            {/* Toggle */}
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isLive}
                onChange={() => setIsLive((x) => !x)}
                className="sr-only peer"
              />
              <div
                className="
        w-12 h-6 bg-gray-600 rounded-full
        peer-checked:bg-green-500
        transition-colors duration-200
      "
              />
              <div
                className="
        absolute left-1 top-1 w-4 h-4 bg-white rounded-full
        peer-checked:translate-x-6
        transition-transform duration-200
      "
              />
            </label>

            {/* Status label */}
            <div className="flex items-center space-x-1">
              {isLive ? (
                <>
                  <span className="inline-block w-2 h-2 bg-green-400 rounded-full" />
                  <span className="font-semibold text-green-400">
                    Connected
                  </span>
                  <span className="text-gray-300">to {jiraHost}</span>
                </>
              ) : (
                <span className="text-sm font-medium text-gray-400">
                  Demo mode
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      <section className="max-w-7xl mx-auto px-6 pb-16">
        <Board isLive={isLive} />
      </section>
    </main>
  );
}
