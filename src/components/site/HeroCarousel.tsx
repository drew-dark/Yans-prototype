import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

const AUTOPLAY_MS = 5000;

// Admin-configurable timing is a future addition — AUTOPLAY_MS stays a
// constant for now, not wired to any settings table yet.

export function HeroCarousel({ images, className = "" }: { images: string[]; className?: string }) {
  const [index, setIndex] = useState(0);
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const count = images.length;
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const goTo = useCallback(
    (i: number) => {
      if (count === 0) return;
      setIndex(((i % count) + count) % count);
    },
    [count],
  );

  const next = useCallback(() => goTo(index + 1), [goTo, index]);
  const prev = useCallback(() => goTo(index - 1), [goTo, index]);

  useEffect(() => {
    if (reduceMotion || count <= 1) return;
    timerRef.current = setInterval(() => {
      setIndex((i) => (i + 1) % count);
    }, AUTOPLAY_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [reduceMotion, count]);

  function pauseAndReset() {
    if (timerRef.current) clearInterval(timerRef.current);
  }

  if (count === 0) return null;

  return (
    <div
      className={`group/hero relative w-full overflow-hidden bg-black ${className}`}
      onMouseEnter={pauseAndReset}
      role="region"
      aria-roledescription="carousel"
      aria-label={t("media.featuredImagesAria")}
    >
      {images.map((src, i) => {
        const active = i === index;
        return (
          <div
            key={i}
            className={`absolute inset-0 ${
              reduceMotion ? "" : "transition-opacity duration-1000 ease-out"
            } ${active ? "opacity-100" : "opacity-0"}`}
            aria-hidden={!active}
          >
            {/* Backdrop: same image, blurred and scaled to fill the frame
                so there's never an empty letterbox bar — purely
                decorative, crops freely since none of its detail matters. */}
            <img
              src={src}
              alt=""
              aria-hidden="true"
              className="h-full w-full scale-110 object-cover opacity-60 blur-2xl"
            />
            {/* Foreground: the actual photo, always shown in full via
                object-contain — nothing gets cropped out of the real
                image, only resized to fit. A slow scale-up (Ken Burns)
                plays on the active slide only, skipped for reduced motion. */}
            <img
              src={src}
              alt=""
              loading={i === 0 ? "eager" : "lazy"}
              className={`absolute inset-0 h-full w-full object-contain ${
                reduceMotion
                  ? ""
                  : `transition-transform duration-[6000ms] ease-out ${active ? "scale-105" : "scale-100"}`
              }`}
            />
          </div>
        );
      })}

      {count > 1 && (
        <>
          <button
            type="button"
            onClick={prev}
            aria-label={t("media.prevImageAria")}
            className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/50 p-1.5 text-white opacity-0 backdrop-blur-sm transition-opacity hover:bg-black/70 focus-visible:opacity-100 group-hover/hero:opacity-100"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={next}
            aria-label={t("media.nextImageAria")}
            className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/50 p-1.5 text-white opacity-0 backdrop-blur-sm transition-opacity hover:bg-black/70 focus-visible:opacity-100 group-hover/hero:opacity-100"
          >
            <ChevronRight className="h-4 w-4" />
          </button>

          <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 gap-1.5">
            {images.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => goTo(i)}
                aria-label={t("media.goToImageAria", { n: i + 1 })}
                aria-current={i === index}
                className={`h-1.5 rounded-full transition-all ${
                  i === index ? "w-5 bg-white" : "w-1.5 bg-white/40 hover:bg-white/70"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
