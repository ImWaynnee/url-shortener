export interface JwtPayload {
  sub: string;
  email: string;
  fullName?: string;
}

export interface JwtUser {
  userId: string;
  email: string;
  fullName?: string;
}