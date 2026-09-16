import { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * A drifting particle field behind the bento layout, colored from the
 * active theme's --kraft variable so it matches whichever of the 11
 * themes is selected rather than a fixed color. This file is only ever
 * imported via React.lazy() from ImmersiveBackground.tsx, so classic-mode
 * users never load three.js at all.
 */
export default function ImmersiveBackgroundScene() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function readKraftColor() {
      return getComputedStyle(document.documentElement).getPropertyValue("--kraft").trim() || "#c9a876";
    }

    const kraftColor = readKraftColor();

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.z = 12;

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);

    const PARTICLE_COUNT = 220;
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 30;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 20;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 20;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: new THREE.Color(kraftColor),
      size: 0.05,
      transparent: true,
      opacity: 0.5,
      sizeAttenuation: true,
    });

    const points = new THREE.Points(geometry, material);
    scene.add(points);

    // ImmersiveBackground mounts once high in the tree and stays mounted
    // across navigation, so a theme switch while immersive mode is
    // active doesn't remount this component -- without this, the
    // particle color would silently go stale instead of tracking
    // "whichever theme is selected" as intended.
    const themeObserver = new MutationObserver(() => {
      material.color.set(readKraftColor());
    });
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    let frameId: number;
    let stopped = false;

    function render() {
      if (stopped) return;
      if (!prefersReducedMotion) {
        points.rotation.y += 0.00025;
        points.rotation.x += 0.0001;
        renderer.render(scene, camera);
        frameId = requestAnimationFrame(render);
      } else {
        // Static scene for reduced-motion users: render the single frame
        // and stop, instead of re-rendering an unchanging scene on every
        // animation frame forever for no visible benefit.
        renderer.render(scene, camera);
      }
    }
    render();

    function handleResize() {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      if (prefersReducedMotion) renderer.render(scene, camera);
    }
    window.addEventListener("resize", handleResize);

    return () => {
      stopped = true;
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", handleResize);
      themeObserver.disconnect();
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 h-full w-full"
    />
  );
}
