import { useEffect, useRef, useState } from 'react';

interface AnimatedNumberProps {
    value: number;
    /** Animation duration in ms. Default ~700ms — feels snappy without being abrupt. */
    duration?: number;
    /** Number of decimal places. Default 0. */
    decimals?: number;
    /** Optional formatter; e.g. percentage, currency, units. */
    format?: (n: number) => string;
    className?: string;
}

/**
 * Smoothly animates a number from its previous render value to the new one.
 * Uses an ease-out cubic so big counts feel quick at first then settle.
 *
 * Skips animation entirely the first render the component mounts with value=0,
 * so initial loading states don't visibly tick from 0 to 0.
 */
export function AnimatedNumber({ value, duration = 700, decimals = 0, format, className }: AnimatedNumberProps) {
    const [displayValue, setDisplayValue] = useState(value);
    const startedAtRef = useRef<number | null>(null);
    const fromRef = useRef(value);
    const rafRef = useRef<number | null>(null);

    useEffect(() => {
        const target = value;
        const from = displayValue;
        if (from === target) return;
        startedAtRef.current = performance.now();
        fromRef.current = from;

        const tick = (now: number) => {
            const elapsed = now - (startedAtRef.current || now);
            const progress = Math.min(1, elapsed / duration);
            // ease-out cubic
            const eased = 1 - Math.pow(1 - progress, 3);
            const current = fromRef.current + (target - fromRef.current) * eased;
            setDisplayValue(current);
            if (progress < 1) {
                rafRef.current = requestAnimationFrame(tick);
            } else {
                setDisplayValue(target);
                rafRef.current = null;
            }
        };

        rafRef.current = requestAnimationFrame(tick);
        return () => {
            if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value, duration]);

    const rounded = decimals > 0 ? displayValue.toFixed(decimals) : Math.round(displayValue).toString();
    return <span className={className}>{format ? format(displayValue) : rounded}</span>;
}
