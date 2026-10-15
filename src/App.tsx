import { useState, useEffect } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'

const RAINBOW = [
  '#FF0000',
  '#FF7F00',
  '#FFFF00',
  '#00FF00',
  '#0000FF',
  '#4B0082',
  '#8B00FF',
  '#FF1493',
]

type Phase = {
  name: string
  anim: 'breatheIn' | 'breatheOut' | null
  baseScale: number
}

const PHASES: Phase[] = [
  { name: 'Inspira', anim: 'breatheIn', baseScale: 0.6 },
  { name: 'Trattieni', anim: null, baseScale: 1.0 },
  { name: 'Espira', anim: 'breatheOut', baseScale: 1.0 },
  { name: 'Trattieni', anim: null, baseScale: 0.6 },
]

const CYCLE = 20 // 4 fasi × 5s
const TOTAL = 60 // 3 cicli

export default function App() {
  const { offlineReady, needRefresh, updateServiceWorker } = useRegisterSW()
  const [elapsed, setElapsed] = useState(0)
  const [running, setRunning] = useState(false)
  const [resetKey, setResetKey] = useState(0)

  // Countdown: dipende solo da `running` (niente re-creazione ogni secondo).
  useEffect(() => {
    if (!running) return
    const t = setInterval(() => setElapsed((e) => Math.min(e + 1, TOTAL)), 1000)
    return () => clearInterval(t)
  }, [running])

  // Ferma il timer a fine sessione.
  useEffect(() => {
    if (elapsed >= TOTAL) setRunning(false)
  }, [elapsed])

  const cycleTime = elapsed % CYCLE
  const phaseIdx = Math.floor(cycleTime / 5)
  const phase = PHASES[phaseIdx]
  const phaseRemaining = 5 - (cycleTime % 5)
  const cycleNum = Math.min(Math.floor(elapsed / CYCLE) + 1, 3)
  const isDone = elapsed >= TOTAL

  const handleReset = () => {
    setRunning(false)
    setElapsed(0)
    setResetKey((k) => k + 1) // riavvia rotazione + respiro da capo
  }

  return (
    <div className="flex h-screen flex-col items-center justify-center gap-8 overflow-hidden bg-white">
      {/* Rotazione continua (smooth) sul wrapper esterno; respiro (scala) sull'elemento interno.
          Entrambe pausabili tramite animation-play-state. */}
      <div
        key={resetKey}
        className="relative"
        style={{
          width: '280px',
          height: '280px',
          animation: 'spin 60s linear infinite',
          animationPlayState: running ? 'running' : 'paused',
        }}
      >
        <div
          className="h-full w-full"
          style={{
            transform: `scale(${phase.baseScale})`,
            animation: phase.anim ? `${phase.anim} 5s ease-in-out forwards` : 'none',
            animationPlayState: running ? 'running' : 'paused',
          }}
        >
          <svg viewBox="0 0 200 200" className="h-full w-full" aria-hidden="true">
            {RAINBOW.map((color, i) => (
              <ellipse
                key={i}
                cx="100"
                cy="100"
                rx="80"
                ry="35"
                fill="none"
                stroke={color}
                strokeWidth="3.5"
                strokeLinecap="round"
                opacity="0.85"
                transform={`rotate(${i * 22.5} 100 100)`}
                style={{ filter: `drop-shadow(0 0 6px ${color}55)` }}
              />
            ))}
          </svg>
        </div>
      </div>

      <div className="text-center">
        {isDone ? (
          <p className="animate-pulse text-4xl font-light text-gray-700">Namaste 🙏</p>
        ) : (
          <>
            <p
              key={phaseIdx}
              className="mb-2 text-3xl font-semibold text-gray-800"
              style={{ animation: 'fadeIn 0.8s ease-in-out' }}
            >
              {phase.name}
            </p>
            <p className="text-5xl font-light text-gray-600">{phaseRemaining}</p>
            <p className="mt-2 text-sm text-gray-400">Ciclo {cycleNum} di 3</p>
          </>
        )}
      </div>

      <div className="flex gap-4">
        {isDone ? (
          <button
            onClick={handleReset}
            className="rounded-full bg-gray-800 px-6 py-3 text-white transition hover:bg-gray-700"
          >
            Ricomincia
          </button>
        ) : !running ? (
          <button
            onClick={() => setRunning(true)}
            className="rounded-full bg-gray-800 px-6 py-3 text-white transition hover:bg-gray-700"
          >
            {elapsed === 0 ? 'Inizia' : 'Riprendi'}
          </button>
        ) : (
          <button
            onClick={() => setRunning(false)}
            className="rounded-full bg-gray-300 px-6 py-3 text-gray-700 transition hover:bg-gray-400"
          >
            Pausa
          </button>
        )}
        {!isDone && (
          <button
            onClick={handleReset}
            className="rounded-full bg-gray-200 px-6 py-3 text-gray-600 transition hover:bg-gray-300"
          >
            Reset
          </button>
        )}
      </div>

      {(offlineReady || needRefresh) && (
        <div className="text-xs text-gray-400">
          {needRefresh ? (
            <button onClick={() => updateServiceWorker(true)} className="underline hover:text-gray-600">
              Nuova versione disponibile — aggiorna
            </button>
          ) : (
            <span>Disponibile offline ✓</span>
          )}
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes breatheIn {
          from { transform: scale(0.6); }
          to   { transform: scale(1); }
        }
        @keyframes breatheOut {
          from { transform: scale(1); }
          to   { transform: scale(0.6); }
        }
      `}</style>
    </div>
  )
}
