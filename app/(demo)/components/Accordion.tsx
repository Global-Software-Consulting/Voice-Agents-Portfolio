// Interactive FAQ accordion with smooth height animation (the grid 1fr/0fr trick)
// and an animated +/× toggle. Used by the Classic and Bold layouts.
"use client";

import { useState } from "react";

type QA = { q: string; a: string };

export function Accordion({
  items,
  accent,
  variant = "divided",
  tone = "light",
}: {
  items: QA[];
  accent: string;
  variant?: "divided" | "cards";
  tone?: "light" | "dark";
}) {
  const [open, setOpen] = useState<number | null>(0);
  const dark = tone === "dark";

  if (variant === "cards") {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {items.map((f, i) => (
          <Item key={f.q} f={f} i={i} open={open} setOpen={setOpen} accent={accent} dark={dark} card />
        ))}
      </div>
    );
  }

  return (
    <div className={`overflow-hidden rounded-2xl border ${dark ? "divide-y divide-white/10 border-white/10 bg-white/[0.04]" : "divide-y divide-gray-100 border-gray-200 bg-white"}`}>
      {items.map((f, i) => (
        <Item key={f.q} f={f} i={i} open={open} setOpen={setOpen} accent={accent} dark={dark} />
      ))}
    </div>
  );
}

function Item({
  f,
  i,
  open,
  setOpen,
  accent,
  card = false,
  dark = false,
}: {
  f: QA;
  i: number;
  open: number | null;
  setOpen: (n: number | null) => void;
  accent: string;
  card?: boolean;
  dark?: boolean;
}) {
  const isOpen = open === i;
  const cardBorder = isOpen ? accent : dark ? "rgba(255,255,255,0.12)" : "#e5e7eb";
  return (
    <div
      className={card ? `rounded-2xl border-2 transition-colors ${dark ? "bg-white/[0.04]" : "bg-white"}` : ""}
      style={card ? { borderColor: cardBorder } : undefined}
    >
      <button
        onClick={() => setOpen(isOpen ? null : i)}
        className="flex w-full items-center justify-between gap-4 p-6 text-left"
        aria-expanded={isOpen}
      >
        <span className={`font-semibold ${dark ? "text-white" : "text-gray-900"}`}>{f.q}</span>
        <span
          className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-lg leading-none text-white transition-transform duration-300"
          style={{ background: accent, transform: isOpen ? "rotate(135deg)" : "none" }}
          aria-hidden
        >
          +
        </span>
      </button>
      <div
        className="grid transition-[grid-template-rows] duration-300 ease-out"
        style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <p className={`px-6 pb-6 text-sm leading-relaxed ${dark ? "text-gray-400" : "text-gray-600"}`}>{f.a}</p>
        </div>
      </div>
    </div>
  );
}
