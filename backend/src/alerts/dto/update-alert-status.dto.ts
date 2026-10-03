import { IsIn } from 'class-validator';
import { AlertStatus } from '../../schemas/alert.schema';

export class UpdateAlertStatusDto {
  @IsIn([AlertStatus.FULFILLED, AlertStatus.CANCELLED])
  status: AlertStatus.FULFILLED | AlertStatus.CANCELLED;
}
