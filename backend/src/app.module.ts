import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { DonorsModule } from './donors/donors.module';
import { HospitalsModule } from './hospitals/hospitals.module';
import { AlertsModule } from './alerts/alerts.module';
import { CampsModule } from './camps/camps.module';
import { RewardsModule } from './rewards/rewards.module';
import { NotificationsModule } from './notifications/notifications.module';
import { SocketModule } from './socket/socket.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forRoot(
      process.env.MONGODB_URI || 'mongodb://localhost:27017/blood-donor-system',
      {
        // Add connection options for better error handling
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      }
    ),
    AuthModule,
    DonorsModule,
    HospitalsModule,
    AlertsModule,
    CampsModule,
    RewardsModule,
    NotificationsModule,
    SocketModule,
  ],
  controllers: [AppController],
})
export class AppModule {}