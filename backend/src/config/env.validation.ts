/* istanbul ignore file */

import { plainToInstance } from 'class-transformer';
import { IsNumber, IsOptional, IsString, IsUrl, Matches, Max, Min, validateSync } from 'class-validator';

class EnvironmentVariables {
  @IsString()
  @Matches(/^(postgresql|postgres):\/\//, { message: 'DATABASE_URL must be a valid PostgreSQL connection string' })
  DATABASE_URL!: string;

  @IsOptional()
  @IsString()
  @Matches(/^redis:\/\//, { message: 'REDIS_URL must be a valid Redis connection string' })
  REDIS_URL!: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  FRONTEND_URL!: string;

  @IsOptional()
  @IsUrl({ require_tld: true })
  REDIRECT_DOMAIN!: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(65535)
  PORT!: number;

  @IsString()
  JWT_SECRET!: string;

  @IsNumber()
  @Min(0)
  JWT_EXPIRATION!: number;

  @IsNumber()
  @Min(0)
  JWT_REFRESH_EXPIRATION!: number;

  @IsString()
  GOOGLE_OAUTH_SESSION_SECRET!: string;

  @IsOptional()
  @IsString()
  GOOGLE_OAUTH_CLIENT_ID!: string;

  @IsOptional()
  @IsString()
  GOOGLE_OAUTH_CLIENT_SECRET!: string;

  @IsOptional()
  @IsString()
  GOOGLE_OAUTH_REDIRECT_URI!: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  CACHE_L1_TTL_MS!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  CACHE_L2_TTL_MS!: number;
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, { skipMissingProperties: false });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }

  return validatedConfig;
}
