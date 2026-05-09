import { Controller, Get } from '@nestjs/common';

@Controller('ping')
export class PingController {
  @Get()
  ping(): { message: string } {
    return { message: 'Pong!' };
  }
}
