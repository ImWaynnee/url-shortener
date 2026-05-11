import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class LoginRequestBody {
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(72)
  password!: string;
}
