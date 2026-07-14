import { useEffect, useState } from "react";

export function ReadingProgress() {
  const [pct, setPct] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement;
      const total = h.scrollHeight - h.clientHeight;
      setPct(total > 0 ? Math.min(100, Math.max(0, (h.scrollTop / total) * 100)) : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-40 h-0.5 bg-transparent"
    >
      <div
        className="h-full bg-white/70 transition-[width] duration-150 ease-out"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
