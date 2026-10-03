import { ArrayMaxSize, IsArray, IsBoolean, IsDateString, IsIn, IsNumber, IsOptional, Max, Min } from 'class-validator';
import { RULES } from '../../eligibility/rules';

export class ScreeningDto {
  @IsOptional() @IsNumber() @Min(3) @Max(25)
  hemoglobin?: number;

  @IsOptional() @IsDateString()
  tattooOrPiercingOn?: string;

  @IsOptional() @IsDateString()
  majorSurgeryOn?: string;

  @IsOptional() @IsDateString()
  illnessRecoveredOn?: string;

  @IsOptional() @IsDateString()
  antibioticsCompletedOn?: string;

  @IsOptional() @IsDateString()
  malariaTreatedOn?: string;

  @IsOptional() @IsDateString()
  childbirthOn?: string;

  @IsOptional() @IsBoolean()
  pregnantOrBreastfeeding?: boolean;

  @IsOptional() @IsBoolean()
  alcoholLast24h?: boolean;

  @IsOptional() @IsArray() @ArrayMaxSize(10) @IsIn(Object.keys(RULES.permanentConditions), { each: true })
  conditions?: string[];
}
