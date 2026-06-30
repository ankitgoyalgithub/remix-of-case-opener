/**
 * HeroScene — the WebGL centerpiece of the Insure Auto landing page.
 *
 * An abstract "verification core": a faceted, glowing glass icosahedron shield
 * (the trusted decision) wrapped in orbiting rings of nodes (documents & checks)
 * connected back to the core by light spokes, suspended in a soft field of
 * particles. Everything is driven by the page's design tokens via useThemeColors,
 * so the single trust-blue accent stays on-brand.
 *
 * Performance / a11y notes:
 *   - Rendered ONLY through <CanvasLazy> (mounts in-view, pauses off-screen, and
 *     is replaced by a static fallback under prefers-reduced-motion) — see HeroSection.
 *   - No OrbitControls; gentle autonomous motion + a subtle pointer parallax.
 *   - Fake "bloom" via emissive + additive blending (no postprocessing dependency).
 *   - Bounded geometry/counts; dpr is capped by CanvasLazy ([1, 2]).
 */
import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import {
  Float,
  Icosahedron,
  MeshDistortMaterial,
  PointMaterial,
  Points,
  Sparkles,
} from "@react-three/drei";
import { AdditiveBlending, CanvasTexture, Color } from "three";
import type { Group, Points as ThreePoints } from "three";
import { useThemeColors } from "./useThemeColors";

/* ───────────────────────────────────────────────────────────────────────────
   ParallaxGroup — eases the whole scene toward the pointer.
   Listens at the window level (the canvas itself is pointer-events:none so it
   never blocks the hero CTAs), and lerps frame-rate-independently.
   ─────────────────────────────────────────────────────────────────────────── */
function ParallaxGroup({ children }: { children: ReactNode }) {
  const ref = useRef<Group>(null);
  const target = useRef({ x: 0, y: 0 });
  const cur = useRef({ x: 0, y: 0 });
  const intro = useRef(0); // 0 → 1 smooth "assemble-in" on mount

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      target.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      target.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  useFrame((_, delta) => {
    const g = ref.current;
    if (!g) return;
    const d = Math.min(delta, 0.05); // clamp to avoid jumps after a tab stall

    // Refined assemble-in: ease scale 0.86 → 1 over ~1.3s (easeOutCubic).
    intro.current = Math.min(1, intro.current + d / 1.3);
    const e = 1 - Math.pow(1 - intro.current, 3);
    g.scale.setScalar(0.86 + e * 0.14);

    // Gentle, frame-rate-independent pointer parallax (smaller throw + heavier
    // damping than before, so it glides instead of swinging).
    const k = 1 - Math.pow(0.0009, d);
    cur.current.x += (target.current.x * 0.24 - cur.current.x) * k;
    cur.current.y += (target.current.y * 0.14 - cur.current.y) * k;
    g.rotation.y = cur.current.x;
    g.rotation.x = cur.current.y;
  });

  return (
    <group ref={ref} scale={0.86}>
      {children}
    </group>
  );
}

/* ───────────────────────────────────────────────────────────────────────────
   GlowSprite — a soft additive halo behind the core (cheap faux-bloom).
   Kept OUTSIDE the parallax group so it always faces the camera.
   ─────────────────────────────────────────────────────────────────────────── */
function GlowSprite({ color }: { color: Color }) {
  const texture = useMemo(() => {
    const size = 256;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      const rgb = color.getStyle().slice(4, -1); // "r, g, b"
      const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
      g.addColorStop(0, `rgba(${rgb}, 0.5)`);
      g.addColorStop(0.32, `rgba(${rgb}, 0.22)`);
      g.addColorStop(0.7, `rgba(${rgb}, 0.05)`);
      g.addColorStop(1, `rgba(${rgb}, 0)`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, size, size);
    }
    return new CanvasTexture(canvas);
  }, [color]);

  return (
    <mesh position={[0, 0, -1.2]} renderOrder={-1}>
      <planeGeometry args={[7.5, 7.5]} />
      <meshBasicMaterial
        map={texture}
        transparent
        depthWrite={false}
        blending={AdditiveBlending}
        opacity={0.95}
        toneMapped={false}
      />
    </mesh>
  );
}

/* ───────────────────────────────────────────────────────────────────────────
   Core — layered faceted shield: distorted glass core + crystalline facet shell
   + crisp wireframe shields. Slow autonomous spin (Float adds bob + sway).
   ─────────────────────────────────────────────────────────────────────────── */
function Core({
  primary,
  deep,
}: {
  primary: Color;
  deep: Color;
}) {
  const spin = useRef<Group>(null);

  useFrame((_, delta) => {
    if (spin.current) spin.current.rotation.y += Math.min(delta, 0.05) * 0.075;
  });

  return (
    <Float speed={1.0} rotationIntensity={0.3} floatIntensity={0.55} floatingRange={[-0.05, 0.05]}>
      <group ref={spin}>
        {/* Distorted glassy core — calmer distortion reads as crystal, not blob */}
        <Icosahedron args={[1.05, 6]}>
          <MeshDistortMaterial
            color={deep}
            emissive={primary}
            emissiveIntensity={0.42}
            metalness={0.55}
            roughness={0.15}
            distort={0.16}
            speed={1.0}
            transparent
            opacity={0.95}
          />
        </Icosahedron>

        {/* Crystalline faceted shell (flat-shaded, near-transparent) */}
        <Icosahedron args={[1.5, 1]}>
          <meshStandardMaterial
            color={primary}
            emissive={primary}
            emissiveIntensity={0.15}
            metalness={0.9}
            roughness={0.3}
            transparent
            opacity={0.08}
            flatShading
          />
        </Icosahedron>

        {/* Crisp wireframe shield */}
        <Icosahedron args={[1.6, 0]}>
          <meshBasicMaterial color={primary} wireframe transparent opacity={0.55} toneMapped={false} />
        </Icosahedron>

        {/* Faint outer wire halo for depth */}
        <Icosahedron args={[1.95, 1]}>
          <meshBasicMaterial color={primary} wireframe transparent opacity={0.12} toneMapped={false} />
        </Icosahedron>
      </group>
    </Float>
  );
}

/* ───────────────────────────────────────────────────────────────────────────
   NodeField — slowly rotating spherical shell of particles (the data cloud).
   ─────────────────────────────────────────────────────────────────────────── */
function NodeField({ color }: { color: Color }) {
  const ref = useRef<ThreePoints>(null);

  const positions = useMemo(() => {
    const count = 700;
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = 1.9 + Math.random() * 1.7;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      arr[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      arr[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      arr[i * 3 + 2] = r * Math.cos(phi);
    }
    return arr;
  }, []);

  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    ref.current.rotation.y = t * 0.028;
    ref.current.rotation.x = Math.sin(t * 0.08) * 0.08;
  });

  return (
    <Points ref={ref} positions={positions} stride={3} frustumCulled={false}>
      <PointMaterial
        transparent
        color={color}
        size={0.02}
        sizeAttenuation
        depthWrite={false}
        blending={AdditiveBlending}
        opacity={0.7}
        toneMapped={false}
      />
    </Points>
  );
}

/* ───────────────────────────────────────────────────────────────────────────
   RingSystem — a tilted orbit ring carrying pulsing nodes, each tethered to the
   core by a light spoke. Several of these = the "documents & checks" network.
   ─────────────────────────────────────────────────────────────────────────── */
function RingSystem({
  radius,
  baseRotation,
  spin,
  color,
  accent,
  markerAngles,
}: {
  radius: number;
  baseRotation: [number, number, number];
  spin: number;
  color: Color;
  accent: Color;
  markerAngles: number[];
}) {
  const ref = useRef<Group>(null);
  const markersRef = useRef<Group>(null);

  const markers = useMemo(
    () =>
      markerAngles.map((a) => {
        const x = Math.cos(a) * radius;
        const y = Math.sin(a) * radius;
        return { x, y, line: new Float32Array([0, 0, 0, x, y, 0]) };
      }),
    [markerAngles, radius],
  );

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (ref.current) ref.current.rotation.z = t * spin;
    const grp = markersRef.current;
    if (grp) {
      for (let i = 0; i < grp.children.length; i++) {
        const s = 0.9 + (Math.sin(t * 1.4 + i * 1.7) * 0.5 + 0.5) * 0.32;
        grp.children[i].scale.setScalar(s);
      }
    }
  });

  return (
    <group ref={ref} rotation={baseRotation}>
      {/* Orbit ring */}
      <mesh>
        <torusGeometry args={[radius, 0.006, 8, 140]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.32}
          blending={AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      {/* Spokes back to the core */}
      {markers.map((m, i) => (
        <lineSegments key={`spoke-${i}`}>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[m.line, 3]} />
          </bufferGeometry>
          <lineBasicMaterial
            color={color}
            transparent
            opacity={0.16}
            blending={AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </lineSegments>
      ))}

      {/* Pulsing nodes sitting on the ring */}
      <group ref={markersRef}>
        {markers.map((m, i) => (
          <mesh key={`node-${i}`} position={[m.x, m.y, 0]}>
            <sphereGeometry args={[0.05, 16, 16]} />
            <meshStandardMaterial
              color={accent}
              emissive={color}
              emissiveIntensity={1.4}
              roughness={0.3}
              metalness={0.1}
              toneMapped={false}
            />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/* ───────────────────────────────────────────────────────────────────────────
   HeroScene — composes lighting, atmosphere, and the layered core/orbit system.
   ─────────────────────────────────────────────────────────────────────────── */
export function HeroScene() {
  const { primary, foreground, background } = useThemeColors();

  // Deep glassy core tone (trust-blue pulled toward the navy background).
  const deep = useMemo(() => primary.clone().lerp(background, 0.62), [primary, background]);
  // Brighter node tone (trust-blue lifted toward foreground).
  const accent = useMemo(() => primary.clone().lerp(foreground, 0.4), [primary, foreground]);

  return (
    <>
      {/* Depth fog blends distant nodes into the section's navy. */}
      <fog attach="fog" args={[background, 8, 18]} />

      <ambientLight intensity={0.45} />
      <pointLight position={[5, 4, 6]} intensity={2.4} decay={0} color={primary} />
      <pointLight position={[-6, -2, -3]} intensity={1.6} decay={0} color={accent} />
      <directionalLight position={[0, 3, 5]} intensity={0.5} color={foreground} />

      <GlowSprite color={primary} />

      <ParallaxGroup>
        <Core primary={primary} deep={deep} />
        <NodeField color={primary} />

        <RingSystem
          radius={2.0}
          baseRotation={[1.25, 0.25, 0]}
          spin={0.14}
          color={primary}
          accent={accent}
          markerAngles={[0.4, 2.6, 4.7]}
        />
        <RingSystem
          radius={2.5}
          baseRotation={[-0.6, 0.9, 0.3]}
          spin={-0.1}
          color={primary}
          accent={accent}
          markerAngles={[1.1, 3.7, 5.5]}
        />
        <RingSystem
          radius={2.95}
          baseRotation={[0.5, -0.7, 1.1]}
          spin={0.08}
          color={primary}
          accent={accent}
          markerAngles={[0.8, 3.2]}
        />

        <Sparkles count={36} scale={[8, 6.5, 5]} size={2.4} speed={0.22} opacity={0.4} color={primary} noise={1} />
      </ParallaxGroup>
    </>
  );
}

export default HeroScene;
