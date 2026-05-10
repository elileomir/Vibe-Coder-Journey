"use client";

import { useRef, useState, useCallback, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Float, Html } from "@react-three/drei";
import * as THREE from "three";

/* ────────────────────────────────────────────
   Module difficulty → visual config
   ──────────────────────────────────────────── */
const DIFFICULTY_THEMES: Record<
  string,
  { color: string; emissive: string; accent: string; scale: number; height: number }
> = {
  zero:         { color: "#2a9d8f", emissive: "#2a9d8f", accent: "#00d4ff", scale: 1.0, height: 0.7 },
  beginner:     { color: "#3cb371", emissive: "#3cb371", accent: "#00bfa6", scale: 1.1, height: 0.9 },
  intermediate: { color: "#2196a8", emissive: "#3dabff", accent: "#0070cc", scale: 1.2, height: 1.1 },
  advanced:     { color: "#7c5cbf", emissive: "#8b5cf6", accent: "#8b5cf6", scale: 1.3, height: 1.3 },
  pro:          { color: "#d4a843", emissive: "#ffc857", accent: "#ffc857", scale: 1.4, height: 1.6 },
};

/* ────────────────────────────────────────────
   Seed-based pseudo-random (deterministic per index)
   ──────────────────────────────────────────── */
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/* ────────────────────────────────────────────
   Glowing ring indicator (progress)
   ──────────────────────────────────────────── */
function ProgressRing({
  progress,
  color,
  radius = 1.5,
}: {
  progress: number;
  color: string;
  radius?: number;
}) {
  const ref = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.rotation.z = clock.getElapsedTime() * 0.15;
    }
  });

  const thetaLength = Math.PI * 2 * Math.max(progress, 0.05);

  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
      <ringGeometry args={[radius - 0.08, radius, 64, 1, 0, thetaLength]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.8}
        transparent
        opacity={0.7}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

/* ────────────────────────────────────────────
   Organic Island Geometry Builder
   Creates a multi-layered island with:
   - Bottom rock base (dark, wider)
   - Sandy beach ring
   - Grassy top terrain with vertex noise
   - Central peak/spire (palm trunk analog)
   - Small vegetation bumps
   ──────────────────────────────────────────── */
function IslandMesh({
  meshRef,
  theme,
  isLocked,
  isActive,
  isCompleted,
  seed,
  onClick,
  onPointerEnter,
  onPointerLeave,
}: {
  meshRef: React.RefObject<THREE.Mesh | null>;
  theme: (typeof DIFFICULTY_THEMES)[string];
  isLocked: boolean;
  isActive: boolean;
  isCompleted: boolean;
  seed: number;
  onClick: () => void;
  onPointerEnter: () => void;
  onPointerLeave: () => void;
}) {
  const rng = useMemo(() => seededRandom(seed), [seed]);

  /* Rock base — wide, irregular, dark */
  const baseGeo = useMemo(() => {
    const r = rng;
    const geo = new THREE.CylinderGeometry(
      1.0 * theme.scale,
      1.6 * theme.scale,
      theme.height * 0.5,
      12,
      3
    );
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      const distort = y < 0 ? 0.2 : 0.1;
      pos.setX(i, pos.getX(i) + (r() - 0.5) * distort * theme.scale);
      pos.setZ(i, pos.getZ(i) + (r() - 0.5) * distort * theme.scale);
    }
    geo.computeVertexNormals();
    return geo;
  }, [theme.scale, theme.height, rng]);

  /* Green terrain top — flatter, wider, organic noise */
  const terrainGeo = useMemo(() => {
    const r = rng;
    const geo = new THREE.CylinderGeometry(
      1.3 * theme.scale,
      1.05 * theme.scale,
      theme.height * 0.35,
      12,
      2
    );
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      if (y > 0) {
        /* Create gentle hills on the top surface */
        const x = pos.getX(i);
        const z = pos.getZ(i);
        const hillNoise = Math.sin(x * 3 + seed) * Math.cos(z * 3 + seed) * 0.15;
        pos.setY(i, y + hillNoise);
        pos.setX(i, x + (r() - 0.5) * 0.12);
        pos.setZ(i, z + (r() - 0.5) * 0.12);
      }
    }
    geo.computeVertexNormals();
    return geo;
  }, [theme.scale, theme.height, rng, seed]);

  /* Sandy beach ring at waterline */
  const beachGeo = useMemo(() => {
    return new THREE.TorusGeometry(
      1.25 * theme.scale,
      0.12 * theme.scale,
      8,
      24
    );
  }, [theme.scale]);

  /* Central tree/spire for the highest point */
  const treeGeo = useMemo(() => {
    const geo = new THREE.ConeGeometry(
      0.18 * theme.scale,
      0.7 * theme.scale,
      5
    );
    return geo;
  }, [theme.scale]);

  const trunkGeo = useMemo(() => {
    return new THREE.CylinderGeometry(
      0.04 * theme.scale,
      0.06 * theme.scale,
      0.5 * theme.scale,
      4
    );
  }, [theme.scale]);

  /* Small vegetation clusters */
  const vegPositions = useMemo(() => {
    const r = rng;
    const positions: [number, number, number][] = [];
    const count = 3 + Math.floor(r() * 3);
    for (let i = 0; i < count; i++) {
      const angle = r() * Math.PI * 2;
      const radius = 0.3 + r() * 0.6;
      positions.push([
        Math.cos(angle) * radius * theme.scale,
        theme.height * 0.32,
        Math.sin(angle) * radius * theme.scale,
      ]);
    }
    return positions;
  }, [theme.scale, theme.height, rng]);

  const lockedOpacity = isLocked ? 0.35 : 1;
  const baseColor = isLocked ? "#1a2840" : "#3d2b1f"; /* dark rock */
  const terrainColor = isLocked ? "#1a2840" : theme.color;
  const beachColor = isLocked ? "#1a2840" : "#e8c170";  /* sandy gold */
  const treeColor = isLocked ? "#1a2840" : "#1b5e20";
  const trunkColor = isLocked ? "#1a2840" : "#5d4037";

  return (
    <group>
      {/* Rock base */}
      <mesh
        ref={meshRef}
        geometry={baseGeo}
        position={[0, -theme.height * 0.15, 0]}
        castShadow
        receiveShadow
        onClick={onClick}
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
      >
        <meshStandardMaterial
          color={baseColor}
          emissive={isLocked ? "#000000" : "#1a0e06"}
          emissiveIntensity={0.1}
          roughness={0.85}
          metalness={0.1}
          transparent={isLocked}
          opacity={lockedOpacity}
        />
      </mesh>

      {/* Terrain top */}
      <mesh
        geometry={terrainGeo}
        position={[0, theme.height * 0.18, 0]}
        castShadow
        receiveShadow
        onClick={onClick}
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
      >
        <meshStandardMaterial
          color={terrainColor}
          emissive={isLocked ? "#000000" : theme.emissive}
          emissiveIntensity={isActive ? 0.35 : isCompleted ? 0.5 : 0.08}
          roughness={0.7}
          metalness={0.15}
          transparent={isLocked}
          opacity={lockedOpacity}
        />
      </mesh>

      {/* Sandy beach ring */}
      <mesh
        geometry={beachGeo}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -theme.height * 0.08, 0]}
      >
        <meshStandardMaterial
          color={beachColor}
          emissive={isLocked ? "#000000" : "#c4a14a"}
          emissiveIntensity={0.05}
          roughness={0.9}
          transparent={isLocked}
          opacity={lockedOpacity * 0.9}
        />
      </mesh>

      {/* Central tree — trunk + canopy */}
      {!isLocked && (
        <group position={[0, theme.height * 0.35, 0]}>
          <mesh geometry={trunkGeo} position={[0, 0, 0]}>
            <meshStandardMaterial color={trunkColor} roughness={0.9} />
          </mesh>
          <mesh geometry={treeGeo} position={[0, 0.35 * theme.scale, 0]}>
            <meshStandardMaterial
              color={treeColor}
              emissive={treeColor}
              emissiveIntensity={0.1}
              roughness={0.8}
            />
          </mesh>
        </group>
      )}

      {/* Small vegetation clusters */}
      {!isLocked &&
        vegPositions.map((vp, i) => (
          <mesh key={`veg-${i}`} position={vp}>
            <sphereGeometry args={[0.08 * theme.scale, 6, 4]} />
            <meshStandardMaterial
              color="#2e7d32"
              emissive="#2e7d32"
              emissiveIntensity={0.08}
              roughness={0.9}
            />
          </mesh>
        ))}
    </group>
  );
}

/* ────────────────────────────────────────────
   Module Island Component
   ──────────────────────────────────────────── */
interface ModuleIslandProps {
  title: string;
  icon: string;
  difficulty: string;
  slug: string;
  totalLessons: number;
  completedLessons: number;
  isActive: boolean;
  isLocked: boolean;
  position: [number, number, number];
  onSelect: (slug: string) => void;
}

export default function ModuleIsland({
  title,
  icon,
  difficulty,
  slug,
  totalLessons,
  completedLessons,
  isActive,
  isLocked,
  position,
  onSelect,
}: ModuleIslandProps) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  const theme = DIFFICULTY_THEMES[difficulty] ?? DIFFICULTY_THEMES.beginner;
  const progress = totalLessons > 0 ? completedLessons / totalLessons : 0;
  /* ✅ FIX: Never show "completed" for locked islands */
  const isCompleted = !isLocked && progress >= 1;

  /* Deterministic seed from slug for consistent geometry */
  const seed = useMemo(() => {
    let h = 0;
    for (let i = 0; i < slug.length; i++) {
      h = ((h << 5) - h + slug.charCodeAt(i)) | 0;
    }
    return Math.abs(h);
  }, [slug]);

  /* Hover animation target */
  const targetY = useRef(position[1]);
  const currentY = useRef(position[1]);

  useFrame((_, delta) => {
    if (!groupRef.current || !meshRef.current) return;

    /* Smooth float on hover */
    targetY.current = hovered ? position[1] + 0.4 : position[1];
    currentY.current = THREE.MathUtils.lerp(
      currentY.current,
      targetY.current,
      delta * 5
    );
    groupRef.current.position.y = currentY.current;

    /* Gentle glow pulse on active island */
    if (isActive) {
      const mat = meshRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 0.3 + Math.sin(Date.now() * 0.003) * 0.15;
    }
  });

  const handleClick = useCallback(() => {
    if (!isLocked) onSelect(slug);
  }, [isLocked, onSelect, slug]);

  const handlePointerEnter = useCallback(() => {
    if (!isLocked) {
      setHovered(true);
      document.body.style.cursor = "pointer";
    }
  }, [isLocked]);

  const handlePointerLeave = useCallback(() => {
    setHovered(false);
    document.body.style.cursor = "auto";
  }, []);

  return (
    <group ref={groupRef} position={position}>
      <Float
        speed={1.2}
        rotationIntensity={0}
        floatIntensity={isLocked ? 0.2 : 0.6}
        floatingRange={[-0.15, 0.15]}
      >
        {/* Multi-layered island body */}
        <IslandMesh
          meshRef={meshRef}
          theme={theme}
          isLocked={isLocked}
          isActive={isActive}
          isCompleted={isCompleted}
          seed={seed}
          onClick={handleClick}
          onPointerEnter={handlePointerEnter}
          onPointerLeave={handlePointerLeave}
        />

        {/* Progress ring */}
        {!isLocked && (
          <ProgressRing
            progress={progress}
            color={isCompleted ? "#00bfa6" : theme.accent}
            radius={1.6 * theme.scale}
          />
        )}

        {/* Emoji + Title via Html overlay — no font dependency */}
        <Html
          position={[0, theme.height * 0.5 + 1.0, 0]}
          center
          style={{ pointerEvents: "none", userSelect: "none" }}
        >
          <div className="island-label">
            <span className="island-icon">{isLocked ? "🔒" : icon}</span>
            <span className="island-title">{title}</span>
          </div>
        </Html>

        {/* Completion badge — ONLY shown when actually completed (not locked) */}
        {isCompleted && (
          <Html
            position={[0, theme.height * 0.5 + 2.0, 0]}
            center
            style={{ pointerEvents: "none" }}
          >
            <span style={{ fontSize: "1.4rem" }}>✅</span>
          </Html>
        )}

        {/* Hover tooltip */}
        {hovered && !isLocked && (
          <Html
            position={[0, theme.height * 0.5 + 2.7, 0]}
            center
            style={{ pointerEvents: "none" }}
          >
            <div className="island-tooltip">
              <strong>{title}</strong>
              <span className={`difficulty-badge difficulty-${difficulty}`}>
                {difficulty}
              </span>
              <div className="island-tooltip-progress">
                <div
                  className="island-tooltip-bar"
                  style={{ width: `${progress * 100}%` }}
                />
              </div>
              <span className="island-tooltip-count">
                {completedLessons}/{totalLessons} lessons
              </span>
            </div>
          </Html>
        )}

        {/* Active island beacon light */}
        {isActive && (
          <pointLight
            position={[0, theme.height + 1.5, 0]}
            intensity={0.6}
            color={theme.accent}
            distance={6}
            decay={2}
          />
        )}
      </Float>
    </group>
  );
}
