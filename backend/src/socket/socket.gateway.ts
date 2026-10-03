import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { frontendUrls } from '../common/config';

@WebSocketGateway({
  cors: {
    origin: frontendUrls(),
    credentials: true,
  },
})
export class SocketGateway implements OnGatewayConnection {
  private readonly logger = new Logger(SocketGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(private jwtService: JwtService) {}

  // Authenticated sockets join their own user room; anonymous sockets may only
  // watch public request pages.
  handleConnection(client: Socket) {
    const token = client.handshake.auth?.token as string | undefined;
    if (!token) return;
    try {
      const payload = this.jwtService.verify(token);
      client.data.userId = String(payload.sub);
      client.data.role = payload.role;
      client.join(`user_${payload.sub}`);
    } catch {
      this.logger.debug(`Rejected socket token for ${client.id}`);
      client.emit('auth_error', { message: 'Invalid token' });
    }
  }

  @SubscribeMessage('watchRequest')
  watchRequest(@ConnectedSocket() client: Socket, @MessageBody() code: string) {
    if (typeof code === 'string' && /^[A-Za-z0-9]{6,12}$/.test(code)) {
      client.join(`request_${code}`);
    }
  }

  @SubscribeMessage('unwatchRequest')
  unwatchRequest(@ConnectedSocket() client: Socket, @MessageBody() code: string) {
    if (typeof code === 'string') client.leave(`request_${code}`);
  }

  toUser(userId: string, event: string, payload: unknown) {
    this.server?.to(`user_${userId}`).emit(event, payload);
  }

  toPublicRequest(code: string, payload: unknown) {
    this.server?.to(`request_${code}`).emit('request:update', payload);
  }
}
