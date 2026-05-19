export default () => ({
  app: {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.APP_PORT || '3001', 10),
    name: process.env.APP_NAME || 'QueuePay',
    url: process.env.APP_URL || 'http://localhost:3001',
    adminUrl: process.env.ADMIN_URL || 'http://localhost:3000',
  },
  database: {
    url: process.env.DATABASE_URL,
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USER || 'queuepay',
    password: process.env.DB_PASSWORD || 'queuepay_secret',
    name: process.env.DB_NAME || 'queuepay_db',
  },
  redis: {
    url: process.env.REDIS_URL, // Upstash cloud (rediss://...)
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || 'queuepay_redis',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret',
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  },
  otp: {
    expiryMinutes: parseInt(process.env.OTP_EXPIRY_MINUTES || '5', 10),
    length: parseInt(process.env.OTP_LENGTH || '6', 10),
  },
  bcrypt: {
    saltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS || '12', 10),
  },
});
