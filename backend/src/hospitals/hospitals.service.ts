import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Hospital, HospitalDocument } from '../schemas/hospital.schema';
import { User, UserDocument } from '../schemas/user.schema';
import { Donor, DonorDocument } from '../schemas/donor.schema';
import { UpdateHospitalDto } from './dto/update-hospital.dto';

const USER_FIELDS = ['name', 'phone', 'address', 'location'] as const;
const HOSPITAL_FIELDS = ['hospitalName', 'contactPerson', 'emergencyContact', 'specialties', 'website'] as const;

@Injectable()
export class HospitalsService {
  constructor(
    @InjectModel(Hospital.name) private hospitalModel: Model<HospitalDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Donor.name) private donorModel: Model<DonorDocument>,
  ) {}

  async getProfile(userId: string) {
    const hospital = await this.findHospital(userId);
    const user = await this.userModel.findById(userId);
    return {
      id: String(user._id),
      hospitalId: String(hospital._id),
      role: user.role,
      name: user.name,
      email: user.email,
      phone: user.phone,
      address: user.address,
      location: user.location,
      hospitalName: hospital.hospitalName,
      licenseNumber: hospital.licenseNumber,
      contactPerson: hospital.contactPerson,
      emergencyContact: hospital.emergencyContact,
      isVerified: hospital.isVerified,
      specialties: hospital.specialties,
      website: hospital.website,
      totalAlertsRaised: hospital.totalAlertsRaised,
      successfulMatches: hospital.successfulMatches,
    };
  }

  async updateProfile(userId: string, dto: UpdateHospitalDto) {
    const hospital = await this.findHospital(userId);
    const pick = (keys: readonly string[]) =>
      Object.fromEntries(keys.filter((k) => dto[k] !== undefined).map((k) => [k, dto[k]]));
    const userUpdate = pick(USER_FIELDS);
    const hospitalUpdate = pick(HOSPITAL_FIELDS);
    if (Object.keys(userUpdate).length) await this.userModel.updateOne({ _id: userId }, { $set: userUpdate });
    if (Object.keys(hospitalUpdate).length) await this.hospitalModel.updateOne({ _id: hospital._id }, { $set: hospitalUpdate });
    return this.getProfile(userId);
  }

  /** A verified hospital's lab confirms a donor's rare phenotype after testing. */
  async verifyDonorPhenotype(hospitalUserId: string, donorId: string) {
    const hospital = await this.findHospital(hospitalUserId);
    if (!hospital.isVerified) throw new ForbiddenException('Only verified hospitals can confirm phenotypes');
    if (!Types.ObjectId.isValid(donorId)) throw new NotFoundException('Donor not found');
    const res = await this.donorModel.updateOne(
      { _id: donorId, 'rarePhenotypes.0': { $exists: true } },
      { $set: { rarePhenotypeVerified: true } },
    );
    if (!res.matchedCount) throw new NotFoundException('Donor not found or has no rare phenotype registered');
    return { success: true };
  }

  async setVerified(hospitalId: string, verified: boolean) {
    if (!Types.ObjectId.isValid(hospitalId)) throw new NotFoundException('Hospital not found');
    const hospital = await this.hospitalModel.findByIdAndUpdate(
      hospitalId,
      { $set: { isVerified: verified, verifiedAt: verified ? new Date() : null } },
      { new: true },
    );
    if (!hospital) throw new NotFoundException('Hospital not found');
    return { id: String(hospital._id), hospitalName: hospital.hospitalName, isVerified: hospital.isVerified };
  }

  async listForReview() {
    const hospitals = await this.hospitalModel.find().populate('userId', 'name email phone address').sort({ isVerified: 1, createdAt: -1 });
    return hospitals.map((h: any) => ({
      id: String(h._id),
      hospitalName: h.hospitalName,
      licenseNumber: h.licenseNumber,
      isVerified: h.isVerified,
      contact: h.userId,
    }));
  }

  private async findHospital(userId: string) {
    const hospital = await this.hospitalModel.findOne({ userId: new Types.ObjectId(userId) });
    if (!hospital) throw new NotFoundException('Hospital profile not found');
    return hospital;
  }
}
