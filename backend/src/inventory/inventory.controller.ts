import { Body, Controller, Delete, Get, Param, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { InventoryService } from './inventory.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../schemas/user.schema';
import { AddLotDto, CreateOfferDto, RecordUsageDto, UpdateOfferDto } from './dto/inventory.dto';

@Controller('inventory')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(UserRole.HOSPITAL)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  getInventory(@Request() req) {
    return this.inventoryService.getInventory(req.user.id);
  }

  @Post('lots')
  addLot(@Request() req, @Body() dto: AddLotDto) {
    return this.inventoryService.addLot(req.user.id, dto);
  }

  @Delete('lots/:id')
  discardLot(@Request() req, @Param('id') id: string) {
    return this.inventoryService.discardLot(req.user.id, id);
  }

  @Post('usage')
  recordUsage(@Request() req, @Body() dto: RecordUsageDto) {
    return this.inventoryService.recordUsage(req.user.id, dto);
  }

  @Get('forecast')
  getForecast(@Request() req) {
    return this.inventoryService.getForecast(req.user.id);
  }

  @Get('exchange/suggestions')
  getSuggestions(@Request() req) {
    return this.inventoryService.getExchangeSuggestions(req.user.id);
  }

  @Get('exchange/offers')
  listOffers(@Request() req) {
    return this.inventoryService.listOffers(req.user.id);
  }

  @Post('exchange/offers')
  createOffer(@Request() req, @Body() dto: CreateOfferDto) {
    return this.inventoryService.createOffer(req.user.id, dto);
  }

  @Patch('exchange/offers/:id')
  updateOffer(@Request() req, @Param('id') id: string, @Body() dto: UpdateOfferDto) {
    return this.inventoryService.updateOffer(req.user.id, id, dto.action);
  }
}
