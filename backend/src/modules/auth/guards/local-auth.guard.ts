import { LoginRequestBody } from '@modules/auth/dto/login.request.dto';
import { BadRequestException, ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

// Extending so we can throw bad request with the proper message instead of just unauthorized
@Injectable()
export class LocalAuthGuard extends AuthGuard('local') {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{ body: unknown }>();
    const dto = plainToInstance(LoginRequestBody, request.body);
    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true 
    });
    if (errors.length > 0) {
      throw new BadRequestException('Validation failed');
    }
    return super.canActivate(context) as Promise<boolean>;
  }
}
