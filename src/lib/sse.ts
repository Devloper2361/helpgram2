import { Response } from "express";

export const sseClients = new Map<string, Response[]>();

export function addClient(userId: string, res: Response) {
  if (!sseClients.has(userId)) {
    sseClients.set(userId, []);
  }
  sseClients.get(userId)!.push(res);
}

export function removeClient(userId: string, res: Response) {
  const clients = sseClients.get(userId);
  if (clients) {
    const index = clients.indexOf(res);
    if (index !== -1) {
      clients.splice(index, 1);
    }
    if (clients.length === 0) {
      sseClients.delete(userId);
    }
  }
}

export function sendSSE(userId: string, event: string, data: any) {
  const clients = sseClients.get(userId);
  if (clients) {
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    clients.forEach(client => {
      try {
        client.write(payload);
      } catch (e) {
        console.error("Failed to send SSE to client", e);
      }
    });
  }
}
