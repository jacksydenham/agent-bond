"use client";

import { forwardRef, HTMLAttributes } from "react";
import type { CSSProperties } from "react";
import { cn } from "src/app/lib/utils";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  id: string;
  title: string;
  comments?: string[];
  style?: CSSProperties;
  className?: string;
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ id, title, comments = [], style, className, ...props }, ref) => (
    <div
      ref={ref}
      style={style}
      data-card-id={id}
      className={cn(
        "relative rounded-lg border border-white/10 bg-white/5 px-6 py-4 text-sm text-white shadow-lg backdrop-blur-sm transition-all",
        "hover:border-white/20 hover:bg-white/10",
        className
      )}
      {...props}
    >
      <span className="absolute top-0 right-1 text-[10px] text-white opacity-25">
        {id}
      </span>

      <div className="font-medium">{title}</div>

      {comments.length > 0 && (
        <ul className="mt-2 list-disc list-outside pl-4 space-y-1">
          {comments.map((c, i) => (
            <li key={i} className="text-xs text-gray-400">
              {c}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
);
Card.displayName = "Card";
export default Card;
