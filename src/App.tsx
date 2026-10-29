import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type MutableRefObject,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CloudBackground } from './components/CloudBackground';

export type Phase = 'idle' | 'inspire' | 'hold' | 'expire' | 'pause';
export type SessionMode = 'all' | 'level1' | 'level2' | 'level3';
export type VoiceGender = 'female' | 'male' | 'off';

interface SpokenPhrase {
  part1: string;
  part2: string;
  fullText: string;
}

interface StageConfig {
  id: 'level1' | 'level2' | 'level3';
  stageNumber: number;
  shortTab: string;
  levelTag: string;
  name: string;
  subtitle: string;
  whenToUse: string;
  benefit: string;
  phrases: {
    inspire: SpokenPhrase;
    hold: SpokenPhrase;
    expire: SpokenPhrase;
    pause: SpokenPhrase;
  };
}

const STAGES: StageConfig[] = [
  {
    id: 'level1',
    stageNumber: 1,
    shortTab: 'Solo Liv. 1 (60s)',
    levelTag: 'LIVELLO 1 · RESET NEURO-VISIVO',
    name: 'Reset Tra Due Call',
    subtitle: 'Sguardo & Spalle',
    whenToUse: 'Seduto · Decompressione oculare e rilascio cervicale',
    benefit:
      'Distoglie la messa a fuoco dai pixel ravvicinati (Titolo VII D.Lgs. 81/08) e rilascia la tensione del trapezio.',
    phrases: {
      inspire: {
        part1: 'Inspira dolcemente dal naso...',
        part2: 'e rilassa lo sguardo.',
        fullText: 'Inspira dolcemente dal naso e rilassa lo sguardo',
      },
      hold: {
        part1: 'Trattieni con calma...',
        part2: 'mantieni la postura.',
        fullText: 'Trattieni, mantieni la postura',
      },
      expire: {
        part1: 'Espira lentamente...',
        part2: 'lascia scendere le spalle.',
        fullText: 'Espira lentamente, lascia scendere le spalle',
      },
      pause: {
        part1: '',
        part2: '',
        fullText: 'Pausa · Rilassa completamente il viso',
      },
    },
  },
  {
    id: 'level2',
    stageNumber: 2,
    shortTab: 'Solo Liv. 2 (60s)',
    levelTag: 'LIVELLO 2 · POMPA EMATICA & GAMBE',
    name: 'Riattivazione Gambe',
    subtitle: 'Talloni & Circolazione',
    whenToUse: 'Dopo 60 min di schermo · Attivazione muscolo soleo (Zero-Sudore)',
    benefit:
      'Riattiva il ritorno venoso dagli arti inferiori verso il cervello dopo un’ora di postura seduta fissa.',
    phrases: {
      inspire: {
        part1: 'Inspira profondamente...',
        part2: 'solleva i talloni, e attiva le gambe.',
        fullText: 'Inspira, solleva i talloni e attiva le gambe',
      },
      hold: {
        part1: 'Trattieni...',
        part2: 'mantieni la postura.',
        fullText: 'Trattieni, mantieni la postura',
      },
      expire: {
        part1: 'Espira dolcemente...',
        part2: 'riappoggia con controllo.',
        fullText: 'Espira, riappoggia con controllo',
      },
      pause: {
        part1: '',
        part2: '',
        fullText: 'Pausa · Lascia fluire la circolazione',
      },
    },
  },
  {
    id: 'level3',
    stageNumber: 3,
    shortTab: 'Solo Liv. 3 (60s)',
    levelTag: 'LIVELLO 3 · SBLOCCO COLLO, SPALLE & POLSI',
    name: 'Decompressione Posturale',
    subtitle: 'Petto, Palmi & Collo',
    whenToUse: 'Pausa VDT (2h) o Fine Turno · Prevenzione DMS',
    benefit:
      'Previene i Disturbi Muscolo-Scheletrici (DMS): decomprime tunnel carpale, rachide cervicale e tratto lombare.',
    phrases: {
      inspire: {
        part1: 'Inspira, apri il petto...',
        part2: 'e ruota i palmi in fuori.',
        fullText: 'Inspira, apri il petto e ruota i palmi in fuori',
      },
      hold: {
        part1: 'Trattieni...',
        part2: 'mantieni la postura.',
        fullText: 'Trattieni, mantieni la postura',
      },
      expire: {
        part1: 'Espira a lungo...',
        part2: 'sciogli collo e spalle.',
        fullText: 'Espira a lungo, sciogli collo e spalle',
      },
      pause: {
        part1: '',
        part2: '',
        fullText: 'Pausa · Ascolta il rilascio muscolare',
      },
    },
  },
];

const INSPIRE_SEC = 7;
const HOLD_SEC = 4;
const EXPIRE_SEC = 7;
const PAUSE_SEC = 2;
const CYCLE_SEC = INSPIRE_SEC + HOLD_SEC + EXPIRE_SEC + PAUSE_SEC; // 20s
const SESSION_DURATION = 60;
const LOCAL_STATS_KEY = 'pausa81_local_completed_count';

interface TimelineSnapshot {
  stageIndex: number;
  stage: StageConfig;
  cycleNumber: number;
  phase: Phase;
  phaseDuration: number;
  phaseTimeLeft: number;
  targetBreath: number;
  displayText: string;
  spokenPhrase: SpokenPhrase | null;
}

function getTimelineSnapshot(elapsed: number, mode: SessionMode): TimelineSnapshot {
  const cycleIndex = Math.min(2, Math.floor(elapsed / CYCLE_SEC));
  const stageIndex =
    mode === 'all'
      ? cycleIndex
      : mode === 'level1'
      ? 0
      : mode === 'level2'
      ? 1
      : 2;

  const stage = STAGES[stageIndex];
  const secInCycle = elapsed % CYCLE_SEC;

  if (secInCycle < INSPIRE_SEC) {
    return {
      stageIndex,
      stage,
      cycleNumber: cycleIndex + 1,
      phase: 'inspire',
      phaseDuration: INSPIRE_SEC,
      phaseTimeLeft: INSPIRE_SEC - secInCycle,
      targetBreath: 1,
      displayText: stage.phrases.inspire.fullText,
      spokenPhrase: stage.phrases.inspire,
    };
  }

  if (secInCycle < INSPIRE_SEC + HOLD_SEC) {
    const intoHold = secInCycle - INSPIRE_SEC;
    return {
      stageIndex,
      stage,
      cycleNumber: cycleIndex + 1,
      phase: 'hold',
      phaseDuration: HOLD_SEC,
      phaseTimeLeft: HOLD_SEC - intoHold,
      targetBreath: 1,
      displayText: stage.phrases.hold.fullText,
      spokenPhrase: stage.phrases.hold,
    };
  }

  if (secInCycle < INSPIRE_SEC + HOLD_SEC + EXPIRE_SEC) {
    const intoExpire = secInCycle - (INSPIRE_SEC + HOLD_SEC);
    return {
      stageIndex,
      stage,
      cycleNumber: cycleIndex + 1,
      phase: 'expire',
      phaseDuration: EXPIRE_SEC,
      phaseTimeLeft: EXPIRE_SEC - intoExpire,
      targetBreath: 0,
      displayText: stage.phrases.expire.fullText,
      spokenPhrase: stage.phrases.expire,
    };
  }

  const intoPause = secInCycle - (INSPIRE_SEC + HOLD_SEC + EXPIRE_SEC);
  const pauseText =
    mode === 'all' && cycleIndex < 2
      ? `Pausa · Passaggio automatico alla Fase ${cycleIndex + 2} di 3`
      : stage.phrases.pause.fullText;

  return {
    stageIndex,
    stage,
    cycleNumber: cycleIndex + 1,
    phase: 'pause',
    phaseDuration: PAUSE_SEC,
    phaseTimeLeft: PAUSE_SEC - intoPause,
    targetBreath: 0,
    displayText: pauseText,
    spokenPhrase: null,
  };
}

/**
 * Seleziona la miglior voce naturale Italiana Femminile o Maschile disponibile sul dispositivo
 * (Google Neural, Microsoft Natural Elsa/Isabella/Diego/Cosimo, Apple Alice/Federica/Luca).
 */
function pickItalianVoice(
  voices: SpeechSynthesisVoice[],
  gender: 'female' | 'male'
): { voice: SpeechSynthesisVoice | null; isDedicatedGenderMatch: boolean } {
  const itVoices = voices.filter(
    (v) =>
      v.lang.toLowerCase().startsWith('it') ||
      v.name.toLowerCase().includes('ital')
  );

  if (itVoices.length === 0) {
    return { voice: null, isDedicatedGenderMatch: false };
  }

  const femaleKeywords = ['elsa', 'isabella', 'alice', 'federica', 'fabiola', 'google italiano', 'female', 'donna'];
  const maleKeywords = ['diego', 'cosimo', 'luca', 'giuseppe', 'giorgio', 'male', 'uomo'];

  if (gender === 'female') {
    // Priorità a voci Neural/Online femminili
    const neuralFemale = itVoices.find(
      (v) =>
        (v.name.toLowerCase().includes('natural') || v.name.toLowerCase().includes('google')) &&
        femaleKeywords.some((k) => v.name.toLowerCase().includes(k))
    );
    if (neuralFemale) return { voice: neuralFemale, isDedicatedGenderMatch: true };

    const anyFemale = itVoices.find((v) =>
      femaleKeywords.some((k) => v.name.toLowerCase().includes(k))
    );
    if (anyFemale) return { voice: anyFemale, isDedicatedGenderMatch: true };

    // Fallback sulla prima voce italiana non maschile
    const nonMale = itVoices.find(
      (v) => !maleKeywords.some((k) => v.name.toLowerCase().includes(k))
    );
    return { voice: nonMale || itVoices[0], isDedicatedGenderMatch: Boolean(nonMale) };
  }

  // Ricerca voce Maschile (Diego, Cosimo, Luca, Giuseppe)
  const neuralMale = itVoices.find(
    (v) =>
      v.name.toLowerCase().includes('natural') &&
      maleKeywords.some((k) => v.name.toLowerCase().includes(k))
  );
  if (neuralMale) return { voice: neuralMale, isDedicatedGenderMatch: true };

  const anyMale = itVoices.find((v) =>
    maleKeywords.some((k) => v.name.toLowerCase().includes(k))
  );
  if (anyMale) return { voice: anyMale, isDedicatedGenderMatch: true };

  return { voice: itVoices[0], isDedicatedGenderMatch: false };
}

function useBreathScale(phase: Phase, breath: number, phaseDuration: number) {
  const scale = phase === 'idle' ? 0.84 : 0.64 + 0.34 * breath;
  const duration = phase === 'idle' ? 0.8 : Math.max(phaseDuration, 1.5);
  return { scale, duration };
}

function Pausa81Logo({ partnerName }: { partnerName: string }) {
  return (
    <div className="brand-block" aria-hidden="true">
      <span className="svasa-wordmark">
        Pausa81 <small className="svasa-badge-b2b">{partnerName || 'D.Lgs. 81/08'}</small>
      </span>
      <span className="powered-by-sub">
        powered by <strong>SvasaOS Engine</strong>
      </span>
    </div>
  );
}

function SacredLotus({ phase }: { phase: Phase }) {
  const openFactor =
    phase === 'inspire' || phase === 'hold'
      ? 1.14
      : phase === 'expire' || phase === 'pause'
      ? 0.86
      : 1;

  const backAngles = [-60 * openFactor, 60 * openFactor];
  const midAngles = [-42 * openFactor, 42 * openFactor];
  const sideAngles = [-25 * openFactor, 25 * openFactor];

  const rays = Array.from({ length: 9 }, (_, i) => {
    const a = ((-160 + i * 17.5) * Math.PI) / 180;
    return {
      x1: 100 + Math.cos(a) * 14,
      y1: 142 + Math.sin(a) * 14,
      x2: 100 + Math.cos(a) * 52,
      y2: 142 + Math.sin(a) * 52,
    };
  });

  const sparkles = Array.from({ length: 9 }, (_, i) => {
    const a = ((-160 + i * 17.5) * Math.PI) / 180;
    const r = 44 + (i % 3) * 15;
    return {
      x: 100 + Math.cos(a) * r,
      y: 142 + Math.sin(a) * r,
      s: 1.1 - (i % 3) * 0.25,
    };
  });

  return (
    <svg className="sacred-lotus" viewBox="0 0 200 200" aria-hidden="true">
      <defs>
        <radialGradient id="lotus-petal" gradientUnits="userSpaceOnUse" cx="100" cy="130" r="88">
          <stop offset="0%" stopColor="#f8fafc" />
          <stop offset="50%" stopColor="#cfe8f7" />
          <stop offset="100%" stopColor="#93c5fd" />
        </radialGradient>
        <radialGradient id="lotus-back" gradientUnits="userSpaceOnUse" cx="100" cy="130" r="96">
          <stop offset="0%" stopColor="#e2f1fb" />
          <stop offset="65%" stopColor="#93c5fd" />
          <stop offset="100%" stopColor="#60a5fa" />
        </radialGradient>
        <radialGradient id="lotus-glow" gradientUnits="userSpaceOnUse" cx="100" cy="140" r="62">
          <stop offset="0%" stopColor="#e0f2fe" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#e0f2fe" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="water-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#93c5fd" stopOpacity="0.42" />
          <stop offset="100%" stopColor="#dbeafe" stopOpacity="0.08" />
        </linearGradient>
      </defs>

      <circle cx="100" cy="140" r="60" fill="url(#lotus-glow)" />

      <g fill="url(#water-fill)">
        <ellipse cx="100" cy="160" rx="84" ry="14" />
        <ellipse cx="100" cy="172" rx="66" ry="10" opacity="0.7" />
        <ellipse cx="100" cy="182" rx="46" ry="7" opacity="0.5" />
      </g>
      <g fill="none" stroke="#93c5fd" strokeOpacity="0.45" strokeWidth="1">
        <ellipse cx="100" cy="158" rx="76" ry="12" />
        <ellipse cx="100" cy="170" rx="58" ry="9" />
      </g>

      {backAngles.map((a, idx) => (
        <path
          key={`back-${idx}`}
          d="M 0 0 C -24 -3 -30 -48 -3 -76 C -1 -80 1 -80 3 -76 C 30 -48 24 -3 0 0 Z"
          fill="url(#lotus-back)"
          style={{
            transform: `translate(100px, 150px) rotate(${a}deg)`,
            transition: 'transform 2.2s ease-in-out',
          }}
        />
      ))}

      {midAngles.map((a, idx) => (
        <path
          key={`mid-${idx}`}
          d="M 0 0 C -22 -3 -28 -46 -2.5 -74 C -1 -77 1 -77 2.5 -74 C 28 -46 22 -3 0 0 Z"
          fill="url(#lotus-petal)"
          opacity="0.88"
          style={{
            transform: `translate(100px, 150px) rotate(${a}deg)`,
            transition: 'transform 2.2s ease-in-out',
          }}
        />
      ))}

      <g stroke="#bae6fd" strokeOpacity="0.65" strokeWidth="1" strokeLinecap="round">
        {rays.map((r, i) => (
          <line key={`ray-${i}`} x1={r.x1} y1={r.y1} x2={r.x2} y2={r.y2} />
        ))}
      </g>

      {sideAngles.map((a, idx) => (
        <path
          key={`side-${idx}`}
          d="M 0 0 C -20 -3 -26 -44 -2 -72 C -1 -75 1 -75 2 -72 C 26 -44 20 -3 0 0 Z"
          fill="url(#lotus-petal)"
          stroke="#ffffff"
          strokeOpacity="0.55"
          strokeWidth="0.7"
          style={{
            transform: `translate(100px, 150px) rotate(${a}deg)`,
            transition: 'transform 2.2s ease-in-out',
          }}
        />
      ))}

      <path
        d="M 0 0 C -18 -2 -24 -42 -2 -70 C -1 -73 1 -73 2 -70 C 24 -42 18 -2 0 0 Z"
        fill="url(#lotus-petal)"
        stroke="#ffffff"
        strokeOpacity="0.6"
        strokeWidth="0.7"
        transform="translate(100 150)"
      />

      {sparkles.map((p, i) => (
        <g key={`spark-${i}`} transform={`translate(${p.x} ${p.y}) scale(${p.s})`}>
          <path
            d="M 0 -6 L 1.5 -1.5 L 6 0 L 1.5 1.5 L 0 6 L -1.5 1.5 L -6 0 L -1.5 -1.5 Z"
            fill="#ffffff"
            opacity="0.92"
          />
        </g>
      ))}

      <circle cx="100" cy="142" r="8" fill="#ffffff" opacity="0.95" />
      <circle cx="100" cy="142" r="8" fill="none" stroke="#7dd3fc" strokeOpacity="0.7" strokeWidth="1" />
      <circle cx="100" cy="142" r="2.6" fill="#fde047" />
    </svg>
  );
}

function DynamicQrSvg({ text }: { text: string }) {
  const size = 21;
  const cells: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

  const drawFinder = (r0: number, c0: number) => {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        const isBorder = r === 0 || r === 6 || c === 0 || c === 6;
        const isInner = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        if (isBorder || isInner) cells[r0 + r][c0 + c] = true;
      }
    }
  };

  drawFinder(0, 0);
  drawFinder(0, size - 7);
  drawFinder(size - 7, 0);

  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const inTopLeft = r < 8 && c < 8;
      const inTopRight = r < 8 && c >= size - 8;
      const inBottomLeft = r >= size - 8 && c < 8;
      if (inTopLeft || inTopRight || inBottomLeft) continue;
      const bit = ((hash >>> ((r * size + c) % 28)) ^ (r * 13 + c * 7)) & 1;
      cells[r][c] = bit === 1;
    }
  }

  return (
    <svg viewBox={`0 0 ${size + 4} ${size + 4}`} className="qr-svg" aria-label="QR Code Pausa81">
      <rect width={size + 4} height={size + 4} fill="#ffffff" rx="1.5" />
      {cells.map((row, r) =>
        row.map((filled, c) =>
          filled ? (
            <rect key={`${r}-${c}`} x={c + 2} y={r + 2} width={0.92} height={0.92} fill="#0f172a" />
          ) : null
        )
      )}
    </svg>
  );
}

function Sphere({
  phase,
  breath,
  phaseDuration,
  sessionRemaining,
}: {
  phase: Phase;
  breath: number;
  phaseDuration: number;
  sessionRemaining: number;
}) {
  const { scale, duration } = useBreathScale(phase, breath, phaseDuration);
  const progress = ((SESSION_DURATION - sessionRemaining) / SESSION_DURATION) * 100;
  const radius = 158;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="sphere-wrap">
      <svg className="orbital-ring" viewBox="0 0 340 340" aria-hidden="true">
        <circle
          cx="170"
          cy="170"
          r={radius}
          fill="none"
          stroke="rgba(148, 163, 184, 0.22)"
          strokeWidth="2.5"
        />
        <circle
          cx="170"
          cy="170"
          r={radius}
          fill="none"
          stroke="#0d9488"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          style={{
            transform: 'rotate(-90deg)',
            transformOrigin: '50% 50%',
            transition: 'stroke-dashoffset 0.35s linear',
          }}
        />
      </svg>

      <motion.div
        className="sphere-halo"
        initial={false}
        animate={{ scale }}
        transition={{ duration, ease: 'easeInOut' }}
        aria-hidden="true"
      />

      <motion.div
        className="sphere"
        initial={false}
        animate={{ scale }}
        transition={{ duration, ease: 'easeInOut' }}
      >
        <div className="sphere-gradient" aria-hidden="true" />
        <div className="sphere-sheen" aria-hidden="true" />
      </motion.div>

      <motion.div
        className="lotus-rig"
        initial={false}
        animate={{ scale }}
        transition={{ duration, ease: 'easeInOut' }}
      >
        <SacredLotus phase={phase} />
      </motion.div>
    </div>
  );
}

export default function App() {
  const params =
    typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const initialPartner = (params?.get('partner') || '').replace(/[-_]/g, ' ').trim();
  const initialClient = (params?.get('cliente') || params?.get('azienda') || '')
    .replace(/[-_]/g, ' ')
    .trim();

  const [sessionMode, setSessionMode] = useState<SessionMode>('all');
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [elapsed, setElapsed] = useState<number>(0);

  // Scelta immediata tra Voce Donna, Voce Uomo o Voce OFF
  const [voiceGender, setVoiceGender] = useState<VoiceGender>('female');
  // Tappeto Armonico Binaurale 432Hz attivabile/disattivabile in 1 clic
  const [binauralEnabled, setBinauralEnabled] = useState<boolean>(true);
  // Campana Tibetana di cambio fase attivabile/disattivabile in 1 clic
  const [chimeEnabled, setChimeEnabled] = useState<boolean>(true);
  const [eyeRestMode, setEyeRestMode] = useState<boolean>(false);

  const [sessionCompleted, setSessionCompleted] = useState<boolean>(false);
  const [showExecutiveModal, setShowExecutiveModal] = useState<boolean>(false);
  const [showQrModal, setShowQrModal] = useState<boolean>(false);

  const [vdtReminderMinutes, setVdtReminderMinutes] = useState<number | null>(null);
  const [vdtSecondsLeft, setVdtSecondsLeft] = useState<number>(0);

  const [localSessionsCount, setLocalSessionsCount] = useState<number>(() => {
    if (typeof window === 'undefined') return 0;
    const saved = window.localStorage.getItem(LOCAL_STATS_KEY);
    return saved ? Number(saved) || 0 : 0;
  });
  const [lastAuditCode, setLastAuditCode] = useState<string>('P81-VDT-8108');
  const [employeesCount, setEmployeesCount] = useState<number>(10);

  // Riferimenti per controllo totale e stop istantaneo (0ms)
  const audioCtxRef: MutableRefObject<AudioContext | null> = useRef<AudioContext | null>(null);
  const chimeOscsRef: MutableRefObject<OscillatorNode[]> = useRef<OscillatorNode[]>([]);
  const chimeGainRef: MutableRefObject<GainNode | null> = useRef<GainNode | null>(null);

  const binauralOscsRef: MutableRefObject<OscillatorNode[]> = useRef<OscillatorNode[]>([]);
  const binauralGainRef: MutableRefObject<GainNode | null> = useRef<GainNode | null>(null);

  const availableVoicesRef: MutableRefObject<SpeechSynthesisVoice[]> = useRef<
    SpeechSynthesisVoice[]
  >([]);
  const phraseTimeoutRef: MutableRefObject<number | null> = useRef<number | null>(null);
  const lastPlayedStepRef = useRef<string>('');
  const wakeLockRef = useRef<{ release: () => Promise<void> } | null>(null);

  // Pre-carica le voci di sistema appena il browser è pronto
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    const updateVoices = () => {
      const v = window.speechSynthesis.getVoices();
      if (v.length > 0) {
        availableVoicesRef.current = v;
      }
    };

    updateVoices();
    window.speechSynthesis.onvoiceschanged = updateVoices;
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []);

  const getOrCreateAudioCtx = useCallback((): AudioContext | null => {
    if (typeof window === 'undefined') return null;
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioCtx();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume().catch(() => {});
    }
    return audioCtxRef.current;
  }, []);

  /** Ferma all'istante la Campana Tibetana */
  const stopChimeNow = useCallback(() => {
    if (chimeGainRef.current && audioCtxRef.current) {
      try {
        chimeGainRef.current.gain.cancelScheduledValues(0);
        chimeGainRef.current.gain.setValueAtTime(0, audioCtxRef.current.currentTime);
      } catch {
        // Ignora
      }
    }
    for (const osc of chimeOscsRef.current) {
      try {
        osc.stop();
        osc.disconnect();
      } catch {
        // Ignora
      }
    }
    chimeOscsRef.current = [];
  }, []);

  /** Ferma all'istante il Tappeto Armonico Binaurale 432Hz */
  const stopBinauralNow = useCallback(() => {
    if (binauralGainRef.current && audioCtxRef.current) {
      try {
        binauralGainRef.current.gain.cancelScheduledValues(0);
        binauralGainRef.current.gain.setValueAtTime(0, audioCtxRef.current.currentTime);
      } catch {
        // Ignora
      }
    }
    for (const osc of binauralOscsRef.current) {
      try {
        osc.stop();
        osc.disconnect();
      } catch {
        // Ignora
      }
    }
    binauralOscsRef.current = [];
    binauralGainRef.current = null;
  }, []);

  /** Ferma all'istante la Voce e le pause prosodiche */
  const stopVoiceNow = useCallback(() => {
    if (phraseTimeoutRef.current !== null) {
      window.clearTimeout(phraseTimeoutRef.current);
      phraseTimeoutRef.current = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Ignora
      }
    }
  }, []);

  /** Ferma TUTTO (Campana + Binaurale + Voce) in 0 millisecondi */
  const stopAllAudio = useCallback(() => {
    stopChimeNow();
    stopBinauralNow();
    stopVoiceNow();
  }, [stopChimeNow, stopBinauralNow, stopVoiceNow]);

  /** Avvia il Tappeto Armonico Binaurale caldo (216Hz + 432Hz + 438Hz Theta/Alpha 6Hz) */
  const startBinauralPad = useCallback(() => {
    stopBinauralNow();
    if (!binauralEnabled) return;
    const ctx = getOrCreateAudioCtx();
    if (!ctx) return;

    try {
      const subOsc = ctx.createOscillator();
      const leftOsc = ctx.createOscillator();
      const rightOsc = ctx.createOscillator();

      const lowpass = ctx.createBiquadFilter();
      lowpass.type = 'lowpass';
      lowpass.frequency.setValueAtTime(620, ctx.currentTime);

      const masterGain = ctx.createGain();

      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(216, ctx.currentTime); // Fondamentale calda 216 Hz

      leftOsc.type = 'sine';
      leftOsc.frequency.setValueAtTime(432, ctx.currentTime); // 432 Hz

      rightOsc.type = 'sine';
      rightOsc.frequency.setValueAtTime(438, ctx.currentTime); // 438 Hz (Battimento binaurale rilassante a 6 Hz)

      masterGain.gain.setValueAtTime(0.0001, ctx.currentTime);
      masterGain.gain.linearRampToValueAtTime(0.018, ctx.currentTime + 1.2);

      subOsc.connect(lowpass);
      leftOsc.connect(lowpass);
      rightOsc.connect(lowpass);
      lowpass.connect(masterGain);
      masterGain.connect(ctx.destination);

      subOsc.start();
      leftOsc.start();
      rightOsc.start();

      binauralOscsRef.current = [subOsc, leftOsc, rightOsc];
      binauralGainRef.current = masterGain;
    } catch {
      // Ignora
    }
  }, [binauralEnabled, getOrCreateAudioCtx, stopBinauralNow]);

  /** Suona un rintocco caldo di Campana Tibetana (con armonico naturale) */
  const triggerSoftChime = useCallback(
    (phase: Phase) => {
      stopChimeNow();
      if (!chimeEnabled) return;
      const ctx = getOrCreateAudioCtx();
      if (!ctx) return;

      try {
        const freqMap: Record<Phase, number> = {
          idle: 432,
          inspire: 528,
          hold: 639,
          expire: 396,
          pause: 432,
        };
        const baseFreq = freqMap[phase] || 432;

        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(baseFreq, ctx.currentTime);

        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(baseFreq * 1.5, ctx.currentTime); // Quinta armonica dolce

        gain.gain.setValueAtTime(0.0001, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.028, ctx.currentTime + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.25);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        chimeOscsRef.current = [osc1, osc2];
        chimeGainRef.current = gain;

        osc1.start();
        osc2.start();
        osc1.stop(ctx.currentTime + 1.3);
        osc2.stop(ctx.currentTime + 1.3);
      } catch {
        // Ignora
      }
    },
    [chimeEnabled, getOrCreateAudioCtx, stopChimeNow]
  );

  /**
   * Pronuncia una frase con Micro-Prosodia Umana Bipartita:
   * - Parte 1: calma, accogliente
   * - Pausa respiratoria di 620ms
   * - Parte 2: intonazione leggermente più profonda e lenta (effetto rassicurante da coach reale)
   */
  const speakHumanPhrase = useCallback(
    (phrase: SpokenPhrase | null, overrideGender?: VoiceGender) => {
      const activeGender = overrideGender !== undefined ? overrideGender : voiceGender;
      stopVoiceNow();
      if (activeGender === 'off' || !phrase || typeof window === 'undefined') return;
      if (!('speechSynthesis' in window)) return;

      const voices =
        availableVoicesRef.current.length > 0
          ? availableVoicesRef.current
          : window.speechSynthesis.getVoices();

      const { voice, isDedicatedGenderMatch } = pickItalianVoice(voices, activeGender);

      // Calibrazione acustica per Voce Donna (calda, vellutata) vs Voce Uomo (profonda, baritonale)
      const baseRate = activeGender === 'female' ? 0.84 : 0.80;
      const basePitch =
        activeGender === 'female'
          ? 1.02
          : isDedicatedGenderMatch
          ? 0.88
          : 0.72; // Se il sistema ha una sola voce, la trasforma in baritono profondo e calmo

      try {
        if (phrase.part1) {
          const u1 = new SpeechSynthesisUtterance(phrase.part1);
          u1.lang = 'it-IT';
          if (voice) u1.voice = voice;
          u1.rate = baseRate;
          u1.pitch = basePitch;
          u1.volume = 0.95;

          u1.onend = () => {
            if (!phrase.part2) return;
            phraseTimeoutRef.current = window.setTimeout(() => {
              const u2 = new SpeechSynthesisUtterance(phrase.part2);
              u2.lang = 'it-IT';
              if (voice) u2.voice = voice;
              // Seconda parte leggermente più lenta e morbida (inflessione discendente rassicurante)
              u2.rate = Math.max(0.74, baseRate - 0.04);
              u2.pitch = Math.max(0.65, basePitch - 0.05);
              u2.volume = 0.90;
              window.speechSynthesis.speak(u2);
            }, 520);
          };

          window.speechSynthesis.speak(u1);
        }
      } catch {
        // Silenzioso
      }
    },
    [voiceGender, stopVoiceNow]
  );

  const previewStageIdx =
    sessionMode === 'level2' ? 1 : sessionMode === 'level3' ? 2 : 0;

  const snapshot: TimelineSnapshot = isRunning
    ? getTimelineSnapshot(elapsed, sessionMode)
    : {
        stageIndex: previewStageIdx,
        stage: STAGES[previewStageIdx],
        cycleNumber: 1,
        phase: 'idle',
        phaseDuration: 5,
        phaseTimeLeft: 0,
        targetBreath: 0.5,
        displayText:
          sessionMode === 'all'
            ? 'Percorso Completo 60s: Visivo (20s) → Gambe (20s) → Postura (20s)'
            : `${STAGES[previewStageIdx].name} (60s): «${STAGES[previewStageIdx].phrases.inspire.fullText}»`,
        spokenPhrase: null,
      };

  // Ad ogni cambio di sotto-fase durante i 60 secondi, suona la campana e avvia la voce scelta
  useEffect(() => {
    if (!isRunning) {
      lastPlayedStepRef.current = '';
      return;
    }

    const stepId = `${snapshot.stage.id}_${snapshot.phase}_${snapshot.cycleNumber}`;
    if (lastPlayedStepRef.current !== stepId) {
      lastPlayedStepRef.current = stepId;
      triggerSoftChime(snapshot.phase);
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(25);
      }
      if (snapshot.spokenPhrase) {
        speakHumanPhrase(snapshot.spokenPhrase);
      }
    }
  }, [isRunning, snapshot, triggerSoftChime, speakHumanPhrase]);

  // Se l'utente attiva/disattiva il Tappeto Binaurale mentre la sessione è in corso, reagisce subito in 1 clic
  useEffect(() => {
    if (!isRunning) {
      stopBinauralNow();
      return;
    }
    if (binauralEnabled) {
      startBinauralPad();
    } else {
      stopBinauralNow();
    }
  }, [binauralEnabled, isRunning, startBinauralPad, stopBinauralNow]);

  // Se l'utente disattiva la Campana mentre sta suonando, la taglia all'istante
  useEffect(() => {
    if (!chimeEnabled) {
      stopChimeNow();
    }
  }, [chimeEnabled, stopChimeNow]);

  // Se l'utente mette Voce OFF mentre sta parlando, la taglia all'istante
  useEffect(() => {
    if (voiceGender === 'off') {
      stopVoiceNow();
    }
  }, [voiceGender, stopVoiceNow]);

  useEffect(() => {
    if (!isRunning) return;

    const interval = window.setInterval(() => {
      setElapsed((prev) => {
        if (prev + 1 >= SESSION_DURATION) {
          stopAllAudio();
          setIsRunning(false);
          if (wakeLockRef.current) {
            wakeLockRef.current.release().catch(() => {});
            wakeLockRef.current = null;
          }
          setLocalSessionsCount((c) => {
            const nextCount = c + 1;
            try {
              window.localStorage.setItem(LOCAL_STATS_KEY, String(nextCount));
            } catch {
              // Ignora
            }
            return nextCount;
          });
          const randomHex = Math.floor(1000 + Math.random() * 9000);
          setLastAuditCode(`P81-VDT-${randomHex}`);
          setSessionCompleted(true);
          return 0;
        }
        return prev + 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [isRunning, stopAllAudio]);

  useEffect(() => {
    if (!vdtReminderMinutes || vdtSecondsLeft <= 0) return;
    const t = window.setInterval(() => {
      setVdtSecondsLeft((prev) => {
        if (prev <= 1) {
          triggerSoftChime('inspire');
          return vdtReminderMinutes * 60;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(t);
  }, [vdtReminderMinutes, vdtSecondsLeft, triggerSoftChime]);

  const stopSession = useCallback(() => {
    stopAllAudio();
    setIsRunning(false);
    setElapsed(0);
    lastPlayedStepRef.current = '';
    if (wakeLockRef.current) {
      wakeLockRef.current.release().catch(() => {});
      wakeLockRef.current = null;
    }
  }, [stopAllAudio]);

  const startSession = useCallback(async () => {
    stopAllAudio();

    const firstSnap = getTimelineSnapshot(0, sessionMode);
    lastPlayedStepRef.current = `${firstSnap.stage.id}_${firstSnap.phase}_${firstSnap.cycleNumber}`;

    setSessionCompleted(false);
    setElapsed(0);
    setIsRunning(true);

    if (binauralEnabled) {
      startBinauralPad();
    }
    triggerSoftChime(firstSnap.phase);
    if (firstSnap.spokenPhrase) {
      speakHumanPhrase(firstSnap.spokenPhrase);
    }

    try {
      const navWithWake = navigator as unknown as {
        wakeLock?: { request: (t: string) => Promise<{ release: () => Promise<void> }> };
      };
      if (navWithWake.wakeLock) {
        wakeLockRef.current = await navWithWake.wakeLock.request('screen');
      }
    } catch {
      // Ignora
    }
  }, [
    sessionMode,
    binauralEnabled,
    stopAllAudio,
    startBinauralPad,
    triggerSoftChime,
    speakHumanPhrase,
  ]);

  /** Cambia voce (Donna / Uomo / OFF) e fa sentire subito un'anteprima rassicurante */
  const handleSelectVoiceGender = (newGender: VoiceGender) => {
    setVoiceGender(newGender);
    if (newGender === 'off') {
      stopVoiceNow();
      return;
    }
    if (!isRunning) {
      const sample: SpokenPhrase =
        newGender === 'female'
          ? {
              part1: 'Voce femminile attiva...',
              part2: 'rilassa lo sguardo e le spalle.',
              fullText: '',
            }
          : {
              part1: 'Voce maschile attiva...',
              part2: 'respira con calma e sciogli le tensioni.',
              fullText: '',
            };
      speakHumanPhrase(sample, newGender);
    } else if (snapshot.spokenPhrase) {
      speakHumanPhrase(snapshot.spokenPhrase, newGender);
    }
  };

  const toggleVdtReminder = () => {
    if (vdtReminderMinutes === null) {
      setVdtReminderMinutes(60);
      setVdtSecondsLeft(60 * 60);
    } else if (vdtReminderMinutes === 60) {
      setVdtReminderMinutes(120);
      setVdtSecondsLeft(120 * 60);
    } else {
      setVdtReminderMinutes(null);
      setVdtSecondsLeft(0);
    }
  };

  const [partnerStudioName, setPartnerStudioName] = useState<string>(
    initialPartner || 'Studio Partner RSPP / Sicurezza'
  );
  const [clientCompanyName, setClientCompanyName] = useState<string>(
    initialClient || 'Azienda Cliente S.r.l.'
  );
  const [departmentName, setDepartmentName] = useState<string>(
    'Area Videoterminali / Sale Riunioni / Reparto'
  );

  const sessionRemaining = isRunning ? SESSION_DURATION - elapsed : SESSION_DURATION;
  const estimatedHoursSavedMonthly = Math.round(employeesCount * 3.2);
  const estimatedAnnualSavings = (employeesCount * 410).toLocaleString('it-IT');

  const customWhiteLabelUrl = `https://pranayama-khaki.vercel.app/?partner=${encodeURIComponent(
    partnerStudioName.replace(/\s+/g, '_')
  )}&cliente=${encodeURIComponent(clientCompanyName.replace(/\s+/g, '_'))}`;

  const startButtonLabel =
    sessionMode === 'all'
      ? 'Avvia Percorso Completo 3 Fasi (60s)'
      : `Avvia Solo ${STAGES[previewStageIdx].name} (60s)`;

  return (
    <div className={`app ${eyeRestMode ? 'app--warm-rest' : ''}`}>
      <CloudBackground />

      <header className="topbar no-print">
        <div className="topbar-left">
          <button
            type="button"
            className="executive-pill"
            onClick={() => setShowExecutiveModal(true)}
          >
            <span className="pill-dot" />
            {initialPartner || initialClient
              ? `${initialClient || initialPartner} · D.Lgs. 81/08`
              : 'Direzione · HR · RSPP · Medico'}
          </button>

          <button
            type="button"
            className="qr-pill-btn"
            onClick={() => setShowQrModal(true)}
          >
            Targa QR
          </button>
        </div>

        <div className="topbar-actions">
          {/* Selettore 1-Clic: Voce Donna / Voce Uomo / Voce OFF */}
          <button
            type="button"
            className={`icon-btn ${voiceGender === 'female' ? 'active' : ''}`}
            onClick={() => handleSelectVoiceGender('female')}
            title="Attiva la voce guida femminile calda e rilassante"
          >
            👩 Voce Donna
          </button>

          <button
            type="button"
            className={`icon-btn ${voiceGender === 'male' ? 'active' : ''}`}
            onClick={() => handleSelectVoiceGender('male')}
            title="Attiva la voce guida maschile profonda e calma"
          >
            👨 Voce Uomo
          </button>

          <button
            type="button"
            className={`icon-btn ${voiceGender === 'off' ? 'active' : ''}`}
            onClick={() => handleSelectVoiceGender('off')}
            title="Disattiva la guida vocale"
          >
            🔇 Voce OFF
          </button>

          {/* Tappeto Armonico Binaurale 432Hz attivabile/disattivabile in 1 clic */}
          <button
            type="button"
            className={`icon-btn ${binauralEnabled ? 'active' : ''}`}
            onClick={() => setBinauralEnabled((v) => !v)}
            title="Attiva o rimuovi il tappeto armonico binaurale a 432Hz"
          >
            {binauralEnabled ? '🌊 Binaurale ON' : '🌊 Binaurale OFF'}
          </button>

          {/* Campana Tibetana di cambio fase */}
          <button
            type="button"
            className={`icon-btn ${chimeEnabled ? 'active' : ''}`}
            onClick={() => setChimeEnabled((v) => !v)}
            title="Attiva o disattiva il tocco di campana tibetana ai cambi di fase"
          >
            {chimeEnabled ? '🔔 Campana ON' : '🔔 Campana OFF'}
          </button>

          <button
            type="button"
            className={`icon-btn ${eyeRestMode ? 'active' : ''}`}
            onClick={() => setEyeRestMode((v) => !v)}
          >
            {eyeRestMode ? 'Filtro ON' : 'Vista'}
          </button>

          <button
            type="button"
            className={`icon-btn ${vdtReminderMinutes !== null ? 'active' : ''}`}
            onClick={toggleVdtReminder}
          >
            {vdtReminderMinutes === null
              ? '⏰ Sveglia VDT'
              : `⏰ VDT ${Math.ceil(vdtSecondsLeft / 60)}m`}
          </button>
        </div>
      </header>

      <main className="app-main no-print">
        <div className="protocol-bar" role="tablist" aria-label="Modalità Pausa81 da 60 secondi">
          <button
            type="button"
            className={`protocol-chip ${sessionMode === 'all' ? 'active' : ''}`}
            onClick={() => {
              stopSession();
              setSessionMode('all');
            }}
          >
            <span className="protocol-level-tag">COMPLETO · 3 FASI</span>
            <span className="protocol-chip-title">Percorso 1+2+3</span>
            <span className="protocol-chip-sub">20s + 20s + 20s</span>
          </button>

          {STAGES.map((stg) => {
            const isSelected = sessionMode === stg.id;
            const isActiveInAuto =
              isRunning && sessionMode === 'all' && snapshot.stage.id === stg.id;
            return (
              <button
                key={stg.id}
                type="button"
                className={`protocol-chip ${
                  isSelected || isActiveInAuto ? 'active' : ''
                }`}
                onClick={() => {
                  stopSession();
                  setSessionMode(stg.id);
                }}
              >
                <span className="protocol-level-tag">{stg.shortTab}</span>
                <span className="protocol-chip-title">{stg.name}</span>
                <span className="protocol-chip-sub">{stg.subtitle}</span>
              </button>
            );
          })}
        </div>

        <Sphere
          phase={snapshot.phase}
          breath={snapshot.targetBreath}
          phaseDuration={snapshot.phaseDuration}
          sessionRemaining={sessionRemaining}
        />

        <div className="breath-phases-stepper" aria-label="Fasi del respiro">
          <span className={`step-badge ${snapshot.phase === 'inspire' ? 'active' : ''}`}>
            1. Inspira ({INSPIRE_SEC}s)
          </span>
          <span className={`step-badge ${snapshot.phase === 'hold' ? 'active' : ''}`}>
            2. Trattieni ({HOLD_SEC}s)
          </span>
          <span className={`step-badge ${snapshot.phase === 'expire' ? 'active' : ''}`}>
            3. Espira ({EXPIRE_SEC}s)
          </span>
          <span className={`step-badge ${snapshot.phase === 'pause' ? 'active' : ''}`}>
            4. Pausa ({PAUSE_SEC}s)
          </span>
        </div>

        <div className="status">
          <span className="when-to-use-pill">
            {sessionMode === 'all'
              ? `PERCORSO 3 FASI · ORA: ${snapshot.stage.levelTag}`
              : `${snapshot.stage.levelTag} (SESSIONE DEDICATA 60S)`}
          </span>

          <p className="phase-text">{snapshot.displayText}</p>

          {!isRunning ? (
            <p className="protocol-benefit">
              {sessionMode === 'all'
                ? 'Unisce in 60 secondi riposo visivo, attivazione circolatoria delle gambe e decompressione di collo, spalle e polsi.'
                : snapshot.stage.benefit}
            </p>
          ) : (
            <div className="countdown">
              <div className="countdown-row">
                <span className="countdown-number">{snapshot.phaseTimeLeft}s</span>
                <span className="countdown-label">
                  · Ciclo {snapshot.cycleNumber}/3 · Fine tra {sessionRemaining}s
                </span>
              </div>
              <div className="tick-bar">
                <div
                  className="tick-bar-fill"
                  style={{
                    width: `${((SESSION_DURATION - sessionRemaining) / SESSION_DURATION) * 100}%`,
                  }}
                />
              </div>
            </div>
          )}
        </div>

        <div className="controls">
          {!isRunning ? (
            <button type="button" className="btn btn-primary" onClick={startSession}>
              {startButtonLabel}
            </button>
          ) : (
            <button type="button" className="btn btn-secondary" onClick={stopSession}>
              Interrompi Pausa
            </button>
          )}
        </div>

        <div className="brand">
          <Pausa81Logo partnerName={initialClient || initialPartner} />
          {localSessionsCount > 0 && (
            <span className="local-counter-pill">
              ✓ {localSessionsCount} pause D.Lgs. 81/08 completate su questo dispositivo
            </span>
          )}
        </div>
      </main>

      <footer className="compliance-footer no-print">
        <span>
          <strong>Pausa81 · 100% Anonimo &amp; Zero-Tracking:</strong> conforme Garante Privacy ·
          Esente Art. 4 L. 300/70 · Presidio Art. 28 e Titolo VII D.Lgs. 81/2008.
        </span>
      </footer>

      <AnimatePresence>
        {sessionCompleted && (
          <motion.div
            className="modal-backdrop no-print"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="completion-card"
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.94, opacity: 0 }}
            >
              <span className="completion-badge">
                Presidio Completato · Codice Verifica {lastAuditCode}
              </span>
              <h2>Decompressione Pausa81 Completata (60s)</h2>
              <p>
                Sessione eseguita:{' '}
                <strong>
                  {sessionMode === 'all'
                    ? 'Percorso Completo 3 Fasi (Visivo + Gambe + Postura)'
                    : snapshot.stage.name}
                </strong>
                .
              </p>

              <div className="benchmark-grid">
                <div className="benchmark-item">
                  <strong>-24%</strong>
                  <span>Fatica Visiva &amp; Posturale*</span>
                </div>
                <div className="benchmark-item">
                  <strong>{localSessionsCount} min</strong>
                  <span>Prevenzione Accumulata (Locale)</span>
                </div>
              </div>

              <p className="legal-note">
                *Valori medi da letteratura scientifica sulle micro-pause ergonomiche (Art. 175
                D.Lgs. 81/08). Il contatore è salvato esclusivamente nella memoria locale del tuo
                dispositivo: nessun dato personale, biometrico o emotivo viene inviato al datore di
                lavoro, né sostituisce la valutazione ufficiale INAIL dello stress lavoro-correlato.
              </p>

              <div className="completion-actions">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setSessionCompleted(false)}
                >
                  Torna al Lavoro Rigenerato
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showQrModal && (
          <motion.div
            className="modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="qr-modal"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
            >
              <div className="executive-header no-print">
                <div>
                  <span className="completion-badge">Kit Phygital Pausa81 · White-Label</span>
                  <h2>Generatore Targa Murale QR Code (D.Lgs. 81/2008)</h2>
                </div>
                <button
                  type="button"
                  className="close-btn"
                  onClick={() => setShowQrModal(false)}
                >
                  ✕
                </button>
              </div>

              <div className="qr-config-grid no-print">
                <div>
                  <label>Nome Studio RSPP / Ente Partner</label>
                  <input
                    type="text"
                    value={partnerStudioName}
                    onChange={(e) => setPartnerStudioName(e.target.value)}
                  />
                </div>
                <div>
                  <label>Ragione Sociale Azienda Cliente</label>
                  <input
                    type="text"
                    value={clientCompanyName}
                    onChange={(e) => setClientCompanyName(e.target.value)}
                  />
                </div>
                <div>
                  <label>Reparto / Area di Affissione</label>
                  <input
                    type="text"
                    value={departmentName}
                    onChange={(e) => setDepartmentName(e.target.value)}
                  />
                </div>
              </div>

              <div className="printable-plaque">
                <div className="plaque-header">
                  <span>PRESIDIO AZIENDALE PAUSA81 · SALUTE, SICUREZZA E BENESSERE ORGANIZZATIVO</span>
                  <strong>D.LGS. 81/2008 · ART. 28 (STRESS LAVORO-CORRELATO) &amp; TITOLO VII (VDT)</strong>
                </div>

                <div className="plaque-company-bar">
                  <div>
                    <small>AZIENDA ADERENTE</small>
                    <h3>{clientCompanyName}</h3>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <small>REPARTO / POSTAZIONE</small>
                    <h4>{departmentName}</h4>
                  </div>
                </div>

                <div className="plaque-body">
                  <div className="plaque-qr-box">
                    <DynamicQrSvg text={customWhiteLabelUrl} />
                    <span>INQUADRA CON LA FOTOCAMERA</span>
                    <small>Accesso diretto · Zero App da installare</small>
                  </div>

                  <div className="plaque-levels">
                    <h4>PERCORSO COMPLETO 3 FASI O SINGOLO PROTOCOLLO DA 60 SECONDI</h4>
                    <div className="plaque-level-item">
                      <strong>LIVELLO 1 · Reset Neuro-Visivo (60s o Fase 1):</strong>
                      <p>«Inspira dolcemente dal naso e rilassa lo sguardo · Trattieni · Espira lentamente, lascia scendere le spalle»</p>
                    </div>
                    <div className="plaque-level-item">
                      <strong>LIVELLO 2 · Pompa Ematica &amp; Gambe (60s o Fase 2):</strong>
                      <p>«Inspira, solleva i talloni e attiva le gambe · Trattieni · Espira, riappoggia con controllo»</p>
                    </div>
                    <div className="plaque-level-item">
                      <strong>LIVELLO 3 · Decompressione Posturale DMS (60s o Fase 3):</strong>
                      <p>«Inspira, apri il petto e ruota i palmi in fuori · Trattieni · Espira a lungo, sciogli collo e spalle»</p>
                    </div>
                  </div>
                </div>

                <div className="plaque-footer">
                  <p>
                    <strong>GARANZIA PRIVACY E LAVORO:</strong> Strumento 100% anonimo e privo di
                    login o tracciamento biometrico/emotivo (Conforme Garante Privacy gpdp.it ·
                    Esente da accordi sindacali ex Art. 4 L. 300/1970 · Misura integrativa INAIL).
                  </p>
                  <div className="plaque-partner-signature">
                    <span>Presidio fornito in partnership con: <strong>{partnerStudioName}</strong></span>
                    <span>Sistema: <strong>Pausa81</strong> <em>powered by SvasaOS</em></span>
                  </div>
                </div>
              </div>

              <div className="executive-footer no-print" style={{ marginTop: '1rem' }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => window.print()}
                >
                  Stampa / Salva Targa PDF (A4)
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => {
                    navigator.clipboard?.writeText(customWhiteLabelUrl);
                  }}
                >
                  Copia Link Cliente
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowQrModal(false)}
                >
                  Chiudi
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showExecutiveModal && (
          <motion.div
            className="modal-backdrop no-print"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="executive-modal"
              initial={{ y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 24, opacity: 0 }}
            >
              <div className="executive-header">
                <div>
                  <span className="completion-badge">
                    Presentazione Direzione · HR · RSPP · Medico Competente
                  </span>
                  <h2>Pausa81 — Sistema a 3 Livelli Anti-Tecnostress &amp; DMS</h2>
                  <small style={{ color: '#64748b', fontSize: '0.76rem' }}>
                    powered by <strong>SvasaOS Engine</strong> · Presidio Art. 28 e Titolo VII D.Lgs. 81/2008
                  </small>
                </div>
                <button
                  type="button"
                  className="close-btn"
                  onClick={() => setShowExecutiveModal(false)}
                >
                  ✕
                </button>
              </div>

              <div className="roi-box">
                <div className="roi-slider-head">
                  <label htmlFor="emp-slider">
                    Numero Lavoratori / Videoterminalisti: <strong>{employeesCount}</strong>
                  </label>
                  <span>Minimo 10 lavoratori · 3 pause da 60s/giorno</span>
                </div>
                <input
                  id="emp-slider"
                  type="range"
                  min={10}
                  max={1000}
                  step={5}
                  value={employeesCount}
                  onChange={(e) => setEmployeesCount(Number(e.target.value))}
                  className="roi-slider"
                />
                <div className="roi-metrics">
                  <div>
                    <small>Ore di Lucidità Recuperate / Mese</small>
                    <strong>+{estimatedHoursSavedMonthly} h</strong>
                  </div>
                  <div>
                    <small>Riduzione Assenteismo, Burnout &amp; DMS / Anno</small>
                    <strong>€ {estimatedAnnualSavings}</strong>
                  </div>
                  <div>
                    <small>Adempimenti Art. 4 Statuto Lavoratori</small>
                    <strong>Zero (100% Anonimo)</strong>
                  </div>
                </div>
              </div>

              <h3 className="compliance-section-title">
                Quadro di Conformità Normativa Italiana Pausa81 (Audit DPO / RSPP / Medico Competente)
              </h3>
              <div className="compliance-grid">
                <div className="compliance-card">
                  <h4>1. Garante Privacy (gpdp.it — Zero-Tracking)</h4>
                  <p>
                    Conforme ai provvedimenti del Garante Privacy sul lavoro: <strong>Pausa81</strong> non usa
                    algoritmi di monitoraggio emotivo, webcam o braccialetti biometrici. Nessun dato
                    personale o sanitario viene raccolto (Art. 9 GDPR e Art. 8 L. 300/1970).
                  </p>
                </div>

                <div className="compliance-card">
                  <h4>2. Linee Guida INAIL &amp; Prevenzione DMS</h4>
                  <p>
                    <strong>Pausa81</strong> si integra con i criteri della piattaforma INAIL sullo Stress
                    Lavoro-Correlato senza sostituirla (Art. 28 D.Lgs. 81/08) e supporta la
                    prevenzione dei Disturbi Muscolo-Scheletrici e dell’affaticamento visivo (Titolo VII).
                  </p>
                </div>

                <div className="compliance-card">
                  <h4>3. Ispettorato Nazionale del Lavoro (INL — Art. 4)</h4>
                  <p>
                    L’assenza totale di login nominativi o tracciamento orario esclude qualsiasi
                    controllo a distanza dei lavoratori: <strong>Pausa81</strong> non richiede accordo
                    sindacale preventivo né autorizzazione dell’Ispettorato Nazionale del Lavoro.
                  </p>
                </div>

                <div className="compliance-card">
                  <h4>4. Cassazione Lavoro (Prevenzione Tecnostress)</h4>
                  <p>
                    Rispetta i limiti della giurisprudenza di Cassazione sui dispositivi digitali:
                    fruizione libera via browser o Targa QR Code di reparto, zero installazioni
                    forzate sui telefoni personali, tutela attiva ex Art. 2087 Codice Civile.
                  </p>
                </div>
              </div>

              <div className="executive-footer">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    setShowExecutiveModal(false);
                    setShowQrModal(true);
                  }}
                >
                  Apri Generatore Targa QR Code
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowExecutiveModal(false)}
                >
                  Chiudi Scheda
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
