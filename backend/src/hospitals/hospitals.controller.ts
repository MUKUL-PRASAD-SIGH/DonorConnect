import { Controller, Get, Patch, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { IsBoolean } from 'class-validator';
import { HospitalsService } from './hospitals.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../schemas/user.schema';
import { UpdateHospitalDto } from './dto/update-hospital.dto';

class VerifyDto {
  @IsBoolean()
  verified: boolean;
}

@Controller('hospitals')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class HospitalsController {
  constructor(private readonly hospitalsService: HospitalsService) {}

  @Get('profile')
  @Roles(UserRole.HOSPITAL)
  getProfile(@Request() req) {
    return this.hospitalsService.getProfile(req.user.id);
  }

  @Patch('profile')
  @Roles(UserRole.HOSPITAL)
  updateProfile(@Request() req, @Body() dto: UpdateHospitalDto) {
    return this.hospitalsService.updateProfile(req.user.id, dto);
  }

  @Post('donors/:donorId/verify-phenotype')
  @Roles(UserRole.HOSPITAL)
  verifyPhenotype(@Request() req, @Param('donorId') donorId: string) {
    return this.hospitalsService.verifyDonorPhenotype(req.user.id, donorId);
  }

  // Admin review of hospital registrations — drives the "Verified" badge on public links
  @Get('review')
  @Roles(UserRole.ADMIN)
  listForReview() {
    return this.hospitalsService.listForReview();
  }

  @Patch(':id/verification')
  @Roles(UserRole.ADMIN)
  setVerified(@Param('id') id: string, @Body() dto: VerifyDto) {
    return this.hospitalsService.setVerified(id, dto.verified);
  }
}
