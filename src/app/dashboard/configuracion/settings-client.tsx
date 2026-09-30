"use client";

import { useState } from "react";
import type { ThemeColorName } from "@/lib/realtime/contracts";
import type { ChannelSettings } from "@/lib/channel/settings";

const CARD = "rounded-2xl border border-violet-500/20 bg-[#0c0718]/80";

const THEME_META: Record<ThemeColorName, { label: string; swatch: string }> = {
  violet: { label: "Violeta", swatch: "#8B5CF6" },
  cyan: { label: "Cian", swatch: "#06B6D4" },
  pink: { label: "Rosa neón", swatch: "#EC4899" },
  red: { label: "Rojo", swatch: "#EF4444" },
  green: { label: "Verde", swatch: "#22C55E" },
};

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
        checked ? "bg-violet-500" : "bg-zinc-700"
      }`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
          checked ? "left-[22px]" : "left-0.5"
        }`}
      />
    </button>
  );
}

export function SettingsClient({
  initialSettings,
}: {
  initialSettings: ChannelSettings;
}) {
  const [subsOnly, setSubsOnly] = useState(initialSettings.subsOnly);
  const [alertSound, setAlertSound] = useState(
    initialSettings.alertSoundEnabled
  );
  const [themeColor, setThemeColor] = useState<ThemeColorName>(
    initialSettings.themeColor
  );
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<"saved" | "error" | null>(null);

  async function save(patch: Partial<ChannelSettings>) {
    setPending(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/channel/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      setFeedback(res.ok ? "saved" : "error");
    } catch {
      setFeedback("error");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <section className={CARD}>
        <div className="border-b border-violet-500/15 px-5 py-4">
          <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-violet-300">
            Participación
          </h2>
        </div>
        <div className="flex items-center justify-between gap-4 px-5 py-4">
          <div>
            <p className="text-sm font-bold text-white">Solo suscriptores</p>
            <p className="mt-0.5 text-xs text-zinc-500">
              Solo los suscriptores pueden sugerir, votar e inscribirse en
              sorteos. Los moderadores y el streamer siempre pueden participar.
            </p>
          </div>
          <Toggle
            checked={subsOnly}
            disabled={pending}
            onChange={(value) => {
              setSubsOnly(value);
              void save({ subsOnly: value });
            }}
          />
        </div>
      </section>

      <section className={CARD}>
        <div className="border-b border-violet-500/15 px-5 py-4">
          <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-violet-300">
            Overlay
          </h2>
        </div>
        <div className="flex flex-col gap-5 px-5 py-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-white">Sonido de alerta</p>
              <p className="mt-0.5 text-xs text-zinc-500">
                Reproduce un aviso en el overlay cada vez que arranca un
                evento.
              </p>
            </div>
            <Toggle
              checked={alertSound}
              disabled={pending}
              onChange={(value) => {
                setAlertSound(value);
                void save({ alertSoundEnabled: value });
              }}
            />
          </div>

          <div>
            <p className="text-sm font-bold text-white">Color del tema</p>
            <p className="mt-0.5 text-xs text-zinc-500">
              Se aplica al overlay y al dashboard.
            </p>
            <div className="mt-3 flex flex-wrap gap-3">
              {(Object.keys(THEME_META) as ThemeColorName[]).map((color) => {
                const selected = color === themeColor;
                return (
                  <button
                    key={color}
                    type="button"
                    disabled={pending}
                    aria-pressed={selected}
                    title={THEME_META[color].label}
                    onClick={() => {
                      setThemeColor(color);
                      void save({ themeColor: color });
                    }}
                    className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                      selected
                        ? "border-violet-400/70 bg-violet-500/20 text-white"
                        : "border-violet-500/25 bg-[#080512] text-zinc-400 hover:border-violet-400/50 hover:text-violet-200"
                    }`}
                  >
                    <span
                      className="h-4 w-4 rounded-full"
                      style={{ backgroundColor: THEME_META[color].swatch }}
                    />
                    {THEME_META[color].label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {feedback === "saved" && (
        <p className="text-xs font-semibold text-emerald-400">
          Ajustes guardados.
        </p>
      )}
      {feedback === "error" && (
        <p className="text-xs font-semibold text-red-400">
          No se pudieron guardar los ajustes. Inténtalo de nuevo.
        </p>
      )}
    </div>
  );
}
