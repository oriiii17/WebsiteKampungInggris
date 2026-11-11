import { getLiveSession, sanitizeSessionForClient, subscribeToSession } from "@/lib/game-session";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ pin: string }> }
) {
  const { pin } = await params;
  const liveSession = getLiveSession(pin);

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
      const initialPayload = `data: ${JSON.stringify(sanitizeSessionForClient(liveSession))}\n\n`;
      controller.enqueue(encoder.encode(initialPayload));

      // Berlangganan event update per PIN
      const unsubscribe = subscribeToSession(pin, (data) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {
          // Client disconnect
        }
      });

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
