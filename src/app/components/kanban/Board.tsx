"use client";

import {
  DndContext,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
  pointerWithin,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  MeasuringStrategy,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useEffect, useState } from "react";
import Column from "./Column";
import Card from "./Card";
import { Item } from "./types";

const columnLabels: Record<string, string> = {
  backlog: "Backlog",
  progress: "In Progress",
  review: "In Review",
  done: "Done",
};

interface BoardProps {
  isLive: boolean;
}
export default function Board({ isLive }: BoardProps) {
  const [columns, setColumns] = useState<Record<string, Item[]>>({});
  const [colToStatusId, setColToStatusId] = useState<Record<string, string>>(
    {}
  );
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeData, setActiveData] = useState<{
    fromCol: string;
    toCol: string;
    itemId: string;
  } | null>(null);
  const [activeItem, setActiveItem] = useState<Item | null>(null);
  const [isMoving, setIsMoving] = useState(false);
  const [events, setEvents] = useState<string[]>([]);

  function addEvent(desc: string) {
    const ts = new Date().toLocaleTimeString();
    setEvents((prev) => [`${ts} — ${desc}`, ...prev]);
  }

  const sensors = useSensors(useSensor(PointerSensor));
  const measuring = { droppable: { strategy: MeasuringStrategy.Always } };

  // fetch the board state and api mapping
  async function loadBoard() {
    const res = await fetch("/api/jira/board");
    if (!res.ok) throw new Error("Failed loading board");
    const { columns, colToStatusId } = await res.json();
    setColumns(columns);
    console.log(columns);
    setColToStatusId(colToStatusId);
  }

  // load once at init
  useEffect(() => {
    loadBoard().catch(console.error);
  }, []);

  // reload on live switch then poll bot
  useEffect(() => {
    if (!isLive) return;
    setIsMoving(true);
    loadBoard()
      .catch(console.error)
      .finally(() => setIsMoving(false));

    const id = setInterval(() => {
      loadBoard().catch(console.error);
    }, 5000);

    return () => clearInterval(id);
  }, [isLive]);

  useEffect(() => {
    const onAIMove = async (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      setIsMoving(true);
      try {
        await loadBoard();
        addEvent(`[AI] ${detail || "Board updated via AI"}`);
      } catch (err) {
        console.error("Failed reloading after AI move:", err);
      } finally {
        setIsMoving(false);
      }
    };
    window.addEventListener("ai-move", onAIMove as EventListener);
    return () =>
      window.removeEventListener("ai-move", onAIMove as EventListener);
  }, []);

  function handleDragStart(event: DragStartEvent) {
    const itemId = event.active.id as string;
    setActiveId(itemId);
    const fromCol = Object.entries(columns).find(([, items]) =>
      items.some((i) => i.id === itemId)
    )![0];
    setActiveItem(columns[fromCol]!.find((i) => i.id === itemId)!);
  }

  function handleDragOver(event: DragOverEvent) {
    const itemId = event.active.id as string;
    const fromCol = Object.entries(columns).find(([, items]) =>
      items.some((i) => i.id === itemId)
    )![0];
    const toCol = event.over ? (event.over.id as string) : fromCol;
    setActiveData({ fromCol, toCol, itemId });
  }

  async function handleDragEnd(event: DragEndEvent) {
    if (activeData && activeItem && event.over) {
      const { fromCol, toCol, itemId } = activeData;
      if (fromCol !== toCol && columns[toCol]) {
        setIsMoving(true);

        // Optimistic move in UI
        setColumns((prev) => {
          const item = prev[fromCol].find((i) => i.id === itemId)!;
          return {
            ...prev,
            [fromCol]: prev[fromCol].filter((i) => i.id !== itemId),
            [toCol]: [...prev[toCol], item],
          };
        });

        if (isLive) {
          // call your Jira move API
          await fetch("/api/jira/move", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              issueKey: itemId,
              toStatusId: colToStatusId[toCol],
            }),
          });

          // re‑sync after a short delay
          await new Promise((r) => setTimeout(r, 800));
          await loadBoard();
        }

        setIsMoving(false);

        addEvent(
          `${isLive ? "[LIVE]" : "[DEMO]"} moved “${activeItem.title}” → ${
            columnLabels[toCol]
          }`
        );
      }
    }

    setActiveId(null);
    setActiveData(null);
    setActiveItem(null);
  }

  return (
    <section className="bg-black py-2">
      <div className="max-w-7xl mx-auto px-6">
        <div className="relative">
          <DndContext
            measuring={measuring}
            sensors={sensors}
            collisionDetection={pointerWithin}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <div
              className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 ${
                isMoving ? "pointer-events-none opacity-50" : ""
              }`}
            >
              {Object.entries(columns).map(([colId, items]) => (
                <SortableContext
                  key={colId}
                  items={items.map((i) => `${colId}:${i.id}`)}
                  strategy={verticalListSortingStrategy}
                >
                  <Column
                    id={colId}
                    label={columnLabels[colId] || colId}
                    items={items}
                    activeId={activeId}
                  />
                </SortableContext>
              ))}
            </div>

            {/* drag preview */}
            <DragOverlay className="pointer-events-none transition-transform duration-300 ease-out">
              {activeItem && (
                <Card
                  id={`${activeItem.id}`}
                  title={activeItem.title}
                  comments={activeItem.comments}
                  className="cursor-grabbing opacity-90 scale-105 shadow-xl"
                />
              )}
            </DragOverlay>
          </DndContext>

          {isMoving && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="absolute inset-0 bg-black/80 animate-pulse" />
              <span className="relative text-3xl font-extrabold text-white drop-shadow-lg">
                Updating…
              </span>
            </div>
          )}
        </div>

        {/* activity feed */}
        <div className="mt-8 bg-white/5 p-4 rounded-lg text-white">
          <h3 className="mb-2 font-semibold">Activity Feed</h3>
          <div className="max-h-48 overflow-y-auto space-y-1 text-sm">
            {events.length === 0 ? (
              <p className="text-white/60">No activity yet</p>
            ) : (
              events.map((ev, i) => (
                <p key={i} className="truncate">
                  {ev}
                </p>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
