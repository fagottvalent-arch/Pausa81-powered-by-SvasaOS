import { useCallback, useEffect, useRef, useState } from 'react';
import type { Phase } from './useBreathing';

const BASE_VOLUME = 0.06;
const FADE_SECONDS = 0.5;

// Inviluppo del "respiro": livello di gain del rumore in ogni fase.
const PHASE_GAIN: Record<Phase, number> = {
  idle: 0,
  inspire: 0.16,
  hold: 0.03,
  expire: 0.13,
  pause: 0.01,
};

// Frequenza del filtro low-pass: inspiro "luminoso", espiro "cupo".
const PHASE_FILTER: Record<Phase, number> = {
  idle: 800,
  inspire: 1600,
  hold: 700,
  expire: 600,
  pause: 700,
};

/**
 * Audio ambiente della sessione: rumore bianco filtrato che "respira" in
 * sincrono con le fasi (inviluppo di gain e frequenza).
 */
export function useAmbientAudio() {
  const ctxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const filterRef = useRef<BiquadFilterNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);

  const [enabled, setEnabled] = useState(true);
  const enabledRef = useRef(enabled);
  const playingRef = useRef(false);
  const hiddenRef = useRef(false);
  const lastPhaseRef = useRef<Phase>('idle');
  const lastDurationRef = useRef(0);

  const setEnabledSafe = useCallback((next: boolean) => {
    enabledRef.current = next;
    setEnabled(next);
  }, []);

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  const getContext = useCallback((): AudioContext => {
    if (!ctxRef.current) {
      const Ctor: typeof AudioContext =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctxRef.current = new Ctor();
    }
    return ctxRef.current;
  }, []);

  const ensureSource = useCallback((): AudioContext | null => {
    const ctx = getContext();
    if (sourceRef.current) return ctx;

    const length = 2 * ctx.sampleRate;
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) {
      data[i] = Math.random() * 2 - 1;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 900;

    const gain = ctx.createGain();
    gain.gain.value = 0;

    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    source.start();

    sourceRef.current = source;
    filterRef.current = filter;
    gainRef.current = gain;
    return ctx;
  }, [getContext]);

  const rampParam = useCallback((param: AudioParam, target: number, seconds: number) => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    const now = ctx.currentTime;
    param.cancelScheduledValues(now);
    param.setValueAtTime(Math.max(0, param.value), now);
    param.linearRampToValueAtTime(target, now + Math.max(0.2, seconds));
  }, []);

  const fadeTo = useCallback(
    (target: number) => {
      const gainNode = gainRef.current;
      if (!gainNode) return;
      rampParam(gainNode.gain, target, FADE_SECONDS);
    },
    [rampParam],
  );

  const play = useCallback(() => {
    const ctx = ensureSource();
    if (ctx && ctx.state === 'suspended' && !hiddenRef.current) {
      void ctx.resume();
    }
    playingRef.current = true;
    fadeTo(BASE_VOLUME);
  }, [ensureSource, fadeTo]);

  const pause = useCallback(() => {
    playingRef.current = false;
    fadeTo(0);
  }, [fadeTo]);

  /** Chiamato a ogni cambio fase: modella il rumore come un respiro. */
  const breathe = useCallback(
    (phase: Phase, duration: number) => {
      lastPhaseRef.current = phase;
      lastDurationRef.current = duration;

      if (!enabledRef.current) return;

      const gainNode = gainRef.current;
      const filter = filterRef.current;
      if (!gainNode || !filter) return;

      rampParam(gainNode.gain, PHASE_GAIN[phase] ?? 0, duration);
      rampParam(filter.frequency, PHASE_FILTER[phase] ?? 800, duration);
    },
    [rampParam],
  );

  const toggle = useCallback(() => {
    setEnabledSafe(!enabledRef.current);
  }, [setEnabledSafe]);

  // Ferma l'audio quando l'app va in background o viene chiusa (PWA).
  useEffect(() => {
    const suspend = () => {
      hiddenRef.current = true;
      const ctx = ctxRef.current;
      if (ctx && ctx.state === 'running') {
        void ctx.suspend();
      }
    };

    const resume = () => {
      hiddenRef.current = false;
      if (!playingRef.current) return;
      const ctx = ctxRef.current;
      if (ctx && ctx.state === 'suspended') {
        void ctx.resume();
      }
      const gainNode = gainRef.current;
      const filter = filterRef.current;
      if (!gainNode || !filter) return;
      const phase = lastPhaseRef.current;
      const duration = lastDurationRef.current;
      rampParam(gainNode.gain, PHASE_GAIN[phase] ?? 0, duration);
      rampParam(filter.frequency, PHASE_FILTER[phase] ?? 800, duration);
    };

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        suspend();
      } else {
        resume();
      }
    };

    document.addEventListener('visibilitychange', onVisibility);
    document.addEventListener('freeze', suspend);
    document.addEventListener('resume', resume);
    window.addEventListener('pagehide', suspend);

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      document.removeEventListener('freeze', suspend);
      document.removeEventListener('resume', resume);
      window.removeEventListener('pagehide', suspend);
    };
  }, [rampParam]);

  useEffect(() => {
    return () => {
      if (sourceRef.current) {
        try {
          sourceRef.current.stop();
        } catch {
          // già fermato
        }
        sourceRef.current = null;
      }
      if (ctxRef.current) {
        void ctxRef.current.close();
        ctxRef.current = null;
      }
    };
  }, []);

  return { enabled, toggle, play, pause, breathe };
}