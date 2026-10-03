import { ArrayMaxSize, IsArray, IsOptional, IsString, IsUrl, MaxLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { LocationDto } from '../../donors/dto/update-donor.dto';

// License number and verification are not self-editable
export class UpdateHospitalDto {
  @IsOptional() @IsString() @MaxLength(100)
  name?: string;

  @IsOptional() @IsString() @MaxLength(30)
  phone?: string;

  @IsOptional() @IsString() @MaxLength(300)
  address?: string;

  @IsOptional() @ValidateNested() @Type(() => LocationDto)
  location?: LocationDto;

  @IsOptional() @IsString() @MaxLength(150)
  hospitalName?: string;

  @IsOptional() @IsString() @MaxLength(100)
  contactPerson?: string;

  @IsOptional() @IsString() @MaxLength(30)
  emergencyContact?: string;

  @IsOptional() @IsArray() @ArrayMaxSize(30) @IsString({ each: true })
  specialties?: string[];

  @IsOptional() @IsUrl()
  website?: string;
}
