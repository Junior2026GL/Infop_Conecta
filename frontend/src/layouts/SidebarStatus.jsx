import { useEffect, useState } from 'react';
import { getStats } from '../features/dashboard/services/dashboard.service.js';

const DURATION_MS = 1200;

// Cuenta de 0 al valor final con una curva que se frena al llegar.
function useCountUp(target) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!target) { setValue(0); return undefined; }
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setValue(target);
      return undefined;
    }

    let frame;
    const start = performance.now();
    const tick = (now) => {
      const progress = Math.min((now - start) / DURATION_MS, 1);
      setValue(Math.round(target * (1 - (1 - progress) ** 3)));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target]);

  return value;
}

export default function SidebarStatus() {
  const [hoy, setHoy] = useState(0);

  useEffect(() => {
    getStats()
      .then((stats) => setHoy(stats?.mensajes?.hoy ?? 0))
      .catch(() => {});
  }, []);

  const count = useCountUp(hoy);

  return (
    <div className="side-status-wrap">
      <div className="side-bar" aria-hidden="true">
        <div className="side-bar-fill" />
      </div>

      <div className="side-status">
        <div className="side-status-top">
          <span className="side-pulse" />
          Sistema en línea
        </div>
        <div className="side-status-count">{count.toLocaleString('es')}</div>
        <div className="side-status-label">mensajes enviados hoy</div>
      </div>
    </div>
  );
}
