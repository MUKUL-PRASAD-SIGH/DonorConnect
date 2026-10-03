import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { SocketGateway } from './socket.gateway';
import { jwtSecret } from '../common/config';

@Module({
  imports: [JwtModule.registerAsync({ useFactory: () => ({ secret: jwtSecret() }) })],
  providers: [SocketGateway],
  exports: [SocketGateway],
})
export class SocketModule {}
