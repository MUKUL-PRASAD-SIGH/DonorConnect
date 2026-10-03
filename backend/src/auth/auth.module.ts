import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthService } from './auth.service';
import { jwtSecret } from '../common/config';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { User, UserSchema } from '../schemas/user.schema';
import { Donor, DonorSchema } from '../schemas/donor.schema';
import { Hospital, HospitalSchema } from '../schemas/hospital.schema';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      useFactory: () => ({ secret: jwtSecret(), signOptions: { expiresIn: '7d' } }),
    }),
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Donor.name, schema: DonorSchema },
      { name: Hospital.name, schema: HospitalSchema },
    ]),
  ],
  providers: [AuthService, JwtStrategy, LocalStrategy],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}