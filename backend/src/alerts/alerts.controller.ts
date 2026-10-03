import { Controller, Get, Post, Body, Param, Patch, Query, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AlertsService } from './alerts.service';
import { CreateAlertDto } from './dto/create-alert.dto';
import { RespondToAlertDto } from './dto/respond-to-alert.dto';
import { UpdateAlertStatusDto } from './dto/update-alert-status.dto';
import { AlertStatus } from '../schemas/alert.schema';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../schemas/user.schema';

@Controller('alerts')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  @Post()
  @Roles(UserRole.HOSPITAL)
  create(@Body() createAlertDto: CreateAlertDto, @Request() req) {
    return this.alertsService.createAlert(createAlertDto, req.user.id);
  }

  @Get('hospital')
  @Roles(UserRole.HOSPITAL)
  getHospitalAlerts(@Request() req, @Query('status') status?: AlertStatus) {
    return this.alertsService.getAlertsByHospital(req.user.id, status);
  }

  @Patch(':id/status')
  @Roles(UserRole.HOSPITAL)
  updateAlertStatus(@Param('id') id: string, @Body() dto: UpdateAlertStatusDto, @Request() req) {
    return this.alertsService.closeAlert(id, dto.status, req.user.id);
  }

  @Post(':id/responses/:donorId/arrived')
  @Roles(UserRole.HOSPITAL)
  markArrived(@Param('id') id: string, @Param('donorId') donorId: string, @Request() req) {
    return this.alertsService.markArrived(id, donorId, req.user.id);
  }

  @Post(':id/responses/:donorId/no-show')
  @Roles(UserRole.HOSPITAL)
  markNoShow(@Param('id') id: string, @Param('donorId') donorId: string, @Request() req) {
    return this.alertsService.markNoShow(id, donorId, req.user.id);
  }

  // Requests this donor was invited to, with their slot status
  @Get('invites')
  @Roles(UserRole.DONOR)
  getInvites(@Request() req) {
    return this.alertsService.getInvites(req.user.id);
  }

  // Open requests this donor matches and can volunteer for
  @Get('nearby')
  @Roles(UserRole.DONOR)
  getNearby(@Request() req) {
    return this.alertsService.getNearbyForDonor(req.user.id);
  }

  @Post(':id/respond')
  @Roles(UserRole.DONOR)
  respondToAlert(@Param('id') id: string, @Body() dto: RespondToAlertDto, @Request() req) {
    return this.alertsService.respond(id, req.user.id, dto.action, dto.notes);
  }
}
