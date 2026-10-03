import { Controller, Get } from '@nestjs/common';
import { DonorsService } from './donors.service';

@Controller('public')
export class RegistryController {
  constructor(private readonly donorsService: DonorsService) {}

  @Get('registry')
  registry() {
    return this.donorsService.registryStats();
  }

  @Get('screening-options')
  screeningOptions() {
    return this.donorsService.screeningOptions();
  }
}
