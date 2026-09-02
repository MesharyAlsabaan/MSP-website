/** Centralised, typed application configuration loaded from environment vars. */

const isProduction = (process.env.NODE_ENV ?? 'development') === 'production';

/**
 * A secret that must never fall back to a value shipped in the repo. In
 * development it takes the given default so the app runs out of the box; in
 * production a missing value STOPS the boot, rather than silently running on a
 * constant that anyone can read here and use to sign tokens or sign in.
 */
function secret(name: string, devDefault: string): string {
  const value = process.env[name];
  if (value) return value;
  if (isProduction) {
    throw new Error(
      `${name} is required in production — set it in the deployment environment.`,
    );
  }
  return devDefault;
}

export default () => ({
  env: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '3000', 10),
  apiPrefix: process.env.API_PREFIX ?? 'api',
  corsOrigin: (process.env.CORS_ORIGIN ?? 'http://localhost:4200')
    .split(',')
    .map((o) => o.trim()),
  database: {
    host: process.env.DB_HOST ?? 'localhost',
    port: parseInt(process.env.DB_PORT ?? '5432', 10),
    username: process.env.DB_USERNAME ?? 'msp',
    password: secret('DB_PASSWORD', 'msp_password'),
    name: process.env.DB_NAME ?? 'msp_db',
    synchronize: (process.env.DB_SYNCHRONIZE ?? 'true') === 'true',
  },
  jwt: {
    // Sign both tokens with a per-deployment secret. The old fallback let
    // anyone reading the repo forge a valid admin token without a password.
    secret: secret('JWT_SECRET', 'dev-secret-change-me'),
    expiresIn: process.env.JWT_EXPIRES_IN ?? '15m',
    refreshSecret: secret('JWT_REFRESH_SECRET', 'dev-refresh-secret-change-me'),
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
  },
  seed: {
    adminEmail: process.env.SEED_ADMIN_EMAIL ?? 'admin@msp.sa',
    // The first admin's password. Never a real one in the repo — production
    // must supply its own, and it should be rotated in the app after seeding.
    adminPassword: secret('SEED_ADMIN_PASSWORD', 'dev-only-change-me'),
  },
  upload: {
    dir: process.env.UPLOAD_DIR ?? 'uploads',
    maxMb: parseInt(process.env.MAX_UPLOAD_MB ?? '5', 10),
  },
});
