export default function handler(req: any, res: any) {
  res.status(200).json({
    ok: true,
    hasDatabaseUrl: Boolean(process.env.DATABASE_URL || process.env.POSTGRES_URL),
    timestamp: new Date().toISOString(),
  });
}
