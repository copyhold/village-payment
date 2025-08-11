export type Env = {
  DB: import('@cloudflare/workers-types').D1Database;
  DBJOURNAL: import('@cloudflare/workers-types').D1Database;
  RP_ID: string;
  RP_NAME: string;
  RP_ORIGIN: string;
  JWT_SECRET: string;
  VAPID_PUBLIC_KEY: string;
  VAPID_PRIVATE_KEY: string;
  VAPID_SUBJECT: string;
  FAMILIES_KV: import('@cloudflare/workers-types').KVNamespace;
  PENDING_KV: import('@cloudflare/workers-types').KVNamespace;
  VENDORS_KV: import('@cloudflare/workers-types').KVNamespace;
  AUTO_APPROVAL_QUEUE: import('@cloudflare/workers-types').Queue;
};
