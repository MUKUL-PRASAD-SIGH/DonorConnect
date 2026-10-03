import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { BloodComponent, BloodGroup } from '../common/blood';

export type InventoryLotDocument = InventoryLot & Document;
export type UsageEventDocument = UsageEvent & Document;
export type TransferOfferDocument = TransferOffer & Document;

export enum LotStatus {
  AVAILABLE = 'available',
  DEPLETED = 'depleted',
  EXPIRED = 'expired',
  DISCARDED = 'discarded',
}

/** A batch of units of one group/component sharing an expiry date. */
@Schema({ timestamps: true })
export class InventoryLot {
  @Prop({ type: Types.ObjectId, ref: 'Hospital', required: true, index: true })
  hospitalId: Types.ObjectId;

  @Prop({ required: true, enum: BloodGroup })
  bloodGroup: BloodGroup;

  @Prop({ required: true, enum: BloodComponent })
  component: BloodComponent;

  @Prop({ required: true, min: 0 })
  units: number;

  @Prop({ required: true })
  collectedAt: Date;

  @Prop({ required: true })
  expiresAt: Date;

  @Prop({ enum: LotStatus, default: LotStatus.AVAILABLE })
  status: LotStatus;

  // e.g. "donation", "transfer from City Hospital"
  @Prop()
  source: string;
}

export enum UsageKind {
  USED = 'used',
  EXPIRED = 'expired',
  RECEIVED = 'received',
  SENT = 'sent',
}

@Schema({ timestamps: true })
export class UsageEvent {
  @Prop({ type: Types.ObjectId, ref: 'Hospital', required: true })
  hospitalId: Types.ObjectId;

  @Prop({ required: true, enum: BloodGroup })
  bloodGroup: BloodGroup;

  @Prop({ required: true, enum: BloodComponent })
  component: BloodComponent;

  @Prop({ required: true })
  units: number;

  @Prop({ required: true, enum: UsageKind })
  kind: UsageKind;

  @Prop({ required: true, default: Date.now })
  at: Date;
}

export enum TransferStatus {
  OFFERED = 'offered',
  ACCEPTED = 'accepted',
  DECLINED = 'declined',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
}

/** One hospital offering near-expiry units to another that is about to run short. */
@Schema({ timestamps: true, optimisticConcurrency: true })
export class TransferOffer {
  @Prop({ type: Types.ObjectId, ref: 'Hospital', required: true, index: true })
  fromHospitalId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Hospital', required: true, index: true })
  toHospitalId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'InventoryLot', required: true })
  lotId: Types.ObjectId;

  @Prop({ required: true, enum: BloodGroup })
  bloodGroup: BloodGroup;

  @Prop({ required: true, enum: BloodComponent })
  component: BloodComponent;

  @Prop({ required: true, min: 1 })
  units: number;

  @Prop({ required: true })
  expiresAt: Date;

  @Prop()
  distanceKm: number;

  @Prop({ enum: TransferStatus, default: TransferStatus.OFFERED })
  status: TransferStatus;

  @Prop()
  note: string;
}

export const InventoryLotSchema = SchemaFactory.createForClass(InventoryLot);
InventoryLotSchema.index({ hospitalId: 1, status: 1, bloodGroup: 1, component: 1, expiresAt: 1 });

export const UsageEventSchema = SchemaFactory.createForClass(UsageEvent);
UsageEventSchema.index({ hospitalId: 1, bloodGroup: 1, component: 1, at: -1 });

export const TransferOfferSchema = SchemaFactory.createForClass(TransferOffer);
