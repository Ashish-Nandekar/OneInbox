import { Request, Response } from 'express';
import { authService } from '../services/auth.service';
import { z } from 'zod';

const registerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export class AuthController {
  async register(req: Request, res: Response) {
    try {
      const { name, email, password } = registerSchema.parse(req.body);

      const result = await authService.register(name, email, password);

      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: error.errors[0].message,
          },
        });
      }

      const message = error instanceof Error ? error.message : 'Registration failed';
      res.status(400).json({
        success: false,
        error: {
          code: 'REGISTRATION_FAILED',
          message,
        },
      });
    }
  }

  async login(req: Request, res: Response) {
    try {
      const { email, password } = loginSchema.parse(req.body);

      const result = await authService.login(email, password);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: error.errors[0].message,
          },
        });
      }

      res.status(401).json({
        success: false,
        error: {
          code: 'LOGIN_FAILED',
          message: 'Invalid credentials',
        },
      });
    }
  }

  async logout(req: Request, res: Response) {
    // With JWT, logout is handled client-side by removing the token
    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  }

  async me(req: Request, res: Response) {
    try {
      const user = await authService.getCurrentUser(req.user!.id);

      res.json({
        success: true,
        data: user,
      });
    } catch (error) {
      res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
        },
      });
    }
  }
}

export const authController = new AuthController();
