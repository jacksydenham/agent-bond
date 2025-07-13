// src/components/kanban/Card.tsx
"use client";

import { forwardRef, HTMLAttributes } from "react";
import type { CSSProperties } from "react";
import { cn } from "src/app/lib/utils";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  id: string;
  title: string;
  style?: CSSProperties;
  className?: string;
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ id, title, style, className, ...props }, ref) => (
    <div
      ref={ref}
      style={style}
      data-card-id={id}
      className={cn(
        "rounded-md border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm shadow-md transition-colors hover:border-neutral-700",
        className
      )}
      {...props}
    >
      {title}
    </div>
  )
);
Card.displayName = "Card";
export default Card;
