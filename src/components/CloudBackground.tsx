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
      // Risoluzione morbida anti-sgranatura ottimizzata per GPU
      canvas.width = Math.min(window.innerWidth, 1440);
      canvas.height = Math.min(window.innerHeight, 900);
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    const render = () => {
      t += 0.0035;
      const w = canvas.width;
      const h = canvas.height;
      const isLight = document.querySelector('.app--theme-light') !== null;

      ctx.clearRect(0, 0, w, h);

      // 3 onde radiali setose in movimento lento sinusoidale (stessi colori Dark & Light)
      const orbs = [
        {
          x: w * (0.5 + Math.sin(t * 0.9) * 0.14),
          y: h * (0.38 + Math.cos(t * 0.7) * 0.1),
          r: Math.max(w, h) * 0.52,
          colorInner: isLight ? 'rgba(20, 184, 166, 0.16)' : 'rgba(13, 148, 136, 0.22)',
          colorMid: isLight ? 'rgba(153, 246, 228, 0.08)' : 'rgba(15, 41, 58, 0.16)',
        },
        {
          x: w * (0.32 + Math.cos(t * 0.65) * 0.16),
          y: h * (0.62 + Math.sin(t * 0.8) * 0.12),
          r: Math.max(w, h) * 0.46,
          colorInner: isLight ? 'rgba(45, 212, 191, 0.13)' : 'rgba(20, 184, 166, 0.14)',
          colorMid: isLight ? 'rgba(204, 251, 241, 0.06)' : 'rgba(9, 13, 22, 0.08)',
        },
        {
          x: w * (0.68 + Math.sin(t * 0.55 + 1.8) * 0.15),
          y: h * (0.52 + Math.cos(t * 0.6 + 1.2) * 0.12),
          r: Math.max(w, h) * 0.44,
          colorInner: isLight ? 'rgba(16, 185, 129, 0.11)' : 'rgba(16, 185, 129, 0.12)',
          colorMid: isLight ? 'rgba(240, 253, 250, 0.05)' : 'rgba(15, 23, 42, 0.06)',
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
