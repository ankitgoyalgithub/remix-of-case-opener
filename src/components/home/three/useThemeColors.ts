/**
 * useThemeColors — read the page's design tokens INTO the WebGL scene.
 *
 * WebGL materials need literal colours, but we still want the single trust-blue
 * accent to come from the design system (never a stray hex). The hero canvas is
 * mounted inside a `.home-dark` section, so the CSS custom properties
 * (--primary / --foreground / --background …) resolve to their dark-tone values
 * on the canvas element via inheritance. We read them once (per mount) off the
 * live `gl.domElement` and convert the `H S% L%` token strings to THREE.Colors.
 *
 * If the variables can't be read (very old browsers), we fall back to the exact
 * values declared for `.home-dark` in home.css so the scene still looks right.
 */
import { useMemo } from "react";
import { useThree } from "@react-three/fiber";
import { Color } from "three";

export interface ThemeColors {
  /** The one accent — brightened trust-blue on dark. */
  primary: Color;
  /** Near-white foreground; used as a neutral fill light / highlight tint. */
  foreground: Color;
  /** Deep-navy section background; used for depth fog + glow base. */
  background: Color;
}

/** Parse a token like `"214 90% 62%"` → `[h, s, l]` (degrees / percent). */
function parseHslToken(token: string): [number, number, number] | null {
  const m = token.trim().match(/(-?[\d.]+)\s+([\d.]+)%\s+([\d.]+)%/);
  if (!m) return null;
  return [parseFloat(m[1]), parseFloat(m[2]), parseFloat(m[3])];
}

function colorFromHsl([h, s, l]: [number, number, number]): Color {
  return new Color().setHSL(h / 360, s / 100, l / 100);
}

/** Mirrors the `.home-dark` token values in home.css (used only as a fallback). */
const FALLBACK = {
  "--primary": [214, 90, 62] as [number, number, number],
  "--foreground": [213, 31, 95] as [number, number, number],
  "--background": [222, 47, 8] as [number, number, number],
};

export function useThemeColors(): ThemeColors {
  const el = useThree((s) => s.gl.domElement);

  return useMemo(() => {
    const read = (name: keyof typeof FALLBACK): Color => {
      let token = "";
      if (typeof window !== "undefined" && el) {
        try {
          token = window.getComputedStyle(el).getPropertyValue(name);
        } catch {
          token = "";
        }
      }
      return colorFromHsl(parseHslToken(token) ?? FALLBACK[name]);
    };

    return {
      primary: read("--primary"),
      foreground: read("--foreground"),
      background: read("--background"),
    };
  }, [el]);
}
