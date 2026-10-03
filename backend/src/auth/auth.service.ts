import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { User, UserDocument, UserRole } from '../schemas/user.schema';
import { Donor, DonorDocument } from '../schemas/donor.schema';
import { Hospital, HospitalDocument } from '../schemas/hospital.schema';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { autoVerifyHospitals } from '../common/config';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Donor.name) private donorModel: Model<DonorDocument>,
    @InjectModel(Hospital.name) private hospitalModel: Model<HospitalDocument>,
    private jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto) {
    const { password, role, latitude, longitude } = registerDto;
    const email = registerDto.email.trim().toLowerCase();

    if (role === UserRole.DONOR && (!registerDto.bloodGroup || !registerDto.dateOfBirth || !registerDto.weight)) {
      throw new BadRequestException('Donors need a blood group, date of birth and weight');
    }
    if (
      role === UserRole.HOSPITAL &&
      (!registerDto.hospitalName || !registerDto.licenseNumber || !registerDto.contactPerson || !registerDto.emergencyContact)
    ) {
      throw new BadRequestException('Hospitals need a name, license number, contact person and emergency contact');
    }

    if (await this.userModel.exists({ email })) {
      throw new ConflictException('User with this email already exists');
    }

    let location = registerDto.location;
    if (!location && latitude !== undefined && longitude !== undefined) {
      location = { type: 'Point', coordinates: [longitude, latitude] }; // MongoDB expects [lng, lat]
    }
    if (!location) throw new BadRequestException('Location is required');

    const user = await this.userModel.create({
      name: registerDto.name,
      email,
      phone: registerDto.phone,
      address: registerDto.address,
      password: await bcrypt.hash(password, 12),
      role,
      location,
    });

    // No multi-document transactions on a standalone MongoDB, so roll back by hand
    try {
      if (role === UserRole.DONOR) {
        await this.donorModel.create({
          userId: user._id,
          bloodGroup: registerDto.bloodGroup,
          dateOfBirth: registerDto.dateOfBirth,
          weight: registerDto.weight,
          sex: registerDto.sex,
          rarePhenotypes: registerDto.rarePhenotypes || [],
          medicalConditions: registerDto.medicalConditions,
        });
      } else {
        await this.hospitalModel.create({
          userId: user._id,
          hospitalName: registerDto.hospitalName,
          licenseNumber: registerDto.licenseNumber,
          contactPerson: registerDto.contactPerson,
          emergencyContact: registerDto.emergencyContact,
          isVerified: autoVerifyHospitals(),
          verifiedAt: autoVerifyHospitals() ? new Date() : undefined,
        });
      }
    } catch (error) {
      await this.userModel.deleteOne({ _id: user._id });
      throw error;
    }

    return this.session(user);
  }

  async login(loginDto: LoginDto) {
    const email = loginDto.email.trim().toLowerCase();
    const user = await this.userModel.findOne({ email, isActive: true }).select('+password');
    if (!user || !(await bcrypt.compare(loginDto.password, user.password))) {
      throw new UnauthorizedException('Invalid email or password');
    }
    return this.session(user);
  }

  async me(userId: string) {
    const user = await this.userModel.findById(userId);
    if (!user) throw new UnauthorizedException();
    return this.publicUser(user);
  }

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.userModel.findOne({ email: email.trim().toLowerCase(), isActive: true }).select('+password');
    if (user && (await bcrypt.compare(password, user.password))) {
      const { password: _, ...result } = user.toObject();
      return result;
    }
    return null;
  }

  async findUserById(id: string): Promise<UserDocument> {
    return this.userModel.findById(id);
  }

  private async session(user: UserDocument) {
    const token = this.jwtService.sign({ sub: String(user._id), email: user.email, role: user.role });
    return { user: await this.publicUser(user), token };
  }

  /** User plus the role-specific fields the frontend needs right after login. */
  private async publicUser(user: UserDocument) {
    const base = {
      id: String(user._id),
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      address: user.address,
      location: user.location,
    };
    if (user.role === UserRole.DONOR) {
      const donor = await this.donorModel.findOne({ userId: user._id });
      return { ...base, donorId: donor && String(donor._id), bloodGroup: donor?.bloodGroup };
    }
    if (user.role === UserRole.HOSPITAL) {
      const hospital = await this.hospitalModel.findOne({ userId: user._id });
      return {
        ...base,
        hospitalId: hospital && String(hospital._id),
        hospitalName: hospital?.hospitalName,
        isVerified: hospital?.isVerified,
      };
    }
    return base;
  }
}
