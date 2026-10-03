import { Prop, Schema, SchemaFactory, raw } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { BloodGroup, RARE_PHENOTYPES } from '../common/blood';
import type { ScreeningAnswers, Sex } from '../eligibility/rules';

export type DonorDocument = Donor & Document;

export enum DonorStatus {
  ELIGIBLE = 'eligible',
  INELIGIBLE = 'ineligible',
  TEMPORARILY_INELIGIBLE = 'temporarily_ineligible',
}

@Schema({ timestamps: true })
export class Donor {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true })
  userId: Types.ObjectId;

  @Prop({ required: true, enum: BloodGroup })
  bloodGroup: BloodGroup;

  @Prop({ required: true })
  dateOfBirth: Date;

  @Prop({ required: true })
  weight: number; // in kg

  @Prop({ enum: ['male', 'female', 'other'] })
  sex: Sex;

  @Prop({ default: DonorStatus.ELIGIBLE, enum: DonorStatus })
  status: DonorStatus;

  @Prop()
  lastDonationDate: Date;

  // Last donation per donation type — drives component-specific eligibility
  @Prop(raw({ whole_blood: Date, platelets: Date, plasma: Date }))
  lastDonations: { whole_blood?: Date; platelets?: Date; plasma?: Date };

  @Prop(
    raw({
      hemoglobin: Number,
      tattooOrPiercingOn: String,
      majorSurgeryOn: String,
      illnessRecoveredOn: String,
      antibioticsCompletedOn: String,
      malariaTreatedOn: String,
      childbirthOn: String,
      pregnantOrBreastfeeding: Boolean,
      alcoholLast24h: Boolean,
      conditions: [String],
      completedAt: Date,
    }),
  )
  screening: ScreeningAnswers & { completedAt?: Date };

  @Prop({ default: 0 })
  totalDonations: number;

  @Prop({ default: 0 })
  rewardPoints: number;

  @Prop({ type: [String], default: [] })
  badges: string[];

  @Prop({ default: true })
  availableForEmergency: boolean;

  @Prop({ default: true })
  notificationsEnabled: boolean;

  @Prop()
  fcmToken: string; // For push notifications

  // Rare-blood registry
  @Prop({ type: [String], enum: Object.keys(RARE_PHENOTYPES), default: [] })
  rarePhenotypes: string[];

  // Set when a hospital lab has confirmed the phenotype
  @Prop({ default: false })
  rarePhenotypeVerified: boolean;

  // Track record used to predict acceptance and show-up probability in dispatch
  @Prop(
    raw({
      invited: { type: Number, default: 0 },
      accepted: { type: Number, default: 0 },
      arrived: { type: Number, default: 0 },
      lapsed: { type: Number, default: 0 },
    }),
  )
  reliability: { invited: number; accepted: number; arrived: number; lapsed: number };
}

export const DonorSchema = SchemaFactory.createForClass(Donor);
DonorSchema.index({ bloodGroup: 1, availableForEmergency: 1 });
DonorSchema.index({ rarePhenotypes: 1 });
