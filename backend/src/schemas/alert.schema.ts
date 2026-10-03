import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { BloodComponent, BloodGroup, RARE_PHENOTYPES } from '../common/blood';

export type AlertDocument = Alert & Document;

export enum AlertStatus {
  ACTIVE = 'active',
  FULFILLED = 'fulfilled',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
}

export enum AlertPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

/**
 * Lifecycle of one donor within one request:
 *   invited → accepted (holds a slot) → arrived
 *           → standby (accepted after slots filled; promoted if a slot frees up)
 *           → declined
 *   accepted → lapsed (hold expired without arrival) | withdrawn (donor cancelled)
 *   invited/standby/accepted → stood_down (request covered or closed)
 */
export enum ResponseStatus {
  INVITED = 'invited',
  ACCEPTED = 'accepted',
  STANDBY = 'standby',
  DECLINED = 'declined',
  ARRIVED = 'arrived',
  LAPSED = 'lapsed',
  WITHDRAWN = 'withdrawn',
  STOOD_DOWN = 'stood_down',
}

export enum DispatchState {
  DISPATCHING = 'dispatching', // still inviting donors
  COVERED = 'covered', // every slot is held — no more invites
  EXHAUSTED = 'exhausted', // no more eligible donors anywhere on the escalation ladder
  CLOSED = 'closed', // request fulfilled, cancelled or expired
}

@Schema({ _id: false })
export class DonorResponse {
  @Prop({ type: Types.ObjectId, ref: 'Donor', required: true })
  donorId: Types.ObjectId;

  @Prop({ required: true, enum: ResponseStatus, default: ResponseStatus.INVITED })
  status: ResponseStatus;

  @Prop({ default: 0 })
  wave: number; // 0 = volunteered via public link

  @Prop({ default: Date.now })
  invitedAt: Date;

  @Prop()
  respondedAt: Date;

  @Prop()
  holdExpiresAt: Date;

  @Prop()
  arrivedAt: Date;

  @Prop()
  distanceKm: number;

  @Prop()
  etaMinutes: number;

  @Prop()
  acceptProbability: number;

  @Prop()
  showProbability: number;

  // Short code donors can text back ("YES K7Q2") when they have no smartphone
  @Prop()
  replyCode: string;

  @Prop()
  notes: string;
}

@Schema({ _id: false })
export class Wave {
  @Prop({ required: true })
  number: number;

  @Prop({ required: true })
  sentAt: Date;

  // null = no distance limit (nationwide escalation for rare blood)
  @Prop({ type: Number, default: null })
  radiusKm: number | null;

  @Prop({ default: 0 })
  invited: number;
}

@Schema({ timestamps: true, optimisticConcurrency: true })
export class Alert {
  @Prop({ type: Types.ObjectId, ref: 'Hospital', required: true })
  hospitalId: Types.ObjectId;

  @Prop({ required: true, enum: BloodGroup })
  bloodGroup: BloodGroup;

  @Prop({ required: true, enum: BloodComponent, default: BloodComponent.WHOLE_BLOOD })
  component: BloodComponent;

  @Prop({ enum: Object.keys(RARE_PHENOTYPES) })
  requiredPhenotype: string;

  @Prop({ required: true })
  unitsNeeded: number;

  @Prop({ required: true, enum: AlertPriority })
  priority: AlertPriority;

  @Prop({ required: true, enum: AlertStatus, default: AlertStatus.ACTIVE })
  status: AlertStatus;

  @Prop({ required: true, enum: DispatchState, default: DispatchState.DISPATCHING })
  dispatchState: DispatchState;

  @Prop({ required: true })
  patientCondition: string;

  @Prop()
  additionalNotes: string;

  @Prop({ required: true })
  requiredBy: Date;

  @Prop({ default: 5 }) // Starting search radius in km
  searchRadius: number;

  // Index into the escalation ladder of radii
  @Prop({ default: 0 })
  escalationLevel: number;

  @Prop({ type: [Wave], default: [] })
  waves: Wave[];

  @Prop({ type: [DonorResponse], default: [] })
  responses: DonorResponse[];

  @Prop({ default: 0 })
  unitsCollected: number;

  // Public, shareable identifier for /r/<code> — safe to forward on WhatsApp
  @Prop({ required: true, unique: true })
  publicCode: string;

  @Prop()
  expiresAt: Date;

  @Prop()
  closedAt: Date;

  @Prop({ default: false })
  isEmergency: boolean;

  // Created from a shortage forecast: donors book an appointment rather than rush in
  @Prop({ default: false })
  isPlanned: boolean;
}

export const AlertSchema = SchemaFactory.createForClass(Alert);

AlertSchema.index({ status: 1, bloodGroup: 1, createdAt: -1 });
AlertSchema.index({ hospitalId: 1, status: 1 });
AlertSchema.index({ 'responses.donorId': 1, status: 1 });
AlertSchema.index({ 'responses.replyCode': 1 });
