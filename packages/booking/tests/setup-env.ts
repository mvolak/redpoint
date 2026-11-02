process.env.APP_ENV = "test";
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? "postgres://booking:booking_dev_only@localhost:54340/booking_test";
process.env.APP_SECRET = "test-secret-test-secret-test-secret-0123456789";
process.env.APP_URL = "http://localhost:3000";
process.env.AUTH_PROVIDER = "dev";
process.env.EMAIL_PROVIDER = "capture";
