"use client";

interface BezelLineProps {
  ticks?: number;
  viewBoxWidth?: number;
  height?: number;
  stroke?: string;
  minorLen?: number;
  majorLen?: number;
  className?: string;
}

export default function BezelLine({
  ticks = 60,
  viewBoxWidth = 600,
  height = 20,
  stroke = "#D4AF37",
  minorLen = 6,
  majorLen = 12,
  className = "",
}: BezelLineProps) {
  const gap = viewBoxWidth / ticks;
  const majorInterval = ticks / 12;

  // james bond ahh watch bezel ahh
  return (
    <svg
      width="100%"
      height={height}
      viewBox={`0 0 ${viewBoxWidth} ${height}`}
      className={`overflow-visible ${className}`}
    >
      {Array.from({ length: ticks }).map((_, i) => {
        const isMajor = i !== 0 && i % majorInterval === 0;
        const len = isMajor ? majorLen : minorLen;

        return (
          <line
            key={i}
            x1={i * gap + gap / 2}
            y1={0}
            x2={i * gap + gap / 2}
            y2={len}
            stroke={stroke}
            strokeWidth={1}
            opacity={isMajor ? 1 : 0.6}
          />
        );
      })}
    </svg>
  );
}
