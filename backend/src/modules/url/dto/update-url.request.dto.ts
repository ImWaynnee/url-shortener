import { IsBoolean, IsOptional, IsString, ValidateIf } from 'class-validator';

export class UpdateUrlRequest {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  comments?: string | null;
}
