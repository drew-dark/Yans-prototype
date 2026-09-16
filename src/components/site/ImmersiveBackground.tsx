import { lazy, Suspense } from "react";
import { useImmersiveMode } from "@/components/site/ImmersiveModeProvider";

const Scene = lazy(() => import("@/components/site/ImmersiveBackgroundScene"));

/** Mount this once, high in the tree (PageShell). It renders nothing —
 * and imports nothing — until mode is actually "immersive". */
export function ImmersiveBackground() {
  const { mode } = useImmersiveMode();
  if (mode !== "immersive") return null;
  return (
    <Suspense fallback={null}>
      <Scene />
    </Suspense>
  );
}
