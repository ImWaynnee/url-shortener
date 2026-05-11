import { PingController } from '@modules/ping/ping.controller';
import { Test, TestingModule } from '@nestjs/testing';

describe('PingController', () => {
  let controller: PingController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PingController],
    }).compile();

    controller = module.get<PingController>(PingController);
  });

  describe('GET /ping', () => {
    it('should return { message: "pong!" }', () => {
      expect(controller.ping()).toEqual({ message: 'pong!' });
    });
  });
});
