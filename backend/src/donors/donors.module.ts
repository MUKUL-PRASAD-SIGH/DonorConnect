import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DonorsService } from './donors.service';
import { DonorsController } from './donors.controller';
import { RegistryController } from './registry.controller';
import { Donor, DonorSchema } from '../schemas/donor.schema';
import { User, UserSchema } from '../schemas/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Donor.name, schema: DonorSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [DonorsController, RegistryController],
  providers: [DonorsService],
  exports: [DonorsService],
})
export class DonorsModule {}