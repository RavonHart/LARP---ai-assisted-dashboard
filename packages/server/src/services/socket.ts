import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';

export class SocketService {
  private static instance: SocketService | null = null;
  private io: Server | null = null;

  private constructor() {}

  public static getInstance(): SocketService {
    if (!SocketService.instance) {
      SocketService.instance = new SocketService();
    }
    return SocketService.instance;
  }

  public init(httpServer: HttpServer): Server {
    this.io = new Server(httpServer, {
      cors: {
        origin: 'http://localhost:5173',
        methods: ['GET', 'POST'],
      },
    });

    this.io.on('connection', (socket: Socket) => {
      console.info(`[SocketService] Client connected: ${socket.id}`);

      // Allow clients to join a room specific to their execution session
      socket.on('join_session', (sessionId: string) => {
        if (sessionId) {
          socket.join(sessionId);
          console.info(`[SocketService] Socket ${socket.id} joined session room: ${sessionId}`);
        }
      });

      socket.on('leave_session', (sessionId: string) => {
        if (sessionId) {
          socket.leave(sessionId);
          console.info(`[SocketService] Socket ${socket.id} left session room: ${sessionId}`);
        }
      });

      socket.on('disconnect', () => {
        console.info(`[SocketService] Client disconnected: ${socket.id}`);
      });
    });

    return this.io;
  }

  public emitToSession(sessionId: string, event: string, data: unknown): void {
    if (!this.io) {
      console.warn(`[SocketService] Cannot emit event "${event}". SocketService is not initialized.`);
      return;
    }
    console.info(`[SocketService] Emitting "${event}" to session room "${sessionId}"`);
    this.io.to(sessionId).emit(event, data);
  }
}
export const socketService = SocketService.getInstance();
