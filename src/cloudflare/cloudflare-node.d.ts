declare module 'cloudflare:node' {
  import type { Server } from 'node:http';

  interface NodeHttpWorkerHandler {
    fetch(request: Request): Promise<Response>;
  }

  export function httpServerHandler(server: Server): NodeHttpWorkerHandler;
}
