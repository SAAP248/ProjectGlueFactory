import { useState, useEffect, useRef } from 'react';

export function useElapsedTime(startTs: string | null) {
  const [elapsed, setElapsed] = useState('');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!startTs) { setElapsed(''); return; }
    const update = () => {
      const diff = Math.floor((Date.now() - new Date(startTs).getTime()) / 1000);
      const h = Math.floor(diff / 3600);
      const m = Math.floor((diff % 3600) / 60);
      const s = diff % 60;
      if (h > 0) setElapsed(`${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
      else setElapsed(`${m}:${String(s).padStart(2, '0')}`);
    };
    update();
    intervalRef.current = setInterval(update, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [startTs]);

  return elapsed;
}
