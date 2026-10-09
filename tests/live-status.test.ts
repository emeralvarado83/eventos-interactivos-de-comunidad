// Caché del estado del directo (helix.ts): el push de EventSub
// (setCachedLiveStatus) debe reflejarse en isChannelLive sin llamar a Twitch,
// y caducar al TTL para reconciliar contra Helix.

import { afterEach, describe, expect, it, vi } from "vitest";

// Los getters de config son perezosos: basta con definirlas antes de invocar.
process.env.TWITCH_CLIENT_ID = "test-client-id";
process.env.TWITCH_CLIENT_SECRET = "test-client-secret";

import { isChannelLive, setCachedLiveStatus } from "@/lib/twitch/helix";

function mockTwitchApi(live: boolean) {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("id.twitch.tv")) {
      return new Response(
        JSON.stringify({ access_token: "app-token", expires_in: 3600 })
      );
    }
    return new Response(JSON.stringify({ data: live ? [{ type: "live" }] : [] }));
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("setCachedLiveStatus (push de EventSub)", () => {
  it("sirve el estado empujado desde caché sin llamar a Twitch", async () => {
    const fetchMock = mockTwitchApi(false);
    vi.stubGlobal("fetch", fetchMock);

    setCachedLiveStatus("chan-push-on", true);
    expect(await isChannelLive("chan-push-on")).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();

    setCachedLiveStatus("chan-push-on", false);
    expect(await isChannelLive("chan-push-on")).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("la caché caduca a los 45 s y vuelve a consultar Helix", async () => {
    vi.useFakeTimers();
    const fetchMock = mockTwitchApi(false);
    vi.stubGlobal("fetch", fetchMock);

    setCachedLiveStatus("chan-ttl", true);
    expect(await isChannelLive("chan-ttl")).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();

    vi.advanceTimersByTime(46_000);
    // Tras caducar reconcilia con Helix, que dice que sigue fuera de línea.
    expect(await isChannelLive("chan-ttl")).toBe(false);
    // Una llamada al token y otra a /helix/streams.
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("sin caché consulta Helix y cachea el resultado", async () => {
    const fetchMock = mockTwitchApi(true);
    vi.stubGlobal("fetch", fetchMock);

    expect(await isChannelLive("chan-http")).toBe(true);
    const callsAfterFetch = fetchMock.mock.calls.length;
    expect(callsAfterFetch).toBeGreaterThan(0);
    expect(await isChannelLive("chan-http")).toBe(true);
    // La segunda lectura sale de la caché: ninguna llamada adicional.
    expect(fetchMock).toHaveBeenCalledTimes(callsAfterFetch);
  });
});
