import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Donor, DonorDocument } from '../schemas/donor.schema';
import { User, UserDocument } from '../schemas/user.schema';
import { RARE_PHENOTYPES } from '../common/blood';
import { RULES, evaluateEligibility } from '../eligibility/rules';
import { UpdateDonorDto } from './dto/update-donor.dto';
import { ScreeningDto } from './dto/screening.dto';

const USER_FIELDS = ['name', 'phone', 'address', 'location'] as const;

@Injectable()
export class DonorsService {
  constructor(
    @InjectModel(Donor.name) private donorModel: Model<DonorDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async getProfile(userId: string) {
    const donor = await this.findDonor(userId);
    const user = await this.userModel.findById(userId);
    return this.toProfile(donor, user);
  }

  async updateProfile(userId: string, dto: UpdateDonorDto) {
    const donor = await this.findDonor(userId);
    const userUpdate: Record<string, unknown> = {};
    for (const key of USER_FIELDS) if (dto[key] !== undefined) userUpdate[key] = dto[key];
    if (Object.keys(userUpdate).length) await this.userModel.updateOne({ _id: userId }, { $set: userUpdate });

    const { weight, sex, availableForEmergency, notificationsEnabled, rarePhenotypes } = dto;
    const donorUpdate = Object.fromEntries(
      Object.entries({ weight, sex, availableForEmergency, notificationsEnabled, rarePhenotypes }).filter(([, v]) => v !== undefined),
    );
    // Self-reported phenotypes need re-confirmation by a hospital lab when they change
    if (rarePhenotypes && rarePhenotypes.join() !== (donor.rarePhenotypes || []).join()) {
      donorUpdate.rarePhenotypeVerified = false;
    }
    if (Object.keys(donorUpdate).length) await this.donorModel.updateOne({ _id: donor._id }, { $set: donorUpdate });
    return this.getProfile(userId);
  }

  async submitScreening(userId: string, dto: ScreeningDto) {
    const donor = await this.findDonor(userId);
    donor.screening = { ...dto, completedAt: new Date() };
    await donor.save();
    return this.getProfile(userId);
  }

  async getEligibility(userId: string) {
    const donor = await this.findDonor(userId);
    return evaluateEligibility(this.facts(donor));
  }

  async updateFCMToken(userId: string, fcmToken: string) {
    const donor = await this.findDonor(userId);
    donor.fcmToken = fcmToken;
    await donor.save();
    return { success: true };
  }

  /** Public, aggregate counts only — encourages people with rare blood to register. */
  async registryStats() {
    const rows = await this.donorModel.aggregate([
      { $unwind: '$rarePhenotypes' },
      { $group: { _id: { p: '$rarePhenotypes', v: '$rarePhenotypeVerified' }, n: { $sum: 1 } } },
    ]);
    return Object.entries(RARE_PHENOTYPES).map(([code, label]) => ({
      code,
      label,
      registered: rows.filter((r) => r._id.p === code).reduce((s, r) => s + r.n, 0),
      verified: rows.find((r) => r._id.p === code && r._id.v)?.n || 0,
    }));
  }

  screeningOptions() {
    return { conditions: RULES.permanentConditions, rarePhenotypes: RARE_PHENOTYPES, minHemoglobin: RULES.minHemoglobin };
  }

  private async findDonor(userId: string) {
    const donor = await this.donorModel.findOne({ userId: new Types.ObjectId(userId) });
    if (!donor) throw new NotFoundException('Donor profile not found');
    return donor;
  }

  private facts(d: DonorDocument) {
    return { dateOfBirth: d.dateOfBirth, weightKg: d.weight, sex: d.sex, lastDonations: d.lastDonations, screening: d.screening };
  }

  private toProfile(d: DonorDocument, u: UserDocument) {
    return {
      id: String(u._id),
      donorId: String(d._id),
      role: u.role,
      name: u.name,
      email: u.email,
      phone: u.phone,
      address: u.address,
      location: u.location,
      bloodGroup: d.bloodGroup,
      dateOfBirth: d.dateOfBirth,
      weight: d.weight,
      sex: d.sex,
      totalDonations: d.totalDonations,
      rewardPoints: d.rewardPoints,
      badges: d.badges,
      lastDonationDate: d.lastDonationDate,
      lastDonations: d.lastDonations || {},
      availableForEmergency: d.availableForEmergency,
      notificationsEnabled: d.notificationsEnabled,
      rarePhenotypes: d.rarePhenotypes,
      rarePhenotypeVerified: d.rarePhenotypeVerified,
      screening: d.screening,
      reliability: d.reliability || { invited: 0, accepted: 0, arrived: 0, lapsed: 0 },
      eligibility: evaluateEligibility(this.facts(d)),
    };
  }
}
