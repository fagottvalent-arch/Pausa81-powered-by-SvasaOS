import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useRive, useStateMachineInput } from '@rive-app/react-canvas';
import type { Phase } from '../hooks/useBreathing';

const RIVE_SRC = '/animations/sphere.riv';
const STATE_MACHINE = 'State Machine 1';
const INPUT_NAME = 'breath';

interface SphereProps {
  phase: Phase;
  breath: number;
}

/**
 * Vite risponde con `index.html` (text/html) quando un asset non esiste,
 * quindi verifichiamo che sphere.riv sia un vero file binario prima di
 * montare l'istanza Rive. In questo modo la sfera CSS resta il fallback
 * senza errori di caricamento.
 */
async function riveFileExists(src: string): Promise<boolean> {
  try {
    const res = await fetch(src, { method: 'HEAD' });
    if (!res.ok) return false;
    const contentType = (res.headers.get('content-type') ?? '').toLowerCase();
    return !contentType.includes('text/html');
  } catch {
    return false;
  }
}

/** Calcola la scala "respiro" condivisa da sfera e logo. */
function useBreathScale(phase: Phase, breath: number) {
  const scale = phase === 'idle' ? 0.82 : 0.6 + 0.4 * breath;
  const duration = phase === 'idle' ? 0.6 : 5;
  return { scale, duration };
}

/** Logo SvasaOS: scritta con gradiente arcobaleno. */
function SvasaLogo() {
  return (
    <span className="svasa-wordmark" aria-hidden="true">
      SvasaOS
    </span>
  );
}

/** Sfera CSS usata come fallback quando il file .riv non è disponibile. */
function FallbackSphere({ phase, breath }: SphereProps) {
  const { scale, duration } = useBreathScale(phase, breath);

  return (
    <motion.div
      className="sphere"
      initial={false}
      animate={{ scale }}
      transition={{ duration, ease: 'easeInOut' }}
    >
      <div className="sphere-gradient" aria-hidden="true" />
      <div className="sphere-sheen" aria-hidden="true" />
    </motion.div>
  );
}

/** Sfera Rive, montata solo quando il file esiste davvero. */
function RiveSphere({ phase, breath }: SphereProps) {
  const [failed, setFailed] = useState(false);

  const { RiveComponent, rive } = useRive({
    src: RIVE_SRC,
    stateMachine: STATE_MACHINE,
    autoplay: true,
    onLoadError: () => setFailed(true),
  });

  const breathInput = useStateMachineInput(rive, STATE_MACHINE, INPUT_NAME);

  useEffect(() => {
    if (!breathInput) return;
    if (phase === 'inspire') {
      breathInput.value = 1;
    } else if (phase === 'expire') {
      breathInput.value = 0;
    }
    // 'hold' mantiene l'ultimo valore: nessuna assegnazione.
  }, [phase, breathInput]);

  // Finché il file non è pronto (o se fallisce) mostra la sfera CSS.
  if (failed || !rive) {
    return <FallbackSphere phase={phase} breath={breath} />;
  }

  return <RiveComponent className="sphere-canvas" />;
}

export function Sphere(props: SphereProps) {
  const [available, setAvailable] = useState<boolean | null>(null);
  const { scale, duration } = useBreathScale(props.phase, props.breath);

  useEffect(() => {
    let cancelled = false;
    riveFileExists(RIVE_SRC).then((ok) => {
      if (!cancelled) setAvailable(ok);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="sphere-wrap">
      <div className="sphere-halo" aria-hidden="true" />

      {available === true ? <RiveSphere {...props} /> : <FallbackSphere {...props} />}

      {/* Logo SvasaOS sempre visibile, in sincrono col respiro */}
      <motion.div
        className="svasa-logo-rig"
        initial={false}
        animate={{ scale }}
        transition={{ duration, ease: 'easeInOut' }}
      >
        <SvasaLogo />
      </motion.div>
    </div>
  );
}
