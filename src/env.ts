export type Env = {
  DB: import('@cloudflare/workers-types').D1Database;
  RP_ID: string;
  RP_NAME: string;
  RP_ORIGIN: string;
  JWT_SECRET: string;
};
