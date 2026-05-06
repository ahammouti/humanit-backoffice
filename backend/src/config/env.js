import 'dotenv/config';

const required = (key) => {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required env var: ${key}`);
  return val;
};

const optional = (key, fallback = '') => process.env[key] ?? fallback;

export const env = {
  port: parseInt(optional('PORT', '3001'), 10),
  nodeEnv: optional('NODE_ENV', 'development'),
  databaseUrl: required('DATABASE_URL'),
  jwt: {
    secret: required('JWT_SECRET'),
    expiresIn: optional('JWT_EXPIRES_IN', '7d'),
  },
  helloasso: {
    clientId: optional('HELLOASSO_CLIENT_ID'),
    clientSecret: optional('HELLOASSO_CLIENT_SECRET'),
    orgSlug: optional('HELLOASSO_ORG_SLUG'),
    webhookSecret: optional('HELLOASSO_WEBHOOK_SECRET'),
    enabled: !!(process.env.HELLOASSO_CLIENT_ID && process.env.HELLOASSO_CLIENT_SECRET),
  },
  remitly: {
    apiKey: optional('REMITLY_API_KEY'),
    enabled: !!process.env.REMITLY_API_KEY,
  },
};
