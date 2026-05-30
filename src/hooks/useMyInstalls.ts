'use client';

import { useState, useEffect } from 'react';

interface MyInstallsResult {
  ids: Set<string>;
  isAuthed: boolean | undefined;
}

export function useMyInstalls(): MyInstallsResult {
  const [ids, setIds] = useState<Set<string>>(new Set());
  const [isAuthed, setIsAuthed] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;

    fetch('/api/me/installs')
      .then((res) => res.json())
      .then((data: { authed: boolean; pluginIds: string[] }) => {
        if (!cancelled) {
          setIds(new Set(data.pluginIds));
          setIsAuthed(data.authed);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  return { ids, isAuthed };
}
