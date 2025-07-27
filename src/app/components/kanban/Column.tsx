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
    <div className="flex flex-col w-full max-w-xs mx-auto">
      <h2 className="mb-4 text-2xl font-bold text-white tracking-tight">
        {label}
      </h2>

      <div
        ref={setNodeRef}
        className={`flex flex-col gap-3 min-h-[200px] rounded-lg p-4 transition-all backdrop-blur-sm
          ${
            isOver
              ? "bg-yellow-500/10 border-2 border-yellow-500 border-dashed shadow-inner"
              : "bg-white/5 border border-white/10"
          }`}
      >
        {items.map((item) => (
          <SortableCard
            key={item.id}
            id={item.id}
            title={item.title}
            comments={item.comments}
            activeId={activeId}
          />
        ))}
      </div>
    </div>
  );
}
