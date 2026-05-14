import { IsNotEmpty, IsUrl } from 'class-validator';

export class CreateUrlRequest {
  @IsUrl(
    { require_protocol: false },
    { message: 'Please provide a valid URL' }
  )
  @IsNotEmpty({ message: 'URL cannot be empty' })
  url!: string;
}
