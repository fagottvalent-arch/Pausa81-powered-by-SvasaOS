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
export function SvasaLogo() {
  return (
    <span className="svasa-wordmark" aria-hidden="true">
      SvasaOS
    </span>
  );
}

/** Fiore di loto a geometria sacra, con colori a contrasto della sfera. */
function SacredLotus() {
  const outerPetals = Array.from({ length: 8 }, (_, i) => i * 45);
  const innerPetals = Array.from({ length: 8 }, (_, i) => i * 45 + 22.5);
  const seedDots = Array.from({ length: 8 }, (_, i) => {
    const a = (i * 45 * Math.PI) / 180;
    return { x: 100 + Math.cos(a) * 8, y: 100 + Math.sin(a) * 8 };
  });
  const lifeCircles = Array.from({ length: 6 }, (_, i) => {
    const a = (i * 60 * Math.PI) / 180;
    return { x: 100 + Math.cos(a) * 44, y: 100 + Math.sin(a) * 44 };
  });

  return (
    <svg className="sacred-lotus" viewBox="0 0 200 200" aria-hidden="true">
      <defs>
        <radialGradient id="lotus-petal" gradientUnits="userSpaceOnUse" cx="100" cy="100" r="70">
          <stop offset="0%" stopColor="#f7c948" />
          <stop offset="55%" stopColor="#e249b3" />
          <stop offset="100%" stopColor="#4c1d95" />
        </radialGradient>
        <radialGradient id="lotus-glow" gradientUnits="userSpaceOnUse" cx="100" cy="100" r="46">
          <stop offset="0%" stopColor="#fde68a" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#fde68a" stopOpacity="0" />
        </radialGradient>
      </defs>

      <circle cx="100" cy="100" r="46" fill="url(#lotus-glow)" />

      {/* Fiore della vita: geometria sacra di base */}
      <g fill="none" stroke="#f59e0b" strokeOpacity="0.26" strokeWidth="1">
        <circle cx="100" cy="100" r="44" />
        {lifeCircles.map((c, i) => (
          <circle key={`life-${i}`} cx={c.x} cy={c.y} r="44" />
        ))}
      </g>

      <circle cx="100" cy="100" r="88" fill="none" stroke="#f59e0b" strokeOpacity="0.6" strokeWidth="1.5" />
      <circle cx="100" cy="100" r="70" fill="none" stroke="#e249b3" strokeOpacity="0.4" strokeWidth="1" strokeDasharray="3 5" />

      {outerPetals.map((a) => (
        <path
          key={`outer-${a}`}
          d="M 0 8 C -16 4 -19 -26 -8 -54 C -3 -62 3 -62 8 -54 C 19 -26 16 4 0 8 Z"
          fill="url(#lotus-petal)"
          stroke="#f7c948"
          strokeOpacity="0.35"
          strokeWidth="0.8"
          transform={`translate(100 100) rotate(${a})`}
        />
      ))}

      {innerPetals.map((a) => (
        <path
          key={`inner-${a}`}
          d="M 0 6 C -11 3 -13 -18 -6 -40 C -2 -46 2 -46 6 -40 C 13 -18 11 3 0 6 Z"
          fill="url(#lotus-petal)"
          opacity="0.95"
          transform={`translate(100 100) rotate(${a})`}
        />
      ))}

      <circle cx="100" cy="100" r="15" fill="#4c1d95" />
      <circle cx="100" cy="100" r="15" fill="none" stroke="#f7c948" strokeOpacity="0.7" strokeWidth="1" />
      {seedDots.map((d, i) => (
        <circle key={`seed-${i}`} cx={d.x} cy={d.y} r="2.2" fill="#f7c948" />
      ))}
      <circle cx="100" cy="100" r="3" fill="#fde68a" />
    </svg>
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
    // 'hold' e 'pause' mantengono l'ultimo valore: nessuna assegnazione.
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

      {/* Fiore di loto a geometria sacra, in sincrono col respiro */}
      <motion.div
        className="lotus-rig"
        initial={false}
        animate={{ scale }}
        transition={{ duration, ease: 'easeInOut' }}
      >
        <SacredLotus />
      </motion.div>
    </div>
  );
}
