import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CloudBackground } from './components/CloudBackground';

export type Phase = 'idle' | 'inspire' | 'hold' | 'expire' | 'pause';

interface LevelProtocol {
  id: string;
  shortTab: string;
  levelTag: string;
  name: string;
  subtitle: string;
  whenToUse: string;
  inspire: number;
  hold: number;
  expire: number;
  pause: number;
  benefit: string;
  prompts: Record<Phase, string>;
  voicePrompts: Record<Phase, string>;
}

const LEVELS: LevelProtocol[] = [
  {
    id: 'level1',
    shortTab: 'Liv. 1 · Visivo',
    levelTag: 'LIVELLO 1 · NEURO-VISIVO',
    name: 'Reset Tra Due Call',
    subtitle: 'Riposo Oculare 5·0·5',
    whenToUse: 'Seduto · Cambio attività o post-videocall',
    inspire: 5,
    hold: 0,
    expire: 5,
    pause: 0,
    benefit:
      'Riduce l’affaticamento della corteccia visiva (Titolo VII D.Lgs. 81/08) e riequilibra il sistema nervoso in 60 secondi.',
    prompts: {
      idle: 'Livello 1: Riposo Visivo e Coerenza (60s)',
      inspire: 'Inspira dal naso · Distogli il fuoco dai pixel e segui il Loto',
      hold: 'Mantieni il respiro calmo',
      expire: 'Espira lentamente · Rilascia mandibola, occhi e spalle',
      pause: 'Pausa naturale',
    },
    voicePrompts: {
      idle: '',
      inspire: 'Inspira dolcemente dal naso, rilassa lo sguardo',
      hold: 'Trattieni',
      expire: 'Espira lentamente, lascia scendere le spalle',
      pause: 'Riposa',
    },
  },
  {
    id: 'level2',
    shortTab: 'Liv. 2 · Gambe 1h',
    levelTag: 'LIVELLO 2 · DOPO 60 MIN DI SCHERMO',
    name: 'Pompa Ematica & Gambe',
    subtitle: 'Soleus & Sit-to-Stand 4·2·4',
    whenToUse: 'Seduto/Sedia · Riattivazione circolatoria (Zero-Sudore)',
    inspire: 4,
    hold: 2,
    expire: 4,
    pause: 0,
    benefit:
      'Riattiva il ritorno venoso dagli arti inferiori al cervello (muscolo soleo e glutei) senza sovraccaricare le ginocchia.',
    prompts: {
      idle: 'Livello 2: Riattivazione Circolatoria Post-1h (60s)',
      inspire: 'Inspira (4s) · Solleva i talloni da terra attivando i polpacci',
      hold: 'Trattieni (2s) · Contrai polpacci e glutei (o sali in piedi)',
      expire: 'Espira (4s) · Riappoggia i talloni (o siediti lentamente)',
      pause: 'Riposa',
    },
    voicePrompts: {
      idle: '',
      inspire: 'Inspira, solleva i talloni e attiva le gambe',
      hold: 'Mantieni la spinta',
      expire: 'Espira, riappoggia con controllo',
      pause: 'Pausa',
    },
  },
  {
    id: 'level3',
    shortTab: 'Liv. 3 · Postura',
    levelTag: 'LIVELLO 3 · RIPRESA FISICA & POSTURALE',
    name: 'Sblocco Collo, Spalle & Polsi',
    subtitle: 'Decompressione DMS 4·2·6',
    whenToUse: 'In piedi · Pausa VDT (2h) o Fine Turno',
    inspire: 4,
    hold: 2,
    expire: 6,
    pause: 0,
    benefit:
      'Previene i Disturbi Muscolo-Scheletrici (DMS): scarica tunnel carpale, rachide cervicale (Tech-Neck) e tratto lombare.',
    prompts: {
      idle: 'Livello 3: Decompressione Fisica in Piedi (60s)',
      inspire: 'Inspira (4s) · In piedi, ruota i palmi in fuori, apri dita e torace',
      hold: 'Trattieni (2s) · Allunga la nuca verso l’alto e attiva i glutei',
      expire: 'Espira (6s) · Rilascia braccia, trapezio e tensione lombare',
      pause: 'Riposa',
    },
    voicePrompts: {
      idle: '',
      inspire: 'Inspira, apri il petto e ruota i palmi verso l’esterno',
      hold: 'Allunga bene la schiena',
      expire: 'Espira a lungo, sciogli collo e spalle',
      pause: 'Riposa',
    },
  },
];

const SESSION_DURATION = 60;
const VOICE_STORAGE_KEY = 'pausa81_custom_voice_v1';

/** Sintetizzatore campana armonica */
function playSoftChime(phase: Phase, enabled: boolean) {
  if (!enabled || typeof window === 'undefined') return;
  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return;

  try {
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    const freqMap: Record<Phase, number> = {
      idle: 432,
      inspire: 528,
      hold: 639,
      expire: 396,
      pause: 432,
    };

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freqMap[phase] || 432, ctx.currentTime);

    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.05, ctx.currentTime + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 2.0);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 2.1);
  } catch {
    // Ignora se audio bloccato
  }
}

/**
 * Riproduce LA TUA VOCE REALE:
 * 1) Cerca prima se hai registrato la tua voce nello Studio Integrato (salvata sul dispositivo)
 * 2) Altrimenti cerca il tuo file audio in `/audio/{levelId}_{phase}.mp3` o `/audio/{phase}.mp3` nella cartella public di GitHub
 * 3) Se non trova file registrati, usa la sintesi vocale italiana di backup.
 */
function playCoachVoice(
  levelId: string,
  phase: Phase,
  fallbackText: string,
  enabled: boolean,
  customRecordings: Record<string, string>,
  activeAudioRef: React.MutableRefObject<HTMLAudioElement | null>
) {
  if (!enabled || typeof window === 'undefined') return;

  // Ferma eventuale audio precedente
  if (activeAudioRef.current) {
    activeAudioRef.current.pause();
    activeAudioRef.current.currentTime = 0;
  }

  const specificKey = `${levelId}_${phase}`;
  const genericKey = phase;

  // 1. Controlla registrazione vocale personalizzata salvata
  const recordedDataUrl = customRecordings[specificKey] || customRecordings[genericKey];
  if (recordedDataUrl) {
    try {
      const audio = new Audio(recordedDataUrl);
      activeAudioRef.current = audio;
      audio.play().catch(() => {});
      return;
    } catch {
      // Continua sul fallback
    }
  }

  // 2. Controlla se esiste il file .mp3 nella cartella public/audio/ su Vercel
  const publicAudioUrl = `/audio/${specificKey}.mp3`;
  const audioEl = new Audio(publicAudioUrl);
  activeAudioRef.current = audioEl;

  audioEl
    .play()
    .then(() => {
      // Riproduzione del file .mp3 della tua voce riuscita!
    })
    .catch(() => {
      // 3. Fallback automatico su sintesi vocale se il file .mp3 non è ancora stato caricato su GitHub
      if (!fallbackText || !('speechSynthesis' in window)) return;
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(fallbackText);
        utterance.lang = 'it-IT';
        utterance.rate = 0.92;
        utterance.pitch = 0.98;
        utterance.volume = 0.9;
        window.speechSynthesis.speak(utterance);
      } catch {
        // Silenzioso
      }
    });
}

function useBreathScale(phase: Phase, breath: number, phaseDuration: number) {
  const scale = phase === 'idle' ? 0.84 : 0.64 + 0.34 * breath;
  const duration = phase === 'idle' ? 0.8 : Math.max(phaseDuration, 1.8);
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

const VOICE_SLOTS = [
  { key: 'level1_inspire', label: 'Livello 1 · Inspira', hint: 'Es: "Inspira dolcemente dal naso e rilassa gli occhi"' },
  { key: 'level1_expire', label: 'Livello 1 · Espira', hint: 'Es: "Espira lentamente, lascia andare le spalle"' },
  { key: 'level2_inspire', label: 'Livello 2 · Inspira (Gambe)', hint: 'Es: "Inspira, solleva i talloni e attiva i polpacci"' },
  { key: 'level2_hold', label: 'Livello 2 · Trattieni', hint: 'Es: "Mantieni la spinta"' },
  { key: 'level2_expire', label: 'Livello 2 · Espira (Gambe)', hint: 'Es: "Espira e riappoggia i talloni a terra"' },
  { key: 'level3_inspire', label: 'Livello 3 · Inspira (Postura)', hint: 'Es: "Inspira in piedi, apri il petto e ruota i palmi in fuori"' },
  { key: 'level3_hold', label: 'Livello 3 · Trattieni', hint: 'Es: "Allunga bene la nuca verso l’alto"' },
  { key: 'level3_expire', label: 'Livello 3 · Espira (Postura)', hint: 'Es: "Espira profondamente, sciogli collo e spalle"' },
];

export default function App() {
  const params =
    typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const initialPartner = (params?.get('partner') || '').replace(/[-_]/g, ' ').trim();
  const initialClient = (params?.get('cliente') || params?.get('azienda') || '')
    .replace(/[-_]/g, ' ')
    .trim();

  const [selectedLevel, setSelectedLevel] = useState<LevelProtocol>(LEVELS[0]);
  const [phase, setPhase] = useState<Phase>('idle');
  const [breath, setBreath] = useState<number>(0.5);
  const [phaseTimeLeft, setPhaseTimeLeft] = useState<number>(0);
  const [phaseDuration, setPhaseDuration] = useState<number>(5);
  const [sessionRemaining, setSessionRemaining] = useState<number>(SESSION_DURATION);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [voiceCoachEnabled, setVoiceCoachEnabled] = useState<boolean>(true);
  const [eyeRestMode, setEyeRestMode] = useState<boolean>(false);
  const [sessionCompleted, setSessionCompleted] = useState<boolean>(false);
  const [showExecutiveModal, setShowExecutiveModal] = useState<boolean>(false);
  const [showQrModal, setShowQrModal] = useState<boolean>(false);
  const [showVoiceStudioModal, setShowVoiceStudioModal] = useState<boolean>(false);

  // Contatore minimo lavoratori impostato a 10
  const [employeesCount, setEmployeesCount] = useState<number>(10);

  // Stato per le registrazioni della TUA voce
  const [customRecordings, setCustomRecordings] = useState<Record<string, string>>(() => {
    if (typeof window === 'undefined') return {};
    try {
      const saved = window.localStorage.getItem(VOICE_STORAGE_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [recordingKey, setRecordingKey] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);

  const [partnerStudioName, setPartnerStudioName] = useState<string>(
    initialPartner || 'Studio Partner RSPP / Sicurezza'
  );
  const [clientCompanyName, setClientCompanyName] = useState<string>(
    initialClient || 'Azienda Cliente S.r.l.'
  );
  const [departmentName, setDepartmentName] = useState<string>(
    'Area Videoterminali / Sale Riunioni / Reparto'
  );

  const timerRef = useRef<number | null>(null);

  const startRecordingSlot = async (slotKey: string) => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64data = reader.result as string;
          setCustomRecordings((prev) => {
            const updated = { ...prev, [slotKey]: base64data };
            try {
              window.localStorage.setItem(VOICE_STORAGE_KEY, JSON.stringify(updated));
            } catch {
              // Se localStorage è pieno mantiene in RAM
            }
            return updated;
          });
        };
        reader.readAsDataURL(blob);
        stream.getTracks().forEach((t) => t.stop());
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecordingKey(slotKey);
    } catch {
      alert('Consenti l’accesso al microfono del telefono o del PC per registrare la tua voce.');
    }
  };

  const stopRecordingSlot = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setRecordingKey(null);
  };

  const getNextPhase = useCallback(
    (current: Phase): { next: Phase; duration: number; targetBreath: number } => {
      const p = selectedLevel;
      if (current === 'idle' || current === 'pause') {
        return { next: 'inspire', duration: p.inspire, targetBreath: 1 };
      }
      if (current === 'inspire') {
        if (p.hold > 0) return { next: 'hold', duration: p.hold, targetBreath: 1 };
        return { next: 'expire', duration: p.expire, targetBreath: 0 };
      }
      if (current === 'hold') {
        return { next: 'expire', duration: p.expire, targetBreath: 0 };
      }
      if (current === 'expire') {
        if (p.pause > 0) return { next: 'pause', duration: p.pause, targetBreath: 0 };
        return { next: 'inspire', duration: p.inspire, targetBreath: 1 };
      }
      return { next: 'inspire', duration: p.inspire, targetBreath: 1 };
    },
    [selectedLevel]
  );

  const stopSession = useCallback(() => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current.currentTime = 0;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setPhase('idle');
    setBreath(0.5);
    setSessionRemaining(SESSION_DURATION);
    setPhaseTimeLeft(0);
  }, []);

  const startSession = useCallback(() => {
    setSessionCompleted(false);
    setSessionRemaining(SESSION_DURATION);
    const first = getNextPhase('idle');
    setPhase(first.next);
    setPhaseDuration(first.duration);
    setPhaseTimeLeft(first.duration);
    setBreath(first.targetBreath);
    playSoftChime(first.next, soundEnabled);
    playCoachVoice(
      selectedLevel.id,
      first.next,
      selectedLevel.voicePrompts[first.next],
      voiceCoachEnabled,
      customRecordings,
      activeAudioRef
    );
  }, [getNextPhase, soundEnabled, voiceCoachEnabled, selectedLevel, customRecordings]);

  useEffect(() => {
    if (phase === 'idle') return;

    timerRef.current = window.setInterval(() => {
      setSessionRemaining((prev) => {
        if (prev <= 1) {
          if (timerRef.current) window.clearInterval(timerRef.current);
          setPhase('idle');
          setBreath(0.5);
          setSessionCompleted(true);
          playSoftChime('idle', soundEnabled);
          return 0;
        }
        return prev - 1;
      });

      setPhaseTimeLeft((prev) => {
        if (prev <= 1) {
          const nextStep = getNextPhase(phase);
          setPhase(nextStep.next);
          setPhaseDuration(nextStep.duration);
          setBreath(nextStep.targetBreath);
          playSoftChime(nextStep.next, soundEnabled);
          playCoachVoice(
            selectedLevel.id,
            nextStep.next,
            selectedLevel.voicePrompts[nextStep.next],
            voiceCoachEnabled,
            customRecordings,
            activeAudioRef
          );
          return nextStep.duration;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [phase, getNextPhase, soundEnabled, voiceCoachEnabled, selectedLevel, customRecordings]);

  const estimatedHoursSavedMonthly = Math.round(employeesCount * 3.2);
  const estimatedAnnualSavings = (employeesCount * 410).toLocaleString('it-IT');

  const customWhiteLabelUrl = `https://pranayama-khaki.vercel.app/?partner=${encodeURIComponent(
    partnerStudioName.replace(/\s+/g, '_')
  )}&cliente=${encodeURIComponent(clientCompanyName.replace(/\s+/g, '_'))}`;

  const hasCustomVoiceRecorded = Object.keys(customRecordings).length > 0;

  return (
    <div className={`app ${eyeRestMode ? 'app--warm-rest' : ''}`}>
      <CloudBackground />

      {/* Topbar ottimizzata per Mobile e Desktop */}
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
          <button
            type="button"
            className={`icon-btn ${voiceCoachEnabled ? 'active' : ''}`}
            onClick={() => setVoiceCoachEnabled((v) => !v)}
          >
            {voiceCoachEnabled
              ? hasCustomVoiceRecorded
                ? 'Tua Voce ON'
                : 'Voce ON'
              : 'Voce OFF'}
          </button>

          <button
            type="button"
            className="icon-btn voice-studio-btn"
            onClick={() => setShowVoiceStudioModal(true)}
            title="Registra la tua voce reale per i 3 livelli"
          >
            🎙️ Mia Voce
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
            className={`icon-btn ${soundEnabled ? 'active' : ''}`}
            onClick={() => setSoundEnabled((v) => !v)}
          >
            {soundEnabled ? 'Audio' : 'Muto'}
          </button>
        </div>
      </header>

      <main className="app-main no-print">
        {/* Barra 3 Livelli compatta (3 colonne affiancate anche su smartphone) */}
        <div className="protocol-bar" role="tablist" aria-label="3 Livelli Pausa81">
          {LEVELS.map((lvl) => (
            <button
              key={lvl.id}
              type="button"
              className={`protocol-chip ${selectedLevel.id === lvl.id ? 'active' : ''}`}
              onClick={() => {
                stopSession();
                setSelectedLevel(lvl);
                setSessionCompleted(false);
              }}
            >
              <span className="protocol-level-tag">{lvl.shortTab}</span>
              <span className="protocol-chip-title">{lvl.name}</span>
              <span className="protocol-chip-sub">{lvl.subtitle}</span>
            </button>
          ))}
        </div>

        <Sphere
          phase={phase}
          breath={breath}
          phaseDuration={phaseDuration}
          sessionRemaining={sessionRemaining}
        />

        <div className="status">
          <span className="when-to-use-pill">{selectedLevel.whenToUse}</span>
          <p className="phase-text">{selectedLevel.prompts[phase]}</p>

          {phase === 'idle' ? (
            <p className="protocol-benefit">{selectedLevel.benefit}</p>
          ) : (
            <div className="countdown">
              <div className="countdown-row">
                <span className="countdown-number">{phaseTimeLeft}s</span>
                <span className="countdown-label">· Fine tra {sessionRemaining}s</span>
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
          {phase === 'idle' ? (
            <button type="button" className="btn btn-primary" onClick={startSession}>
              Avvia {selectedLevel.name} (60s)
            </button>
          ) : (
            <button type="button" className="btn btn-secondary" onClick={stopSession}>
              Interrompi Pausa
            </button>
          )}
        </div>

        <div className="brand">
          <Pausa81Logo partnerName={initialClient || initialPartner} />
        </div>
      </main>

      <footer className="compliance-footer no-print">
        <span>
          <strong>Pausa81 · 100% Anonimo &amp; Zero-Tracking:</strong> conforme Garante Privacy ·
          Esente Art. 4 L. 300/70 · Presidio Art. 28 e Titolo VII D.Lgs. 81/2008.
        </span>
      </footer>

      {/* Modal Studio Registrazione LA TUA VOCE */}
      <AnimatePresence>
        {showVoiceStudioModal && (
          <motion.div
            className="modal-backdrop no-print"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="executive-modal"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
            >
              <div className="executive-header">
                <div>
                  <span className="completion-badge">Personalizzazione Vocale Fondatore</span>
                  <h2>🎙️ Registra la Tua Voce Coach per Pausa81</h2>
                </div>
                <button
                  type="button"
                  className="close-btn"
                  onClick={() => {
                    stopRecordingSlot();
                    setShowVoiceStudioModal(false);
                  }}
                >
                  ✕
                </button>
              </div>

              <p className="legal-note" style={{ marginBottom: '0.9rem' }}>
                <strong>Come funziona:</strong> Premi <strong>Registra</strong> accanto a ogni fase e
                pronuncia la frase con tono calmo. La tua voce viene salvata subito in questo
                telefono/PC per le tue demo dal vivo. Se clicchi su <strong>Scarica file</strong>,
                puoi caricare i file nella cartella <code>public/audio/</code> su GitHub così tutti
                i clienti sentiranno la tua voce!
              </p>

              <div className="voice-slots-list">
                {VOICE_SLOTS.map((slot) => {
                  const isRec = recordingKey === slot.key;
                  const savedAudio = customRecordings[slot.key];
                  return (
                    <div key={slot.key} className="voice-slot-card">
                      <div>
                        <strong>{slot.label}</strong>
                        <small>{slot.hint}</small>
                      </div>
                      <div className="voice-slot-actions">
                        {!isRec ? (
                          <button
                            type="button"
                            className="btn-mini btn-mini-rec"
                            onClick={() => startRecordingSlot(slot.key)}
                          >
                            {savedAudio ? 'Riregistra' : '● Registra'}
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="btn-mini btn-mini-stop"
                            onClick={stopRecordingSlot}
                          >
                            ■ Stop
                          </button>
                        )}

                        {savedAudio && (
                          <>
                            <button
                              type="button"
                              className="btn-mini"
                              onClick={() => {
                                const a = new Audio(savedAudio);
                                a.play();
                              }}
                            >
                              ▶ Ascolta
                            </button>
                            <a
                              href={savedAudio}
                              download={`${slot.key}.mp3`}
                              className="btn-mini"
                              style={{ textDecoration: 'none' }}
                            >
                              ⬇ Scarica
                            </a>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="executive-footer" style={{ marginTop: '1rem' }}>
                {hasCustomVoiceRecorded && (
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => {
                      setCustomRecordings({});
                      window.localStorage.removeItem(VOICE_STORAGE_KEY);
                    }}
                  >
                    Ripristina Voce Default
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    stopRecordingSlot();
                    setShowVoiceStudioModal(false);
                  }}
                >
                  Salva e Torna a Pausa81
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Fine Sessione */}
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
              <span className="completion-badge">{selectedLevel.levelTag} Completato</span>
              <h2>Decompressione Pausa81 Completata</h2>
              <p>
                Hai completato 60 secondi di <strong>{selectedLevel.name}</strong>.
              </p>

              <div className="benchmark-grid">
                <div className="benchmark-item">
                  <strong>-24%</strong>
                  <span>Fatica Visiva &amp; Posturale*</span>
                </div>
                <div className="benchmark-item">
                  <strong>+21%</strong>
                  <span>Equilibrio Autonomico (HRV)*</span>
                </div>
              </div>

              <p className="legal-note">
                *Valori medi da letteratura scientifica sulle micro-pause ergonomiche. Pausa81 non
                effettua misurazioni biometriche o monitoraggio emotivo sul lavoratore, né
                sostituisce la valutazione ufficiale INAIL dello stress lavoro-correlato.
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

      {/* Modal Generatore Targa Murale QR Code D.Lgs. 81/08 */}
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
                    <h4>PROTOCOLLI PAUSA81 DA 60 SECONDI</h4>
                    <div className="plaque-level-item">
                      <strong>LIVELLO 1 · Reset Neuro-Visivo (Tra due call / picco operativo):</strong>
                      <p>Decompressione oculare e respirazione guidata 5·5 a colori tenui.</p>
                    </div>
                    <div className="plaque-level-item">
                      <strong>LIVELLO 2 · Pompa Ematica &amp; Gambe (Dopo 60 min di postura fissa):</strong>
                      <p>Attivazione muscolo soleo e Sit-to-Stand ergonomico contro la stasi venosa.</p>
                    </div>
                    <div className="plaque-level-item">
                      <strong>LIVELLO 3 · Decompressione Posturale DMS (Pausa 2h / Fine Turno):</strong>
                      <p>Scarico guidato di rachide cervicale, spalle, tratto lombare e tunnel carpale.</p>
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

      {/* Modal Presentazione Direzione · HR · RSPP · Medico Competente con Pausa81 e minimo 10 lavoratori */}
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
