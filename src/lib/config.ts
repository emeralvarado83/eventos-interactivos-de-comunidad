// Acceso centralizado a variables de entorno. Los getters son perezosos para
// que el build de Next no falle cuando las credenciales aún no están rellenas.

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Falta la variable de entorno ${name} (ver .env.example)`);
  }
  return value;
}

export const config = {
  get twitchClientId(): string {
    return required("TWITCH_CLIENT_ID");
  },
  get twitchClientSecret(): string {
    return required("TWITCH_CLIENT_SECRET");
  },
  get twitchRedirectUri(): string {
    return required("TWITCH_REDIRECT_URI");
  },
  get sessionSecret(): string {
    return required("SESSION_SECRET");
  },
  get isProduction(): boolean {
    return process.env.NODE_ENV === "production";
  },
};
