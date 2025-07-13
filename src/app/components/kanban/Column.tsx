"use client";
import { useDroppable } from "@dnd-kit/core";
import SortableCard from "./SortableCard";
import { Item } from "./types";

interface ColumnProps {
  id: string;
  label: string;
  items: Item[];
  activeId: string | null;
}

export default function Column({ id, label, items, activeId }: ColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div className="flex w-72 flex-col gap-3">
      <h2 className="px-1 text-sm font-medium text-neutral-300">{label}</h2>
      <div
        ref={setNodeRef}
        className={`flex flex-col gap-3 min-h-[200px] rounded-lg p-3 transition-colors ${
          isOver ? "bg-blue-900/60" : "bg-neutral-950/60"
        }`}
      >
        {items.map((item) => (
          <SortableCard
            key={item.id}
            id={item.id}
            title={item.title}
            activeId={activeId}
          />
        ))}
      </div>
    </div>
  );
}
