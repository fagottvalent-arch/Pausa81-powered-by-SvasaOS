export function CloudBackground() {
  return (
    <div className="cloud-bg" aria-hidden="true">
      {/* Strato posteriore: nuvole lente e morbide */}
      <svg
        className="cloud-svg cloud-svg--back"
        viewBox="0 0 1000 1000"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <filter id="clouds-back" x="-40%" y="-40%" width="180%" height="180%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.008"
              numOctaves="3"
              seed="5"
              result="noise"
            />
            <feGaussianBlur in="noise" stdDeviation="22" result="blur" />
            <feColorMatrix
              in="blur"
              type="matrix"
              values="
                0 0 0 0 0.93
                0 0 0 0 0.95
                0 0 0 0 1
                0.45 0.45 0.45 0 0
              "
            />
          </filter>
        </defs>
        <rect width="1000" height="1000" fill="#ffffff" filter="url(#clouds-back)" />
      </svg>

      {/* Strato anteriore: nuvole più definite, in movimento */}
      <svg
        className="cloud-svg cloud-svg--front"
        viewBox="0 0 1000 1000"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <filter id="clouds-front" x="-40%" y="-40%" width="180%" height="180%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.012"
              numOctaves="2"
              seed="11"
              result="noise"
            />
            <feGaussianBlur in="noise" stdDeviation="14" result="blur" />
            <feColorMatrix
              in="blur"
              type="matrix"
              values="
                0 0 0 0 0.97
                0 0 0 0 0.98
                0 0 0 0 1
                0.5 0.5 0.5 0 0
              "
            />
          </filter>
        </defs>
        <rect width="1000" height="1000" fill="#ffffff" filter="url(#clouds-front)" />
      </svg>

      {/* Masse nuvolose sfumate per profondità e moto */}
      <div className="cloud-blob cloud-blob--1" />
      <div className="cloud-blob cloud-blob--2" />
      <div className="cloud-blob cloud-blob--3" />
    </div>
  );
}
