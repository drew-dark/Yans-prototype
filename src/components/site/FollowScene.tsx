/**
 * Minimalist two-figure illustration for the Follow button's click
 * animation. Deliberately abstract (circle head, rounded body, two swung
 * legs) rather than a detailed character — it reads clearly at button
 * scale and matches the site's plain, ink-line aesthetic rather than
 * introducing a mismatched illustration style.
 *
 * Sequence (see the keyframes this references in styles.css):
 *  1. Figure A walks in from the left.
 *  2. Figure B stands idle (a small bob) until A reaches it.
 *  3. B "gets up" — a quick squash/stretch pop.
 *  4. Both walk off to the right together, fading out — B is now
 *     following A. The button then settles into its normal
 *     "Following" state.
 */
function Figure({ className, legAnim }: { className?: string; legAnim: string }) {
  return (
    <svg viewBox="0 0 20 26" width="14" height="18" className={className} aria-hidden="true">
      <circle cx="10" cy="4" r="3.2" fill="currentColor" />
      <rect x="6.5" y="8" width="7" height="10" rx="2.5" fill="currentColor" />
      <line
        x1="9"
        y1="18"
        x2="9"
        y2="25"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        style={{ transformOrigin: "9px 18px", animation: `${legAnim} 0.5s ease-in-out infinite` }}
      />
      <line
        x1="11"
        y1="18"
        x2="11"
        y2="25"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        style={{
          transformOrigin: "11px 18px",
          animation: `${legAnim === "leg-swing-a" ? "leg-swing-b" : "leg-swing-a"} 0.5s ease-in-out infinite`,
        }}
      />
    </svg>
  );
}

export function FollowScene({ playing }: { playing: boolean }) {
  if (!playing) return null;
  return (
    <div className="relative flex h-6 w-16 items-end overflow-hidden text-current">
      <div
        className="absolute bottom-0 left-0"
        style={{ animation: "figure-walk-in 0.9s ease-out forwards, figures-walk-off 0.7s ease-in 0.9s forwards" }}
      >
        <Figure legAnim="leg-swing-a" />
      </div>
      <div
        className="absolute bottom-0 left-7"
        style={{
          animation:
            "figure-bob 0.6s ease-in-out 3, figure-pop-up 0.4s ease-out 0.9s forwards, figures-walk-off 0.7s ease-in 1.3s forwards",
        }}
      >
        <Figure legAnim="leg-swing-b" />
      </div>
    </div>
  );
}
