import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CloudBackground } from './components/CloudBackground';

export type Phase = 'idle' | 'inspire' | 'hold' | 'expire' | 'pause';

interface Protocol {
  id: string;
  name: string;
  subtitle: string;
  inspire: number;
  hold: number;
  expire: number;
  pause: number;
  benefit: string;
}

const PROTOCOLS: Protocol[] = [
  {
    id: 'coherence',
    name: 'Reset Tra Due Call',
    subtitle: 'Coerenza Cardiaca 5·5',
    inspire: 5,
    hold: 0,
    expire: 5,
    pause: 0,
    benefit: 'Riduce il carico cognitivo e stabilizza il ritmo autonomico in 6 cicli da 10 secondi.',
  },
  {
    id: 'box',
    name: 'Lucidità Pre-Meeting',
    subtitle: 'Sama Vritti 4·4·4·4',
    inspire: 4,
    hold: 4,
    expire: 4,
    pause: 4,
    benefit: 'Riequilibra la corteccia prefrontale prima di decisioni o riunioni ad alta pressione.',
  },
  {
    id: 'antiburnout',
    name: 'Scudo Anti-Tecnostress',
    subtitle: 'Espirazione Estesa 4·2·6',
    inspire: 4,
    hold: 2,
    expire: 6,
    pause: 0,
    benefit: 'Stimola il nervo vago prolungando la fase di espirazione per sciogliere la tensione accumulata.',
  },
  {
    id: 'visual',
    name: 'Riposo Visivo & Mentale',
    subtitle: 'Onda Calma 4·4·6·2',
    inspire: 4,
    hold: 4,
    expire: 6,
    pause: 2,
    benefit: 'Ideale ogni 2 ore di videoterminale (Titolo VII D.Lgs. 81/2008) per riposare vista e attenzione.',
  },
];

const SESSION_DURATION = 60;

function playSoftChime(phase: Phase, enabled: boolean) {
  if (!enabled || typeof window === 'undefined') return;
  const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
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
    gain.gain.exponentialRampToValueAtTime(0.06, ctx.currentTime + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 2.2);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 2.3);
  } catch {
    // Audio non ancora sbloccato dal browser
  }
}

function useBreathScale(phase: Phase, breath: number, phaseDuration: number) {
  const scale = phase === 'idle' ? 0.84 : 0.64 + 0.34 * breath;
  const duration = phase === 'idle' ? 0.8 : Math.max(phaseDuration, 1.8);
  return { scale, duration };
}

function SvasaLogo() {
  return (
    <span className="svasa-wordmark" aria-hidden="true">
      SvasaOS <small className="svasa-badge-b2b">Enterprise</small>
    </span>
  );
}

function SacredLotus({ phase }: { phase: Phase }) {
  const openFactor =
    phase === 'inspire' || phase === 'hold'
      ? 1.12
      : phase === 'expire' || phase === 'pause'
      ? 0.88
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
            transition: 'transform 2.4s ease-in-out',
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
            transition: 'transform 2.4s ease-in-out',
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
            transition: 'transform 2.4s ease-in-out',
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
          stroke="#64748b"
          strokeWidth="3"
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
  const [selectedProtocol, setSelectedProtocol] = useState<Protocol>(PROTOCOLS[0]);
  const [phase, setPhase] = useState<Phase>('idle');
  const [breath, setBreath] = useState<number>(0.5);
  const [phaseTimeLeft, setPhaseTimeLeft] = useState<number>(0);
  const [phaseDuration, setPhaseDuration] = useState<number>(5);
  const [sessionRemaining, setSessionRemaining] = useState<number>(SESSION_DURATION);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [eyeRestMode, setEyeRestMode] = useState<boolean>(false);
  const [sessionCompleted, setSessionCompleted] = useState<boolean>(false);
  const [showExecutiveModal, setShowExecutiveModal] = useState<boolean>(false);
  const [employeesCount, setEmployeesCount] = useState<number>(120);

  const timerRef = useRef<number | null>(null);

  const getNextPhase = useCallback(
    (current: Phase): { next: Phase; duration: number; targetBreath: number } => {
      const p = selectedProtocol;
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
    [selectedProtocol]
  );

  const stopSession = useCallback(() => {
    if (timerRef.current) window.clearInterval(timerRef.current);
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
  }, [getNextPhase, soundEnabled]);

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
          return nextStep.duration;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [phase, getNextPhase, soundEnabled]);

  const phaseLabel: Record<Phase, string> = {
    idle: 'Pausa Rigenerativa da 60 Secondi',
    inspire: 'Inspira dolcemente dal naso',
    hold: 'Trattieni con calma',
    expire: 'Espira lentamente lasciando andare',
    pause: 'Riposo a polmoni vuoti',
  };

  const estimatedHoursSavedMonthly = Math.round(employeesCount * 3.2);
  const estimatedAnnualSavings = (employeesCount * 410).toLocaleString('it-IT');

  return (
    <div className={`app ${eyeRestMode ? 'app--warm-rest' : ''}`}>
      <CloudBackground />

      <header className="topbar">
        <button
          type="button"
          className="executive-pill"
          onClick={() => setShowExecutiveModal(true)}
        >
          <span className="pill-dot" />
          Area Direttori · ROI &amp; Conformità Legale (IT)
        </button>

        <div className="topbar-actions">
          <button
            type="button"
            className={`icon-btn ${eyeRestMode ? 'active' : ''}`}
            onClick={() => setEyeRestMode((v) => !v)}
          >
            {eyeRestMode ? 'Filtro Caldo Attivo' : 'Riposo Visivo'}
          </button>

          <button
            type="button"
            className={`icon-btn ${soundEnabled ? 'active' : ''}`}
            onClick={() => setSoundEnabled((v) => !v)}
          >
            {soundEnabled ? 'Audio ON' : 'Audio Muto'}
          </button>
        </div>
      </header>

      <main className="app-main">
        <div className="protocol-bar" role="tablist" aria-label="Protocolli da 60 secondi">
          {PROTOCOLS.map((p) => (
            <button
              key={p.id}
              type="button"
              className={`protocol-chip ${selectedProtocol.id === p.id ? 'active' : ''}`}
              onClick={() => {
                stopSession();
                setSelectedProtocol(p);
                setSessionCompleted(false);
              }}
            >
              <span className="protocol-chip-title">{p.name}</span>
              <span className="protocol-chip-sub">{p.subtitle}</span>
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
          <p className="phase-text">{phaseLabel[phase]}</p>

          {phase === 'idle' ? (
            <p className="protocol-benefit">{selectedProtocol.benefit}</p>
          ) : (
            <div className="countdown">
              <span className="countdown-number">{phaseTimeLeft}</span>
              <span className="countdown-label">
                Fine micro-pausa tra {sessionRemaining}s
              </span>
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
              Inizia Reset di 60 Secondi
            </button>
          ) : (
            <button type="button" className="btn btn-secondary" onClick={stopSession}>
              Termina Pausa
            </button>
          )}
        </div>

        <div className="brand">
          <SvasaLogo />
        </div>
      </main>

      <footer className="compliance-footer">
        <span>
          <strong>100% Anonimo &amp; Zero-Tracking:</strong> nessun dato personale, biometrico o
          emotivo viene raccolto o condiviso con il datore di lavoro (Conforme Garante Privacy ·
          Esente Art. 4 L. 300/1970 · Misura integrativa D.Lgs. 81/2008).
        </span>
      </footer>

      <AnimatePresence>
        {sessionCompleted && (
          <motion.div
            className="modal-backdrop"
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
              <span className="completion-badge">Micro-Pausa Completata · 60 Secondi</span>
              <h2>Decompressione Mentale e Visiva Completata</h2>
              <p>
                Hai completato un minuto di respirazione guidata <strong>{selectedProtocol.name}</strong>.
              </p>

              <div className="benchmark-grid">
                <div className="benchmark-item">
                  <strong>-24%</strong>
                  <span>Affaticamento da Videoterminale*</span>
                </div>
                <div className="benchmark-item">
                  <strong>+21%</strong>
                  <span>Equilibrio Autonomico (HRV)*</span>
                </div>
              </div>

              <p className="legal-note">
                *Valori medi di riferimento tratti dalla letteratura scientifica sulla respirazione
                guidata e sulle micro-pause lavorative. Questa web-app non effettua misurazioni
                biometriche, diagnostiche o di monitoraggio emotivo sul lavoratore, né sostituisce la
                valutazione ufficiale INAIL dello stress lavoro-correlato.
              </p>

              <div className="completion-actions">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setSessionCompleted(false)}
                >
                  Torna al Lavoro Rigenerato
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => {
                    setSessionCompleted(false);
                    startSession();
                  }}
                >
                  Ripeti 60s
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showExecutiveModal && (
          <motion.div
            className="modal-backdrop"
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
                  <span className="completion-badge">Presentazione Direzione · HR · RSPP · DPO</span>
                  <h2>SvasaOS Enterprise — Prevenzione Burnout &amp; Tecnostress</h2>
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
                    Numero Dipendenti / Videoterminalisti: <strong>{employeesCount}</strong>
                  </label>
                  <span>3 micro-pause da 60s / giorno</span>
                </div>
                <input
                  id="emp-slider"
                  type="range"
                  min={15}
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
                    <small>Riduzione Costi Assenteismo &amp; Turnover / Anno</small>
                    <strong>€ {estimatedAnnualSavings}</strong>
                  </div>
                  <div>
                    <small>Tempo di Adozione IT &amp; Sindacale</small>
                    <strong>Immediato (Zero Login)</strong>
                  </div>
                </div>
              </div>

              <h3 className="compliance-section-title">
                Quadro di Conformità Normativa Italiana (Pronto per Audit DPO / RSPP)
              </h3>
              <div className="compliance-grid">
                <div className="compliance-card">
                  <h4>1. Garante per la Protezione dei Dati Personali (gpdp.it)</h4>
                  <p>
                    Pienamente conforme ai provvedimenti restrittivi del Garante Privacy sul lavoro:
                    SvasaOS <strong>non utilizza algoritmi di monitoraggio emotivo</strong>,
                    webcam, sensori o &ldquo;braccialetti intelligenti&rdquo;. Funziona interamente
                    nel browser (Client-Side) senza raccogliere dati sanitari o biometrici (Art. 9
                    GDPR e Art. 8 L. 300/1970).
                  </p>
                </div>

                <div className="compliance-card">
                  <h4>2. Linee Guida INAIL sullo Stress Lavoro-Correlato</h4>
                  <p>
                    Progettata per <strong>integrarsi e rispettare i criteri della metodologia
                    ufficiale INAIL senza mai sostituirla</strong>. Affianca il percorso ufficiale
                    (check-list e questionari standardizzati ex Art. 28 D.Lgs. 81/2008) come misura
                    concreta di prevenzione secondaria e mitigazione del rischio nel DVR aziendale.
                  </p>
                </div>

                <div className="compliance-card">
                  <h4>3. Ispettorato Nazionale del Lavoro (INL) — Art. 4 Statuto Lavoratori</h4>
                  <p>
                    In linea con le circolari interpretative dell&apos;INL sull&apos;Art. 4 della
                    Legge 300/1970, l&apos;assenza totale di account nominativi, log di utilizzo o
                    tracciamento orario rende impossibile qualsiasi controllo a distanza:
                    <strong> non richiede accordo sindacale preventivo né autorizzazione INL</strong>.
                  </p>
                </div>

                <div className="compliance-card">
                  <h4>4. Giurisprudenza di Cassazione Lavoro (Tecnostress)</h4>
                  <p>
                    Rispetta i limiti tracciati dalla Cassazione su ciò che il datore di lavoro può
                    installare sui dispositivi dei dipendenti: è una web-app leggera a fruizione
                    volontaria su browser, senza alcuna installazione forzata, che tutela
                    l&apos;azienda dal rischio di tecnostress (Art. 2087 c.c. e Titolo VII D.Lgs. 81/08).
                  </p>
                </div>
              </div>

              <div className="executive-footer">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    setShowExecutiveModal(false);
                    startSession();
                  }}
                >
                  Avvia Demo Direttori (60 Secondi)
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
