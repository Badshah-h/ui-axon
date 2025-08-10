import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from '../database/entities/user.entity';
import { Organization } from '../database/entities/organization.entity';
import { LoginRequest, RegisterRequest, LoginResponse } from '@shared/types/auth';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Organization)
    private organizationRepository: Repository<Organization>,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.userRepository.findOne({
      where: { email },
      relations: ['organization'],
    });

    if (user && await bcrypt.compare(password, user.password)) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async login(loginRequest: LoginRequest): Promise<LoginResponse> {
    const user = await this.validateUser(loginRequest.email, loginRequest.password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { email: user.email, sub: user.id, role: user.role };
    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '30d' });

    // Update last login
    await this.userRepository.update(user.id, { lastLoginAt: new Date() });

    return {
      user,
      accessToken,
      refreshToken,
    };
  }

  async register(registerRequest: RegisterRequest): Promise<LoginResponse> {
    // Check if user exists
    const existingUser = await this.userRepository.findOne({
      where: { email: registerRequest.email },
    });

    if (existingUser) {
      throw new UnauthorizedException('User already exists');
    }

    // Create or find organization
    let organization = await this.organizationRepository.findOne({
      where: { name: registerRequest.organizationName || 'Default Organization' },
    });

    if (!organization) {
      organization = this.organizationRepository.create({
        name: registerRequest.organizationName || 'Default Organization',
      });
      organization = await this.organizationRepository.save(organization);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(registerRequest.password, 10);

    // Create user
    const user = this.userRepository.create({
      email: registerRequest.email,
      password: hashedPassword,
      firstName: registerRequest.firstName,
      lastName: registerRequest.lastName,
      organization,
    });

    const savedUser = await this.userRepository.save(user);
    const { password, ...userWithoutPassword } = savedUser;

    const payload = { email: user.email, sub: user.id, role: user.role };
    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '30d' });

    return {
      user: userWithoutPassword,
      accessToken,
      refreshToken,
    };
  }
}