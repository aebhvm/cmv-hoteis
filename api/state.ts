import { neon } from '@neondatabase/serverless';

const APP_STATE_ID = 'cmv-hoteis';

const initialState = {
  currentUnit: 'AeB Villa Mayor',
  user: {
    nome: 'Ataide Silveira',
    email: 'gerenteataide@gmail.com',
    cargo: 'Gestor',
    estabelecimento: 'AeB Villa Mayor',
    metaFCP: 30,
  },
  users: [
    {
      id: 'user-1',
      nome: 'Ataide Silveira',
      email: 'gerenteataide@gmail.com',
      cargo: 'Gestor',
      estabelecimento: 'AeB Villa Mayor',
      metaFCP: 30,
      senha: '123456',
    },
    {
      id: 'user-2',
      nome: 'Carlos Souza',
      email: 'colaborador@vmhoteis.com',
      cargo: 'Colaborador',
      estabelecimento: 'AeB Villa Mayor',
      metaFCP: 30,
      senha: '123456',
    },
  ],
  allInsumos: [],
  allFichas: [],
  allMovimentacoes: [],
  allVendas: [],
};

const getSql = () => {
  const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not configured.');
  }
  return neon(databaseUrl);
};

const ensureSchema = async (sql: ReturnType<typeof neon>) => {
  await sql`
    CREATE TABLE IF NOT EXISTS app_state (
      id text PRIMARY KEY,
      data jsonb NOT NULL,
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `;
};

export default async function handler(req: any, res: any) {
  try {
    const sql = getSql();
    await ensureSchema(sql);

    if (req.method === 'GET') {
      const rows = await sql`SELECT data FROM app_state WHERE id = ${APP_STATE_ID} LIMIT 1`;
      if (rows.length > 0) {
        return res.status(200).json(rows[0].data);
      }

      await sql`
        INSERT INTO app_state (id, data)
        VALUES (${APP_STATE_ID}, ${JSON.stringify(initialState)}::jsonb)
      `;
      return res.status(200).json(initialState);
    }

    if (req.method === 'PUT') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      if (!body || typeof body !== 'object') {
        return res.status(400).json({ error: 'Invalid payload.' });
      }

      await sql`
        INSERT INTO app_state (id, data, updated_at)
        VALUES (${APP_STATE_ID}, ${JSON.stringify(body)}::jsonb, now())
        ON CONFLICT (id)
        DO UPDATE SET data = excluded.data, updated_at = now()
      `;

      return res.status(200).json({ ok: true });
    }

    res.setHeader('Allow', 'GET, PUT');
    return res.status(405).json({ error: 'Method not allowed.' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal error.',
    });
  }
}
