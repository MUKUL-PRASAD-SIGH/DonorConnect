import { ArrayMaxSize, IsArray, IsBoolean, IsIn, IsNumber, IsOptional, IsString, Max, MaxLength, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { RARE_PHENOTYPES } from '../../common/blood';

export class LocationDto {
  @IsIn(['Point'])
  type: 'Point';

  @IsArray()
  @IsNumber({}, { each: true })
  coordinates: [number, number];
}

// Only fields a donor may change about themselves. Blood group, donation history,
// reward points and verification are deliberately not editable here.
export class UpdateDonorDto {
  @IsOptional() @IsString() @MaxLength(100)
  name?: string;

  @IsOptional() @IsString() @MaxLength(30)
  phone?: string;

  @IsOptional() @IsString() @MaxLength(300)
  address?: string;

  @IsOptional() @ValidateNested() @Type(() => LocationDto)
  location?: LocationDto;

  @IsOptional() @IsNumber() @Min(30) @Max(250)
  weight?: number;

  @IsOptional() @IsIn(['male', 'female', 'other'])
  sex?: 'male' | 'female' | 'other';

  @IsOptional() @IsBoolean()
  availableForEmergency?: boolean;

  @IsOptional() @IsBoolean()
  notificationsEnabled?: boolean;

  @IsOptional() @IsArray() @ArrayMaxSize(8) @IsIn(Object.keys(RARE_PHENOTYPES), { each: true })
  rarePhenotypes?: string[];
}
