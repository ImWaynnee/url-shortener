import { IsString, IsUUID } from 'class-validator';

export class RefreshRequestBody {
  @IsString()
  @IsUUID(4)
  refreshToken!: string;
}
