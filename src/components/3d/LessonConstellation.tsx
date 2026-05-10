"use client";

import { useRef, useState, useMemo, useCallback, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { Float, Html, Line, OrbitControls } from "@react-three/drei";
import * as THREE from "three";

/* ────────────────────────────────────────────
   Types
   ──────────────────────────────────────────── */

interface LessonNode {
  id: number;
  slug: string;
  title: string;
  xpReward: number;
  estimatedMinutes: number;
  status: "completed" | "in_progress" | "not_started";
  index: number;
}

interface LessonConstellationProps {
  lessons: LessonNode[];
  moduleTitle: string;
  moduleIcon: string;
  moduleSlug: string;
  difficulty: string;
  onLessonSelect: (slug: string) => void;
}

/* ────────────────────────────────────────────
   Visual constants
   ──────────────────────────────────────────── */

const STATUS_CONFIG: Record<
  string,
  { color: string; emissive: number; glowOpacity: number; nodeScale: number }
> = {
  completed: {
    color: "#00bfa6",
    emissive: 0.6,
    glowOpacity: 0.35,
    nodeScale: 1.0,
  },
  in_progress: {
    color: "#00d4ff",
    emissive: 0.8,
    glowOpacity: 0.5,
    nodeScale: 1.15,
  },
  not_started: {
    color: "#2a3f5f",
    emissive: 0.08,
    glowOpacity: 0.05,
    nodeScale: 0.8,
  },
};

const DIFFICULTY_ACCENT: Record<string, string> = {
  zero: "#00d4ff",
  beginner: "#00bfa6",
  intermediate: "#3dabff",
  advanced: "#8b5cf6",
  pro: "#ffc857",
};

/* ────────────────────────────────────────────
   Spiral layout — lessons placed in a helix
   ──────────────────────────────────────────── */

function getSpiralPosition(
  index: number,
  total: number
): [number, number, number] {
  const radius = 3.5;
  const angleStep = (Math.PI * 2) / Math.max(total, 6);
  const angle = index * angleStep - Math.PI / 2;
  const y = index * 0.8 - ((total - 1) * 0.8) / 2;
  const x = Math.cos(angle) * radius;
  const z = Math.sin(angle) * radius;
  return [x, y, z];
}

/* ────────────────────────────────────────────
   Orbiting Ring around active/completed nodes
   ──────────────────────────────────────────── */

function OrbitRing({
  color,
  radius,
  speed,
  tilt,
}: {
  color: string;
  radius: number;
  speed: number;
  tilt: number;
}) {
  const ref = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.rotation.z = clock.getElapsedTime() * speed;
    }
  });

  return (
    <mesh ref={ref} rotation={[tilt, 0, 0]}>
      <torusGeometry args={[radius, 0.015, 8, 48]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.6}
        transparent
        opacity={0.5}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

/* ────────────────────────────────────────────
   Completion Checkmark (sprite-style via Html)
   ──────────────────────────────────────────── */

function CompletionBadge() {
  return (
    <Html
      center
      distanceFactor={12}
      position={[0, 0.55, 0]}
      style={{ pointerEvents: "none" }}
    >
      <div
        style={{
          width: 18,
          height: 18,
          borderRadius: "50%",
          background: "#00bfa6",
          display: "grid",
          placeItems: "center",
          fontSize: "0.6rem",
          fontWeight: 700,
          color: "#020b18",
          boxShadow: "0 0 8px rgba(0,191,166,0.6)",
        }}
      >
        ✓
      </div>
    </Html>
  );
}

/* ────────────────────────────────────────────
   Single Lesson Node — premium star-like orb
   ──────────────────────────────────────────── */

function LessonNodeMesh({
  lesson,
  position,
  accentColor,
  onSelect,
}: {
  lesson: LessonNode;
  position: [number, number, number];
  accentColor: string;
  onSelect: () => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  const config = STATUS_CONFIG[lesson.status];
  const isInteractive = lesson.status !== "not_started" || lesson.index === 0;

  useFrame(({ clock }) => {
    if (!meshRef.current || !groupRef.current) return;
    const t = clock.getElapsedTime();

    /* Gentle floating */
    groupRef.current.position.y =
      position[1] + Math.sin(t * 0.8 + lesson.index * 0.5) * 0.08;

    /* Hover scale */
    const targetScale = hovered ? 1.35 : 1;
    meshRef.current.scale.lerp(
      new THREE.Vector3(targetScale, targetScale, targetScale),
      0.1
    );

    /* Slow rotation for visual interest */
    meshRef.current.rotation.y = t * 0.2 + lesson.index;

    /* Glow pulse */
    if (glowRef.current) {
      const pulse =
        lesson.status === "in_progress"
          ? 0.5 + Math.sin(t * 2) * 0.25
          : lesson.status === "completed"
          ? 0.35
          : 0.05;
      (glowRef.current.material as THREE.MeshBasicMaterial).opacity = pulse;
      glowRef.current.scale.setScalar(1.8 + Math.sin(t * 1.5) * 0.15);
    }
  });

  const handlePointerOver = useCallback(() => {
    if (isInteractive) {
      setHovered(true);
      document.body.style.cursor = "pointer";
    }
  }, [isInteractive]);

  const handlePointerOut = useCallback(() => {
    setHovered(false);
    document.body.style.cursor = "auto";
  }, []);

  const handleClick = useCallback(() => {
    if (isInteractive) onSelect();
  }, [isInteractive, onSelect]);

  /* Node geometry — varies by status for visual distinction */
  const nodeGeo = useMemo(() => {
    if (lesson.status === "completed") {
      /* Completed: polished dodecahedron (gem-like) */
      return new THREE.DodecahedronGeometry(0.3, 0);
    } else if (lesson.status === "in_progress") {
      /* Active: icosahedron (rounded, energized) */
      return new THREE.IcosahedronGeometry(0.34, 1);
    } else {
      /* Not started: simple sphere (dormant) */
      return new THREE.SphereGeometry(0.22, 16, 16);
    }
  }, [lesson.status]);

  return (
    <group ref={groupRef} position={position}>
      {/* Outer glow sphere */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[0.5, 16, 16]} />
        <meshBasicMaterial
          color={config.color}
          transparent
          opacity={config.glowOpacity}
          depthWrite={false}
        />
      </mesh>

      {/* Orbiting rings for completed and active nodes */}
      {lesson.status === "completed" && (
        <OrbitRing
          color="#00bfa6"
          radius={0.48}
          speed={0.4}
          tilt={Math.PI / 3}
        />
      )}
      {lesson.status === "in_progress" && (
        <>
          <OrbitRing
            color={accentColor}
            radius={0.52}
            speed={0.6}
            tilt={Math.PI / 4}
          />
          <OrbitRing
            color="#00d4ff"
            radius={0.46}
            speed={-0.35}
            tilt={Math.PI / 2.5}
          />
        </>
      )}

      {/* Main node mesh */}
      <Float
        speed={1.2}
        rotationIntensity={0.15}
        floatIntensity={0.1}
        enabled={lesson.status === "in_progress"}
      >
        <mesh
          ref={meshRef}
          geometry={nodeGeo}
          onPointerOver={handlePointerOver}
          onPointerOut={handlePointerOut}
          onClick={handleClick}
          scale={config.nodeScale}
        >
          <meshStandardMaterial
            color={config.color}
            emissive={config.color}
            emissiveIntensity={config.emissive}
            roughness={0.25}
            metalness={0.5}
            transparent={lesson.status === "not_started"}
            opacity={lesson.status === "not_started" ? 0.35 : 1}
          />
        </mesh>
      </Float>

      {/* Completion checkmark badge */}
      {lesson.status === "completed" && <CompletionBadge />}

      {/* Point light for active nodes */}
      {lesson.status !== "not_started" && (
        <pointLight
          color={config.color}
          intensity={lesson.status === "in_progress" ? 1.8 : 0.6}
          distance={3.5}
          decay={2}
        />
      )}

      {/* Hover tooltip */}
      {hovered && (
        <Html center distanceFactor={10} style={{ pointerEvents: "none" }}>
          <div className="lesson-node-tooltip">
            <div className="lesson-node-number">
              {lesson.status === "completed" ? "✓" : lesson.index + 1}
            </div>
            <div className="lesson-node-info">
              <div className="lesson-node-title">{lesson.title}</div>
              <div className="lesson-node-meta">
                <span>+{lesson.xpReward} XP</span>
                <span>⏱ {lesson.estimatedMinutes}m</span>
              </div>
            </div>
            <div
              className="lesson-node-status-dot"
              style={{ background: config.color }}
            />
          </div>
        </Html>
      )}

      {/* Always-visible lesson number label */}
      <Html center distanceFactor={12} style={{ pointerEvents: "none" }}>
        <div
          className="lesson-node-label"
          style={{
            color:
              lesson.status === "not_started"
                ? "rgba(255,255,255,0.2)"
                : config.color,
            fontWeight: lesson.status === "in_progress" ? 700 : 500,
            textShadow:
              lesson.status !== "not_started"
                ? `0 0 8px ${config.color}40`
                : "none",
          }}
        >
          {lesson.status === "completed" ? "✓" : lesson.index + 1}
        </div>
      </Html>
    </group>
  );
}

/* ────────────────────────────────────────────
   Energy beam connectors between nodes
   ──────────────────────────────────────────── */

function EnergyBeam({
  from,
  to,
  status,
}: {
  from: [number, number, number];
  to: [number, number, number];
  status: "completed" | "in_progress" | "not_started";
}) {
  const color =
    status === "completed"
      ? "#00bfa6"
      : status === "in_progress"
      ? "#00d4ff"
      : "#1a2a40";

  const opacity = status === "not_started" ? 0.12 : 0.65;

  const curve = useMemo(() => {
    const mx =
      (from[0] + to[0]) / 2 +
      (((from[0] * 7 + to[0] * 13) % 1) - 0.5) * 0.5;
    const my = (from[1] + to[1]) / 2;
    const mz =
      (from[2] + to[2]) / 2 +
      (((from[2] * 11 + to[2] * 3) % 1) - 0.5) * 0.5;

    return new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(...from),
      new THREE.Vector3(mx, my, mz),
      new THREE.Vector3(...to)
    );
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [from[0], from[1], from[2], to[0], to[1], to[2]]);

  const points = useMemo(() => curve.getPoints(24), [curve]);

  return (
    <Line
      points={points}
      color={color}
      lineWidth={status === "completed" ? 2.5 : status === "in_progress" ? 1.8 : 1}
      transparent
      opacity={opacity}
    />
  );
}

/* ────────────────────────────────────────────
   Ambient particles for the constellation
   ──────────────────────────────────────────── */

function ConstellationParticles({ count = 100 }: { count?: number }) {
  const ref = useRef<THREE.Points>(null);
  const geoRef = useRef<THREE.BufferGeometry>(null);

  const positions = useMemo(() => {
    /* Seeded PRNG to avoid impure Math.random during render */
    let seed = count * 3571;
    function srand() {
      seed = (seed * 1664525 + 1013904223) & 0xffffffff;
      return (seed >>> 0) / 0xffffffff;
    }
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (srand() - 0.5) * 16;
      pos[i * 3 + 1] = (srand() - 0.5) * 14;
      pos[i * 3 + 2] = (srand() - 0.5) * 16;
    }
    return pos;
  }, [count]);

  /* Imperative buffer setup — avoids R3F v9 reconciliation issues */
  useEffect(() => {
    if (!geoRef.current) return;
    geoRef.current.setAttribute(
      "position",
      new THREE.BufferAttribute(positions, 3)
    );
  }, [positions]);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.rotation.y = clock.getElapsedTime() * 0.008;
  });

  return (
    <points ref={ref}>
      <bufferGeometry ref={geoRef} />
      <pointsMaterial
        size={0.04}
        color="#4a7a9b"
        transparent
        opacity={0.35}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}

/* ────────────────────────────────────────────
   Main Constellation Scene
   ──────────────────────────────────────────── */

export default function LessonConstellation({
  lessons,
  moduleSlug,
  difficulty,
  onLessonSelect,
}: LessonConstellationProps) {
  const accent = DIFFICULTY_ACCENT[difficulty] ?? "#00d4ff";

  /* Compute positions for all nodes */
  const nodePositions = useMemo(
    () =>
      lessons.map((_, i) => getSpiralPosition(i, lessons.length)),
    [lessons]
  );

  /* Determine beam status between consecutive nodes */
  const getBeamStatus = useCallback(
    (fromIdx: number): "completed" | "in_progress" | "not_started" => {
      const a = lessons[fromIdx];
      const b = lessons[fromIdx + 1];
      if (a.status === "completed" && b.status === "completed")
        return "completed";
      if (a.status === "completed" && b.status !== "not_started")
        return "in_progress";
      return "not_started";
    },
    [lessons]
  );

  return (
    <>
      {/* Camera controls */}
      <OrbitControls
        enablePan={false}
        enableZoom
        minDistance={5}
        maxDistance={16}
        autoRotate
        autoRotateSpeed={0.3}
        maxPolarAngle={Math.PI * 0.75}
        minPolarAngle={Math.PI * 0.25}
        dampingFactor={0.08}
        enableDamping
      />

      {/* Ambient light — subtle fill so dormant nodes are still visible */}
      <ambientLight intensity={0.08} color="#4a7a9b" />

      {/* Ambient particles */}
      <ConstellationParticles />

      {/* Energy beams */}
      {lessons.slice(0, -1).map((_, i) => (
        <EnergyBeam
          key={`beam-${i}`}
          from={nodePositions[i]}
          to={nodePositions[i + 1]}
          status={getBeamStatus(i)}
        />
      ))}

      {/* Lesson nodes */}
      {lessons.map((lesson, i) => (
        <LessonNodeMesh
          key={lesson.id}
          lesson={lesson}
          position={nodePositions[i]}
          accentColor={accent}
          onSelect={() =>
            onLessonSelect(`/learn/${moduleSlug}/${lesson.slug}`)
          }
        />
      ))}

      {/* Central accent light — matching module difficulty color */}
      <pointLight
        position={[0, 0, 0]}
        color={accent}
        intensity={0.4}
        distance={14}
      />
    </>
  );
}
