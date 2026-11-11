import { revision, snapshot } from "@/server/db";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export function GET(request: Request) {
  const encoder = new TextEncoder();
  let cleanup = () => {};
  const stream = new ReadableStream({
    start(controller) {
      const lastEventId = request.headers.get("last-event-id");
      let last = lastEventId ? Number(lastEventId) : -1,
        closed = false,
        ticks = 0;
      const close = () => {
        if (closed) return;
        closed = true;
        clearInterval(timer);
        request.signal.removeEventListener("abort", close);
        try {
          controller.close();
        } catch {
          /* already cancelled */
        }
      };
      const send = async () => {
        if (closed) return;
        try {
          const next = revision();
          if (next !== last) {
            const data = await snapshot();
            controller.enqueue(
              encoder.encode(`id: ${next}\nevent: tree\ndata: ${JSON.stringify(data)}\n\n`),
            );
            last = next;
          } else if (++ticks % 15 === 0)
            controller.enqueue(encoder.encode(": heartbeat\n\n"));
        } catch {
          close();
        }
      };
      const timer = setInterval(() => void send(), 750);
      cleanup = close;
      controller.enqueue(encoder.encode("retry: 2000\n\n"));
      void send();
      request.signal.addEventListener("abort", close, { once: true });
      if (request.signal.aborted) close();
    },
    cancel() {
      cleanup();
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
