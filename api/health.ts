export default function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.status(200).json({
    ok: true,
    timestamp: new Date().toISOString(),
  });
}
