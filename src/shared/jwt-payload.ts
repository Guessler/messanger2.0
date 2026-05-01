export interface JwtPayload {
  sub: string;
  email?: string;
  username?: string;
  name?: string;
  iat?: number;
  exp?: number;
}
