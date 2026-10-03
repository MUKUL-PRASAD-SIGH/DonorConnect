import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class RespondToAlertDto {
  // accept: hold a slot (or join standby) · decline: not this time · withdraw: cancel after accepting
  @IsIn(['accept', 'decline', 'withdraw'])
  action: 'accept' | 'decline' | 'withdraw';

  @IsOptional()
  @IsString()
  @MaxLength(300)
  notes?: string;
}
