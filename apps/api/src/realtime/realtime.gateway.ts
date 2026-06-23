import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Server, Socket } from 'socket.io';

interface JwtPayload {
  sub: string;
  tenantId: string;
  role: 'MANAGER' | 'COUNTER';
}

@Injectable()
@WebSocketGateway({ namespace: '/realtime', cors: { origin: '*' } })
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(RealtimeGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  async handleConnection(client: Socket) {
    const token = client.handshake.auth?.token as string | undefined;
    if (!token) {
      client.disconnect();
      return;
    }
    try {
      const payload = await this.jwt.verifyAsync<JwtPayload>(token, {
        secret: this.config.get<string>('JWT_ACCESS_SECRET'),
      });
      await client.join(payload.tenantId);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.debug(`Client disconnected: ${client.id}`);
  }

  emitCountUpdated(tenantId: string, payload: { assignmentId: string; productId: string }) {
    this.server?.to(tenantId).emit('count:updated', payload);
  }
}
