"use client";

import { Suspense, useEffect, useState, type ReactNode } from "react";
import { Canvas } from "@react-three/fiber";
import { Preload } from "@react-three/drei";

/* ────────────────────────────────────────────
   Performance detection — skip WebGL on weak GPUs
   ──────────────────────────────────────────── */
function useCanRender3D() {
  const [ok, setOk] = useState<boolean | null>(null);

  useEffect(() => {
    try {
      const cvs = document.createElement("canvas");
      const gl =
        cvs.getContext("webgl2") || cvs.getContext("webgl");
      if (!gl) {
        requestAnimationFrame(() => setOk(false));
        return;
      }
      const dbg = (gl as WebGL2RenderingContext).getExtension(
        "WEBGL_debug_renderer_info"
      );
      if (dbg) {
        const renderer = (gl as WebGL2RenderingContext).getParameter(
          dbg.UNMASKED_RENDERER_WEBGL
        );
        /* SwiftShader = software renderer → bail */
        if (/swiftshader|llvmpipe/i.test(renderer)) {
          requestAnimationFrame(() => setOk(false));
          return;
        }
      }
      requestAnimationFrame(() => setOk(true));
    } catch {
      requestAnimationFrame(() => setOk(false));
    }
  }, []);

  return ok;
}

/* ────────────────────────────────────────────
   Loading Fallback
   ──────────────────────────────────────────── */
function SceneLoader() {
  return (
    <div className="scene-loader">
      <div className="scene-loader-ring" />
      <p>Entering the ocean…</p>
    </div>
  );
}

/* ────────────────────────────────────────────
   2D Fallback for low-end / no-WebGL
   ──────────────────────────────────────────── */
function Fallback2D({ children }: { children?: ReactNode }) {
  return (
    <div className="scene-fallback">
      {children ?? (
        <p style={{ color: "var(--text-muted)" }}>
          3D view unavailable on this device.
        </p>
      )}
    </div>
  );
}

/* ────────────────────────────────────────────
   Main Scene wrapper
   ──────────────────────────────────────────── */
interface SceneProps {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
  /** Flat React content shown while 3D loads or as fallback */
  fallback?: ReactNode;
  /** Camera field-of-view in degrees */
  fov?: number;
  /** Camera initial position [x, y, z] */
  cameraPosition?: [number, number, number];
}

export default function Scene({
  children,
  className = "",
  style,
  fallback,
  fov = 55,
  cameraPosition = [0, 5, 14],
}: SceneProps) {
  const canRender = useCanRender3D();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    requestAnimationFrame(check);
  }, []);

  /* Still detecting */
  if (canRender === null) return <SceneLoader />;
  /* No WebGL */
  if (!canRender) return <Fallback2D>{fallback}</Fallback2D>;

  return (
    <div
      className={`scene-container ${className}`}
      style={style}
    >
      <Suspense fallback={<SceneLoader />}>
        <Canvas
          camera={{ position: cameraPosition, fov, near: 0.1, far: 200 }}
          dpr={isMobile ? [1, 1] : [1, 1.5]}
          gl={{
            antialias: !isMobile,
            alpha: true,
            powerPreference: "high-performance",
            stencil: false,
            depth: true,
          }}
          style={{ background: "transparent" }}
          performance={{ min: 0.5 }}
        >
          {/* Global lighting */}
          <ambientLight intensity={0.35} color="#7ec8ff" />
          <directionalLight
            position={[8, 12, 5]}
            intensity={1}
            color="#ffffff"
            castShadow={!isMobile}
            shadow-mapSize={isMobile ? [512, 512] : [1024, 1024]}
          />
          <pointLight
            position={[-6, 4, -8]}
            intensity={0.4}
            color="#00d4ff"
          />
          <hemisphereLight
            args={["#0070cc", "#020b18", 0.3]}
          />

          {/* Fog matching the ocean depth */}
          <fog attach="fog" args={["#020b18", 15, 60]} />

          {children}
          <Preload all />
        </Canvas>
      </Suspense>
    </div>
  );
}

