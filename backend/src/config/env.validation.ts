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
