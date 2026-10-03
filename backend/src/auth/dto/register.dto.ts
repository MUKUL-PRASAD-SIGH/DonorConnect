import { IsEmail, IsString, IsEnum, IsOptional, IsNumber, IsDateString, IsArray, ValidateNested, IsIn, MinLength, MaxLength } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { UserRole, BloodGroup } from '../../schemas/user.schema';
import { RARE_PHENOTYPES } from '../../common/blood';

class LocationDto {
  @IsString()
  type: string;

  @IsArray()
  @IsNumber({}, { each: true })
  coordinates: [number, number];
}

export class RegisterDto {
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password: string;

  // Frontend sends confirmPassword but we don't need to validate it in backend
  @IsOptional()
  @IsString()
  confirmPassword?: string;

  @IsString()
  phone: string;

  // Admin accounts are never self-registered
  @IsIn([UserRole.DONOR, UserRole.HOSPITAL])
  role: UserRole;

  @IsString()
  address: string;

  // Handle both location object and separate lat/lng
  @IsOptional()
  @ValidateNested()
  @Type(() => LocationDto)
  location?: LocationDto;

  // Frontend sends separate latitude/longitude
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  // Donor-specific fields
  @IsOptional()
  @IsEnum(BloodGroup)
  bloodGroup?: BloodGroup;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @IsOptional()
  @IsNumber()
  weight?: number;

  @IsOptional()
  @IsIn(['male', 'female', 'other'])
  sex?: 'male' | 'female' | 'other';

  @IsOptional()
  @IsArray()
  @IsIn(Object.keys(RARE_PHENOTYPES), { each: true })
  rarePhenotypes?: string[];

  // Hospital-specific fields
  @IsOptional()
  @IsString()
  hospitalName?: string;

  @IsOptional()
  @IsString()
  licenseNumber?: string;

  @IsOptional()
  @IsString()
  contactPerson?: string;

  @IsOptional()
  @IsString()
  emergencyContact?: string;

  @IsOptional()
  @IsArray()
  medicalConditions?: string[];

  @IsOptional()
  @IsArray()
  medications?: string[];
}