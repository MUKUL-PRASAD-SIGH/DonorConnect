import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AlertsService } from './alerts.service';
import { AlertsController } from './alerts.controller';
import { PublicController } from './public.controller';
import { SmsController } from './sms.controller';
import { Alert, AlertSchema } from '../schemas/alert.schema';
import { Donor, DonorSchema } from '../schemas/donor.schema';
import { Hospital, HospitalSchema } from '../schemas/hospital.schema';
import { User, UserSchema } from '../schemas/user.schema';
import { NotificationsModule } from '../notifications/notifications.module';
import { SocketModule } from '../socket/socket.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Alert.name, schema: AlertSchema },
      { name: Donor.name, schema: DonorSchema },
      { name: Hospital.name, schema: HospitalSchema },
      { name: User.name, schema: UserSchema },
    ]),
    NotificationsModule,
    SocketModule,
  ],
  controllers: [AlertsController, PublicController, SmsController],
  providers: [AlertsService],
  exports: [AlertsService],
})
export class AlertsModule {}
