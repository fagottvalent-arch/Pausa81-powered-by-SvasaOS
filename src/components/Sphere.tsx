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

/** Fiore di loto azzurro di profilo, con stelle che sprizzano dal centro. */
function SacredLotus() {
  const backAngles = [-60, 60];
  const sideAngles = [-30, 30];
  const rays = Array.from({ length: 9 }, (_, i) => {
    const a = ((-160 + i * 17.5) * Math.PI) / 180;
    return {
      x1: 100 + Math.cos(a) * 14,
      y1: 142 + Math.sin(a) * 14,
      x2: 100 + Math.cos(a) * 50,
      y2: 142 + Math.sin(a) * 50,
    };
  });
  const sparkles = Array.from({ length: 9 }, (_, i) => {
    const a = ((-160 + i * 17.5) * Math.PI) / 180;
    const r = 44 + (i % 3) * 15;
    return {
      x: 100 + Math.cos(a) * r,
      y: 142 + Math.sin(a) * r,
      s: 1.15 - (i % 3) * 0.3,
    };
  });

  return (
    <svg className="sacred-lotus" viewBox="0 0 200 200" aria-hidden="true">
      <defs>
        <radialGradient id="lotus-petal" gradientUnits="userSpaceOnUse" cx="100" cy="130" r="88">
          <stop offset="0%" stopColor="#f0f9ff" />
          <stop offset="45%" stopColor="#bae6fd" />
          <stop offset="100%" stopColor="#7dd3fc" />
        </radialGradient>
        <radialGradient id="lotus-back" gradientUnits="userSpaceOnUse" cx="100" cy="130" r="96">
          <stop offset="0%" stopColor="#e0f2fe" />
          <stop offset="60%" stopColor="#7dd3fc" />
          <stop offset="100%" stopColor="#38bdf8" />
        </radialGradient>
        <radialGradient id="lotus-glow" gradientUnits="userSpaceOnUse" cx="100" cy="140" r="58">
          <stop offset="0%" stopColor="#e0f2fe" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#e0f2fe" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="water-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7dd3fc" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#bae6fd" stopOpacity="0.1" />
        </linearGradient>
      </defs>

      {/* alone di luce */}
      <circle cx="100" cy="140" r="58" fill="url(#lotus-glow)" />

      {/* acqua */}
      <g fill="url(#water-fill)">
        <ellipse cx="100" cy="160" rx="84" ry="14" />
        <ellipse cx="100" cy="172" rx="66" ry="10" opacity="0.7" />
        <ellipse cx="100" cy="182" rx="46" ry="7" opacity="0.55" />
      </g>
      <g fill="none" stroke="#7dd3fc" strokeOpacity="0.5" strokeWidth="1">
        <ellipse cx="100" cy="158" rx="76" ry="12" />
        <ellipse cx="100" cy="170" rx="58" ry="9" />
      </g>

      {/* petali posteriori (profilo) */}
      {backAngles.map((a) => (
        <path
          key={`back-${a}`}
          d="M 0 0 C -24 -3 -30 -48 -3 -76 C -1 -80 1 -80 3 -76 C 30 -48 24 -3 0 0 Z"
          fill="url(#lotus-back)"
          transform={`translate(100 150) rotate(${a})`}
        />
      ))}

      {/* petali laterali (profilo) */}
      {sideAngles.map((a) => (
        <path
          key={`side-${a}`}
          d="M 0 0 C -20 -3 -26 -44 -2 -72 C -1 -75 1 -75 2 -72 C 26 -44 20 -3 0 0 Z"
          fill="url(#lotus-petal)"
          stroke="#ffffff"
          strokeOpacity="0.45"
          strokeWidth="0.7"
          transform={`translate(100 150) rotate(${a})`}
        />
      ))}

      {/* petalo centrale (profilo) */}
      <path
        d="M 0 0 C -18 -2 -24 -42 -2 -70 C -1 -73 1 -73 2 -70 C 24 -42 18 -2 0 0 Z"
        fill="url(#lotus-petal)"
        stroke="#ffffff"
        strokeOpacity="0.5"
        strokeWidth="0.7"
        transform="translate(100 150)"
      />

      {/* raggi di luce dal centro */}
      <g stroke="#bae6fd" strokeOpacity="0.7" strokeWidth="1" strokeLinecap="round">
        {rays.map((r, i) => (
          <line key={`ray-${i}`} x1={r.x1} y1={r.y1} x2={r.x2} y2={r.y2} />
        ))}
      </g>

      {/* stelle che sprizzano dal centro */}
      {sparkles.map((p, i) => (
        <g key={`spark-${i}`} transform={`translate(${p.x} ${p.y}) scale(${p.s})`}>
          <path
            d="M 0 -6 L 1.6 -1.6 L 6 0 L 1.6 1.6 L 0 6 L -1.6 1.6 L -6 0 L -1.6 -1.6 Z"
            fill="#ffffff"
          />
        </g>
      ))}

      {/* cuore luminoso del fiore */}
      <circle cx="100" cy="142" r="8" fill="#ffffff" opacity="0.95" />
      <circle cx="100" cy="142" r="8" fill="none" stroke="#38bdf8" strokeOpacity="0.7" strokeWidth="1" />
      <circle cx="100" cy="142" r="2.5" fill="#facc15" />
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

      {/* Fiore di loto azzurro di profilo, in sincrono col respiro */}
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
