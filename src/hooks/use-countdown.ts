"use client";

import { useEffect, useState } from "react";

/**
 * Milisegundos restantes hasta phaseEndsAt (autoridad del servidor),
 * actualizados cada segundo. null si no hay fin de fase definido.
 */
export function useCountdown(
  phaseEndsAt: string | null | undefined
): number | null {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!phaseEndsAt) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [phaseEndsAt]);

  if (!phaseEndsAt) return null;
  return Math.max(0, new Date(phaseEndsAt).getTime() - now);
}

export function formatCountdown(remainingMs: number | null): string {
  if (remainingMs === null) return "--:--";
  const totalSec = Math.ceil(remainingMs / 1000);
  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
