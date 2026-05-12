import { JwtAuthGuard } from '@guards/jwt-auth.guard';
import { AuthService } from '@modules/auth/auth.service';
import { LoginRequestBody } from '@modules/auth/dto/login.request.dto';
import { RefreshRequestBody } from '@modules/auth/dto/refresh.request.dto';
import { RegisterRequestBody } from '@modules/auth/dto/register.request.dto';
import { GoogleAuthGuard, GoogleCallbackGuard } from '@modules/auth/guards/google-auth.guard';
import { GoogleOAuthEnabledGuard } from '@modules/auth/guards/google-oauth-enabled.guard';
import { JwtUser } from '@modules/auth/strategies/jwt.strategy';
import { Body, Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';
import { extractClientInfo } from '@src/common/utils/extract-client-info';
import type { UserModel } from '@src/generated/prisma/models/User';
import type { Request, Response } from 'express';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Post('register')
  register(@Req() req: Request, @Body() registrationData: RegisterRequestBody) {
    return this.authService.register(registrationData, extractClientInfo(req));
  }

  @UseGuards(AuthGuard('local'))
  @Post('login')
  login(@Req() req: Request, @Body() _loginData: LoginRequestBody) {
    return this.authService.login(req.user as UserModel, extractClientInfo(req));
  }

  @Post('refresh')
  refresh(@Req() req: Request, @Body() refreshData: RefreshRequestBody) {
    return this.authService.refreshTokens(refreshData.refreshToken, extractClientInfo(req));
  }

  @UseGuards(GoogleOAuthEnabledGuard, GoogleAuthGuard)
  @Get('google')
  googleAuth() {
    // Guard handles the redirect to Google
  }

  @UseGuards(GoogleOAuthEnabledGuard, GoogleCallbackGuard)
  @Get('google/callback')
  async googleCallback(@Req() req: Request, @Res() res: Response) {
    const { accessToken, refreshToken } = await this.authService.loginWithGoogle(
      req.user as UserModel,
      extractClientInfo(req),
    );
    const frontendUrl = this.configService.getOrThrow<string>('FRONTEND_URL');
    return res.redirect(`${frontendUrl}/auth/callback?access_token=${accessToken}&refresh_token=${refreshToken}`);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Req() req: Request) {
    return req.user as JwtUser;
  }
}
