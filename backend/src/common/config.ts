import { Logger } from '@nestjs/common';

const DEV_JWT_SECRET = 'dev-only-insecure-jwt-secret';
let warned = false;

export function jwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be set in production');
  }
  if (!warned) {
    new Logger('Config').warn('JWT_SECRET not set — using an insecure development secret');
    warned = true;
  }
  return DEV_JWT_SECRET;
}

export function autoVerifyHospitals(): boolean {
  return process.env.AUTO_VERIFY_HOSPITALS === 'true';
}

export function frontendUrls(): string[] {
  return (process.env.FRONTEND_URL || 'http://localhost:3000')
    .split(',')
    .map((u) => u.trim())
    .filter(Boolean);
}
