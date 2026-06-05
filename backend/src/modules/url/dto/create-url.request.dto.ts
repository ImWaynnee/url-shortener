import { IsNotDangerousUrl } from '@common/validators/url';
import { IsNotEmpty, IsUrl } from 'class-validator';

export class CreateUrlRequest {
  @IsNotDangerousUrl({ message: 'URL contains a disallowed protocol' })
  @IsUrl(
    { require_protocol: false },
    { message: 'Please provide a valid URL' }
  )
  @IsNotEmpty({ message: 'URL cannot be empty' })
  url!: string;
}
