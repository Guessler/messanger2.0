import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy as GoogleStrategyBase } from 'passport-google-oauth20';

export interface OAuthProfile {
  email: string;
  name?: string;
  avatar?: string;
  provider: string;
  providerId: string;
}

type GoogleProfile = {
  id: string;
  displayName?: string;
  emails?: Array<{ value?: string }>;
  photos?: Array<{ value?: string }>;
};

type GoogleStrategyOptions = ConstructorParameters<
  typeof GoogleStrategyBase
>[0];

function getEmail(profile: GoogleProfile): string | undefined {
  return profile.emails?.[0]?.value;
}

function getAvatar(profile: GoogleProfile): string | undefined {
  return profile.photos?.[0]?.value;
}

function getName(profile: GoogleProfile): string | undefined {
  return profile.displayName;
}

@Injectable()
export class GoogleStrategy extends PassportStrategy(
  GoogleStrategyBase,
  'google',
) {
  constructor() {
    const clientID = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientID || !clientSecret) {
      throw new Error('Google OAuth env variables are missing');
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    super({
      clientID,
      clientSecret,
      callbackURL: 'http://localhost:3000/auth/google/callback',
      scope: ['email', 'profile'],
    } as GoogleStrategyOptions);
  }

  validate(
    _accessToken: string,
    _refreshToken: string,
    profile: GoogleProfile,
  ): OAuthProfile {
    const email = getEmail(profile);

    if (!email) {
      throw new UnauthorizedException('Google account has no email');
    }

    return {
      email,
      name: getName(profile),
      avatar: getAvatar(profile),
      provider: 'google',
      providerId: profile.id,
    };
  }
}
