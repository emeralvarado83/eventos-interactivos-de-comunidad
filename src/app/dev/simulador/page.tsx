"use client";

// /dev/simulador — SOLO DESARROLLO. Panel para inyectar mensajes de chat
// falsos (espectadores simulados) contra /api/dev/simulate-chat y así
// probar el flujo completo (sugerencias, votación, sorteo) como si fuera
// un en vivo, sin necesidad de un stream real en Twitch.

import { useCallback, useRef, useState } from "react";

const VIEWER_NAMES = [
  "lunaria", "pixelpana", "el_ryuzaki", "michigamer", "donpercebe",
  "karola20", "nexo_hd", "frankito", "sarita_play", "wallyx",
  "tremendo_", "yisuscrack", "nocturna", "checoperez", "aida_lp",
  "monstro74", "kame_hame", "pandicornio", "zeruel01", "lamariana",
];

const GAME_SUGGESTIONS = [
  "Elden Ring", "Hollow Knight: Silksong", "Minecraft", "Hades II",
  "Baldur's Gate 3", "Stardew Valley", "Celeste", "Hollow Knight",
  "Terraria", "Dead Cells", "The Witcher 3", "Zelda Breath of the Wild",
  "Dark Souls III", "Slay the Spire", "Among Us", "Phasmophobia",
  "It Takes Two", "Portal 2", "Cuphead", "Dave the Diver",
];

interface LogEntry {
  login: string;
  text: string;
  ok: boolean;
}

function randomItem<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default function SimuladorPage() {
  const [login, setLogin] = useState("lunaria");
  const [text, setText] = useState("");
  const [subscriber, setSubscriber] = useState(false);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [busy, setBusy] = useState(false);
  const cancelRef = useRef(false);

  const send = useCallback(
    async (msgLogin: string, msgText: string, msgSubscriber = false) => {
      try {
        const res = await fetch("/api/dev/simulate-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            login: msgLogin,
            text: msgText,
            subscriber: msgSubscriber,
          }),
        });
        const ok = res.ok;
        setLog((prev) =>
          [{ login: msgLogin, text: msgText, ok }, ...prev].slice(0, 50)
        );
        return ok;
      } catch {
        setLog((prev) =>
          [{ login: msgLogin, text: msgText, ok: false }, ...prev].slice(0, 50)
        );
        return false;
      }
    },
    []
  );

  const sendManual = useCallback(async () => {
    if (!text.trim() || busy) return;
    setBusy(true);
    await send(login, text, subscriber);
    setText("");
    setBusy(false);
  }, [login, text, subscriber, busy, send]);

  /** Ráfaga: n mensajes con pausa, de espectadores aleatorios sin repetir. */
  const burst = useCallback(
    async (n: number, build: () => string, intervalMs: number) => {
      if (busy) return;
      setBusy(true);
      cancelRef.current = false;
      const viewers = [...VIEWER_NAMES].sort(() => Math.random() - 0.5);
      for (let i = 0; i < n && !cancelRef.current; i++) {
        const viewer = viewers[i % viewers.length];
        // Si la ráfaga supera el número de nombres, sufija para que cuenten
        // como espectadores distintos (reglas de duplicados del sistema).
        const name =
          i < viewers.length ? viewer : `${viewer}_${Math.floor(i / viewers.length)}`;
        await send(name, build());
        await sleep(intervalMs);
      }
      setBusy(false);
    },
    [busy, send]
  );

  return (
    <main className="flex flex-1 flex-col items-center bg-zinc-950 px-6 py-10 font-sans text-zinc-100">
      <div className="w-full max-w-2xl">
        <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-violet-400">
          Solo desarrollo
        </p>
        <h1 className="mb-2 text-3xl font-bold tracking-tight">
          Simulador de chat en vivo
        </h1>
        <p className="mb-8 text-sm leading-6 text-zinc-400">
          Los mensajes entran por el mismo procesador que Twitch EventSub.
          Crea e inicia un evento desde el{" "}
          <a href="/dashboard" className="text-violet-400 underline hover:text-violet-300">
            dashboard
          </a>{" "}
          y observa cómo reaccionan el panel y el overlay en tiempo real.
        </p>

        {/* Envío manual */}
        <section className="mb-8 rounded-lg border border-zinc-800 bg-zinc-900/60 p-5">
          <h2 className="mb-4 text-lg font-semibold">Mensaje manual</h2>
          <div className="mb-3 flex gap-3">
            <input
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              placeholder="nombre del espectador"
              className="w-48 rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-violet-500"
            />
            <label className="flex items-center gap-2 text-sm text-zinc-300">
              <input
                type="checkbox"
                checked={subscriber}
                onChange={(e) => setSubscriber(e.target.checked)}
                className="accent-violet-500"
              />
              suscriptor
            </label>
          </div>
          <div className="flex gap-3">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendManual()}
              placeholder="mensaje (juego, número de voto, participo…)"
              className="flex-1 rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-violet-500"
            />
            <button
              onClick={sendManual}
              disabled={busy || !text.trim()}
              className="rounded-md bg-violet-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-violet-500 disabled:opacity-40"
            >
              Enviar
            </button>
          </div>
        </section>

        {/* Ráfagas automáticas */}
        <section className="mb-8 rounded-lg border border-zinc-800 bg-zinc-900/60 p-5">
          <h2 className="mb-1 text-lg font-semibold">Ráfagas automáticas</h2>
          <p className="mb-4 text-sm text-zinc-400">
            15 espectadores distintos, un mensaje cada ~600 ms.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => burst(15, () => randomItem(GAME_SUGGESTIONS), 600)}
              disabled={busy}
              className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-500 disabled:opacity-40"
            >
              15 sugerencias de juegos
            </button>
            <button
              onClick={() =>
                burst(15, () => String(1 + Math.floor(Math.random() * 5)), 600)
              }
              disabled={busy}
              className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-sky-500 disabled:opacity-40"
            >
              15 votos (1–5)
            </button>
            <button
              onClick={() => burst(15, () => "participo", 600)}
              disabled={busy}
              className="rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-500 disabled:opacity-40"
            >
              15 «participo» (sorteo)
            </button>
            {busy && (
              <button
                onClick={() => {
                  cancelRef.current = true;
                }}
                className="rounded-md border border-red-800 px-4 py-2 text-sm font-medium text-red-300 transition-colors hover:bg-red-950/60"
              >
                Detener
              </button>
            )}
          </div>
        </section>

        {/* Registro */}
        <section className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-5">
          <h2 className="mb-3 text-lg font-semibold">Mensajes enviados</h2>
          {log.length === 0 ? (
            <p className="text-sm text-zinc-500">Aún no se ha enviado nada.</p>
          ) : (
            <ul className="flex max-h-64 flex-col gap-1 overflow-y-auto font-mono text-sm">
              {log.map((entry, i) => (
                <li key={i} className={entry.ok ? "text-zinc-300" : "text-red-400"}>
                  <span className="text-violet-400">{entry.login}</span>
                  {": "}
                  {entry.text}
                  {!entry.ok && " (error)"}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
