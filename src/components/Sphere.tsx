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

/** Fiore di loto blu che galleggia sull'acqua, in stile zen. */
function SacredLotus() {
  const backPetals = Array.from({ length: 8 }, (_, i) => i * 45);
  const frontPetals = Array.from({ length: 8 }, (_, i) => i * 45 + 22.5);
  const sparkles = [
    { x: 40, y: 42, s: 1 },
    { x: 160, y: 36, s: 0.85 },
    { x: 156, y: 120, s: 0.7 },
    { x: 44, y: 126, s: 0.65 },
    { x: 102, y: 24, s: 0.9 },
  ];
  const seeds = Array.from({ length: 8 }, (_, i) => {
    const a = (i * 45 * Math.PI) / 180;
    return { x: 100 + Math.cos(a) * 6, y: 90 + Math.sin(a) * 6 };
  });

  return (
    <svg className="sacred-lotus" viewBox="0 0 200 200" aria-hidden="true">
      <defs>
        <radialGradient id="lotus-petal" gradientUnits="userSpaceOnUse" cx="100" cy="90" r="74">
          <stop offset="0%" stopColor="#f0f9ff" />
          <stop offset="40%" stopColor="#7dd3fc" />
          <stop offset="100%" stopColor="#1d4ed8" />
        </radialGradient>
        <radialGradient id="lotus-back" gradientUnits="userSpaceOnUse" cx="100" cy="90" r="88">
          <stop offset="0%" stopColor="#93c5fd" />
          <stop offset="100%" stopColor="#1e40af" />
        </radialGradient>
        <radialGradient id="lotus-glow" gradientUnits="userSpaceOnUse" cx="100" cy="88" r="52">
          <stop offset="0%" stopColor="#bae6fd" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#bae6fd" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="water-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.12" />
        </linearGradient>
      </defs>

      {/* alone di luce */}
      <circle cx="100" cy="88" r="52" fill="url(#lotus-glow)" />

      {/* stelle */}
      {sparkles.map((p, i) => (
        <g key={`spark-${i}`} transform={`translate(${p.x} ${p.y}) scale(${p.s})`}>
          <path
            d="M 0 -6 L 1.6 -1.6 L 6 0 L 1.6 1.6 L 0 6 L -1.6 1.6 L -6 0 L -1.6 -1.6 Z"
            fill="#e0f2fe"
          />
        </g>
      ))}

      {/* acqua */}
      <g fill="url(#water-fill)">
        <ellipse cx="100" cy="164" rx="80" ry="15" />
        <ellipse cx="100" cy="174" rx="62" ry="11" opacity="0.7" />
        <ellipse cx="100" cy="183" rx="44" ry="8" opacity="0.55" />
      </g>
      <g fill="none" stroke="#7dd3fc" strokeOpacity="0.5" strokeWidth="1">
        <ellipse cx="100" cy="162" rx="72" ry="13" />
        <ellipse cx="100" cy="172" rx="54" ry="9" />
      </g>

      {/* petali posteriori */}
      {backPetals.map((a) => (
        <path
          key={`back-${a}`}
          d="M 0 12 C -18 6 -26 -32 -10 -66 C -4 -76 4 -76 10 -66 C 26 -32 18 6 0 12 Z"
          fill="url(#lotus-back)"
          stroke="#bfdbfe"
          strokeOpacity="0.35"
          strokeWidth="0.8"
          transform={`translate(100 92) rotate(${a})`}
        />
      ))}

      {/* petali frontali */}
      {frontPetals.map((a) => (
        <path
          key={`front-${a}`}
          d="M 0 10 C -14 5 -18 -24 -8 -50 C -3 -57 3 -57 8 -50 C 18 -24 14 5 0 10 Z"
          fill="url(#lotus-petal)"
          stroke="#e0f2fe"
          strokeOpacity="0.4"
          strokeWidth="0.7"
          transform={`translate(100 94) rotate(${a})`}
        />
      ))}

      {/* cuore luminoso del fiore */}
      <circle cx="100" cy="90" r="13" fill="#e0f2fe" opacity="0.9" />
      <circle cx="100" cy="90" r="13" fill="none" stroke="#38bdf8" strokeOpacity="0.8" strokeWidth="1" />
      {seeds.map((d, i) => (
        <circle key={`seed-${i}`} cx={d.x} cy={d.y} r="1.8" fill="#facc15" />
      ))}
      <circle cx="100" cy="90" r="3" fill="#ffffff" />
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

      {/* Fiore di loto blu sull'acqua, in sincrono col respiro */}
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
