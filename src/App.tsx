import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CloudBackground } from './components/CloudBackground';
import { Sphere, SvasaLogo } from './components/Sphere';
import { useBreathing, type Phase } from './hooks/useBreathing';
import { useAmbientAudio } from './hooks/useAmbientAudio';

const PHASE_LABELS: Record<Phase, string> = {
  idle: 'Pronto a respirare?',
  inspire: 'Inspira',
  hold: 'Trattieni',
  expire: 'Espira',
  pause: 'Pausa',
};

function SpeakerIcon({ muted }: { muted: boolean }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M11 5 6.5 9H3v6h3.5L11 19V5z" fill="currentColor" stroke="none" />
      {muted ? (
        <>
          <line x1="16" y1="9" x2="22" y2="15" />
          <line x1="22" y1="9" x2="16" y2="15" />
        </>
      ) : (
        <>
          <path d="M15.5 8.5a5 5 0 0 1 0 7" />
          <path d="M18.5 5.5a9 9 0 0 1 0 13" />
        </>
      )}
    </svg>
  );
}

export default function App() {
  const { status, phase, breath, secondsLeft, secondProgress, duration, start, reset } = useBreathing();
  const { enabled, toggle, play, pause, breathe } = useAmbientAudio();

  const handleStart = () => {
    play();
    start();
  };

  const handleReset = () => {
    pause();
    reset();
  };

  // Sincronizza l'audio (respiro) con le fasi e l'interruttore.
  useEffect(() => {
    if (status === 'running' && enabled) {
      play();
      breathe(phase, duration);
    } else {
      pause();
    }
  }, [status, enabled, phase, duration, play, pause, breathe]);

  return (
    <div className="app">
      <CloudBackground />

      <button
        type="button"
        className={`sound-toggle${enabled ? ' active' : ''}`}
        onClick={toggle}
        aria-label={enabled ? 'Disattiva audio' : 'Attiva audio'}
        aria-pressed={enabled}
      >
        <SpeakerIcon muted={!enabled} />
      </button>

      <main className="app-main">
        <Sphere phase={phase} breath={breath} />

        <div className="status">
          <AnimatePresence mode="wait">
            <motion.p
              key={phase}
              className="phase-text"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
            >
              {PHASE_LABELS[phase]}
            </motion.p>
          </AnimatePresence>

          {status === 'running' && (
            <motion.div
              className="countdown"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            >
              <motion.span
                key={secondsLeft}
                className="countdown-number"
                initial={{ opacity: 0, y: 10, scale: 1.2 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
              >
                {secondsLeft}
              </motion.span>
              <span className="countdown-label">secondi</span>
              <div className="tick-bar" aria-hidden="true">
                <div className="tick-bar-fill" style={{ width: `${secondProgress * 100}%` }} />
              </div>
            </motion.div>
          )}
        </div>

        <div className="controls">
          {status === 'idle' ? (
            <motion.button
              type="button"
              className="btn btn-primary"
              whileTap={{ scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              onClick={handleStart}
            >
              Inizia
            </motion.button>
          ) : (
            <motion.button
              type="button"
              className="btn btn-secondary"
              whileTap={{ scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              onClick={handleReset}
            >
              Reset
            </motion.button>
          )}
        </div>

        <div className="brand">
          <SvasaLogo />
        </div>
      </main>
    </div>
  );
}
