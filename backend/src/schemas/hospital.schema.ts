import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type HospitalDocument = Hospital & Document;

@Schema({ timestamps: true })
export class Hospital {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  hospitalName: string;

  @Prop({ required: true })
  licenseNumber: string;

  @Prop({ required: true })
  contactPerson: string;

  @Prop({ required: true })
  emergencyContact: string;

  // Only verified hospitals get the "Verified" badge on public request links
  @Prop({ default: false })
  isVerified: boolean;

  @Prop()
  verifiedAt: Date;

  @Prop({ type: [String], default: [] })
  specialties: string[];

  @Prop()
  website: string;

  @Prop({ default: 0 })
  totalAlertsRaised: number;

  @Prop({ default: 0 })
  successfulMatches: number;
}

export const HospitalSchema = SchemaFactory.createForClass(Hospital);
