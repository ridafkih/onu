import { Server as HTTPServer } from "http";
import { Server as HTTPSServer } from "https";
import { Server as WebSocketServer } from "socket.io";

/**
 * Attaches a server to the WebSocket.
 * @param server The server to attach.
 * @returns The WebSocket server.
 */
export const attachServersToSocket = (
  io: WebSocketServer,
  ...servers: (HTTPServer | HTTPSServer)[]
) => servers.map((server) => io.attach(server));
