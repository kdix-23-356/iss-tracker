import { useState, useEffect, useMemo } from 'react';
import * as satellite from 'satellite.js';
import type { LogEvent } from '@/types';

const TLE_URL = 'https://api.wheretheiss.at/v1/satellites/25544/tles';
type Tle = { line1: string; line2: string };

export function useTle(addSystemLog: (entry: Omit<LogEvent, 'id' | 'time'>) => void) {
  const [tle, setTle] = useState<Tle | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    (async () => {
      try {
        const res = await fetch(TLE_URL, { signal: controller.signal });
        if (!res.ok) throw new Error(`TLE HTTP ${res.status}`);
        const json = await res.json();
        setTle({ line1: json.line1, line2: json.line2 });

        addSystemLog({ message: 'TLE fetched', type: 'info' });
      } catch (e: unknown) {
        const isAbortError =
          (e instanceof DOMException && e.name === 'AbortError') ||
          controller.signal.aborted ||
          typeof e === 'string' ||
          ((e as any)?.name === 'AbortError');

        if (isAbortError) {
          const reason =
            (controller.signal as any).reason ??
            ((e as Error)?.message || (typeof e === 'string' ? e : 'aborted'));
          addSystemLog({ message: `TLE fetch aborted: ${String(reason)}`, type: 'info' });
          return;
        }

        const msg = (e as Error)?.message ?? String(e);
        addSystemLog({ message: `TLE fetch failed: ${msg}`, type: 'warning' });
      }
    })();

    return () => controller.abort('component unmounted or superseded');
  }, [addSystemLog]);

  return useMemo(() => (tle ? satellite.twoline2satrec(tle.line1, tle.line2) : null), [tle]);
}