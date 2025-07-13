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
import { useState } from "react";
import Column from "./Column";
import Card from "./Card";
import { Item } from "./types";

type Columns = Record<string, Item[]>;

const initialColumns: Columns = {
  backlog: [
    { id: "task-1", title: "Research competitors" },
    { id: "task-2", title: "Draft project proposal" },
    { id: "task-3", title: "Create wireframes" },
  ],
  progress: [
    { id: "task-4", title: "Implement authentication" },
    { id: "task-5", title: "Design database schema" },
  ],
  review: [],
  done: [
    { id: "task-6", title: "Setup project repository" },
    { id: "task-7", title: "Configure CI/CD pipeline" },
  ],
};

const columnLabels: Record<string, string> = {
  backlog: "Backlog",
  progress: "In Progress",
  review: "In Review",
  done: "Done",
};

export default function Board() {
  const [columns, setColumns] = useState(initialColumns);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeData, setActiveData] = useState<{
    fromCol: string;
    toCol: string;
    itemId: string;
  } | null>(null);
  const [activeItem, setActiveItem] = useState<Item | null>(null);

  const [isLive, setIsLive] = useState(false);
  const [events, setEvents] = useState<string[]>([]);

  // move event
  function addEvent(desc: string) {
    const ts = new Date().toLocaleTimeString();
    setEvents((prev) => [`${ts} — ${desc}`, ...prev]);
  }

  // dampened drag consts
  const sensors = useSensors(useSensor(PointerSensor));
  const measuring = { droppable: { strategy: MeasuringStrategy.Always } };

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
  function handleDragEnd(event: DragEndEvent) {
    if (activeData) {
      const { fromCol, toCol, itemId } = activeData;
      const valid = Object.keys(columns).includes(toCol);
      setColumns((prev) => {
        const item = prev[fromCol].find((i) => i.id === itemId);
        if (!item || !valid || fromCol === toCol || !event.over) return prev;
        return {
          ...prev,
          [fromCol]: prev[fromCol].filter((i) => i.id !== itemId),
          [toCol]: [...prev[toCol], item],
        };
      });
      addEvent(
        `${isLive ? "[LIVE]" : "[DEMO]"} moved “${activeItem?.title}” → ${
          columnLabels[toCol]
        }`
      );
    }
    setActiveId(null);
    setActiveData(null);
    setActiveItem(null);
  }

  return (
    <section className="bg-black py-6">

      {/* movethis ugly shit*/}
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex justify-end">
          <label className="inline-flex items-center text-white">
            <input
              type="checkbox"
              checked={isLive}
              onChange={() => setIsLive((x) => !x)}
              className="h-4 w-4"
            />
            <span className="ml-2 select-none">Live mode</span>
          </label>
        </div>


        <DndContext
          measuring={measuring}
          sensors={sensors}
          collisionDetection={pointerWithin}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {Object.entries(columns).map(([colId, items]) => (
              <SortableContext
                key={colId}
                items={items.map((i) => `${colId}:${i.id}`)}
                strategy={verticalListSortingStrategy}
              >
                <Column
                  id={colId}
                  label={columnLabels[colId]}
                  items={items}
                  activeId={activeId}
                />
              </SortableContext>
            ))}
          </div>

          {/* drag preview */}
          <DragOverlay
            className="pointer-events-none transition-transform duration-300 ease-out"
          >
            {activeItem && (
              <Card
                id={`overlay:${activeItem.id}`}
                title={activeItem.title}
                className="cursor-grabbing opacity-90 scale-105 shadow-xl"
              />
            )}
          </DragOverlay>
        </DndContext>

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
