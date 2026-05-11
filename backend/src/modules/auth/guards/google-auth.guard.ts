import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// Initiates the Google OAuth redirect flow.
@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {}

// Handles the Google OAuth callback after Google redirects back.
// Passport session is used only to verify the OAuth state (CSRF protection);
// the session is not used for API authentication — all API auth is JWT-based.
@Injectable()
export class GoogleCallbackGuard extends AuthGuard('google') {}
