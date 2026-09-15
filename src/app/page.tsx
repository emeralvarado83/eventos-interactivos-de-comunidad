import Link from "next/link";
import { getSession } from "@/lib/auth/session";

const ERROR_MESSAGES: Record<string, string> = {
  auth_config: "La integración con Twitch no está configurada (revisa el archivo .env).",
  twitch_denied: "Has cancelado la autorización en Twitch.",
  invalid_state: "La validación de seguridad del login ha fallado. Inténtalo de nuevo.",
  auth_failed: "No se ha podido completar el inicio de sesión con Twitch.",
};

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const [{ error }, session] = await Promise.all([searchParams, getSession()]);
  const errorMessage = error ? ERROR_MESSAGES[error] : null;

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-950 px-6 font-sans text-zinc-100">
      <main className="flex w-full max-w-xl flex-col items-center gap-8 text-center">
        <h1 className="text-4xl font-bold tracking-tight">
          Eventos interactivos para Twitch
        </h1>
        <p className="text-lg leading-8 text-zinc-400">
          Crea eventos de sugerencias y votaciones para tu chat: tu audiencia
          propone juegos y vota el ganador, con un overlay listo para OBS.
        </p>

        {errorMessage && (
          <p className="w-full rounded-md border border-red-800 bg-red-950/60 px-4 py-3 text-sm text-red-300">
            {errorMessage}
          </p>
        )}

        {session ? (
          <div className="flex flex-col items-center gap-4">
            <p className="text-zinc-300">
              Sesión iniciada como{" "}
              <span className="font-semibold text-zinc-50">{session.displayName}</span>
            </p>
            <Link
              href="/dashboard"
              className="flex h-12 items-center justify-center rounded-full bg-violet-600 px-8 font-medium text-white transition-colors hover:bg-violet-500"
            >
              Ir al dashboard
            </Link>
          </div>
        ) : (
          <a
            href="/api/auth/twitch"
            className="flex h-12 items-center justify-center gap-3 rounded-full bg-violet-600 px-8 font-medium text-white transition-colors hover:bg-violet-500"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden="true">
              <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0 1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z" />
            </svg>
            Iniciar sesión con Twitch
          </a>
        )}
      </main>
    </div>
  );
}
