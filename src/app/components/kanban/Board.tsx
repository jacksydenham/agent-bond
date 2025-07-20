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

type Columns = Record<string, Item[]>;

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
  const [columns, setColumns] = useState<Columns>({});
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

  // move event
  function addEvent(desc: string) {
    const ts = new Date().toLocaleTimeString();
    setEvents((prev) => [`${ts} — ${desc}`, ...prev]);
  }

  // dampened drag consts
  const sensors = useSensors(useSensor(PointerSensor));
  const measuring = { droppable: { strategy: MeasuringStrategy.Always } };

  // reload the entire board from Jira
  async function loadBoard() {
    try {
      const res = await fetch("/api/jira/board");
      const { columns, colToStatusId } = await res.json();
      setColumns(columns);
      setColToStatusId(colToStatusId);
    } catch (err) {
      console.error("Failed to reload board:", err);
    }
  }

  useEffect(() => {
    if (!isLive) return;
    setIsMoving(true);
    loadBoard()
      .catch(console.error)
      .finally(() => {
        setIsMoving(false);
      });
  }, [isLive]);

  // pickup
  function handleDragStart(event: DragStartEvent) {
    const itemId = event.active.id as string;
    setActiveId(itemId);
    const fromCol = Object.entries(columns).find(([, items]) =>
      items.some((i) => i.id === itemId)
    )![0];
    setActiveItem(columns[fromCol]!.find((i) => i.id === itemId)!);
  }

  // hold over
  function handleDragOver(event: DragOverEvent) {
    const itemId = event.active.id as string;
    const fromCol = Object.entries(columns).find(([, items]) =>
      items.some((i) => i.id === itemId)
    )![0];
    const toCol = event.over ? (event.over.id as string) : fromCol;
    setActiveData({ fromCol, toCol, itemId });
  }

  // drop
  async function handleDragEnd(event: DragEndEvent) {
    if (activeData && activeItem && event.over) {
      const { fromCol, toCol, itemId } = activeData;
      const valid = Object.keys(columns).includes(toCol);

      if (valid && fromCol !== toCol) {
        setIsMoving(true);

        setColumns((prev) => {
          const item = prev[fromCol].find((i) => i.id === itemId)!;
          return {
            ...prev,
            [fromCol]: prev[fromCol].filter((i) => i.id !== itemId),
            [toCol]: [...prev[toCol], item],
          };
        });
        if (isLive) {
          if (isLive) {

            // call move
            await fetch("/api/jira/move", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                issueKey: itemId,
                toStatusId: colToStatusId[toCol],
              }),
            });

            await new Promise((r) => setTimeout(r, 800));
            await loadBoard();
          }

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

    // reset drag state
    setActiveId(null);
    setActiveData(null);
    setActiveItem(null);
  }

  useEffect(() => {
    if (isLive) {
      fetch("/api/jira/board")
        .then((r) => r.json())
        .then(({ columns }) => setColumns(columns))
        .catch(console.error);
    }
  }, [isLive]);

  return (
    <section className="bg-black py-2">
      {/* movethis ugly shit*/}
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
              className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6
              ${isMoving ? "pointer-events-none opacity-50" : ""}`}
            >
              {Object.entries(columns).map(([colId, items]) => (
                <SortableContext
                  key={colId}
                  items={items.map((i) => `${colId}:${i.id}`)}
                  strategy={verticalListSortingStrategy}
                >
                  <Column
                    id={colId}
                    label={colId}
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
                  id={`overlay:${activeItem.id}`}
                  title={activeItem.title}
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
        {/* should prolly be its own component */}
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
