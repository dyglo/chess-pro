"use client";

import { useMemo } from "react";

interface LineChartProps {
  data: { label: string; value: number }[];
  height?: number;
  stroke?: string;
  fill?: string;
}

function buildPath(values: number[], width: number, height: number) {
  if (values.length === 0) return "";
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const step = values.length > 1 ? width / (values.length - 1) : 0;

  return values
    .map((value, index) => {
      const x = index * step;
      const y = height - ((value - min) / range) * height;
      return `${index === 0 ? "M" : "L"}${x},${y}`;
    })
    .join(" ");
}

export function LineChart({
  data,
  height = 160,
  stroke = "#111111",
  fill = "rgba(198,40,40,0.15)",
}: LineChartProps) {
  const width = 600;
  const values = useMemo(() => data.map((d) => d.value), [data]);
  const path = useMemo(() => buildPath(values, width, height), [values, height]);
  const areaPath = path ? `${path} L${width},${height} L0,${height} Z` : "";

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-40 w-full">
        <defs>
          <linearGradient id="areaFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={fill} stopOpacity="0.8" />
            <stop offset="100%" stopColor={fill} stopOpacity="0" />
          </linearGradient>
        </defs>
        {areaPath && <path d={areaPath} fill="url(#areaFill)" />}
        {path && (
          <path
            d={path}
            fill="none"
            stroke={stroke}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
      </svg>
      <div className="mt-2 grid grid-cols-7 gap-2 text-[10px] font-semibold text-[var(--muted)]">
        {data.map((point) => (
          <span key={point.label} className="truncate text-center">
            {point.label}
          </span>
        ))}
      </div>
    </div>
  );
}
