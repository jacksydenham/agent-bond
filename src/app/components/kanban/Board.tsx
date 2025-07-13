"use client";
import {
  DndContext,
  DragStartEvent,
  DragOverEvent,
  closestCenter,
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

export default function Board() {
  const [columns, setColumns] = useState(initialColumns);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeData, setActiveData] = useState<{
    fromCol: string;
    toCol: string;
    itemId: string;
  } | null>(null);
  const [activeItem, setActiveItem] = useState<Item | null>(null);

  const sensors = useSensors(useSensor(PointerSensor));
  const measuring = {
    droppable: {
      strategy: MeasuringStrategy.Always,
    },
  };

  function handleDragStart(event: DragStartEvent) {
    const itemId = event.active.id as string;
    setActiveId(itemId);
    setActiveData(null);

    // Find which column it came from:
    const fromCol = Object.entries(columns).find(([, items]) =>
      items.some((i) => i.id === itemId)
    )![0];

    const item = columns[fromCol]!.find((i) => i.id === itemId)!;
    setActiveItem(item);
  }

  // HandleDragOver:
  function handleDragOver(event: DragOverEvent) {
    if (!event.over) return;

    const itemId = event.active.id as string;
    const toCol = event.over.id as string; // your Column’s droppable id
    const fromCol = Object.entries(columns).find(([, items]) =>
      items.some((i) => i.id === itemId)
    )![0];

    if (fromCol !== toCol) {
      setActiveData({ fromCol, toCol, itemId });
    }
  }

  function handleDragEnd() {
    // Only update the state when the drag is completed
    if (activeData) {
      const { fromCol, toCol, itemId } = activeData;

      setColumns((prev) => {
        const item = prev[fromCol]?.find((i) => i.id === itemId);
        if (!item) return prev; // Return previous state if item not found

        return {
          ...prev,
          [fromCol]: prev[fromCol].filter((i) => i.id !== itemId),
          [toCol]: [...prev[toCol], item],
        };
      });
    }

    setActiveId(null);
    setActiveData(null);
    setActiveItem(null);
  }

  return (
    <DndContext
      measuring={measuring}
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto p-6">
        {Object.entries(columns).map(([colId, items]) => (
          <SortableContext
            key={colId}
            items={items.map((i) => `${colId}:${i.id}`)}
            strategy={verticalListSortingStrategy}
          >
            <Column
              id={colId}
              label={colId.replace(/^\w/, (c) => c.toUpperCase())}
              items={items}
              activeId={activeId}
            />
          </SortableContext>
        ))}
      </div>

      {/* Drag overlay for visual feedback */}
      <DragOverlay>
        {activeItem ? (
          <Card
            id={`overlay:${activeItem.id}`}
            title={activeItem.title}
            className="cursor-grabbing opacity-90 scale-105 shadow-lg"
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
