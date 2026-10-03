import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

@Controller()
export class AppController {
  constructor(@InjectConnection() private connection: Connection) {}

  @Get()
  getHello() {
    return { name: 'DonorConnect API', version: '2.0.0', timestamp: new Date().toISOString() };
  }

  @Get('health')
  getHealth() {
    const connected = this.connection.readyState === 1;
    const body = { status: connected ? 'healthy' : 'degraded', database: connected ? 'connected' : 'disconnected', timestamp: new Date().toISOString() };
    if (!connected) throw new ServiceUnavailableException(body);
    return body;
  }
}
