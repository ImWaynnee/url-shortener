import { IsISO8601WithTZandTime } from '@src/common/validators/datetime';
import { IsBoolean, IsOptional, IsString, IsUrl, MaxLength, ValidateIf } from 'class-validator';

export class UpdateUrlRequest {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(100, { message: 'Comment must be 100 characters or less' })
  comments?: string | null;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsISO8601WithTZandTime({
    message: 'expiresAt must be a valid ISO 8601 datetime in UTC (e.g., 2024-01-01T12:00:00Z)' 
  })
  expiresAt?: string | null;

  @IsOptional()
  @IsUrl({ require_protocol: true })
  destinationUrl?: string;
}
