import { Controller, Get, Patch, Post, Body, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { IsString, MaxLength } from 'class-validator';
import { DonorsService } from './donors.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../schemas/user.schema';
import { UpdateDonorDto } from './dto/update-donor.dto';
import { ScreeningDto } from './dto/screening.dto';

class FcmTokenDto {
  @IsString()
  @MaxLength(4096)
  fcmToken: string;
}

@Controller('donors')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(UserRole.DONOR)
export class DonorsController {
  constructor(private readonly donorsService: DonorsService) {}

  @Get('profile')
  getProfile(@Request() req) {
    return this.donorsService.getProfile(req.user.id);
  }

  @Patch('profile')
  updateProfile(@Request() req, @Body() dto: UpdateDonorDto) {
    return this.donorsService.updateProfile(req.user.id, dto);
  }

  @Get('eligibility')
  getEligibility(@Request() req) {
    return this.donorsService.getEligibility(req.user.id);
  }

  @Post('screening')
  submitScreening(@Request() req, @Body() dto: ScreeningDto) {
    return this.donorsService.submitScreening(req.user.id, dto);
  }

  @Patch('fcm-token')
  updateFCMToken(@Request() req, @Body() dto: FcmTokenDto) {
    return this.donorsService.updateFCMToken(req.user.id, dto.fcmToken);
  }
}
