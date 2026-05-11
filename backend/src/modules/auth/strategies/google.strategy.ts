import { AuthService } from '@modules/auth/auth.service';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy } from 'passport-google-oauth20';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    super({
      clientID: configService.get<string>('GOOGLE_OAUTH_CLIENT_ID') ?? '',
      clientSecret: configService.get<string>('GOOGLE_OAUTH_CLIENT_SECRET') ?? '',
      callbackURL: configService.get<string>('GOOGLE_OAUTH_REDIRECT_URI') ?? '',
      scope: ['email', 'profile'],
      state: true,
    });
  }

  // These are google's access/refresh tokens, we're only using profile since
  // we store our own tokens and don't need to call google APIs after login.
  async validate(_accessToken: string, _refreshToken: string, profile: Profile) {
    return this.authService.findOrCreateGoogleUser({
      email: profile.emails?.[0]?.value,
      fullName: profile.displayName,
      providerUserId: profile.id,
    });
  }
}
