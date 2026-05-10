import { IsNotEmpty, IsUrl } from 'class-validator';

export class CreateUrlRequest {
  @IsUrl(
    { require_protocol: true },
    { message: 'Please provide a valid URL including http:// or https://' },
  )
  @IsNotEmpty({ message: 'URL cannot be empty' })
  url!: string;
}
