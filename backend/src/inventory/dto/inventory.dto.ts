import { IsDateString, IsEnum, IsIn, IsMongoId, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { BloodComponent, BloodGroup } from '../../common/blood';

export class AddLotDto {
  @IsEnum(BloodGroup)
  bloodGroup: BloodGroup;

  @IsEnum(BloodComponent)
  component: BloodComponent;

  @IsNumber() @Min(1) @Max(500)
  units: number;

  @IsOptional() @IsDateString()
  collectedAt?: string;

  // Defaults to collectedAt + shelf life of the component
  @IsOptional() @IsDateString()
  expiresAt?: string;

  @IsOptional() @IsString() @MaxLength(120)
  source?: string;
}

export class RecordUsageDto {
  @IsEnum(BloodGroup)
  bloodGroup: BloodGroup;

  @IsEnum(BloodComponent)
  component: BloodComponent;

  @IsNumber() @Min(1) @Max(500)
  units: number;
}

export class CreateOfferDto {
  @IsMongoId()
  lotId: string;

  @IsMongoId()
  toHospitalId: string;

  @IsNumber() @Min(1) @Max(500)
  units: number;

  @IsOptional() @IsString() @MaxLength(300)
  note?: string;
}

export class UpdateOfferDto {
  @IsIn(['accept', 'decline', 'cancel', 'complete'])
  action: 'accept' | 'decline' | 'cancel' | 'complete';
}
