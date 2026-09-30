import { neon } from '@neondatabase/serverless';

const APP_STATE_ID = 'cmv-hoteis';
const MAX_BODY_BYTES = 4_096;

const getSql = () => {
  const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL is not configured.');
  return neon(databaseUrl);
};

const readJsonBody = (req: any) => {
  const contentLength = Number(req.headers?.['content-length'] || 0);
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) return null;
  if (typeof req.body !== 'string') return req.body;
  if (req.body.length > MAX_BODY_BYTES) return null;
  try {
    return JSON.parse(req.body);
  } catch {
    return null;
  }
};

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const body = readJsonBody(req);
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body?.password === 'string' ? body.password : '';
  if (!email || !password || email.length > 254 || password.length > 200) {
    return res.status(400).json({ error: 'Credenciais inválidas.' });
  }

  try {
    const sql = getSql();
    const rows = await sql`
      SELECT user_record.value AS user_data
      FROM app_state
      CROSS JOIN LATERAL jsonb_array_elements(
        CASE
          WHEN jsonb_typeof(data->'users') = 'array' THEN data->'users'
          ELSE '[]'::jsonb
        END
      ) AS user_record(value)
      WHERE id = ${APP_STATE_ID}
        AND lower(trim(user_record.value->>'email')) = ${email}
        AND user_record.value->>'senha' = ${password}
      LIMIT 1
    `;

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Usuário ou senha inválidos.' });
    }

    const user = rows[0].user_data || {};
    return res.status(200).json({
      user: {
        id: typeof user.id === 'string' ? user.id : undefined,
        nome: String(user.nome || ''),
        email: String(user.email || ''),
        cargo: user.cargo === 'Colaborador' ? 'Colaborador' : 'Gestor',
        estabelecimento: user.estabelecimento === 'VM Cumbuco' ? 'VM Cumbuco' : 'AeB Villa Mayor',
        metaFCP: Number(user.metaFCP) || 30,
      },
    });
  } catch (error) {
    console.error('Unable to authenticate user.', error);
    return res.status(500).json({ error: 'Não foi possível validar o acesso agora.' });
  }
}
