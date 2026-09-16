import { Send } from "lucide-react";

/**
 * All three layers share one 5000ms animation-duration so their
 * percentage keyframe steps (defined in styles.css) land at the same
 * wall-clock moment without separate delay math: letter folds and packs
 * (0–60%), an envelope flap closes over it and seals (57–78%), then it
 * crossfades into a paper-plane icon that flies out (79–100%).
 */
export function LetterFoldAnimation({ playing }: { playing: boolean }) {
  if (!playing) return null;
  return (
    <div className="relative flex h-6 w-16 items-center justify-center text-current" style={{ perspective: "220px" }}>
      <div
        className="absolute h-4 w-5 rounded-[1px] border border-current bg-current/10"
        style={{ animation: "letter-timeline 5s ease-in-out forwards", transformOrigin: "top" }}
      />
      <div
        className="absolute h-4 w-5 origin-top border border-current bg-current/20"
        style={{ animation: "envelope-timeline 5s ease-in-out forwards", transformStyle: "preserve-3d" }}
      />
      <div
        className="absolute h-1.5 w-1.5 rounded-full bg-kraft"
        style={{ animation: "seal-timeline 5s ease-in-out forwards" }}
      />
      <div className="absolute" style={{ animation: "plane-timeline 5s ease-in-out forwards" }}>
        <Send className="h-4 w-4" />
      </div>
    </div>
  );
}
