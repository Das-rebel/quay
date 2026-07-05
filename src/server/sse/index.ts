// ============================================================
// Quay — SSE Event Broadcaster
// VOTED: SSE for dashboard (simple, reliable, HTTP-native)
// ============================================================

import type { SSEEvent, SSEEventType } from '../../lib/types/index.js';

interface SSEClient {
  id: string;
  controller: ReadableStreamDefaultController<Uint8Array>;
}

export class SSEBroadcaster {
  private clients = new Map<string, SSEClient>();
  private encoder = new TextEncoder();

  addClient(id: string, controller: ReadableStreamDefaultController<Uint8Array>): () => void {
    this.clients.set(id, { id, controller });
    console.log(`[SSE] Client connected: ${id} (${this.clients.size} total)`);
    this.sendTo(id, { type: 'sse:heartbeat', data: { clientId: id, connected: true }, timestamp: Date.now() });
    return () => {
      this.clients.delete(id);
      console.log(`[SSE] Client disconnected: ${id} (${this.clients.size} total)`);
    };
  }

  broadcast(type: SSEEventType, data: Record<string, unknown>) {
    const event: SSEEvent = { type, data, timestamp: Date.now() };
    const msg = `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`;
    const encoded = this.encoder.encode(msg);
    for (const [id, client] of this.clients) {
      try {
        client.controller.enqueue(encoded);
      } catch {
        this.clients.delete(id);
      }
    }
  }

  sendTo(clientId: string, event: SSEEvent) {
    const client = this.clients.get(clientId);
    if (!client) return;
    try {
      const msg = `event: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`;
      client.controller.enqueue(this.encoder.encode(msg));
    } catch {
      this.clients.delete(clientId);
    }
  }

  get clientCount() { return this.clients.size; }
}

export const sseBroadcaster = new SSEBroadcaster();
