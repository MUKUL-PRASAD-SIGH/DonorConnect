import { Controller, Get, Param } from '@nestjs/common';
import { AlertsService } from './alerts.service';

// Unauthenticated endpoints backing shareable /r/<code> request pages
@Controller('public')
export class PublicController {
  constructor(private readonly alertsService: AlertsService) {}

  @Get('requests/:code')
  getRequest(@Param('code') code: string) {
    return this.alertsService.getPublicRequest(code);
  }
}
