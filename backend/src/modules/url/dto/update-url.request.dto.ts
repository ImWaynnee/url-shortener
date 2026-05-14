import { IsBoolean, IsISO8601, IsOptional, IsString, IsUrl, ValidateIf } from 'class-validator';

export class UpdateUrlRequest {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  comments?: string | null;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsISO8601({ strict: true })
  expiresAt?: string | null;

  @IsOptional()
  @IsUrl({ require_protocol: true })
  destinationUrl?: string;
}
