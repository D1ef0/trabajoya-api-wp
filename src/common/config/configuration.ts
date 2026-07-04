export default () => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  databaseUrl: process.env.DATABASE_URL,
  redis: {
    host: process.env.REDIS_HOST ?? 'localhost',
    port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
  },
  zavu: {
    apiKey: process.env.ZAVUDEV_API_KEY,
    webhookSecret: process.env.ZAVU_WEBHOOK_SECRET,
    skipSignatureVerification:
      process.env.ZAVU_SKIP_SIGNATURE_VERIFICATION === 'true',
  },
  auth: {
    jwtSecret: process.env.JWT_SECRET ?? 'dev-secret-change-me',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  },
  trabajoya: {
    baseUrl:
      process.env.TRABAJOYA_API_BASE_URL ??
      'https://trabajoya.rivasystems.dev',
    intakeApiKey: process.env.TRABAJOYA_INTAKE_API_KEY,
  },
});
