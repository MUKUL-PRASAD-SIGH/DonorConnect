import { IsEnum, IsString, IsNumber, IsDateString, IsOptional, IsBoolean, IsIn, Min, Max, MaxLength } from 'class-validator';
import { BloodComponent, BloodGroup, RARE_PHENOTYPES } from '../../common/blood';
import { AlertPriority } from '../../schemas/alert.schema';

export class CreateAlertDto {
  @IsEnum(BloodGroup)
  bloodGroup: BloodGroup;

  @IsOptional()
  @IsEnum(BloodComponent)
  component?: BloodComponent;

  // Rare-blood requests escalate beyond the normal radius
  @IsOptional()
  @IsIn(Object.keys(RARE_PHENOTYPES))
  requiredPhenotype?: string;

  @IsNumber()
  @Min(1)
  @Max(50)
  unitsNeeded: number;

  @IsEnum(AlertPriority)
  priority: AlertPriority;

  @IsString()
  @MaxLength(200)
  patientCondition: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  additionalNotes?: string;

  @IsDateString()
  requiredBy: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50)
  searchRadius?: number;

  @IsOptional()
  @IsBoolean()
  isEmergency?: boolean;

  // Created from a shortage forecast rather than an emergency
  @IsOptional()
  @IsBoolean()
  isPlanned?: boolean;
}
