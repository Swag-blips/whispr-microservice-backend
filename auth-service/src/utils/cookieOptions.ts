export const isProduction = process.env.NODE_ENV === 'production';

export const accessTokenCookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: 'lax' as const,
  maxAge: 15 * 60 * 1000, // 15 minutes in milliseconds
};

export const refreshTokenCookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: 'lax' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
};
