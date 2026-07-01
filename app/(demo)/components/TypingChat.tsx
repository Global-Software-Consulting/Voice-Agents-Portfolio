// Animated "live conversation" — types out the sample turns one character at a
// time, reveals the outcome chips, holds, then loops. Purely decorative; the real
// voice widget is the actual call UI. Respects prefers-reduced-motion.
"use client";

import { useEffect, useRef, useState } from "react";

type Turn = { side: "agent" | "user"; text: string };

export function TypingChat({
  turns,
  color,
  outcomes = [],
  tone = "light",
}: {
  turns: Turn[];
  color: string;
  outcomes?: string[];
  tone?: "light" | "dark";
}) {
  const dark = tone === "dark";
  const agentBubble = dark
    ? { background: `${color}33`, color: "#e2e8f0" }
    : { background: `${color}14`, color: "#0f172a" };
  const userBubble = dark
    ? { background: "rgba(255,255,255,0.08)", color: "#e2e8f0" }
    : { background: "#f1f5f9", color: "#0f172a" };
  const [done, setDone] = useState<Turn[]>([]);
  const [partial, setPartial] = useState<Turn | null>(null);
  const [showOutcomes, setShowOutcomes] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const wait = (ms: number) =>
      new Promise<void>((res) => timers.push(setTimeout(res, ms)));

    async function run() {
      while (!cancelled) {
        setDone([]);
        setPartial(null);
        setShowOutcomes(false);
        await wait(500);
        for (const turn of turns) {
          if (cancelled) return;
          if (reduce) {
            setDone((d) => [...d, turn]);
            await wait(500);
            continue;
          }
          for (let i = 1; i <= turn.text.length; i++) {
            if (cancelled) return;
            setPartial({ side: turn.side, text: turn.text.slice(0, i) });
            await wait(16);
          }
          setDone((d) => [...d, turn]);
          setPartial(null);
          await wait(480);
        }
        if (cancelled) return;
        setShowOutcomes(true);
        await wait(3400);
      }
    }
    run();
    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, [turns]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 99999, behavior: "smooth" });
  }, [done, partial, showOutcomes]);

  const bubbles = partial ? [...done, partial] : done;

  return (
    <div ref={scrollRef} className="max-h-72 space-y-3 overflow-hidden text-sm">
      {bubbles.map((turn, i) => {
        const isAgent = turn.side === "agent";
        const typing = partial && i === bubbles.length - 1;
        return (
          <div key={i} className={`flex ${isAgent ? "justify-start" : "justify-end"}`}>
            <div
              className="max-w-[85%] rounded-2xl px-3.5 py-2 leading-snug"
              style={isAgent ? agentBubble : userBubble}
            >
              {turn.text}
              {typing && <span className="caret ml-0.5 inline-block" style={{ color }}>▍</span>}
            </div>
          </div>
        );
      })}
      {showOutcomes && outcomes.length > 0 && (
        <div
          className="animate-in-up mt-3 flex flex-wrap items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium"
          style={{ background: `${color}18`, color }}
        >
          {outcomes.map((o, i) => (
            <span key={i}>{o}</span>
          ))}
        </div>
      )}
    </div>
  );
}
