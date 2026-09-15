interface OverlayPreviewProps {
  overlayUrl: string;
  /** true cuando no hay evento activo: se muestra un estado vacío propio. */
  empty: boolean;
}

export function OverlayPreview({ overlayUrl, empty }: OverlayPreviewProps) {
  return (
    <section className="overflow-hidden rounded-2xl border border-violet-500/20 bg-[#0c0718]/80">
      <div className="flex items-center justify-between border-b border-violet-500/15 px-4 py-3">
        <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-violet-300">
          Preview del overlay
        </h3>
        <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-300">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          Vista previa
        </span>
      </div>
      {empty ? (
        <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
          <p className="text-sm font-bold text-white">
            No hay ningún evento activo.
          </p>
          <p className="text-xs text-zinc-500">Crea un evento para comenzar.</p>
        </div>
      ) : (
        <div
          className="overflow-hidden bg-[#0a0614]"
          style={{ height: 540 }}
        >
          {/* El overlay mide 492px de ancho (460 + padding); se escala para
              encajar en la columna. */}
          <iframe
            src={overlayUrl}
            title="Preview del overlay"
            className="h-[770px] w-[492px] origin-top-left scale-[0.7] border-0"
          />
        </div>
      )}
    </section>
  );
}
