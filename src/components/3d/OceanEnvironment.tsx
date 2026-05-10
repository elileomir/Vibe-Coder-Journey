"use client";

import { useRef, useMemo, useEffect, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Float, Stars } from "@react-three/drei";
import * as THREE from "three";

/* ────────────────────────────────────────────
   Animated ocean surface
   Vertex shader displaces Y with sine waves,
   fragment shader blends Ocean Blue gradients.
   ──────────────────────────────────────────── */

const OCEAN_VERTEX = /* glsl */ `
  uniform float uTime;
  varying vec2 vUv;
  varying float vWave;

  void main() {
    vUv = uv;
    vec3 pos = position;

    /* Two overlapping sine waves for organic feel */
    float wave1 = sin(pos.x * 0.4 + uTime * 0.6) * 0.35;
    float wave2 = sin(pos.z * 0.3 + uTime * 0.45 + 1.5) * 0.25;
    float wave3 = sin((pos.x + pos.z) * 0.2 + uTime * 0.3) * 0.15;
    pos.y += wave1 + wave2 + wave3;

    vWave = (wave1 + wave2 + wave3) * 0.5 + 0.5;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const OCEAN_FRAGMENT = /* glsl */ `
  uniform float uTime;
  varying vec2 vUv;
  varying float vWave;

  void main() {
    /* Deep sea → surface gradient matching Ocean Blue palette */
    vec3 deep   = vec3(0.008, 0.043, 0.094);  /* --bg-primary #020b18 */
    vec3 mid    = vec3(0.024, 0.078, 0.157);   /* --bg-secondary #061428 */
    vec3 bright = vec3(0.0, 0.44, 0.8);        /* --ocean-500 #0070cc */
    vec3 foam   = vec3(0.0, 0.83, 1.0);        /* --accent-cyan #00d4ff */

    float depth = smoothstep(0.0, 1.0, vUv.y);
    vec3 col = mix(deep, mid, depth);

    /* Wave peaks get brighter */
    col = mix(col, bright, vWave * 0.4);

    /* Subtle caustic shimmer */
    float caustic = sin(vUv.x * 30.0 + uTime * 1.2) *
                    sin(vUv.y * 30.0 + uTime * 0.8) * 0.5 + 0.5;
    col += foam * caustic * 0.06 * vWave;

    gl_FragColor = vec4(col, 0.85);
  }
`;

function OceanSurface() {
  const meshRef = useRef<THREE.Mesh>(null);
  /* Plain mutable object — NOT a React ref, so ESLint refs rule doesn't apply.
     Three.js reads `.value` each frame; React never needs to track it. */
  const [timeUniform] = useState(() => ({ value: 0 }));
  const uniforms = useMemo(() => ({ uTime: timeUniform }), [timeUniform]);

  useFrame(({ clock }) => {
    // eslint-disable-next-line react-hooks/immutability -- Three.js shader uniform requires direct mutation each frame
    timeUniform.value = clock.getElapsedTime();
  });

  return (
    <mesh
      ref={meshRef}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -1.5, 0]}
      receiveShadow
    >
      <planeGeometry args={[80, 80, 128, 128]} />
      <shaderMaterial
        vertexShader={OCEAN_VERTEX}
        fragmentShader={OCEAN_FRAGMENT}
        uniforms={uniforms}
        transparent
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

/* ────────────────────────────────────────────
   Ambient particles — imperative buffer setup
   ──────────────────────────────────────────── */

function OceanParticles({ count = 200 }: { count?: number }) {
  const ref = useRef<THREE.Points>(null);
  const geoRef = useRef<THREE.BufferGeometry>(null);

  const { positions, speeds } = useMemo(() => {
    /* Seeded PRNG to avoid impure Math.random in render */
    let seed = count * 7919;
    function srand() {
      seed = (seed * 1664525 + 1013904223) & 0xffffffff;
      return (seed >>> 0) / 0xffffffff;
    }
    const pos = new Float32Array(count * 3);
    const spd = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (srand() - 0.5) * 50;
      pos[i * 3 + 1] = srand() * 12 - 2;
      pos[i * 3 + 2] = (srand() - 0.5) * 50;
      spd[i] = 0.02 + srand() * 0.04;
    }
    return { positions: pos, speeds: spd };
  }, [count]);

  /* Imperatively set the attribute to avoid R3F v9 reconciler issues */
  useEffect(() => {
    if (geoRef.current) {
      geoRef.current.setAttribute(
        "position",
        new THREE.BufferAttribute(positions, 3)
      );
    }
  }, [positions]);

  useFrame(() => {
    if (!geoRef.current) return;
    const posAttr = geoRef.current.attributes
      .position as THREE.BufferAttribute;
    if (!posAttr) return;
    const arr = posAttr.array as Float32Array;

    for (let i = 0; i < count; i++) {
      arr[i * 3 + 1] += speeds[i];
      /* Reset when they float above the scene */
      if (arr[i * 3 + 1] > 12) {
        arr[i * 3 + 1] = -2;
        arr[i * 3] = (Math.random() - 0.5) * 50;
        arr[i * 3 + 2] = (Math.random() - 0.5) * 50;
      }
    }
    posAttr.needsUpdate = true;
  });

  return (
    <points ref={ref}>
      <bufferGeometry ref={geoRef} />
      <pointsMaterial
        size={0.06}
        color="#00d4ff"
        transparent
        opacity={0.5}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}

/* ────────────────────────────────────────────
   Complete Ocean Environment
   ──────────────────────────────────────────── */
export default function OceanEnvironment() {
  return (
    <group>
      <OceanSurface />
      <OceanParticles count={250} />
      <Stars
        radius={50}
        depth={40}
        count={1500}
        factor={3}
        saturation={0.2}
        fade
        speed={0.5}
      />

      {/* Subtle floating light orbs for depth */}
      {[...Array(5)].map((_, i) => (
        <Float
          key={i}
          speed={0.6 + i * 0.15}
          rotationIntensity={0}
          floatIntensity={1.5}
          floatingRange={[-0.5, 0.5]}
        >
          <pointLight
            position={[
              Math.sin(i * 1.3) * 12,
              2 + i * 0.8,
              Math.cos(i * 1.3) * 12,
            ]}
            intensity={0.15}
            color={i % 2 === 0 ? "#00d4ff" : "#00bfa6"}
            distance={10}
            decay={2}
          />
        </Float>
      ))}
    </group>
  );
}
