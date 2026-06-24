// Lightweight, dependency-free SVG charts for the admin dashboard. Each is a
// pure presentational client component (responsive via viewBox). Kept here so
// the dashboard needs no chart library — consistent with the single-codebase,
// minimal-deps design of this repo.
"use client";

import { useId, useState } from "react";

export type Point = { label: string; value: number };
export type Series = { label: string; value: number; color: string };

const fmt = (n: number) =>
  n >= 1000 ? `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k` : `${n}`;

/* ----------------------------- Line / area ----------------------------- */

export function LineChart({
  data,
  color = "#0f766e",
  height = 220,
}: {
  data: Point[];
  color?: string;
  height?: number;
}) {
  const gradId = useId();
  const w = 720;
  const h = height;
  const pad = { top: 16, right: 16, bottom: 28, left: 32 };
  const iw = w - pad.left - pad.right;
  const ih = h - pad.top - pad.bottom;
  const max = Math.max(1, ...data.map((d) => d.value));
  const n = data.length;

  if (n === 0) return <ChartEmpty height={height} />;

  const x = (i: number) => pad.left + (n === 1 ? iw / 2 : (i / (n - 1)) * iw);
  const y = (v: number) => pad.top + ih - (v / max) * ih;

  const line = data.map((d, i) => `${x(i)},${y(d.value)}`).join(" ");
  const area = `${pad.left},${pad.top + ih} ${line} ${pad.left + iw},${pad.top + ih}`;

  const ticks = 3;
  const gridVals = Array.from({ length: ticks + 1 }, (_, i) =>
    Math.round((max / ticks) * i),
  );

  // show at most ~8 x labels to avoid crowding
  const step = Math.max(1, Math.ceil(n / 8));

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>

      {gridVals.map((v) => (
        <g key={v}>
          <line
            x1={pad.left}
            x2={pad.left + iw}
            y1={y(v)}
            y2={y(v)}
            stroke="#e5e7eb"
            strokeWidth="1"
          />
          <text x={pad.left - 6} y={y(v) + 3} textAnchor="end" className="fill-gray-400 text-[10px]">
            {fmt(v)}
          </text>
        </g>
      ))}

      <polygon points={area} fill={`url(#${gradId})`} />
      <polyline
        points={line}
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {data.map((d, i) => (
        <g key={i}>
          {n <= 31 && (
            <circle cx={x(i)} cy={y(d.value)} r="2.5" fill={color}>
              <title>{`${d.label}: ${d.value}`}</title>
            </circle>
          )}
          {i % step === 0 && (
            <text x={x(i)} y={h - 8} textAnchor="middle" className="fill-gray-400 text-[10px]">
              {d.label}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}

/* ------------------------------- Bars ---------------------------------- */

export function BarChart({
  data,
  height = 220,
}: {
  data: Series[];
  height?: number;
}) {
  const w = 720;
  const h = height;
  const pad = { top: 16, right: 16, bottom: 40, left: 32 };
  const iw = w - pad.left - pad.right;
  const ih = h - pad.top - pad.bottom;
  const max = Math.max(1, ...data.map((d) => d.value));
  const n = data.length;

  if (n === 0) return <ChartEmpty height={height} />;

  const band = iw / n;
  const bw = Math.min(56, band * 0.6);
  const ticks = 3;
  const gridVals = Array.from({ length: ticks + 1 }, (_, i) =>
    Math.round((max / ticks) * i),
  );
  const y = (v: number) => pad.top + ih - (v / max) * ih;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img">
      {gridVals.map((v) => (
        <g key={v}>
          <line x1={pad.left} x2={pad.left + iw} y1={y(v)} y2={y(v)} stroke="#e5e7eb" />
          <text x={pad.left - 6} y={y(v) + 3} textAnchor="end" className="fill-gray-400 text-[10px]">
            {fmt(v)}
          </text>
        </g>
      ))}

      {data.map((d, i) => {
        const cx = pad.left + band * i + band / 2;
        const bh = (d.value / max) * ih;
        return (
          <g key={d.label}>
            <rect
              x={cx - bw / 2}
              y={pad.top + ih - bh}
              width={bw}
              height={bh}
              rx="4"
              fill={d.color}
            >
              <title>{`${d.label}: ${d.value}`}</title>
            </rect>
            {bh > 16 && (
              <text x={cx} y={pad.top + ih - bh - 5} textAnchor="middle" className="fill-gray-500 text-[10px] font-medium">
                {d.value}
              </text>
            )}
            <text x={cx} y={h - 22} textAnchor="middle" className="fill-gray-500 text-[10px]">
              {d.label.length > 9 ? `${d.label.slice(0, 8)}…` : d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/* ------------------------------- Donut --------------------------------- */

export function DonutChart({
  data,
  size = 200,
}: {
  data: Series[];
  size?: number;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const total = data.reduce((s, d) => s + d.value, 0);
  const r = 80;
  const cx = 100;
  const cy = 100;
  const stroke = 26;
  const circ = 2 * Math.PI * r;

  if (total === 0)
    return (
      <div
        className="flex items-center justify-center text-sm text-gray-400"
        style={{ height: size }}
      >
        No data
      </div>
    );

  const arcs = data.map((d, i) => {
    const before = data.slice(0, i).reduce((s, x) => s + x.value, 0);
    const frac = d.value / total;
    return {
      ...d,
      i,
      dash: frac * circ,
      gap: circ - frac * circ,
      rot: (before / total) * 360 - 90,
    };
  });

  const active = hover != null ? arcs[hover] : null;

  return (
    <div className="flex items-center gap-5">
      <svg viewBox="0 0 200 200" width={size} height={size} className="shrink-0">
        {arcs.map((a) => (
          <circle
            key={a.label}
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={a.color}
            strokeWidth={hover === a.i ? stroke + 4 : stroke}
            strokeDasharray={`${a.dash} ${a.gap}`}
            strokeDashoffset={0}
            transform={`rotate(${a.rot} ${cx} ${cy})`}
            style={{ transition: "stroke-width 120ms" }}
            onMouseEnter={() => setHover(a.i)}
            onMouseLeave={() => setHover(null)}
          />
        ))}
        <text x={cx} y={cy - 4} textAnchor="middle" className="fill-gray-900 text-[26px] font-bold">
          {active ? active.value : total}
        </text>
        <text x={cx} y={cy + 16} textAnchor="middle" className="fill-gray-400 text-[11px]">
          {active ? active.label : "total"}
        </text>
      </svg>

      <ul className="space-y-1.5 text-sm">
        {arcs.map((a) => (
          <li
            key={a.label}
            className="flex items-center gap-2"
            onMouseEnter={() => setHover(a.i)}
            onMouseLeave={() => setHover(null)}
          >
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: a.color }} />
            <span className="text-gray-600">{a.label}</span>
            <span className="ml-auto font-medium text-gray-900">{a.value}</span>
            <span className="w-9 text-right text-xs text-gray-400">
              {Math.round((a.value / total) * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ChartEmpty({ height }: { height: number }) {
  return (
    <div
      className="flex items-center justify-center text-sm text-gray-400"
      style={{ height }}
    >
      No data for the selected filters
    </div>
  );
}
