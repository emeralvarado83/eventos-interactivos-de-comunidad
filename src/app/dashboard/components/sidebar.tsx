import { BRAND_NAME, BRAND_TAGLINE } from "@/lib/branding";
import {
  BoltIcon,
  GearIcon,
  HistoryIcon,
  HomeIcon,
  ListIcon,
} from "./icons";

const NAV_ITEMS = [
  { label: "Inicio", icon: HomeIcon, active: true },
  { label: "Lista de juegos", icon: ListIcon, active: false },
  { label: "Configuración", icon: GearIcon, active: false },
  { label: "Historial", icon: HistoryIcon, active: false },
] as const;

export function Sidebar() {
  return (
    <aside className="flex w-70 shrink-0 flex-col border-r border-violet-500/15 bg-[#0c0718]">
      <div className="flex items-center gap-3 px-5 pt-6 pb-8">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-400 to-violet-700 shadow-[0_4px_16px_rgba(139,92,246,0.4)]">
          <BoltIcon className="h-5 w-5 text-white" />
        </span>
        <div className="leading-tight">
          <p className="font-display text-lg text-white">{BRAND_NAME}</p>
          <p className="text-[11px] font-medium text-violet-200/60">
            {BRAND_TAGLINE}
          </p>
        </div>
      </div>

      <nav className="flex flex-col gap-1 px-3">
        {NAV_ITEMS.map(({ label, icon: Icon, active }) =>
          active ? (
            <span
              key={label}
              className="flex items-center gap-3 rounded-xl bg-violet-500/15 px-3 py-2.5 text-sm font-bold text-violet-200"
            >
              <Icon className="h-4.5 w-4.5 text-violet-300" />
              {label}
            </span>
          ) : (
            <span
              key={label}
              title="Próximamente"
              className="flex cursor-not-allowed items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-zinc-500"
            >
              <Icon className="h-4.5 w-4.5" />
              {label}
              <span className="ml-auto rounded-full border border-zinc-700 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-zinc-500">
                Próximamente
              </span>
            </span>
          )
        )}
      </nav>
    </aside>
  );
}
