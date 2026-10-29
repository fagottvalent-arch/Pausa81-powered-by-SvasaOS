import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type MutableRefObject,
  type ChangeEvent,
  type MouseEvent as ReactMouseEvent,
  type TouchEvent as ReactTouchEvent,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CloudBackground } from './components/CloudBackground';

export type Phase = 'idle' | 'inspire' | 'hold' | 'expire' | 'pause';
export type SessionMode = 'all' | 'level1' | 'level2' | 'level3';
export type VoiceGender = 'female' | 'male' | 'off';

export type PhraseKey =
  | 'level1_inspire'
  | 'level1_expire'
  | 'level2_inspire'
  | 'level2_hold'
  | 'level2_expire'
  | 'level3_inspire'
  | 'level3_expire';

/**
 * Coordinate chirurgiche al millisecondo misurate sui frame MPEG di:
 * 1) Serena - Calm & Soothing (Femminile, durata 26.59s)
 * 2) Alessandro - Stoic, Breathy & Steady (Maschile, durata 22.20s)
 */
const SERENA_FEMALE_TIMESTAMPS: Record<PhraseKey, [number, number]> = {
  level1_inspire: [0.0, 4.35],
  level1_expire: [4.45, 8.55],
  level2_inspire: [8.68, 12.55],
  level2_hold: [12.65, 15.35],
  level2_expire: [15.45, 18.35],
  level3_inspire: [18.45, 22.68],
  level3_expire: [22.75, 26.59],
};

const ALESSANDRO_MALE_TIMESTAMPS: Record<PhraseKey, [number, number]> = {
  level1_inspire: [0.0, 3.75],
  level1_expire: [3.82, 7.15],
  level2_inspire: [7.22, 10.45],
  level2_hold: [10.52, 12.88],
  level2_expire: [12.95, 15.48],
  level3_inspire: [15.54, 19.02],
  level3_expire: [19.1, 22.2],
};

const FEMALE_MP3_CANDIDATE_URLS = [
  '/ElevenLabs_2026-10-29T16_48_52_Serena - Calm & Soothing_pvc_sp100_s50_sb75_v4.mp3',
  '/ElevenLabs_2026-10-29T16_48_52_Serena%20-%20Calm%20%26%20Soothing_pvc_sp100_s50_sb75_v4.mp3',
  '/donna.mp3',
  '/serena.mp3',
  '/female.mp3',
];

const MALE_MP3_CANDIDATE_URLS = [
  '/ElevenLabs_2026-10-29T16_51_22_Alessandro - Stoic, Breathy & Steady_pvc_sp100_s50_sb75_v4.mp3',
  '/ElevenLabs_2026-10-29T16_51_22_Alessandro%20-%20Stoic%2C%20Breathy%20%26%20Steady_pvc_sp100_s50_sb75_v4.mp3',
  '/uomo.mp3',
  '/alessandro.mp3',
  '/male.mp3',
];

interface SpokenPhrase {
  audioKey: PhraseKey | '';
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
        audioKey: 'level1_inspire',
        part1: 'Inspira dolcemente dal naso...',
        part2: 'e rilassa lo sguardo.',
        fullText: 'Inspira dolcemente dal naso e rilassa lo sguardo',
      },
      hold: {
        audioKey: 'level2_hold',
        part1: 'Trattieni...',
        part2: 'mantieni la postura.',
        fullText: 'Trattieni, mantieni la postura',
      },
      expire: {
        audioKey: 'level1_expire',
        part1: 'Espira lentamente...',
        part2: 'lascia scendere le spalle.',
        fullText: 'Espira lentamente, lascia scendere le spalle',
      },
      pause: {
        audioKey: '',
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
        audioKey: 'level2_inspire',
        part1: 'Inspira...',
        part2: 'solleva i talloni, e attiva le gambe.',
        fullText: 'Inspira, solleva i talloni e attiva le gambe',
      },
      hold: {
        audioKey: 'level2_hold',
        part1: 'Trattieni...',
        part2: 'mantieni la postura.',
        fullText: 'Trattieni, mantieni la postura',
      },
      expire: {
        audioKey: 'level2_expire',
        part1: 'Espira...',
        part2: 'riappoggia con controllo.',
        fullText: 'Espira, riappoggia con controllo',
      },
      pause: {
        audioKey: '',
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
        audioKey: 'level3_inspire',
        part1: 'Inspira, apri il petto...',
        part2: 'e ruota i palmi in fuori.',
        fullText: 'Inspira, apri il petto e ruota i palmi in fuori',
      },
      hold: {
        audioKey: 'level2_hold',
        part1: 'Trattieni...',
        part2: 'mantieni la postura.',
        fullText: 'Trattieni, mantieni la postura',
      },
      expire: {
        audioKey: 'level3_expire',
        part1: 'Espira a lungo...',
        part2: 'sciogli collo e spalle.',
        fullText: 'Espira a lungo, sciogli collo e spalle',
      },
      pause: {
        audioKey: '',
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

function saveToIdb(key: string, value: unknown): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !('indexedDB' in window)) {
      resolve();
      return;
    }
    try {
      const req = window.indexedDB.open('pausa81_serena_alessandro_db', 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('audio')) {
          db.createObjectStore('audio');
        }
      };
      req.onsuccess = () => {
        const db = req.result;
        const tx = db.transaction('audio', 'readwrite');
        tx.objectStore('audio').put(value, key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      };
      req.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

function loadFromIdb<T>(key: string): Promise<T | null> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !('indexedDB' in window)) {
      resolve(null);
      return;
    }
    try {
      const req = window.indexedDB.open('pausa81_serena_alessandro_db', 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('audio')) {
          db.createObjectStore('audio');
        }
      };
      req.onsuccess = () => {
        const db = req.result;
        const tx = db.transaction('audio', 'readonly');
        const getReq = tx.objectStore('audio').get(key);
        getReq.onsuccess = () => resolve((getReq.result as T) || null);
        getReq.onerror = () => resolve(null);
      };
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

function pickItalianSystemVoice(
  voices: SpeechSynthesisVoice[],
  gender: 'female' | 'male'
): { voice: SpeechSynthesisVoice | null; isDedicatedGenderMatch: boolean } {
  const itVoices = voices.filter(
    (v) =>
      v.lang.toLowerCase().startsWith('it') ||
      v.name.toLowerCase().includes('ital')
  );
  if (itVoices.length === 0) return { voice: null, isDedicatedGenderMatch: false };

  const femaleKeywords = ['elsa', 'isabella', 'alice', 'federica', 'fabiola', 'google italiano', 'female', 'donna'];
  const maleKeywords = ['diego', 'cosimo', 'luca', 'giuseppe', 'giorgio', 'male', 'uomo'];

  if (gender === 'female') {
    const matchF = itVoices.find((v) =>
      femaleKeywords.some((k) => v.name.toLowerCase().includes(k))
    );
    if (matchF) return { voice: matchF, isDedicatedGenderMatch: true };
    const nonMale = itVoices.find(
      (v) => !maleKeywords.some((k) => v.name.toLowerCase().includes(k))
    );
    return { voice: nonMale || itVoices[0], isDedicatedGenderMatch: Boolean(nonMale) };
  }

  const matchM = itVoices.find((v) =>
    maleKeywords.some((k) => v.name.toLowerCase().includes(k))
  );
  if (matchM) return { voice: matchM, isDedicatedGenderMatch: true };
  return { voice: itVoices[0], isDedicatedGenderMatch: false };
}

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

/**
 * VERO QR CODE ISO/IEC 18004 SCANSIONABILE DA QUALSIASI FOTOCAMERA IPHONE / ANDROID
 * (con fallback SVG se il dispositivo è offline).
 */
function RealScannableQrCode({ url }: { url: string }) {
  const [imgError, setImgError] = useState(false);
  const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&ecc=M&margin=1&data=${encodeURIComponent(
    url
  )}`;

  if (!imgError) {
    return (
      <img
        src={qrApiUrl}
        alt="QR Code Ufficiale Pausa81 Scansionabile"
        className="qr-svg"
        style={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
        onError={() => setImgError(true)}
      />
    );
  }

  // Fallback SVG offline
  const size = 21;
  return (
    <svg viewBox={`0 0 ${size + 4} ${size + 4}`} className="qr-svg" aria-label="QR Code Pausa81">
      <rect width={size + 4} height={size + 4} fill="#ffffff" rx="1.5" />
      <text x="50%" y="50%" textAnchor="middle" fontSize="2.2" fill="#0f766e">
        QR PAUSA81
      </text>
    </svg>
  );
}

/**
 * TAVOLETTA DI FIRMA DIGITALE TOUCH / MOUSE DIRETTA SULLO SCHERMO DELL'APP
 */
function InteractiveSignaturePad({
  label,
  savedDataUrl,
  onSave,
  onClear,
}: {
  label: string;
  savedDataUrl: string;
  onSave: (dataUrl: string) => void;
  onClear: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);

  const getCoords = (
    e: ReactMouseEvent<HTMLCanvasElement> | ReactTouchEvent<HTMLCanvasElement>
  ): { x: number; y: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if ('touches' in e) {
      const touch = e.touches[0] || e.changedTouches[0];
      if (!touch) return null;
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const startDraw = (
    e: ReactMouseEvent<HTMLCanvasElement> | ReactTouchEvent<HTMLCanvasElement>
  ) => {
    e.preventDefault();
    const coords = getCoords(e);
    const ctx = canvasRef.current?.getContext('2d');
    if (!coords || !ctx) return;
    isDrawingRef.current = true;
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
  };

  const moveDraw = (
    e: ReactMouseEvent<HTMLCanvasElement> | ReactTouchEvent<HTMLCanvasElement>
  ) => {
    if (!isDrawingRef.current) return;
    e.preventDefault();
    const coords = getCoords(e);
    const ctx = canvasRef.current?.getContext('2d');
    if (!coords || !ctx) return;
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
  };

  const endDraw = () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    if (canvasRef.current) {
      onSave(canvasRef.current.toDataURL('image/png'));
    }
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    onClear();
  };

  return (
    <div
      style={{
        background: '#f8fafc',
        border: '1px solid #cbd5e1',
        borderRadius: '10px',
        padding: '0.55rem',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '0.3rem',
        }}
      >
        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#0f766e' }}>
          ✍️ {label} (Firma col dito o col mouse)
        </span>
        <button
          type="button"
          className="btn-mini"
          onClick={handleClear}
          style={{ padding: '0.15rem 0.45rem', fontSize: '0.66rem' }}
        >
          Cancella Firma
        </button>
      </div>

      {savedDataUrl ? (
        <div
          style={{
            background: '#ffffff',
            border: '1px dashed #0d9488',
            borderRadius: '8px',
            padding: '0.3rem',
            textAlign: 'center',
          }}
        >
          <img
            src={savedDataUrl}
            alt={label}
            style={{ maxHeight: '64px', maxWidth: '100%', objectFit: 'contain' }}
          />
          <small style={{ display: 'block', fontSize: '0.62rem', color: '#0d9488' }}>
            ✓ Firma acquisita e applicata ai documenti ufficiali
          </small>
        </div>
      ) : (
        <canvas
          ref={canvasRef}
          width={340}
          height={90}
          style={{
            width: '100%',
            height: '78px',
            background: '#ffffff',
            border: '1px dashed #94a3b8',
            borderRadius: '8px',
            touchAction: 'none',
            cursor: 'crosshair',
          }}
          onMouseDown={startDraw}
          onMouseMove={moveDraw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          onTouchStart={startDraw}
          onTouchMove={moveDraw}
          onTouchEnd={endDraw}
        />
      )}
    </div>
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

  const [voiceGender, setVoiceGender] = useState<VoiceGender>('female');
  const [binauralEnabled, setBinauralEnabled] = useState<boolean>(true);
  const [chimeEnabled, setChimeEnabled] = useState<boolean>(true);
  const [eyeRestMode, setEyeRestMode] = useState<boolean>(false);

  const [sessionCompleted, setSessionCompleted] = useState<boolean>(false);
  const [showExecutiveModal, setShowExecutiveModal] = useState<boolean>(false);
  const [showQrModal, setShowQrModal] = useState<boolean>(false);
  const [showMedicalModal, setShowMedicalModal] = useState<boolean>(false);

  const [hasSerenaLoaded, setHasSerenaLoaded] = useState<boolean>(false);
  const [hasAlessandroLoaded, setHasAlessandroLoaded] = useState<boolean>(false);

  const serenaBytesRef: MutableRefObject<ArrayBuffer | null> = useRef<ArrayBuffer | null>(null);
  const alessandroBytesRef: MutableRefObject<ArrayBuffer | null> = useRef<ArrayBuffer | null>(null);
  const serenaBufferRef: MutableRefObject<AudioBuffer | null> = useRef<AudioBuffer | null>(null);
  const alessandroBufferRef: MutableRefObject<AudioBuffer | null> = useRef<AudioBuffer | null>(null);
  const multiFileInputRef = useRef<HTMLInputElement | null>(null);

  const [vdtReminderMinutes, setVdtReminderMinutes] = useState<number | null>(null);
  const [vdtSecondsLeft, setVdtSecondsLeft] = useState<number>(0);

  const [localSessionsCount, setLocalSessionsCount] = useState<number>(() => {
    if (typeof window === 'undefined') return 0;
    const saved = window.localStorage.getItem(LOCAL_STATS_KEY);
    return saved ? Number(saved) || 0 : 0;
  });
  const [lastAuditCode, setLastAuditCode] = useState<string>('P81-VDT-8108');
  const [employeesCount, setEmployeesCount] = useState<number>(10);

  // Dati e Firme Digitali per Verbale DVR Art. 35 & Validazione Medico Competente
  const [partnerStudioName, setPartnerStudioName] = useState<string>(
    initialPartner || 'Studio Partner RSPP / Sicurezza'
  );
  const [clientCompanyName, setClientCompanyName] = useState<string>(
    initialClient || 'Azienda Cliente S.r.l.'
  );
  const [departmentName, setDepartmentName] = useState<string>(
    'Area Videoterminali / Sale Riunioni / Reparto'
  );
  const [doctorName, setDoctorName] = useState<string>('Dott. [Nome Medico Competente]');
  const [doctorAlbo, setDoctorAlbo] = useState<string>('Ordine Medici n. [XXXX]');
  const [rsppName, setRsppName] = useState<string>('Ing. / Dott. [Nome RSPP / Datore]');
  const [doctorSignatureUrl, setDoctorSignatureUrl] = useState<string>('');
  const [employerSignatureUrl, setEmployerSignatureUrl] = useState<string>('');

  const audioCtxRef: MutableRefObject<AudioContext | null> = useRef<AudioContext | null>(null);
  const chimeOscsRef: MutableRefObject<OscillatorNode[]> = useRef<OscillatorNode[]>([]);
  const chimeGainRef: MutableRefObject<GainNode | null> = useRef<GainNode | null>(null);

  const binauralOscsRef: MutableRefObject<OscillatorNode[]> = useRef<OscillatorNode[]>([]);
  const binauralGainRef: MutableRefObject<GainNode | null> = useRef<GainNode | null>(null);

  const activeBufferSourceRef: MutableRefObject<AudioBufferSourceNode | null> =
    useRef<AudioBufferSourceNode | null>(null);
  const availableVoicesRef: MutableRefObject<SpeechSynthesisVoice[]> = useRef<
    SpeechSynthesisVoice[]
  >([]);
  const phraseTimeoutRef: MutableRefObject<number | null> = useRef<number | null>(null);
  const lastPlayedStepRef = useRef<string>('');
  const wakeLockRef = useRef<{ release: () => Promise<void> } | null>(null);

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

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const updateVoices = () => {
        const v = window.speechSynthesis.getVoices();
        if (v.length > 0) availableVoicesRef.current = v;
      };
      updateVoices();
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }

    let mounted = true;

    async function autoLoadElevenMp3s() {
      const cachedF = await loadFromIdb<ArrayBuffer>('serena_mp3_bytes');
      if (mounted && cachedF && cachedF.byteLength > 10000) {
        serenaBytesRef.current = cachedF;
        setHasSerenaLoaded(true);
      } else {
        for (const url of FEMALE_MP3_CANDIDATE_URLS) {
          try {
            const res = await fetch(url);
            if (!res.ok) continue;
            const ct = res.headers.get('content-type') || '';
            if (ct.includes('text/html')) continue;
            const buf = await res.arrayBuffer();
            if (buf.byteLength > 20000 && mounted) {
              serenaBytesRef.current = buf;
              setHasSerenaLoaded(true);
              await saveToIdb('serena_mp3_bytes', buf);
              break;
            }
          } catch {
            // Continua
          }
        }
      }

      const cachedM = await loadFromIdb<ArrayBuffer>('alessandro_mp3_bytes');
      if (mounted && cachedM && cachedM.byteLength > 10000) {
        alessandroBytesRef.current = cachedM;
        setHasAlessandroLoaded(true);
      } else {
        for (const url of MALE_MP3_CANDIDATE_URLS) {
          try {
            const res = await fetch(url);
            if (!res.ok) continue;
            const ct = res.headers.get('content-type') || '';
            if (ct.includes('text/html')) continue;
            const buf = await res.arrayBuffer();
            if (buf.byteLength > 20000 && mounted) {
              alessandroBytesRef.current = buf;
              setHasAlessandroLoaded(true);
              await saveToIdb('alessandro_mp3_bytes', buf);
              break;
            }
          } catch {
            // Continua
          }
        }
      }
    }

    autoLoadElevenMp3s();
    return () => {
      mounted = false;
    };
  }, []);

  const handleUploadMp3Files = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const ctx = getOrCreateAudioCtx();

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const lower = file.name.toLowerCase();
      try {
        const buf = await file.arrayBuffer();
        let decoded: AudioBuffer | null = null;
        if (ctx) {
          decoded = await ctx.decodeAudioData(buf.slice(0));
        }

        const isFemale =
          lower.includes('serena') ||
          lower.includes('donna') ||
          lower.includes('female') ||
          (decoded !== null &&
            !lower.includes('alessandro') &&
            !lower.includes('uomo') &&
            decoded.duration > 24.4);

        if (isFemale) {
          serenaBytesRef.current = buf;
          if (decoded) serenaBufferRef.current = decoded;
          setHasSerenaLoaded(true);
          await saveToIdb('serena_mp3_bytes', buf);
        } else {
          alessandroBytesRef.current = buf;
          if (decoded) alessandroBufferRef.current = decoded;
          setHasAlessandroLoaded(true);
          await saveToIdb('alessandro_mp3_bytes', buf);
        }
      } catch {
        // Ignora
      }
    }
  };

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

  const stopVoiceNow = useCallback(() => {
    if (phraseTimeoutRef.current !== null) {
      window.clearTimeout(phraseTimeoutRef.current);
      phraseTimeoutRef.current = null;
    }
    if (activeBufferSourceRef.current) {
      try {
        activeBufferSourceRef.current.stop();
        activeBufferSourceRef.current.disconnect();
      } catch {
        // Ignora
      }
      activeBufferSourceRef.current = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Ignora
      }
    }
  }, []);

  const stopAllAudio = useCallback(() => {
    stopChimeNow();
    stopBinauralNow();
    stopVoiceNow();
  }, [stopChimeNow, stopBinauralNow, stopVoiceNow]);

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
      subOsc.frequency.setValueAtTime(216, ctx.currentTime);

      leftOsc.type = 'sine';
      leftOsc.frequency.setValueAtTime(432, ctx.currentTime);

      rightOsc.type = 'sine';
      rightOsc.frequency.setValueAtTime(438, ctx.currentTime);

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
        osc2.frequency.setValueAtTime(baseFreq * 1.5, ctx.currentTime);

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

  const speakPhrase = useCallback(
    async (phrase: SpokenPhrase | null, overrideGender?: VoiceGender) => {
      const activeGender = overrideGender !== undefined ? overrideGender : voiceGender;
      stopVoiceNow();
      if (activeGender === 'off' || !phrase || typeof window === 'undefined') return;

      if (phrase.audioKey) {
        const ctx = getOrCreateAudioCtx();
        if (ctx) {
          if (activeGender === 'female' && !serenaBufferRef.current && serenaBytesRef.current) {
            try {
              serenaBufferRef.current = await ctx.decodeAudioData(
                serenaBytesRef.current.slice(0)
              );
            } catch {
              // Ignora
            }
          }
          if (
            activeGender === 'male' &&
            !alessandroBufferRef.current &&
            alessandroBytesRef.current
          ) {
            try {
              alessandroBufferRef.current = await ctx.decodeAudioData(
                alessandroBytesRef.current.slice(0)
              );
            } catch {
              // Ignora
            }
          }

          const targetBuffer =
            activeGender === 'female'
              ? serenaBufferRef.current
              : alessandroBufferRef.current;

          const timestampsTable =
            activeGender === 'female'
              ? SERENA_FEMALE_TIMESTAMPS
              : ALESSANDRO_MALE_TIMESTAMPS;

          const sliceCoords = timestampsTable[phrase.audioKey];

          if (targetBuffer && sliceCoords) {
            const [startSec, endSec] = sliceCoords;
            const dur = Math.max(0.4, endSec - startSec);
            const now = ctx.currentTime;

            const src = ctx.createBufferSource();
            src.buffer = targetBuffer;

            const envGain = ctx.createGain();
            envGain.gain.setValueAtTime(0.001, now);
            envGain.gain.linearRampToValueAtTime(1.0, now + 0.06);
            envGain.gain.setValueAtTime(1.0, now + dur - 0.08);
            envGain.gain.linearRampToValueAtTime(0.001, now + dur);

            src.connect(envGain);
            envGain.connect(ctx.destination);
            src.start(0, startSec, dur);
            activeBufferSourceRef.current = src;
            return;
          }
        }
      }

      if (!('speechSynthesis' in window)) return;
      const voices =
        availableVoicesRef.current.length > 0
          ? availableVoicesRef.current
          : window.speechSynthesis.getVoices();

      const { voice, isDedicatedGenderMatch } = pickItalianSystemVoice(
        voices,
        activeGender
      );

      const baseRate = activeGender === 'female' ? 0.84 : 0.80;
      const basePitch =
        activeGender === 'female'
          ? 1.02
          : isDedicatedGenderMatch
          ? 0.88
          : 0.72;

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
    [voiceGender, stopVoiceNow, getOrCreateAudioCtx]
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
        speakPhrase(snapshot.spokenPhrase);
      }
    }
  }, [isRunning, snapshot, triggerSoftChime, speakPhrase]);

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

  useEffect(() => {
    if (!chimeEnabled) {
      stopChimeNow();
    }
  }, [chimeEnabled, stopChimeNow]);

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
      await speakPhrase(firstSnap.spokenPhrase);
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
    speakPhrase,
  ]);

  const handleSelectVoiceGender = (newGender: VoiceGender) => {
    setVoiceGender(newGender);
    if (newGender === 'off') {
      stopVoiceNow();
      return;
    }
    if (!isRunning) {
      speakPhrase(STAGES[0].phrases.inspire, newGender);
    } else if (snapshot.spokenPhrase) {
      speakPhrase(snapshot.spokenPhrase, newGender);
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

  const sessionRemaining = isRunning ? SESSION_DURATION - elapsed : SESSION_DURATION;
  const estimatedHoursSavedMonthly = Math.round(employeesCount * 3.2);
  const estimatedAnnualSavings = (employeesCount * 410).toLocaleString('it-IT');

  // Legge automaticamente il dominio attuale (così quando rinomini in pausa81.vercel.app si aggiorna da solo!)
  const currentOrigin =
    typeof window !== 'undefined' && window.location.origin
      ? window.location.origin
      : 'https://pausa81.vercel.app';

  const customWhiteLabelUrl = `${currentOrigin}/?partner=${encodeURIComponent(
    partnerStudioName.replace(/\s+/g, '_')
  )}&cliente=${encodeURIComponent(clientCompanyName.replace(/\s+/g, '_'))}`;

  const todayFormatted = new Date().toLocaleDateString('it-IT');

  const startButtonLabel =
    sessionMode === 'all'
      ? 'Avvia Percorso Completo 3 Fasi (60s)'
      : `Avvia Solo ${STAGES[previewStageIdx].name} (60s)`;

  return (
    <div className={`app ${eyeRestMode ? 'app--warm-rest' : ''}`}>
      <CloudBackground />

      <input
        ref={multiFileInputRef}
        type="file"
        accept=".mp3,.wav,audio/*"
        multiple
        style={{ display: 'none' }}
        onChange={handleUploadMp3Files}
      />

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

          {/* Pulsante Firma Digitale Medico Competente & Verbale DVR Art. 35 */}
          <button
            type="button"
            className="qr-pill-btn"
            style={{
              background: doctorSignatureUrl ? '#dcfce7' : '#eff6ff',
              borderColor: doctorSignatureUrl ? '#16a34a' : '#2563eb',
              color: doctorSignatureUrl ? '#15803d' : '#1d4ed8',
            }}
            onClick={() => setShowMedicalModal(true)}
          >
            🩺 {doctorSignatureUrl ? 'Verbale Medico Firmato ✓' : 'Firma Medico & Verbale DVR'}
          </button>
        </div>

        <div className="topbar-actions">
          <button
            type="button"
            className={`icon-btn ${voiceGender === 'female' ? 'active' : ''}`}
            onClick={() => handleSelectVoiceGender('female')}
            title="Voce Femminile Serena (Calm & Soothing)"
          >
            👩 Donna {hasSerenaLoaded ? '✓' : ''}
          </button>

          <button
            type="button"
            className={`icon-btn ${voiceGender === 'male' ? 'active' : ''}`}
            onClick={() => handleSelectVoiceGender('male')}
            title="Voce Maschile Alessandro (Stoic, Breathy & Steady)"
          >
            👨 Uomo {hasAlessandroLoaded ? '✓' : ''}
          </button>

          <button
            type="button"
            className={`icon-btn ${voiceGender === 'off' ? 'active' : ''}`}
            onClick={() => handleSelectVoiceGender('off')}
          >
            🔇 OFF
          </button>

          {(!hasSerenaLoaded || !hasAlessandroLoaded) && (
            <button
              type="button"
              className="icon-btn voice-studio-btn"
              onClick={() => multiFileInputRef.current?.click()}
              title="Seleziona i 2 file MP3 di ElevenLabs (Serena e Alessandro) dal tuo computer"
            >
              📂 Collega MP3 ({hasSerenaLoaded ? '1/2' : '0/2'})
            </button>
          )}

          <button
            type="button"
            className={`icon-btn ${binauralEnabled ? 'active' : ''}`}
            onClick={() => setBinauralEnabled((v) => !v)}
          >
            {binauralEnabled ? '🌊 Binaurale ON' : '🌊 Binaurale OFF'}
          </button>

          <button
            type="button"
            className={`icon-btn ${chimeEnabled ? 'active' : ''}`}
            onClick={() => setChimeEnabled((v) => !v)}
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
              ? '⏰ VDT'
              : `⏰ ${Math.ceil(vdtSecondsLeft / 60)}m`}
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

      {/* Modal Targa Murale QR Code A4 con VERO QR CODE SCANSIONABILE e Bollino Firma Medico */}
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
                  <h2>Generatore Targa Murale QR Code Reale (D.Lgs. 81/2008)</h2>
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
                    <RealScannableQrCode url={customWhiteLabelUrl} />
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
                    <span>
                      Partner: <strong>{partnerStudioName}</strong> · Validazione:{' '}
                      <strong>
                        {doctorName} ({doctorAlbo})
                      </strong>
                    </span>
                    <span>
                      Sistema: <strong>Pausa81</strong> <em>powered by SvasaOS</em>
                    </span>
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
                  Copia Link White-Label
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

      {/* NUOVO: Modal Tavoletta Firma Medico Competente & Verbale DVR Art. 35 D.Lgs. 81/2008 */}
      <AnimatePresence>
        {showMedicalModal && (
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
                  <span className="completion-badge">
                    Validazione Clinica &amp; Allegato Ufficiale DVR / INAIL OT23
                  </span>
                  <h2>🩺 Firma Medico Competente &amp; Verbale Adozione (Art. 35 D.Lgs. 81/08)</h2>
                </div>
                <button
                  type="button"
                  className="close-btn"
                  onClick={() => setShowMedicalModal(false)}
                >
                  ✕
                </button>
              </div>

              {/* Campi dati e Tavolette di Firma Touch (visibili solo a schermo, nascosti in stampa) */}
              <div className="qr-config-grid no-print">
                <div>
                  <label>Azienda Aderente</label>
                  <input
                    type="text"
                    value={clientCompanyName}
                    onChange={(e) => setClientCompanyName(e.target.value)}
                  />
                </div>
                <div>
                  <label>Medico Competente (Nome e Cognome)</label>
                  <input
                    type="text"
                    value={doctorName}
                    onChange={(e) => setDoctorName(e.target.value)}
                  />
                </div>
                <div>
                  <label>N. Iscrizione Ordine Medici / Albo</label>
                  <input
                    type="text"
                    value={doctorAlbo}
                    onChange={(e) => setDoctorAlbo(e.target.value)}
                  />
                </div>
                <div>
                  <label>Datore di Lavoro / RSPP</label>
                  <input
                    type="text"
                    value={rsppName}
                    onChange={(e) => setRsppName(e.target.value)}
                  />
                </div>
              </div>

              <div
                className="no-print"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                  gap: '0.75rem',
                  marginBottom: '1rem',
                }}
              >
                <InteractiveSignaturePad
                  label="Firma Medico Competente"
                  savedDataUrl={doctorSignatureUrl}
                  onSave={setDoctorSignatureUrl}
                  onClear={() => setDoctorSignatureUrl('')}
                />
                <InteractiveSignaturePad
                  label="Firma Datore di Lavoro / RSPP"
                  savedDataUrl={employerSignatureUrl}
                  onSave={setEmployerSignatureUrl}
                  onClear={() => setEmployerSignatureUrl('')}
                />
              </div>

              {/* Documento Ufficiale A4 Stampabile con le Firme Incorporate */}
              <div className="printable-plaque" style={{ padding: '0' }}>
                <div className="plaque-header">
                  <span>ATTESTATO DI VALIDAZIONE ERGONOMICA E VERBALE DI ADOZIONE PRESIDIO</span>
                  <strong>
                    AI SENSI DEGLI ARTT. 25, 28, 35 E TITOLO VII (ART. 175) DEL D.LGS. 81/2008
                  </strong>
                </div>

                <div className="plaque-company-bar">
                  <div>
                    <small>RAGIONE SOCIALE AZIENDA</small>
                    <h3>{clientCompanyName}</h3>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <small>DATA DI VALIDAZIONE</small>
                    <h4>{todayFormatted}</h4>
                  </div>
                </div>

                <div style={{ padding: '1rem 1.2rem', fontSize: '0.78rem', lineHeight: 1.45 }}>
                  <p style={{ margin: '0 0 0.65rem' }}>
                    <strong>1. OGGETTO DELLA VALIDAZIONE MEDICO-ERGONOMICA:</strong> Il sottoscritto{' '}
                    <strong>{doctorName}</strong> ({doctorAlbo}), in qualità di Medico Competente /
                    Specialista in Medicina del Lavoro, esaminato il protocollo tecnico-organizzativo{' '}
                    <strong>Pausa81 powered by SvasaOS</strong> articolato in 3 fasi da 20 secondi
                    (e sessioni dedicate da 60 secondi), attesta che gli esercizi di{' '}
                    <em>Reset Neuro-Visivo (Liv. 1)</em>,{' '}
                    <em>Riattivazione Circolatoria del Muscolo Soleo (Liv. 2)</em> e{' '}
                    <em>Decompressione Posturale Cervicale/Carpale (Liv. 3)</em> sono
                    biomeccanicamente sicuri, eseguibili in abiti da lavoro (<em>Zero-Sweat</em>),
                    privi di sovraccarico articolare e idonei alla prevenzione primaria dei Disturbi
                    Muscolo-Scheletrici (DMS), dell’affaticamento visivo da videoterminale (Art. 175
                    D.Lgs. 81/08) e del Tecnostress / Stress Lavoro-Correlato (Art. 28 D.Lgs. 81/08).
                  </p>

                  <p style={{ margin: '0 0 0.65rem' }}>
                    <strong>2. CONFORMITÀ PRIVACY E STATUTO DEI LAVORATORI:</strong> Si dà atto che
                    il presidio opera con architettura <strong>100% Client-Side Zero-Tracking</strong>,
                    senza raccolta di dati personali, biometrici o di monitoraggio emotivo (conforme
                    ai provvedimenti del Garante Privacy <em>gpdp.it</em> ed esente da accordi
                    sindacali ex Art. 4 L. 300/1970 secondo le circolari INL). Il presente verbale
                    costituisce documentazione probatoria valida ai fini della Riunione Periodica
                    (Art. 35 D.Lgs. 81/08), della riduzione del tasso medio di tariffa{' '}
                    <strong>INAIL (Modello OT23)</strong> e dei sistemi di gestione{' '}
                    <strong>ISO 45003 / UNI PdR 125</strong>.
                  </p>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '1rem',
                      marginTop: '0.9rem',
                      paddingTop: '0.75rem',
                      borderTop: '1px solid #cbd5e1',
                    }}
                  >
                    <div
                      style={{
                        border: '1px solid #cbd5e1',
                        borderRadius: '8px',
                        padding: '0.55rem',
                        textAlign: 'center',
                        minHeight: '88px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                      }}
                    >
                      <small style={{ fontSize: '0.64rem', fontWeight: 700, color: '#475569' }}>
                        IL MEDICO COMPETENTE ({doctorName} · {doctorAlbo})
                      </small>
                      {doctorSignatureUrl ? (
                        <img
                          src={doctorSignatureUrl}
                          alt="Firma Medico Competente"
                          style={{ maxHeight: '52px', margin: '0.2rem auto', objectFit: 'contain' }}
                        />
                      ) : (
                        <span style={{ fontSize: '0.68rem', color: '#94a3b8', margin: '1rem 0' }}>
                          [Spazio Firma Autografa / Digitale]
                        </span>
                      )}
                      <small style={{ fontSize: '0.6rem', color: '#0f766e' }}>
                        Validato in data {todayFormatted}
                      </small>
                    </div>

                    <div
                      style={{
                        border: '1px solid #cbd5e1',
                        borderRadius: '8px',
                        padding: '0.55rem',
                        textAlign: 'center',
                        minHeight: '88px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                      }}
                    >
                      <small style={{ fontSize: '0.64rem', fontWeight: 700, color: '#475569' }}>
                        IL DATORE DI LAVORO / RSPP ({rsppName})
                      </small>
                      {employerSignatureUrl ? (
                        <img
                          src={employerSignatureUrl}
                          alt="Firma Datore / RSPP"
                          style={{ maxHeight: '52px', margin: '0.2rem auto', objectFit: 'contain' }}
                        />
                      ) : (
                        <span style={{ fontSize: '0.68rem', color: '#94a3b8', margin: '1rem 0' }}>
                          [Spazio Firma Autografa / Digitale]
                        </span>
                      )}
                      <small style={{ fontSize: '0.6rem', color: '#0f766e' }}>
                        Studio Partner: {partnerStudioName}
                      </small>
                    </div>
                  </div>
                </div>
              </div>

              <div className="executive-footer no-print" style={{ marginTop: '1rem' }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => window.print()}
                >
                  Stampa / Salva Verbale Firmato in PDF (A4)
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowMedicalModal(false)}
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
                    setShowMedicalModal(true);
                  }}
                >
                  Apri Firma Medico &amp; Verbale DVR
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    setShowExecutiveModal(false);
                    setShowQrModal(true);
                  }}
                >
                  Apri Targa QR Code
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
