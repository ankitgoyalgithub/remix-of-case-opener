/**
 * ShaderField — generative WebGL "data in motion" backdrop.
 *
 * A GPU point-cloud (one draw call, ~14k points) laid out as a flowing field and
 * displaced by layered 3D simplex noise in a custom GLSL vertex shader. Points are
 * drawn as soft, additively-blended discs whose size + colour track the flow's
 * elevation, so dense crests glow trust-blue while troughs sink into the dark —
 * abstract "underwriting data, always moving".
 *
 * Colour is read from the live `--primary` design token (off the canvas element),
 * so it always matches the section tone — never a hardcoded hex.
 *
 * Render this INSIDE a <CanvasLazy> (which handles mount-in-view, frameloop
 * pausing and the reduced-motion static fallback). It owns no lights — the points
 * are unlit/self-coloured.
 */
import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

/* ── Colour helpers (token → sRGB floats, no THREE colour-management surprises) ─ */

/** Parse a CSS HSL triplet like "214 90% 62%" → [h(0-360), s(0-1), l(0-1)]. */
function readHsl(
  raw: string | undefined,
  fallback: [number, number, number],
): [number, number, number] {
  if (!raw) return fallback;
  const m = raw.trim().match(/([\d.]+)\s+([\d.]+)%\s+([\d.]+)%/);
  if (!m) return fallback;
  return [parseFloat(m[1]), parseFloat(m[2]) / 100, parseFloat(m[3]) / 100];
}

/** HSL → sRGB [r,g,b] in 0..1 (passed straight to the shader as a plain vec3). */
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = ((h % 360) + 360) % 360 / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r = 0;
  let g = 0;
  let b = 0;
  if (hp < 1) [r, g, b] = [c, x, 0];
  else if (hp < 2) [r, g, b] = [x, c, 0];
  else if (hp < 3) [r, g, b] = [0, c, x];
  else if (hp < 4) [r, g, b] = [0, x, c];
  else if (hp < 5) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const m = l - c / 2;
  return [r + m, g + m, b + m];
}

/* ── GLSL ─────────────────────────────────────────────────────────────────── */

// Ashima Arts — simplex 3D noise (public domain / MIT). Compact + GPU-friendly.
const SIMPLEX_3D = /* glsl */ `
vec4 permute(vec4 x){ return mod(((x*34.0)+1.0)*x, 289.0); }
vec4 taylorInvSqrt(vec4 r){ return 1.79284291400159 - 0.85373472095314 * r; }
float snoise(vec3 v){
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + 1.0 * C.xxx;
  vec3 x2 = x0 - i2 + 2.0 * C.xxx;
  vec3 x3 = x0 - 1.0 + 3.0 * C.xxx;
  i = mod(i, 289.0);
  vec4 p = permute(permute(permute(
            i.z + vec4(0.0, i1.z, i2.z, 1.0))
          + i.y + vec4(0.0, i1.y, i2.y, 1.0))
          + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 1.0/7.0;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}
`;

const VERTEX = /* glsl */ `
uniform float uTime;
uniform float uSpeed;
uniform float uAmp;
uniform float uSize;
uniform float uPixelRatio;
uniform float uFogNear;
uniform float uFogFar;
attribute float aSeed;
varying float vElev;
varying float vFade;

${SIMPLEX_3D}

void main() {
  vec3 pos = position;
  float t = uTime * uSpeed * 0.12;

  // Two layers of flow at different scales/directions → organic, non-repeating drift.
  float n1 = snoise(vec3(pos.x * 0.16 + t,        pos.y * 0.16,        t * 0.7));
  float n2 = snoise(vec3(pos.x * 0.40 - t * 0.6,  pos.y * 0.40 + t * 0.35, t * 1.1 + 12.0));
  float elev = n1 * 0.72 + n2 * 0.28;
  pos.z += elev * uAmp;

  vElev = elev;

  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  float dist = -mv.z;
  vFade = clamp((uFogFar - dist) / (uFogFar - uFogNear), 0.0, 1.0);

  gl_Position = projectionMatrix * mv;

  // Per-point twinkle + crest-driven size, with perspective attenuation.
  float twinkle = 0.75 + 0.25 * sin(uTime * (0.8 + aSeed * 1.6) + aSeed * 6.2831);
  float sizeScale = 0.45 + 0.95 * smoothstep(-0.25, 0.95, elev);
  gl_PointSize = max(uSize * sizeScale * twinkle * uPixelRatio * (8.0 / max(dist, 0.001)), 1.0);
}
`;

const FRAGMENT = /* glsl */ `
precision highp float;
uniform vec3 uColorHigh;
uniform vec3 uColorLow;
uniform float uOpacity;
varying float vElev;
varying float vFade;

void main() {
  // Soft round disc.
  vec2 uv = gl_PointCoord - 0.5;
  float d = length(uv);
  if (d > 0.5) discard;
  float core = smoothstep(0.5, 0.0, d);
  float alpha = core * core;

  float m = smoothstep(-0.25, 0.9, vElev);
  vec3 col = mix(uColorLow, uColorHigh, m);
  col += uColorHigh * core * 0.25 * m; // hotter glowing core on crests

  gl_FragColor = vec4(col, alpha * uOpacity * vFade);
}
`;

/* ── Component ────────────────────────────────────────────────────────────── */

export interface ShaderFieldProps {
  /** Grid points per side (total = resolution²). Default 120 → ~14.4k points. */
  resolution?: number;
  /** World width of the field plane. Default 20. */
  width?: number;
  /** World height of the field plane. Default 13. */
  height?: number;
  /** Vertical displacement amplitude of the flow. Default 1.5. */
  amplitude?: number;
  /** Flow speed multiplier. Default 1. */
  speed?: number;
  /** Base point size (px, before perspective + pixel-ratio scaling). Default 5. */
  size?: number;
  /** Resting tilt of the field (radians, around X). Default -0.3. */
  tilt?: number;
}

export function ShaderField({
  resolution = 120,
  width = 20,
  height = 13,
  amplitude = 1.5,
  speed = 1,
  size = 5,
  tilt = -0.3,
}: ShaderFieldProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const gl = useThree((s) => s.gl);

  // Build the grid positions + per-point seeds once.
  const { positions, seeds } = useMemo(() => {
    const count = resolution * resolution;
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    let p = 0;
    for (let iy = 0; iy < resolution; iy++) {
      for (let ix = 0; ix < resolution; ix++) {
        const u = resolution > 1 ? ix / (resolution - 1) : 0.5;
        const v = resolution > 1 ? iy / (resolution - 1) : 0.5;
        positions[p * 3] = (u - 0.5) * width;
        positions[p * 3 + 1] = (v - 0.5) * height;
        positions[p * 3 + 2] = 0;
        seeds[p] = Math.random();
        p++;
      }
    }
    return { positions, seeds };
  }, [resolution, width, height]);

  // Stable uniforms object. Colours start from the dark-tone primary and are
  // refined from the live token below.
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uSpeed: { value: speed },
      uAmp: { value: amplitude },
      uSize: { value: size },
      uPixelRatio: { value: 1 },
      uFogNear: { value: 8 },
      uFogFar: { value: 20 },
      uOpacity: { value: 0.92 },
      uColorHigh: { value: new THREE.Vector3(...hslToRgb(214, 0.9, 0.7)) },
      uColorLow: { value: new THREE.Vector3(...hslToRgb(214, 0.72, 0.28)) },
    }),
    [speed, amplitude, size],
  );

  // Pull the real --primary from the section tone so the art matches the palette.
  useEffect(() => {
    const styles = getComputedStyle(gl.domElement);
    const [h, s, l] = readHsl(styles.getPropertyValue("--primary"), [214, 0.9, 0.62]);
    uniforms.uColorHigh.value.set(...hslToRgb(h, s, Math.min(0.78, l + 0.1)));
    uniforms.uColorLow.value.set(...hslToRgb(h, s * 0.8, l * 0.45));
  }, [gl, uniforms]);

  useFrame((state, delta) => {
    const mat = matRef.current;
    if (mat) {
      mat.uniforms.uTime.value = state.clock.elapsedTime;
      mat.uniforms.uPixelRatio.value = state.gl.getPixelRatio();
    }
    const pts = pointsRef.current;
    if (pts) {
      const t = state.clock.elapsedTime;
      const k = Math.min(1, delta * 3); // frame-rate-independent smoothing
      // Gentle pointer parallax + slow autonomous drift (kept subtle).
      pts.rotation.x += (tilt + state.pointer.y * 0.06 - pts.rotation.x) * k;
      pts.rotation.y += (state.pointer.x * 0.1 - pts.rotation.y) * k;
      pts.rotation.z = Math.sin(t * 0.04) * 0.03;
    }
  });

  return (
    <points ref={pointsRef} frustumCulled={false} rotation={[tilt, 0, 0]}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-aSeed" args={[seeds, 1]} />
      </bufferGeometry>
      <shaderMaterial
        ref={matRef}
        uniforms={uniforms}
        vertexShader={VERTEX}
        fragmentShader={FRAGMENT}
        transparent
        depthWrite={false}
        depthTest={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

export default ShaderField;
