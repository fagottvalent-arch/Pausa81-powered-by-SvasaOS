import { useEffect, useRef } from 'react';

export function CloudBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let t = 0;

    const handleResize = () => {
      if (!canvas) return;
      canvas.width = Math.min(window.innerWidth, 1440);
      canvas.height = Math.min(window.innerHeight, 900);
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    const render = () => {
      t += 0.0032;
      const w = canvas.width;
      const h = canvas.height;
      const isLight = document.querySelector('.app--theme-light') !== null;

      ctx.clearRect(0, 0, w, h);

      // 3 onde setose ispirate al medaglione S.V.A.S.A. OS:
      // Sinistra: Smeraldo Bioluminescente | Destra: Oro Champagne | Centro: Titanio/Teal
      const orbs = [
        {
          x: w * (0.36 + Math.sin(t * 0.85) * 0.12),
          y: h * (0.42 + Math.cos(t * 0.65) * 0.1),
          r: Math.max(w, h) * 0.5,
          colorInner: isLight ? 'rgba(16, 185, 129, 0.14)' : 'rgba(45, 212, 191, 0.18)',
          colorMid: isLight ? 'rgba(204, 251, 241, 0.08)' : 'rgba(13, 148, 136, 0.08)',
        },
        {
          x: w * (0.64 + Math.cos(t * 0.7) * 0.12),
          y: h * (0.44 + Math.sin(t * 0.75) * 0.1),
          r: Math.max(w, h) * 0.48,
          colorInner: isLight ? 'rgba(212, 175, 55, 0.13)' : 'rgba(212, 175, 55, 0.15)',
          colorMid: isLight ? 'rgba(254, 243, 199, 0.07)' : 'rgba(180, 138, 46, 0.06)',
        },
        {
          x: w * (0.5 + Math.sin(t * 0.5 + 1.4) * 0.14),
          y: h * (0.65 + Math.cos(t * 0.55 + 1.1) * 0.1),
          r: Math.max(w, h) * 0.45,
          colorInner: isLight ? 'rgba(20, 184, 166, 0.10)' : 'rgba(30, 41, 59, 0.24)',
          colorMid: isLight ? 'rgba(241, 245, 249, 0.05)' : 'rgba(9, 13, 22, 0.08)',
        },
      ];

      for (const orb of orbs) {
        const grad = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, orb.r);
        grad.addColorStop(0, orb.colorInner);
        grad.addColorStop(0.55, orb.colorMid);
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
      }

      animationFrameId = window.requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="cloud-bg"
      aria-hidden="true"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100dvh',
        pointerEvents: 'none',
        zIndex: 0,
        display: 'block',
      }}
    />
  );
}
