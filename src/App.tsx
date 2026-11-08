import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type MutableRefObject,
  type MouseEvent as ReactMouseEvent,
  type TouchEvent as ReactTouchEvent,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CloudBackground } from './components/CloudBackground';

export type Phase = 'idle' | 'inspire' | 'hold' | 'expire' | 'pause';
export type SessionMode = 'all' | 'level1' | 'level2' | 'level3';
export type VoiceGender = 'female' | 'male' | 'off';
export type ThemeMode = 'dark' | 'light';

export type PhraseKey =
  | 'level1_inspire'
  | 'level1_expire'
  | 'level2_inspire'
  | 'level2_hold'
  | 'level2_expire'
  | 'level3_inspire'
  | 'level3_expire';

const APP_BUILD_VERSION = 'pausa81-v3.4-r2-single-screen';
const VERSION_STORAGE_KEY = 'pausa81_active_build_version';

const IOS_MODAL_SPRING = {
  type: 'spring' as const,
  stiffness: 410,
  damping: 32,
  mass: 0.78,
};

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

/**
 * Genera al millisecondo l'URL firmato per il Cloudflare Worker R2 (audio.pausa81.it)
 */
function buildFreshR2CandidateUrls(gender: 'female' | 'male'): string[] {
  const ts = Math.floor(Date.now() / 1000);
  const sig = ((ts * 8108) ^ 432146).toString(36);
  const sign = (name: string) =>
    `https://audio.pausa81.it/${encodeURIComponent(name)}?ts=${ts}&sig=${sig}`;

  if (gender === 'female') {
    return [
      sign('serena.mp3'),
      sign('ElevenLabs_2026-10-29T16_48_52_Serena - Calm & Soothing_pvc_sp100_s50_sb75_v4.mp3'),
      sign('donna.mp3'),
      '/ElevenLabs_2026-10-29T16_48_52_Serena - Calm & Soothing_pvc_sp100_s50_sb75_v4.mp3',
      '/serena.mp3',
      '/donna.mp3',
    ];
  }

  return [
    sign('alessandro.mp3'),
    sign('ElevenLabs_2026-10-29T16_51_22_Alessandro - Stoic, Breathy & Steady_pvc_sp100_s50_sb75_v4.mp3'),
    sign('uomo.mp3'),
    '/ElevenLabs_2026-10-29T16_51_22_Alessandro - Stoic, Breathy & Steady_pvc_sp100_s50_sb75_v4.mp3',
    '/alessandro.mp3',
    '/uomo.mp3',
  ];
}

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
      'Previene i Disturbi Muscolo-Scheletrici (DMS, 74,7% delle malattie professionali INAIL): decomprime tunnel carpale, collo e spalle.',
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
const CYCLE_SEC = INSPIRE_SEC + HOLD_SEC + EXPIRE_SEC + PAUSE_SEC;
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
): { voice: SpeechSynthesisVoice | null } {
  const itVoices = voices.filter(
    (v) =>
      v.lang.toLowerCase().startsWith('it') ||
      v.name.toLowerCase().includes('ital')
  );
  if (itVoices.length === 0) return { voice: null };

  const femaleKeywords = ['elsa', 'isabella', 'alice', 'federica', 'fabiola', 'google italiano', 'female', 'donna'];
  const maleKeywords = ['diego', 'cosimo', 'luca', 'giuseppe', 'giorgio', 'male', 'uomo'];

  if (gender === 'female') {
    const matchF = itVoices.find((v) =>
      femaleKeywords.some((k) => v.name.toLowerCase().includes(k))
    );
    if (matchF) return { voice: matchF };
    const nonMale = itVoices.find(
      (v) => !maleKeywords.some((k) => v.name.toLowerCase().includes(k))
    );
    return { voice: nonMale || itVoices[0] };
  }

  const matchM = itVoices.find((v) =>
    maleKeywords.some((k) => v.name.toLowerCase().includes(k))
  );
  return { voice: matchM || itVoices[0] };
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
        Pausa81 <small className="svasa-badge-b2b">{partnerName || 'by SvasaOS'}</small>
      </span>
      <span className="powered-by-sub">
        Presidio Neuro-Ergonomico <strong>D.Lgs. 81/2008</strong>
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
          <stop offset="50%" stopColor="#ccfbf1" />
          <stop offset="100%" stopColor="#5eead4" />
        </radialGradient>
        <radialGradient id="lotus-back" gradientUnits="userSpaceOnUse" cx="100" cy="130" r="96">
          <stop offset="0%" stopColor="#e0f2fe" />
          <stop offset="65%" stopColor="#2dd4bf" />
          <stop offset="100%" stopColor="#0d9488" />
        </radialGradient>
        <radialGradient id="lotus-glow" gradientUnits="userSpaceOnUse" cx="100" cy="140" r="62">
          <stop offset="0%" stopColor="#5eead4" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#0d9488" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="water-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2dd4bf" stopOpacity="0.42" />
          <stop offset="100%" stopColor="#0d9488" stopOpacity="0.08" />
        </linearGradient>
      </defs>

      <circle cx="100" cy="140" r="60" fill="url(#lotus-glow)" />

      <g fill="url(#water-fill)">
        <ellipse cx="100" cy="160" rx="84" ry="14" />
        <ellipse cx="100" cy="172" rx="66" ry="10" opacity="0.7" />
        <ellipse cx="100" cy="182" rx="46" ry="7" opacity="0.5" />
      </g>
      <g fill="none" stroke="#5eead4" strokeOpacity="0.45" strokeWidth="1">
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
          opacity="0.9"
          style={{
            transform: `translate(100px, 150px) rotate(${a}deg)`,
            transition: 'transform 2.2s ease-in-out',
          }}
        />
      ))}

      <g stroke="#99f6e4" strokeOpacity="0.65" strokeWidth="1" strokeLinecap="round">
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
          strokeOpacity="0.6"
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
        strokeOpacity="0.65"
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
      <circle cx="100" cy="142" r="8" fill="none" stroke="#2dd4bf" strokeOpacity="0.7" strokeWidth="1" />
      <circle cx="100" cy="142" r="2.8" fill="#fde047" />
    </svg>
  );
}

function RealScannableQrCode({ url, sizePx = 110 }: { url: string; sizePx?: number }) {
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
        style={{
          width: `${sizePx}px`,
          height: `${sizePx}px`,
          borderRadius: '8px',
          border: '1px solid #cbd5e1',
          background: '#ffffff',
          padding: '3px',
        }}
        onError={() => setImgError(true)}
      />
    );
  }

  const size = 21;
  return (
    <svg
      viewBox={`0 0 ${size + 4} ${size + 4}`}
      className="qr-svg"
      style={{ width: `${sizePx}px`, height: `${sizePx}px` }}
      aria-label="QR Code Pausa81"
    >
      <rect width={size + 4} height={size + 4} fill="#ffffff" rx="1.5" />
      <text x="50%" y="50%" textAnchor="middle" fontSize="2.2" fill="#0f766e">
        QR PAUSA81
      </text>
    </svg>
  );
}

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
        padding: '0.5rem',
        color: '#0f172a',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '0.28rem',
        }}
      >
        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#0f766e' }}>
          ✍️ {label}
        </span>
        <button
          type="button"
          className="btn-mini"
          onClick={handleClear}
          style={{ padding: '0.12rem 0.4rem', fontSize: '0.64rem', color: '#0f172a' }}
        >
          Cancella
        </button>
      </div>

      {savedDataUrl ? (
        <div
          style={{
            background: '#ffffff',
            border: '1px dashed #10b981',
            borderRadius: '8px',
            padding: '0.25rem',
            textAlign: 'center',
          }}
        >
          <img
            src={savedDataUrl}
            alt={label}
            style={{ maxHeight: '56px', maxWidth: '100%', objectFit: 'contain' }}
          />
          <small style={{ display: 'block', fontSize: '0.6rem', color: '#10b981', fontWeight: 600 }}>
            ✓ Firma autografa certificata nel Fascicolo
          </small>
        </div>
      ) : (
        <canvas
          ref={canvasRef}
          width={320}
          height={82}
          style={{
            width: '100%',
            height: '72px',
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

  const liquidClass =
    phase === 'inspire'
      ? 'liquid-sphere-core--inspire'
      : phase === 'hold'
      ? 'liquid-sphere-core--hold'
      : phase === 'expire' || phase === 'pause'
      ? 'liquid-sphere-core--expire'
      : 'liquid-sphere-core--idle';

  const ringStrokeColor =
    phase === 'hold' ? '#10b981' : phase === 'inspire' ? '#14b8a6' : '#0d9488';

  return (
    <div className="sphere-wrap">
      <svg className="orbital-ring" viewBox="0 0 340 340" aria-hidden="true">
        <circle
          cx="170"
          cy="170"
          r={radius}
          fill="none"
          stroke="rgba(148, 163, 184, 0.16)"
          strokeWidth="2.5"
        />
        <circle
          cx="170"
          cy="170"
          r={radius}
          fill="none"
          stroke={ringStrokeColor}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          style={{
            transform: 'rotate(-90deg)',
            transformOrigin: '50% 50%',
            transition: 'stroke-dashoffset 0.35s linear, stroke 0.6s ease',
          }}
        />
      </svg>

      <motion.div
        className="sphere-halo"
        initial={false}
        animate={{ scale: scale * 1.06 }}
        transition={{ duration, ease: 'easeInOut' }}
        aria-hidden="true"
      />

      <motion.div
        className={`sphere liquid-sphere-core ${liquidClass}`}
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

  const [themeMode, setThemeMode] = useState<ThemeMode>('dark');
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

  const serenaBytesRef: MutableRefObject<ArrayBuffer | null> = useRef<ArrayBuffer | null>(null);
  const alessandroBytesRef: MutableRefObject<ArrayBuffer | null> = useRef<ArrayBuffer | null>(null);
  const serenaBufferRef: MutableRefObject<AudioBuffer | null> = useRef<AudioBuffer | null>(null);
  const alessandroBufferRef: MutableRefObject<AudioBuffer | null> = useRef<AudioBuffer | null>(null);

  const [vdtReminderMinutes, setVdtReminderMinutes] = useState<number | null>(null);
  const [vdtSecondsLeft, setVdtSecondsLeft] = useState<number>(0);
  const [vdtAlertActive, setVdtAlertActive] = useState<boolean>(false);

  const [localSessionsCount, setLocalSessionsCount] = useState<number>(() => {
    if (typeof window === 'undefined') return 0;
    const saved = window.localStorage.getItem(LOCAL_STATS_KEY);
    return saved ? Number(saved) || 0 : 0;
  });
  const [lastAuditCode, setLastAuditCode] = useState<string>('P81-VDT-8108');
  const [employeesCount, setEmployeesCount] = useState<number>(25);

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
  const [rsppName, setRsppName] = useState<string>('Ing. / Dott. [Datore / RSPP]');
  const [rlsName, setRlsName] = useState<string>('Sig. [Rappresentante Lavoratori RLS]');

  const [doctorSignatureUrl, setDoctorSignatureUrl] = useState<string>('');
  const [employerSignatureUrl, setEmployerSignatureUrl] = useState<string>('');
  const [rlsSignatureUrl, setRlsSignatureUrl] = useState<string>('');

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

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.title = 'Pausa81 by SvasaOS — Presidio Neuro-Ergonomico D.Lgs. 81/2008';
      let metaColorScheme = document.querySelector('meta[name="color-scheme"]');
      if (!metaColorScheme) {
        metaColorScheme = document.createElement('meta');
        metaColorScheme.setAttribute('name', 'color-scheme');
        document.head.appendChild(metaColorScheme);
      }
      metaColorScheme.setAttribute('content', 'dark light');
    }

    if (typeof window !== 'undefined') {
      try {
        const storedVer = window.localStorage.getItem(VERSION_STORAGE_KEY);
        if (storedVer !== APP_BUILD_VERSION) {
          window.localStorage.setItem(VERSION_STORAGE_KEY, APP_BUILD_VERSION);
          if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistrations().then((regs) => {
              for (const reg of regs) {
                reg.update().catch(() => {});
              }
            });
          }
        }
      } catch {
        // Ignora
      }
    }
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

  /**
   * Scarica l'audio dal Cloudflare Worker R2 (audio.pausa81.it) generando
   * un token fresco al momento esatto della richiesta e salvandolo in cache locale.
   */
  const fetchVoiceFromCloudflareR2 = useCallback(
    async (gender: 'female' | 'male'): Promise<ArrayBuffer | null> => {
      const idbKey = gender === 'female' ? 'serena_mp3_bytes' : 'alessandro_mp3_bytes';
      const cached = await loadFromIdb<ArrayBuffer>(idbKey);
      if (cached && cached.byteLength > 20000) {
        return cached;
      }

      const urls = buildFreshR2CandidateUrls(gender);
      for (const url of urls) {
        try {
          const res = await fetch(url, { mode: 'cors' });
          if (!res.ok) continue;
          const ct = res.headers.get('content-type') || '';
          if (ct.includes('text/html')) continue;
          const buf = await res.arrayBuffer();
          if (buf.byteLength > 20000) {
            await saveToIdb(idbKey, buf);
            return buf;
          }
        } catch {
          // Prova il candidato successivo
        }
      }
      return null;
    },
    []
  );

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
    async function preloadVoicesFromR2() {
      const fBuf = await fetchVoiceFromCloudflareR2('female');
      if (mounted && fBuf) {
        serenaBytesRef.current = fBuf;
      }
      const mBuf = await fetchVoiceFromCloudflareR2('male');
      if (mounted && mBuf) {
        alessandroBytesRef.current = mBuf;
      }
    }
    preloadVoicesFromR2();
    return () => {
      mounted = false;
    };
  }, [fetchVoiceFromCloudflareR2]);

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
        activeBufferSourceRef.current.onended = null;
        activeBufferSourceRef.current.stop(0);
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

  useEffect(() => {
    const handleVisibilityOrExit = () => {
      if (document.visibilityState === 'hidden' || document.hidden) {
        stopSession();
        if (audioCtxRef.current && audioCtxRef.current.state === 'running') {
          audioCtxRef.current.suspend().catch(() => {});
        }
      }
    };

    const handleForceStop = () => {
      stopSession();
      if (audioCtxRef.current && audioCtxRef.current.state === 'running') {
        audioCtxRef.current.suspend().catch(() => {});
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityOrExit);
    window.addEventListener('pagehide', handleForceStop);
    window.addEventListener('beforeunload', handleForceStop);
    window.addEventListener('blur', handleVisibilityOrExit);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityOrExit);
      window.removeEventListener('pagehide', handleForceStop);
      window.removeEventListener('beforeunload', handleForceStop);
      window.removeEventListener('blur', handleVisibilityOrExit);
      stopAllAudio();
    };
  }, [stopSession, stopAllAudio]);

  const startBinauralPad = useCallback(() => {
    stopBinauralNow();
    if (!binauralEnabled) return;
    const ctx = getOrCreateAudioCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const subOsc = ctx.createOscillator();
      const leftOsc = ctx.createOscillator();
      const rightOsc = ctx.createOscillator();

      const lowpass = ctx.createBiquadFilter();
      lowpass.type = 'lowpass';
      lowpass.frequency.setValueAtTime(680, now);
      lowpass.frequency.exponentialRampToValueAtTime(380, now + SESSION_DURATION);

      const masterGain = ctx.createGain();

      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(216, now);

      leftOsc.type = 'sine';
      leftOsc.frequency.setValueAtTime(432, now);

      rightOsc.type = 'sine';
      rightOsc.frequency.setValueAtTime(446, now);
      rightOsc.frequency.linearRampToValueAtTime(438, now + SESSION_DURATION);

      masterGain.gain.setValueAtTime(0.0001, now);
      masterGain.gain.linearRampToValueAtTime(0.018, now + 1.2);

      subOsc.connect(lowpass);
      leftOsc.connect(lowpass);
      rightOsc.connect(lowpass);
      lowpass.connect(masterGain);
      masterGain.connect(ctx.destination);

      subOsc.start(now);
      leftOsc.start(now);
      rightOsc.start(now);

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

  const triggerHapticFeedback = useCallback((phase: Phase) => {
    if (typeof navigator === 'undefined' || !navigator.vibrate) return;
    try {
      if (phase === 'inspire') {
        navigator.vibrate([35, 45, 65]);
      } else if (phase === 'hold') {
        navigator.vibrate(50);
      } else if (phase === 'expire') {
        navigator.vibrate([80, 50, 30]);
      } else {
        navigator.vibrate(20);
      }
    } catch {
      // Ignora
    }
  }, []);

  const speakPhrase = useCallback(
    async (phrase: SpokenPhrase | null, overrideGender?: VoiceGender) => {
      const activeGender = overrideGender !== undefined ? overrideGender : voiceGender;
      stopVoiceNow();
      if (
        activeGender === 'off' ||
        !phrase ||
        typeof window === 'undefined' ||
        (typeof document !== 'undefined' && document.hidden)
      ) {
        return;
      }

      if (phrase.audioKey) {
        const ctx = getOrCreateAudioCtx();
        if (ctx) {
          if (activeGender === 'female' && !serenaBytesRef.current) {
            serenaBytesRef.current = await fetchVoiceFromCloudflareR2('female');
          }
          if (activeGender === 'male' && !alessandroBytesRef.current) {
            alessandroBytesRef.current = await fetchVoiceFromCloudflareR2('male');
          }

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
            const bufferDur = Math.max(0.4, endSec - startSec);

            const playbackRate = 1.0;
            const realPlaybackDur = bufferDur / playbackRate;

            const onsetDelay =
              activeGender === 'male'
                ? phrase.audioKey === 'level2_hold'
                  ? 0.32
                  : 0.65
                : phrase.audioKey === 'level2_hold'
                ? 0.22
                : 0.40;

            const startTime = ctx.currentTime + onsetDelay;

            const src = ctx.createBufferSource();
            src.buffer = targetBuffer;
            src.playbackRate.setValueAtTime(playbackRate, startTime);

            const envGain = ctx.createGain();
            envGain.gain.setValueAtTime(0.0001, ctx.currentTime);
            envGain.gain.setValueAtTime(0.001, startTime);
            envGain.gain.linearRampToValueAtTime(1.0, startTime + 0.06);
            envGain.gain.setValueAtTime(1.0, startTime + realPlaybackDur - 0.08);
            envGain.gain.linearRampToValueAtTime(0.0001, startTime + realPlaybackDur);

            src.connect(envGain);
            envGain.connect(ctx.destination);

            src.start(startTime, startSec);
            src.stop(startTime + realPlaybackDur);

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

      const { voice } = pickItalianSystemVoice(voices, activeGender);
      const baseRate = activeGender === 'female' ? 0.88 : 0.86;
      const naturalPitch = 1.0;

      try {
        if (phrase.part1) {
          const u1 = new SpeechSynthesisUtterance(phrase.part1);
          u1.lang = 'it-IT';
          if (voice) u1.voice = voice;
          u1.rate = baseRate;
          u1.pitch = naturalPitch;
          u1.volume = 0.95;

          u1.onend = () => {
            if (!phrase.part2 || (typeof document !== 'undefined' && document.hidden)) return;
            phraseTimeoutRef.current = window.setTimeout(() => {
              if (typeof document !== 'undefined' && document.hidden) return;
              const u2 = new SpeechSynthesisUtterance(phrase.part2);
              u2.lang = 'it-IT';
              if (voice) u2.voice = voice;
              u2.rate = baseRate;
              u2.pitch = naturalPitch;
              u2.volume = 0.92;
              window.speechSynthesis.speak(u2);
            }, 850);
          };

          window.speechSynthesis.speak(u1);
        }
      } catch {
        // Silenzioso
      }
    },
    [voiceGender, stopVoiceNow, getOrCreateAudioCtx, fetchVoiceFromCloudflareR2]
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
      triggerHapticFeedback(snapshot.phase);
      if (snapshot.spokenPhrase) {
        speakPhrase(snapshot.spokenPhrase);
      }
    }
  }, [isRunning, snapshot, triggerSoftChime, triggerHapticFeedback, speakPhrase]);

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
          setVdtAlertActive(true);
          return vdtReminderMinutes * 60;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(t);
  }, [vdtReminderMinutes, vdtSecondsLeft, triggerSoftChime]);

  const startSession = useCallback(async () => {
    stopAllAudio();
    setVdtAlertActive(false);

    const firstSnap = getTimelineSnapshot(0, sessionMode);
    lastPlayedStepRef.current = `${firstSnap.stage.id}_${firstSnap.phase}_${firstSnap.cycleNumber}`;

    setSessionCompleted(false);
    setElapsed(0);
    setIsRunning(true);

    if (binauralEnabled) {
      startBinauralPad();
    }
    triggerSoftChime(firstSnap.phase);
    triggerHapticFeedback(firstSnap.phase);
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
    triggerHapticFeedback,
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
    setVdtAlertActive(false);
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

  const snoozeVdtAlert5Min = () => {
    setVdtAlertActive(false);
    if (vdtReminderMinutes === null) {
      setVdtReminderMinutes(60);
    }
    setVdtSecondsLeft(5 * 60);
  };

  const sessionRemaining = isRunning ? SESSION_DURATION - elapsed : SESSION_DURATION;

  const totalCompanyDamageYearly = (employeesCount * 4484).toLocaleString('it-IT');
  const totalCompanyDamageMonthly = Math.round((employeesCount * 4484) / 12).toLocaleString('it-IT');
  const estimatedAnnualSavings = Math.round(employeesCount * 448.4).toLocaleString('it-IT');
  const inailOt23DiscountPct =
    employeesCount <= 10 ? '28%' : employeesCount <= 50 ? '18%' : employeesCount <= 200 ? '10%' : '5%';
  const recommendedPlanPrice =
    employeesCount <= 15
      ? '€ 1.200 / anno (+ € 390 Impianto Kit Phygital)'
      : employeesCount <= 35
      ? '€ 2.400 / anno (+ € 590 Impianto Kit Phygital)'
      : employeesCount <= 80
      ? '€ 3.900 / anno (+ € 890 Impianto Kit Phygital)'
      : employeesCount <= 200
      ? '€ 6.900 / anno (+ € 1.490 Impianto Kit Phygital)'
      : `€ ${(employeesCount * 45).toLocaleString('it-IT')} / anno (+ € 2.490 Impianto Kit Phygital)`;

  const currentOrigin =
    typeof window !== 'undefined' && window.location.origin
      ? window.location.origin
      : 'https://pausa81.it';

  const customWhiteLabelUrl = `${currentOrigin}/?partner=${encodeURIComponent(
    partnerStudioName.replace(/\s+/g, '_')
  )}&cliente=${encodeURIComponent(clientCompanyName.replace(/\s+/g, '_'))}&v=3.4`;

  const todayFormatted = new Date().toLocaleDateString('it-IT');
  const allThreeSigned = Boolean(
    doctorSignatureUrl && employerSignatureUrl && rlsSignatureUrl
  );

  const startButtonLabel =
    sessionMode === 'all'
      ? 'Avvia Percorso Completo 3 Fasi (60s)'
      : `Avvia Solo ${STAGES[previewStageIdx].name} (60s)`;

  return (
    <div
      className={`app app--theme-${themeMode} ${
        eyeRestMode ? 'app--warm-rest' : ''
      }`}
    >
      <CloudBackground />

      <header className="topbar no-print">
        <div className="topbar-left">
          <button
            type="button"
            className="executive-pill"
            onClick={() => {
              stopVoiceNow();
              setShowExecutiveModal(true);
            }}
          >
            <span className="pill-dot" />
            {initialPartner || initialClient
              ? `${initialClient || initialPartner} · D.Lgs. 81/08`
              : 'ROI & Dati INAIL · Direzione'}
          </button>

          <button
            type="button"
            className="qr-pill-btn"
            onClick={() => {
              stopVoiceNow();
              setShowQrModal(true);
            }}
          >
            Targa QR
          </button>

          <button
            type="button"
            className="qr-pill-btn"
            style={{
              background: allThreeSigned ? 'rgba(16, 185, 129, 0.22)' : undefined,
              borderColor: allThreeSigned ? '#10b981' : '#14b8a6',
              color: allThreeSigned ? '#10b981' : undefined,
            }}
            onClick={() => {
              stopVoiceNow();
              setShowMedicalModal(true);
            }}
          >
            📜 {allThreeSigned ? 'Fascicolo DVR Firmato (3/3) ✓' : 'Fascicolo DVR (3 Firme)'}
          </button>
        </div>

        <div className="topbar-actions">
          <button
            type="button"
            className={`icon-btn ${voiceGender === 'female' ? 'active' : ''}`}
            onClick={() => handleSelectVoiceGender('female')}
            title="Voce Femminile Serena (Cloudflare R2)"
          >
            👩 Donna
          </button>

          <button
            type="button"
            className={`icon-btn ${voiceGender === 'male' ? 'active' : ''}`}
            onClick={() => handleSelectVoiceGender('male')}
            title="Voce Maschile Alessandro (Cloudflare R2)"
          >
            👨 Uomo
          </button>

          <button
            type="button"
            className={`icon-btn ${voiceGender === 'off' ? 'active' : ''}`}
            onClick={() => handleSelectVoiceGender('off')}
          >
            🔇 OFF
          </button>

          <button
            type="button"
            className={`icon-btn ${binauralEnabled ? 'active' : ''}`}
            onClick={() => setBinauralEnabled((v) => !v)}
          >
            {binauralEnabled ? '🌊 432Hz ON' : '🌊 432Hz OFF'}
          </button>

          <button
            type="button"
            className={`icon-btn ${chimeEnabled ? 'active' : ''}`}
            onClick={() => setChimeEnabled((v) => !v)}
          >
            {chimeEnabled ? '🔔 Campana' : '🔕 Muto'}
          </button>

          <button
            type="button"
            className="icon-btn"
            onClick={() => setThemeMode((t) => (t === 'dark' ? 'light' : 'dark'))}
          >
            {themeMode === 'dark' ? '🌙 Calm Dark' : '☀️ Light'}
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

      <AnimatePresence>
        {vdtAlertActive && !isRunning && (
          <motion.div
            className="no-print"
            initial={{ y: -24, opacity: 0, scale: 0.92 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -24, opacity: 0, scale: 0.92 }}
            transition={IOS_MODAL_SPRING}
            style={{
              position: 'fixed',
              top: '58px',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 45,
              background: 'rgba(15, 23, 42, 0.95)',
              border: '1px solid rgba(20, 184, 166, 0.5)',
              color: '#f8fafc',
              padding: '0.55rem 1rem',
              borderRadius: '999px',
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem',
              boxShadow: '0 14px 32px rgba(0, 0, 0, 0.45)',
              fontSize: '0.76rem',
            }}
          >
            <span>⏰ Pausa Ergonomica VDT consigliata (60s):</span>
            <button
              type="button"
              className="btn-mini"
              style={{ background: '#10b981', color: '#fff', border: 'none' }}
              onClick={startSession}
            >
              ▶ Inizia Ora (60s)
            </button>
            <button
              type="button"
              className="btn-mini"
              style={{ background: '#334155', color: '#e2e8f0', border: 'none' }}
              onClick={snoozeVdtAlert5Min}
            >
              ⏳ Finisco il task (+5 min)
            </button>
          </motion.div>
        )}
      </AnimatePresence>

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
                    background: 'linear-gradient(90deg, #0d9488 0%, #10b981 100%)',
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
            <span
              className="local-counter-pill"
              style={{
                background: 'rgba(16, 185, 129, 0.14)',
                border: '1px solid rgba(16, 185, 129, 0.35)',
                color: themeMode === 'dark' ? '#6ee7b7' : '#047857',
              }}
            >
              ✓ {localSessionsCount} sessioni completate · Certificato Locale {lastAuditCode}
            </span>
          )}
        </div>
      </main>

      <footer className="shield-status-footer no-print">
        <div className="shield-status-pill">
          <span className="shield-dot-emerald" aria-hidden="true" />
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#10b981"
            strokeWidth="2.3"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <path d="m9 12 2 2 4-4" />
          </svg>
          <span>
            <strong>✓ 0 Byte Tracciati</strong> · Esente Art. 4 L. 300/70 · Conforme Garante Privacy
            · <strong>Salva-Pause 15m Art. 175 D.Lgs. 81/08</strong>
          </span>
        </div>
      </footer>

      <AnimatePresence>
        {sessionCompleted && (
          <motion.div
            className="modal-backdrop no-print"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            <motion.div
              className="completion-card"
              initial={{ scale: 0.86, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 12 }}
              transition={IOS_MODAL_SPRING}
            >
              <span
                className="completion-badge"
                style={{ background: '#d1fae5', color: '#065f46' }}
              >
                ✓ Presidio Completato · Sigillo Verifica {lastAuditCode}
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
                  <strong style={{ color: '#10b981' }}>0 Byte</strong>
                  <span>Dati Personali Inviati (Esente Art. 4)</span>
                </div>
                <div className="benchmark-item">
                  <strong style={{ color: '#0d9488' }}>{localSessionsCount} min</strong>
                  <span>Prevenzione Accumulata (Locale)</span>
                </div>
              </div>

              <p className="legal-note">
                Il presidio da 60s è salvato solo nella memoria locale del dispositivo (Zero-Tracking)
                e integra — senza mai ridurre — le pause di 15 minuti ogni 120 minuti previste dall’Art.
                175 comma 3 D.Lgs. 81/2008.
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
            transition={{ duration: 0.16 }}
          >
            <motion.div
              className="qr-modal"
              initial={{ scale: 0.84, opacity: 0, y: -18 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.88, opacity: 0, y: -12 }}
              transition={IOS_MODAL_SPRING}
            >
              <div className="executive-header no-print">
                <div>
                  <span className="completion-badge">Kit Phygital Pausa81 · White-Label</span>
                  <h2>Generatore Targa Murale QR Code ISO/IEC 18004 (D.Lgs. 81/2008)</h2>
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
                    <RealScannableQrCode url={customWhiteLabelUrl} sizePx={136} />
                    <span>INQUADRA CON LA FOTOCAMERA</span>
                    <small>Versione Unificata Multi-Browser v3.4</small>
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
                    <strong>GARANZIA SINDACALE E PRIVACY (0 BYTE TRACCIATI):</strong> Strumento
                    100% anonimo esente da accordi ex Art. 4 L. 300/1970. Misura integrativa che
                    non sostituisce né riduce le pause VDT di 15 minuti ex Art. 175 c. 3 D.Lgs. 81/08.
                  </p>
                  <div className="plaque-partner-signature">
                    <span>
                      Partner: <strong>{partnerStudioName}</strong> · Medico:{' '}
                      <strong>{doctorName}</strong>
                    </span>
                    <span>
                      Sistema: <strong>Pausa81</strong> <em>by SvasaOS</em>
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

      <AnimatePresence>
        {showMedicalModal && (
          <motion.div
            className="modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
          >
            <motion.div
              className="qr-modal"
              initial={{ scale: 0.84, opacity: 0, y: -18 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.88, opacity: 0, y: -12 }}
              transition={IOS_MODAL_SPRING}
            >
              <div className="executive-header no-print">
                <div>
                  <span className="completion-badge">
                    Fascicolo Digitale Notarile · DVR Art. 35 &amp; Pratica INAIL OT23
                  </span>
                  <h2>📜 Verbale Ufficiale Pre-Verificato (Medico · RSPP · RLS)</h2>
                </div>
                <button
                  type="button"
                  className="close-btn"
                  onClick={() => setShowMedicalModal(false)}
                >
                  ✕
                </button>
              </div>

              <div className="qr-config-grid no-print">
                <div>
                  <label>Ragione Sociale Azienda</label>
                  <input
                    type="text"
                    value={clientCompanyName}
                    onChange={(e) => setClientCompanyName(e.target.value)}
                  />
                </div>
                <div>
                  <label>Medico Competente (Nome e Albo)</label>
                  <input
                    type="text"
                    value={`${doctorName} - ${doctorAlbo}`}
                    onChange={(e) => {
                      const parts = e.target.value.split(' - ');
                      setDoctorName(parts[0] || '');
                      if (parts[1]) setDoctorAlbo(parts[1]);
                    }}
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
                <div>
                  <label>Rappresentante Lavoratori (RLS)</label>
                  <input
                    type="text"
                    value={rlsName}
                    onChange={(e) => setRlsName(e.target.value)}
                  />
                </div>
              </div>

              <div
                className="no-print"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
                  gap: '0.6rem',
                  marginBottom: '0.9rem',
                }}
              >
                <InteractiveSignaturePad
                  label="1. Firma Medico Competente"
                  savedDataUrl={doctorSignatureUrl}
                  onSave={setDoctorSignatureUrl}
                  onClear={() => setDoctorSignatureUrl('')}
                />
                <InteractiveSignaturePad
                  label="2. Firma Datore / RSPP"
                  savedDataUrl={employerSignatureUrl}
                  onSave={setEmployerSignatureUrl}
                  onClear={() => setEmployerSignatureUrl('')}
                />
                <InteractiveSignaturePad
                  label="3. Firma Consultazione RLS"
                  savedDataUrl={rlsSignatureUrl}
                  onSave={setRlsSignatureUrl}
                  onClear={() => setRlsSignatureUrl('')}
                />
              </div>

              <div className="notarial-dossier">
                <div className="notarial-header-bar">
                  <div>
                    <span className="notarial-seal-badge">
                      ATTO INTERNO DI CONFORMITÀ D.LGS. 81/2008 · PROTOCOLLO VERIFICATO {lastAuditCode}
                    </span>
                    <h3 style={{ margin: '0 0 0.2rem', fontSize: '0.95rem', letterSpacing: '0.02em' }}>
                      VERBALE DI VALIDAZIONE ERGONOMICA E ADOZIONE PRESIDIO (ARTT. 25, 28, 35, 50 E 175)
                    </h3>
                    <small style={{ color: '#cbd5e1', fontSize: '0.68rem' }}>
                      Esenzione Ispettorato Nazionale del Lavoro ex Art. 4 L. 300/1970 · Idoneità Sconto INAIL OT23 ({inailOt23DiscountPct})
                    </small>
                  </div>

                  <div style={{ textAlign: 'center', flexShrink: 0 }}>
                    <RealScannableQrCode url={customWhiteLabelUrl} sizePx={74} />
                    <small
                      style={{
                        display: 'block',
                        fontSize: '0.55rem',
                        color: '#5eead4',
                        marginTop: '2px',
                        fontWeight: 700,
                      }}
                    >
                      VERIFICA QR PRESIDIO
                    </small>
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    background: '#f1f5f9',
                    padding: '0.6rem 1.1rem',
                    borderBottom: '1px solid #cbd5e1',
                    fontSize: '0.76rem',
                  }}
                >
                  <div>
                    <small style={{ color: '#64748b', display: 'block', fontSize: '0.62rem' }}>
                      SOGGETTO GIURIDICO / AZIENDA ADERENTE
                    </small>
                    <strong>{clientCompanyName}</strong> ({departmentName})
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <small style={{ color: '#64748b', display: 'block', fontSize: '0.62rem' }}>
                      DATA DI SOTTOSCRIZIONE E STUDIO PARTNER
                    </small>
                    <strong>{todayFormatted}</strong> · {partnerStudioName}
                  </div>
                </div>

                <div style={{ padding: '0.9rem 1.15rem', fontSize: '0.74rem', lineHeight: 1.44 }}>
                  <p style={{ margin: '0 0 0.55rem' }}>
                    <strong>ART. 1 — VALIDAZIONE CLINICO-ERGONOMICA (ART. 25 E TITOLO VII D.LGS. 81/2008):</strong>{' '}
                    Il Medico Competente <strong>{doctorName}</strong> ({doctorAlbo}), in ottemperanza
                    agli obblighi di collaborazione attiva alla prevenzione primaria ex Art. 25 c. 1
                    lett. a) D.Lgs. 81/08 e nel pieno rispetto dell’Art. 30 del Codice di Deontologia
                    Medica FNOMCeO, attesta che il protocollo tecnico-organizzativo{' '}
                    <strong>Pausa81 by SvasaOS</strong> (3 fasi da 20s / 60s eseguibili in abiti da
                    lavoro: <em>Reset Neuro-Visivo</em>, <em>Pompa Ematica del Soleo</em>,{' '}
                    <em>Decompressione Posturale DMS</em>) è biomeccanicamente sicuro e idoneo a
                    mitigare l’astenopia da VDT (Art. 175), i Disturbi Muscolo-Scheletrici (74,7% delle
                    tecnopatie INAIL) e lo Stress Lavoro-Correlato (Art. 28 D.Lgs. 81/08 e Art. 2087 c.c.).
                  </p>

                  <p style={{ margin: '0 0 0.55rem' }}>
                    <strong>ART. 2 — CLAUSOLA DI SALVAGUARDIA SINDACALE RLS (ART. 50 E ART. 175 C. 3 D.LGS. 81/2008):</strong>{' '}
                    Con la sottoscrizione per consultazione del Rappresentante dei Lavoratori per la
                    Sicurezza (<strong>{rlsName}</strong>) ex Art. 29 c. 2 e Art. 50 D.Lgs. 81/08, le
                    parti certificano che le micro-pause da 60 secondi (dotate di funzione{' '}
                    <em>Snooze +5 min</em> per non interrompere l’operatività) rivestono carattere{' '}
                    <strong>esclusivamente integrativo e volontario</strong> e{' '}
                    <strong>non sostituiscono né riducono di un solo secondo</strong> il diritto ai 15
                    minuti di pausa ogni 120 minuti di applicazione continuativa al videoterminale (Art.
                    175 c. 3 D.Lgs. 81/08).
                  </p>

                  <p style={{ margin: '0 0 0.55rem' }}>
                    <strong>ART. 3 — ARCHITETTURA "0 BYTE TRACCIATI" ED ESENZIONE ART. 4 L. 300/1970:</strong>{' '}
                    Si attesta che l’infrastruttura opera in modalità{' '}
                    <strong>100% Client-Side Stateless (0 Byte inviati su rete esterna)</strong>, senza
                    login nominativi, profilazione o raccolta di dati personali/biometrici (Art. 9
                    GDPR), risultando conforme ai provvedimenti del Garante Privacy ed esente da
                    autorizzazione INL ex Art. 4 L. 300/1970. Il presente fascicolo ha valore
                    probatorio per la Riunione Periodica (Art. 35) e per l’istanza di riduzione del
                    premio <strong>INAIL Modello OT23 (fascia sconto {inailOt23DiscountPct})</strong>.
                  </p>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr 1fr',
                      gap: '0.7rem',
                      marginTop: '0.8rem',
                      paddingTop: '0.7rem',
                      borderTop: '2px solid #0f172a',
                    }}
                  >
                    <div
                      style={{
                        border: '1px solid #94a3b8',
                        borderRadius: '6px',
                        padding: '0.45rem',
                        textAlign: 'center',
                        minHeight: '82px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        background: '#f8fafc',
                      }}
                    >
                      <small style={{ fontSize: '0.58rem', fontWeight: 800, color: '#0f172a' }}>
                        1. IL MEDICO COMPETENTE ({doctorName})
                      </small>
                      {doctorSignatureUrl ? (
                        <img
                          src={doctorSignatureUrl}
                          alt="Firma Medico"
                          style={{ maxHeight: '46px', margin: '0.15rem auto', objectFit: 'contain' }}
                        />
                      ) : (
                        <span style={{ fontSize: '0.62rem', color: '#94a3b8', margin: '0.8rem 0' }}>
                          [Spazio Firma Autografa / PAdES]
                        </span>
                      )}
                      <small style={{ fontSize: '0.56rem', color: '#0f766e', fontWeight: 700 }}>
                        {doctorAlbo} · Art. 25 D.Lgs. 81/08
                      </small>
                    </div>

                    <div
                      style={{
                        border: '1px solid #94a3b8',
                        borderRadius: '6px',
                        padding: '0.45rem',
                        textAlign: 'center',
                        minHeight: '82px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        background: '#f8fafc',
                      }}
                    >
                      <small style={{ fontSize: '0.58rem', fontWeight: 800, color: '#0f172a' }}>
                        2. DATORE DI LAVORO / RSPP ({rsppName})
                      </small>
                      {employerSignatureUrl ? (
                        <img
                          src={employerSignatureUrl}
                          alt="Firma Datore"
                          style={{ maxHeight: '46px', margin: '0.15rem auto', objectFit: 'contain' }}
                        />
                      ) : (
                        <span style={{ fontSize: '0.62rem', color: '#94a3b8', margin: '0.8rem 0' }}>
                          [Spazio Firma Autografa / PAdES]
                        </span>
                      )}
                      <small style={{ fontSize: '0.56rem', color: '#0f766e', fontWeight: 700 }}>
                        Art. 18 e Art. 35 D.Lgs. 81/08
                      </small>
                    </div>

                    <div
                      style={{
                        border: '1px solid #94a3b8',
                        borderRadius: '6px',
                        padding: '0.45rem',
                        textAlign: 'center',
                        minHeight: '82px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        background: '#f8fafc',
                      }}
                    >
                      <small style={{ fontSize: '0.58rem', fontWeight: 800, color: '#0f172a' }}>
                        3. PER CONSULTAZIONE RLS ({rlsName})
                      </small>
                      {rlsSignatureUrl ? (
                        <img
                          src={rlsSignatureUrl}
                          alt="Firma RLS"
                          style={{ maxHeight: '46px', margin: '0.15rem auto', objectFit: 'contain' }}
                        />
                      ) : (
                        <span style={{ fontSize: '0.62rem', color: '#94a3b8', margin: '0.8rem 0' }}>
                          [Spazio Firma Consultazione RLS]
                        </span>
                      )}
                      <small style={{ fontSize: '0.56rem', color: '#0f766e', fontWeight: 700 }}>
                        Ex Art. 50 D.Lgs. 81/2008
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
                  🖨️ Esporta / Stampa Fascicolo Notarile in PDF (A4)
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
            transition={{ duration: 0.16 }}
          >
            <motion.div
              className="executive-modal"
              initial={{ scale: 0.84, opacity: 0, y: -18 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.88, opacity: 0, y: -12 }}
              transition={IOS_MODAL_SPRING}
            >
              <div className="executive-header">
                <div>
                  <span className="completion-badge">
                    Analisi Economica &amp; Conformità D.Lgs. 81/2008 (Dati Ufficiali INAIL / UE)
                  </span>
                  <h2>Pausa81 — Calcolatore Costo Non-Prevenzione &amp; Sconto INAIL OT23</h2>
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
                    Numero Dipendenti Azienda: <strong>{employeesCount}</strong>
                  </label>
                  <span>
                    Investimento Pausa81: <strong>{recommendedPlanPrice}</strong>
                  </span>
                </div>
                <input
                  id="emp-slider"
                  type="range"
                  min={10}
                  max={500}
                  step={5}
                  value={employeesCount}
                  onChange={(e) => setEmployeesCount(Number(e.target.value))}
                  className="roi-slider"
                />
                <div className="roi-metrics">
                  <div>
                    <small>Danno Non-Prevenzione (Annuo / Mensile)*</small>
                    <strong style={{ color: '#dc2626' }}>
                      - € {totalCompanyDamageYearly}/a (€ {totalCompanyDamageMonthly}/m)
                    </strong>
                  </div>
                  <div>
                    <small>Recupero Produttività &amp; Assenze (10%)</small>
                    <strong style={{ color: '#10b981' }}>+ € {estimatedAnnualSavings} / anno</strong>
                  </div>
                  <div>
                    <small>Fascia Sconto Premio INAIL (Modello OT23)</small>
                    <strong style={{ color: '#0d9488' }}>-{inailOt23DiscountPct} sul premio</strong>
                  </div>
                </div>
              </div>

              <h3 className="compliance-section-title">
                I 4 Indicatori di Rischio Economico e Penale Azzerati da Pausa81
              </h3>
              <div className="compliance-grid">
                <div className="compliance-card">
                  <h4>1. Malattie Professionali DMS (74,7% Totale INAIL)</h4>
                  <p>
                    Secondo i dati ufficiali INAIL, i Disturbi Muscolo-Scheletrici (collo, spalle,
                    tunnel carpale) rappresentano il <strong>74,7% delle malattie professionali</strong>{' '}
                    (+21,6%), generando in media 4,8 giorni di assenza breve/anno (€ 905/dipendente).
                  </p>
                </div>

                <div className="compliance-card">
                  <h4>2. Burnout &amp; Presenteismo (88,5 Miliardi €/anno in Italia)</h4>
                  <p>
                    Il calo di lucidità al videoterminale e il burnout colpiscono il 69% dei
                    lavoratori italiani, causando una perdita invisibile di resa pari a{' '}
                    <strong>€ 2.282/anno per addetto</strong> (€ 4.484/anno totali, pari a € 373,66/mese).
                  </p>
                </div>

                <div className="compliance-card">
                  <h4>3. Scudo Sanzioni Penali Art. 55/178 D.Lgs. 81/08 &amp; Art. 2087 c.c.</h4>
                  <p>
                    Protegge il Datore di Lavoro dalle ammende penali ex Art. 55 e Art. 178 D.Lgs.
                    81/08 (da <strong>€ 2.847 a € 9.112</strong> rivalutate del +15,9%) e dalle cause
                    civili per ambiente stressogeno ex Art. 2087 c.c.
                  </p>
                </div>

                <div className="compliance-card">
                  <h4>4. Zero-Tracking (0 Byte) &amp; Garanzia Sindacale RLS</h4>
                  <p>
                    Esente da accordi ex Art. 4 L. 300/1970 (nessun dato raccolto) e conforme
                    all’Art. 175 c. 3 D.Lgs. 81/08 (integra senza mai ridurre i 15 minuti di pausa VDT).
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
                  Apri Fascicolo Notarile DVR (3 Firme)
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    setShowExecutiveModal(false);
                    setShowQrModal(true);
                  }}
                >
                  Stampa Targa QR Reparto
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowExecutiveModal(false)}
                >
                  Chiudi
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
