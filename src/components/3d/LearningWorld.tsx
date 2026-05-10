"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Line } from "@react-three/drei";
import * as THREE from "three";
import OceanEnvironment from "./OceanEnvironment";
import ModuleIsland from "./ModuleIsland";
import type { VibeModule, UserProgress } from "@/lib/supabase";

/* ────────────────────────────────────────────
   Layout — arrange islands in an archipelago arc
   ──────────────────────────────────────────── */

function getIslandPosition(index: number, total: number): [number, number, number] {
  const arcAngle = Math.PI * 0.75; /* sweep range */
  const startAngle = Math.PI * 0.6;
  const radius = 8 + index * 0.5;
  const angle = startAngle - (index / Math.max(total - 1, 1)) * arcAngle;

  return [
    Math.cos(angle) * radius,
    -0.3 + Math.sin(index * 0.7) * 0.3, /* subtle Y variance */
    Math.sin(angle) * radius,
  ];
}

/* ────────────────────────────────────────────
   Camera fly-to animation controller
   ──────────────────────────────────────────── */
function CameraController({
  target,
  isFlying,
  onArrived,
}: {
  target: THREE.Vector3 | null;
  isFlying: boolean;
  onArrived: () => void;
}) {
  const { camera } = useThree();
  const progress = useRef(0);
  const startPos = useRef(new THREE.Vector3());
  const started = useRef(false);

  useFrame((_, delta) => {
    if (!isFlying || !target) return;

    if (!started.current) {
      startPos.current.copy(camera.position);
      progress.current = 0;
      started.current = true;
    }

    progress.current = Math.min(progress.current + delta * 1.2, 1);
    const eased = 1 - Math.pow(1 - progress.current, 3); /* ease-out cubic */

    const dest = new THREE.Vector3(
      target.x + 2,
      target.y + 4,
      target.z + 5
    );

    camera.position.lerpVectors(startPos.current, dest, eased);
    camera.lookAt(target);

    if (progress.current >= 1) {
      started.current = false;
      onArrived();
    }
  });

  return null;
}

/* ────────────────────────────────────────────
   Connector beams between islands (drei Line)
   ──────────────────────────────────────────── */
function IslandConnector({
  from,
  to,
  completed,
}: {
  from: [number, number, number];
  to: [number, number, number];
  completed: boolean;
}) {
  const points = useMemo(() => {
    const start = new THREE.Vector3(...from);
    const end = new THREE.Vector3(...to);
    const mid = new THREE.Vector3().lerpVectors(start, end, 0.5);
    mid.y += 1.5; /* arc upward */

    const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
    return curve.getPoints(32);
  }, [from, to]);

  return (
    <Line
      points={points}
      color={completed ? "#00bfa6" : "#1a2840"}
      lineWidth={completed ? 2 : 1}
      transparent
      opacity={completed ? 0.7 : 0.25}
    />
  );
}

/* ────────────────────────────────────────────
   Main Learning World
   ──────────────────────────────────────────── */
interface LearningWorldProps {
  modules: VibeModule[];
  progress: UserProgress[];
  currentModule: number;
  onModuleSelect: (slug: string) => void;
}

export default function LearningWorld({
  modules,
  progress,
  currentModule,
  onModuleSelect,
}: LearningWorldProps) {
  const [flyTarget, setFlyTarget] = useState<THREE.Vector3 | null>(null);
  const [isFlying, setIsFlying] = useState(false);

  /* Calculate completion per module using currentModule index as truth.
     UserProgress lacks module_id, so we derive status from position:
     - Before currentModule: fully completed
     - At currentModule: partially complete (estimated from overall progress)
     - After currentModule: locked, 0 progress */
  const moduleProgress = useMemo(() => {
    const map: Record<number, { completed: number; total: number }> = {};
    const totalCompleted = progress.filter((p) => p.status === "completed").length;

    /* Track running lesson count to estimate active module progress */
    let cumulativeLessons = 0;

    for (let i = 0; i < modules.length; i++) {
      const mod = modules[i];
      const moduleIdx = i + 1; /* 1-based to match currentModule */

      if (moduleIdx < currentModule) {
        /* Completed module — full progress */
        map[mod.id] = { completed: mod.total_lessons, total: mod.total_lessons };
      } else if (moduleIdx === currentModule) {
        /* Active module — estimate from remaining completed lessons */
        const lessonsBeforeThis = cumulativeLessons;
        const activeCompleted = Math.max(0, totalCompleted - lessonsBeforeThis);
        map[mod.id] = {
          completed: Math.min(activeCompleted, mod.total_lessons),
          total: mod.total_lessons,
        };
      } else {
        /* Locked module — no progress */
        map[mod.id] = { completed: 0, total: mod.total_lessons };
      }

      cumulativeLessons += mod.total_lessons;
    }
    return map;
  }, [modules, progress, currentModule]);

  const positions = useMemo(
    () => modules.map((_, i) => getIslandPosition(i, modules.length)),
    [modules]
  );

  const handleIslandSelect = useCallback(
    (slug: string) => {
      const idx = modules.findIndex((m) => m.slug === slug);
      if (idx >= 0) {
        const pos = positions[idx];
        setFlyTarget(new THREE.Vector3(...pos));
        setIsFlying(true);
      }
      setTimeout(() => onModuleSelect(slug), 800);
    },
    [modules, positions, onModuleSelect]
  );

  const handleArrived = useCallback(() => {
    setIsFlying(false);
  }, []);

  return (
    <group>
      <OceanEnvironment />

      <CameraController
        target={flyTarget}
        isFlying={isFlying}
        onArrived={handleArrived}
      />

      <OrbitControls
        enablePan={false}
        enableZoom
        minDistance={6}
        maxDistance={25}
        maxPolarAngle={Math.PI / 2.2}
        minPolarAngle={Math.PI / 6}
        autoRotate
        autoRotateSpeed={0.3}
        dampingFactor={0.08}
        enableDamping
      />

      {/* Island connectors */}
      {positions.slice(0, -1).map((pos, i) => (
        <IslandConnector
          key={`conn-${i}`}
          from={pos}
          to={positions[i + 1]}
          completed={i < currentModule - 1}
        />
      ))}

      {/* Module Islands */}
      {modules.map((mod, i) => {
        const mp = moduleProgress[mod.id] ?? { completed: 0, total: mod.total_lessons };
        return (
          <ModuleIsland
            key={mod.id}
            title={mod.title}
            icon={mod.icon}
            difficulty={mod.difficulty}
            slug={mod.slug}
            totalLessons={mp.total}
            completedLessons={mp.completed}
            isActive={i === currentModule - 1}
            isLocked={i > currentModule - 1}
            position={positions[i]}
            onSelect={handleIslandSelect}
          />
        );
      })}
    </group>
  );
}
