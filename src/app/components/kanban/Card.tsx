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
        "rounded-lg border border-white/10 bg-white/5 px-6 py-4 text-sm text-white shadow-lg backdrop-blur-sm transition-all",
        "hover:border-white/20 hover:bg-white/10",
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
