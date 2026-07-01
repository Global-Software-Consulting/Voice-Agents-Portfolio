// Small, dependency-free motion primitives for the demo landing pages.
// Reveal = scroll-into-view fade/slide (IntersectionObserver, works everywhere
// and degrades to instantly-visible under reduced motion). Marquee = infinite
// horizontal ticker with edge fade + pause-on-hover.
"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    !!window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export function Reveal({
  children,
  className = "",
  delay = 0,
  y = 18,
  once = true,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  once?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (prefersReducedMotion()) {
      // One-time: reveal immediately, no animation. Intentional init in effect.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShown(true);
      return;
    }
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          if (once) io.disconnect();
        } else if (!once) {
          setShown(false);
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [once]);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: shown ? 1 : 0,
        transform: shown ? "none" : `translateY(${y}px)`,
        transition: `opacity .7s cubic-bezier(.16,1,.3,1) ${delay}ms, transform .7s cubic-bezier(.16,1,.3,1) ${delay}ms`,
        willChange: "opacity, transform",
      }}
    >
      {children}
    </div>
  );
}

export function Marquee({
  items,
  className = "",
  itemClassName = "",
  separator,
}: {
  items: string[];
  className?: string;
  itemClassName?: string;
  separator?: ReactNode;
}) {
  // Duplicate the row so the -50% translate loops seamlessly.
  const row = [...items, ...items];
  return (
    <div className={`marquee-wrap marquee-mask overflow-hidden ${className}`}>
      <div className="animate-marquee flex w-max items-center gap-10 pr-10">
        {row.map((t, i) => (
          <span key={i} className={`flex items-center gap-10 whitespace-nowrap ${itemClassName}`}>
            {t}
            {separator ?? <span aria-hidden>◦</span>}
          </span>
        ))}
      </div>
    </div>
  );
}
