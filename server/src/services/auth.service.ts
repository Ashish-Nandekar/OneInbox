import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../utils/db';
import { config } from '../config/env';
import { AuthUser } from '../types';

export class AuthService {
  async register(name: string, email: string, password: string) {
    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new Error('User already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
      },
    });

    // Generate token
    const token = this.generateToken({
      id: user.id,
      email: user.email,
      name: user.name,
    });

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
      token,
    };
  }

  async login(email: string, password: string) {
    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      throw new Error('Invalid credentials');
    }

    // Generate token
    const token = this.generateToken({
      id: user.id,
      email: user.email,
      name: user.name,
    });

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
      token,
    };
  }

  async getCurrentUser(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    return user;
  }

  private generateToken(user: AuthUser): string {
    const payload = {
      id: user.id,
      email: user.email,
      name: user.name,
    };
    return jwt.sign(payload, config.jwt.secret, {
      expiresIn: '7d',
    });
  }
}

export const authService = new AuthService();
