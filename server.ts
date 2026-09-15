import { createServer } from "node:http";
import next from "next";
import { initRealtime } from "./src/lib/realtime/server";
import { rehydrateTimers } from "./src/lib/timers";
import { startAll } from "./src/lib/twitch/eventsub";

const port = parseInt(process.env.PORT || "3000", 10);
// No leer HOSTNAME del entorno: en Windows suele ser el nombre de la máquina.
const hostname = "localhost";
const dev = process.env.NODE_ENV !== "production";

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    handle(req, res);
  });

  server.listen(port, () => {
    console.log(
      `> Servidor listo en http://${hostname}:${port} (modo ${
        dev ? "desarrollo" : "producción"
      })`
    );

    // Socket.IO sobre el mismo servidor HTTP/puerto.
    try {
      initRealtime(server);
    } catch (err) {
      console.error("No se pudo inicializar Socket.IO:", err);
    }

    // Rehidratar los temporizadores de fase desde phaseEndsAt (p. ej. tras un
    // reinicio con eventos aún activos). La DB puede no estar disponible.
    rehydrateTimers().catch((err) => {
      console.error("No se pudieron rehidratar los temporizadores:", err);
    });

    // Listener de Twitch EventSub (chat) para todos los streamers registrados.
    startAll().catch((err) => {
      console.error("No se pudo iniciar el listener de EventSub:", err);
    });
  });
});
