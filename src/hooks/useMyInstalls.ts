'use client';

import { useState, useEffect } from 'react';

export function useMyInstalls(): Set<string> {
  const [ids, setIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;

    fetch('/api/me/installs')
      .then((res) => res.json())
      .then((data: { pluginIds: string[] }) => {
        if (!cancelled) {
          setIds(new Set(data.pluginIds));
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  return ids;
}
