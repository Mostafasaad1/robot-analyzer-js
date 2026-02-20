import { useCallback, useEffect, useRef } from 'react';
import { useSessionStore } from '../stores/sessionStore';
import { AnimationPattern } from '../types/robot';

export function useAnimation() {
  const { robotInfo } = useSessionStore();
  const animationRef = useRef<number | null>(null);
  const timeRef = useRef<number>(0);
  const isAnimatingRef = useRef(false);

  const startAnimation = useCallback((config: {
    pattern: AnimationPattern;
    amplitude: number;
    frequency: number;
    speed: number;
  }) => {
    if (!robotInfo) return;

    // Stop any existing
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    isAnimatingRef.current = true;
    let lastTime = performance.now();

    const animate = (time: number) => {
      if (!isAnimatingRef.current) return;

      const deltaTime = (time - lastTime) / 1000; // in seconds
      lastTime = time;

      timeRef.current += deltaTime * config.speed;
      const t = timeRef.current;

      // Get latest state
      const { jointPositions, setJointPositions } = useSessionStore.getState();
      const newPositions = [...jointPositions];

      robotInfo.jointNames.forEach((_, i) => {
        const lower = robotInfo.lowerLimits[i] || -Math.PI;
        const upper = robotInfo.upperLimits[i] || Math.PI;

        const range = upper - lower;
        const mid = lower + range / 2;
        const actualAmp = (range / 2) * config.amplitude;

        const phase = i * 0.5; // Offset between joints

        if (config.pattern === AnimationPattern.SINE_WAVE) {
          newPositions[i] = mid + actualAmp * Math.sin(t * config.frequency * 2 * Math.PI + phase);
        } else if (config.pattern === AnimationPattern.CIRCULAR) {
          newPositions[i] = mid + actualAmp * (i % 2 === 0 ? Math.sin(t * config.frequency * 2 * Math.PI) : Math.cos(t * config.frequency * 2 * Math.PI));
        } else if (config.pattern === AnimationPattern.WAVE) {
          newPositions[i] = mid + actualAmp * Math.sin(t * config.frequency * 2 * Math.PI - i * 0.8);
        } else if (config.pattern === AnimationPattern.RANDOM) {
          // Smoothed continuous random using varying sinewaves
          newPositions[i] = mid + actualAmp * (
            Math.sin(t * config.frequency * 3.1 + phase) * 0.5 +
            Math.sin(t * config.frequency * 1.7 - phase * 2) * 0.5
          );
        }
      });

      setJointPositions(newPositions);
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
  }, [robotInfo]);

  const stopAnimation = useCallback(() => {
    isAnimatingRef.current = false;
    timeRef.current = 0; // Reset time back to 0
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
  }, []);

  const pauseAnimation = useCallback(() => {
    isAnimatingRef.current = false;
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isAnimatingRef.current = false;
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return {
    startAnimation,
    stopAnimation,
    pauseAnimation,
  };
}
