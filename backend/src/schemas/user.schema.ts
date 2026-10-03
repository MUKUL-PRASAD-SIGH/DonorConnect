import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export { BloodGroup } from '../common/blood';

export type UserDocument = User & Document;

export enum UserRole {
  DONOR = 'donor',
  HOSPITAL = 'hospital',
  ADMIN = 'admin',
}

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  // Never returned unless explicitly selected with '+password'
  @Prop({ required: true, select: false })
  password: string;

  @Prop({ required: true })
  phone: string;

  @Prop({ required: true, enum: UserRole })
  role: UserRole;

  @Prop({ required: true })
  address: string;

  @Prop({
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
    },
    coordinates: {
      type: [Number],
      required: true,
    },
  })
  location: {
    type: string;
    coordinates: [number, number]; // [longitude, latitude]
  };

  @Prop({ default: true })
  isActive: boolean;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Create 2dsphere index for geospatial queries
UserSchema.index({ location: '2dsphere' });
