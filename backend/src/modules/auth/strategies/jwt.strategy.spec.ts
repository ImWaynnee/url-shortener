import { JwtPayload, JwtStrategy } from '@modules/auth/strategies/jwt.strategy';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

// passport-jwt requires a real JWT_SECRET at construction time via configService.getOrThrow
describe('JwtStrategy', () => {
  let strategy: JwtStrategy;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn().mockReturnValue('test-secret'),
          },
        },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('validate()', () => {
    it('maps sub to userId and preserves email', () => {
      const payload: JwtPayload = {
        sub: 'user-uuid',
        email: 'alice@example.com',
        fullName: 'Alice', 
      };
      const result = strategy.validate(payload);
      expect(result).toEqual({
        userId: 'user-uuid',
        email: 'alice@example.com',
        fullName: 'Alice',
      });
    });
  });
});
