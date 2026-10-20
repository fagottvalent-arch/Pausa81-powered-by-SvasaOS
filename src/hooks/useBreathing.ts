import { useCallback, useEffect, useRef, useState } from 'react';

export type Phase = 'idle' | 'inspire' | 'hold' | 'expire';
export type Status = 'idle' | 'running';

interface Step {
  phase: Phase;
  /** Durata della fase in secondi. */
  duration: number;
  /** Target discreto per l'input Rive "breath": 1 = espansa, 0 = contratta. */
  breath: number;
}

// Ciclo Sama Vritti (box breathing): 5 - 5 - 5 - 5.
const CYCLE: Step[] = [
  { phase: 'inspire', duration: 5, breath: 1 },
  { phase: 'hold', duration: 5, breath: 1 },
  { phase: 'expire', duration: 5, breath: 0 },
  { phase: 'hold', duration: 5, breath: 0 },
];

const CYCLE_TOTAL_MS = CYCLE.reduce((sum, step) => sum + step.duration * 1000, 0);
const TICK_MS = 100;

export interface BreathingSnapshot {
  status: Status;
  phase: Phase;
  breath: number;
  secondsLeft: number;
  /** Durata della fase corrente in secondi (0 quando in idle). */
  duration: number;
}

const IDLE_SNAPSHOT: BreathingSnapshot = {
  status: 'idle',
  phase: 'idle',
  breath: 0,
  secondsLeft: 0,
  duration: 0,
};

function snapshotAt(totalElapsedMs: number): BreathingSnapshot {
  const cycleTime = totalElapsedMs % CYCLE_TOTAL_MS;
  let acc = 0;
  for (const step of CYCLE) {
    const stepMs = step.duration * 1000;
    if (cycleTime < acc + stepMs) {
      const elapsed = cycleTime - acc;
      return {
        status: 'running',
        phase: step.phase,
        breath: step.breath,
        secondsLeft: Math.max(1, Math.ceil((stepMs - elapsed) / 1000)),
        duration: step.duration,
      };
    }
    acc += stepMs;
  }

  const last = CYCLE[CYCLE.length - 1];
  return {
    status: 'running',
    phase: last.phase,
    breath: last.breath,
    secondsLeft: 1,
    duration: last.duration,
  };
}

export function useBreathing() {
  const [snapshot, setSnapshot] = useState<BreathingSnapshot>(IDLE_SNAPSHOT);
  const startTimeRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const start = useCallback(() => {
    clearTimer();
    startTimeRef.current = Date.now();
    setSnapshot(snapshotAt(0));
    timerRef.current = window.setInterval(() => {
      if (startTimeRef.current === null) return;
      setSnapshot(snapshotAt(Date.now() - startTimeRef.current));
    }, TICK_MS);
  }, [clearTimer]);

  const reset = useCallback(() => {
    clearTimer();
    startTimeRef.current = null;
    setSnapshot(IDLE_SNAPSHOT);
  }, [clearTimer]);

  useEffect(() => {
    return () => clearTimer();
  }, [clearTimer]);

  return {
    ...snapshot,
    start,
    reset,
  };
}
