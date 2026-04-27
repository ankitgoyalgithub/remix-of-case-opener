import { useRef, useState, MouseEvent, ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ParallaxHeroProps {
    /** Tailwind classes for the gradient background applied to the root. */
    gradientClass: string;
    /** Color of the corner glow orb. Use a Tailwind bg-* token. */
    orbClass?: string;
    children: ReactNode;
    className?: string;
}

/**
 * Wraps a hero section with a soft mouse-tracking parallax glow. The orb
 * follows the cursor with a touch of inertia (CSS transition does the easing),
 * giving a subtle sense of depth without being distracting. Reverts to the
 * default position when the cursor leaves.
 */
export function ParallaxHero({
    gradientClass,
    orbClass = 'bg-primary/10',
    children,
    className,
}: ParallaxHeroProps) {
    const wrapperRef = useRef<HTMLDivElement | null>(null);
    const [pos, setPos] = useState<{ x: number; y: number; active: boolean }>({
        x: 0.85, y: 0.15, active: false,
    });

    const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
        const el = wrapperRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        const y = (e.clientY - rect.top) / rect.height;
        setPos({ x, y, active: true });
    };

    const handleMouseLeave = () => setPos({ x: 0.85, y: 0.15, active: false });

    return (
        <div
            ref={wrapperRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            className={cn(
                'relative overflow-hidden rounded-xl border border-border p-5 sm:p-6 bg-gradient-to-br',
                gradientClass,
                className,
            )}
        >
            <div
                className={cn(
                    'pointer-events-none absolute w-72 h-72 rounded-full blur-3xl opacity-70 transition-[transform,opacity] duration-500 ease-out',
                    orbClass,
                )}
                style={{
                    left: `calc(${pos.x * 100}% - 9rem)`,
                    top: `calc(${pos.y * 100}% - 9rem)`,
                    opacity: pos.active ? 0.85 : 0.55,
                }}
            />
            <div className="relative">{children}</div>
        </div>
    );
}
