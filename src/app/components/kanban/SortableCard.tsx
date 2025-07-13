/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { defaultAnimateLayoutChanges, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { CSSProperties } from "react";
import Card from "./Card";

function customAnimateLayoutChanges(args: any) {
  if (args.isSorting || args.wasDragging) {
    return defaultAnimateLayoutChanges(args);
  }
  return true;
}

export default function SortableCard({
  id,
  title,
  activeId,
}: {
  id: string;
  title: string;
  activeId: string | null;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, animateLayoutChanges: customAnimateLayoutChanges });

  const style: CSSProperties = {};
  if (transform) style.transform = CSS.Transform.toString(transform);
  if (transition) style.transition = transition;

  const isActive = isDragging || activeId === id;

  return (
    <Card
      ref={setNodeRef}
      id={id}
      title={title}
      style={style}
      className={isActive ? "cursor-grabbing opacity-50" : "cursor-grab"}
      {...attributes}
      {...listeners}
    />
  );
}
