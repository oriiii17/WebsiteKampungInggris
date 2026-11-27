import { sanitizeSessionForClient, subscribeToSession } from "@/lib/game-session";
import { loadLiveGame } from "@/lib/live-game-store";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ pin: string }> }
) {
  const { pin } = await params;
  let liveSession;
  try {
    liveSession = await loadLiveGame(pin);
  } catch {
    return new Response(JSON.stringify({ error: "Sesi kuis belum dapat dibaca dari server." }), { status: 503, headers: { "Content-Type": "application/json" } });
  }

  if (!liveSession) {
    return new Response(JSON.stringify({ error: "Sesi tidak ditemukan" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      // Kirim state awal
      let lastPayload = JSON.stringify(sanitizeSessionForClient(liveSession));
      controller.enqueue(encoder.encode(`data: ${lastPayload}\n\n`));

      // Berlangganan event update per PIN
      const unsubscribe = subscribeToSession(pin, (data) => {
        try {
          lastPayload = JSON.stringify(data);
          controller.enqueue(encoder.encode(`data: ${lastPayload}\n\n`));
        } catch {
          // Client disconnect
        }
      });

      // Vercel instances do not share process memory; poll the durable row so
      // updates from a different instance reach this host/player stream.
      let polling = false;
      const stateTimer = setInterval(async () => {
        if (polling) return;
        polling = true;
        try {
          const latest = await loadLiveGame(pin);
          if (latest) {
            const payload = JSON.stringify(sanitizeSessionForClient(latest));
            if (payload !== lastPayload) {
              lastPayload = payload;
              controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
            }
          }
        } catch {
          // Keep the stream alive through short database interruptions.
        } finally {
          polling = false;
        }
      }, 1500);

      // Keepalive ping setiap 15 detik
      const pingTimer = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": keepalive\n\n"));
        } catch {
          clearInterval(pingTimer);
        }
      }, 15000);

      req.signal.addEventListener("abort", () => {
        clearInterval(pingTimer);
        clearInterval(stateTimer);
        unsubscribe();
        try {
          controller.close();
        } catch {
          // Ignore
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
