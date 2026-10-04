"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { BRAND_NAME, BRAND_TAGLINE } from "@/lib/branding";
import {
  GearIcon,
  HistoryIcon,
  HomeIcon,
  ListIcon,
} from "./icons";

const NAV_ITEMS = [
  { label: "Inicio", icon: HomeIcon, href: "/dashboard" },
  { label: "Juegos sugeridos", icon: ListIcon, href: "/dashboard/juegos-sugeridos" },
  { label: "Configuración", icon: GearIcon, href: "/dashboard/configuracion" },
  { label: "Historial", icon: HistoryIcon, href: "/dashboard/historial" },
] as const;

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-70 shrink-0 flex-col border-r border-violet-500/15 bg-[#0c0718]">
      <div className="flex items-center gap-3 px-5 pt-6 pb-8">
        <Image
          src="/logo.png"
          alt=""
          width={40}
          height={40}
          className="h-10 w-10 rounded-xl shadow-[0_4px_16px_rgba(var(--theme-glow-500),0.4)]"
        />
        <div className="leading-tight">
          <p className="font-display text-lg text-white">{BRAND_NAME}</p>
          <p className="text-[11px] font-medium text-violet-200/60">
            {BRAND_TAGLINE}
          </p>
        </div>
      </div>

      <nav className="flex flex-col gap-1 px-3">
        {NAV_ITEMS.map(({ label, icon: Icon, href }) => {
          const active = pathname === href;
          return (
            <Link
              key={label}
              href={href}
              aria-current={active ? "page" : undefined}
              className={
                active
                  ? "flex items-center gap-3 rounded-xl bg-violet-500/15 px-3 py-2.5 text-sm font-bold text-violet-200"
                  : "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-zinc-400 transition-colors hover:bg-violet-500/10 hover:text-violet-200"
              }
            >
              <Icon
                className={`h-4.5 w-4.5 ${active ? "text-violet-300" : ""}`}
              />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
