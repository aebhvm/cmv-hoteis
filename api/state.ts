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
      updated_at timestamptz NOT NULL DEFAULT now(),
      revision bigint NOT NULL DEFAULT 0
    )
  `;
  await sql`ALTER TABLE app_state ADD COLUMN IF NOT EXISTS revision bigint NOT NULL DEFAULT 0`;
};

const dedupeInsumosById = (items: any[]) => {
  const seen = new Set<string>();
  return items.filter(item => {
    if (!item?.id) return true;
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
};

const normalizeState = (state: any) => {
  if (!state || typeof state !== 'object') return state;
  if (!Array.isArray(state.allInsumos)) return state;
  return {
    ...state,
    allInsumos: dedupeInsumosById(state.allInsumos),
  };
};

const collectionKeys = ['users', 'allInsumos', 'allFichas', 'allMovimentacoes', 'allVendas'] as const;

const getEntityKey = (item: any) => String(item?.id || item?.email || '');

const mergeCollection = (current: any[], patch: any) => {
  const deleted = new Set<string>(Array.isArray(patch?.deleted) ? patch.deleted : []);
  const upserts = Array.isArray(patch?.upserts) ? patch.upserts : [];
  const upsertsByKey = new Map(upserts.map((item: any) => [getEntityKey(item), item]));
  const merged = current
    .filter(item => !deleted.has(getEntityKey(item)))
    .map(item => upsertsByKey.get(getEntityKey(item)) || item);

  upserts.forEach((item: any) => {
    const key = getEntityKey(item);
    if (key && !current.some(existing => getEntityKey(existing) === key)) merged.push(item);
  });

  return merged;
};

const applyPatch = (currentState: any, patch: any) => {
  const nextState = { ...currentState };

  if (patch.currentUnit !== undefined) nextState.currentUnit = patch.currentUnit;
  if (patch.user !== undefined) nextState.user = patch.user;

  collectionKeys.forEach(key => {
    if (patch[key]) nextState[key] = mergeCollection(Array.isArray(currentState[key]) ? currentState[key] : [], patch[key]);
  });

  return nextState;
};

export default async function handler(req: any, res: any) {
  try {
    const sql = getSql();
    await ensureSchema(sql);

    if (req.method === 'GET') {
      const rows = await sql`SELECT data, updated_at, revision FROM app_state WHERE id = ${APP_STATE_ID} LIMIT 1`;
      if (rows.length > 0) {
        const normalized = normalizeState(rows[0].data);
        let revision = rows[0].revision;
        if (JSON.stringify(normalized.allInsumos || []) !== JSON.stringify(rows[0].data.allInsumos || [])) {
          const saved = await sql`
            UPDATE app_state
            SET data = ${JSON.stringify(normalized)}::jsonb, updated_at = now(), revision = revision + 1
            WHERE id = ${APP_STATE_ID}
            RETURNING revision
          `;
          revision = saved[0].revision;
        }
        return res.status(200).json({ ...normalized, _revision: String(revision) });
      }

      await sql`
        INSERT INTO app_state (id, data)
        VALUES (${APP_STATE_ID}, ${JSON.stringify(initialState)}::jsonb)
      `;
      return res.status(200).json({ ...initialState, _revision: '0' });
    }

    if (req.method === 'PATCH') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      if (!body?.patch || typeof body.patch !== 'object') {
        return res.status(400).json({ error: 'Invalid patch.' });
      }

      for (let attempt = 0; attempt < 3; attempt += 1) {
        const current = await sql`SELECT data, updated_at, revision FROM app_state WHERE id = ${APP_STATE_ID} LIMIT 1`;
        if (current.length === 0) {
          await sql`
            INSERT INTO app_state (id, data)
            VALUES (${APP_STATE_ID}, ${JSON.stringify(initialState)}::jsonb)
            ON CONFLICT (id) DO NOTHING
          `;
          continue;
        }

        const nextState = normalizeState(applyPatch(current[0].data, body.patch));
        const saved = await sql`
          UPDATE app_state
          SET data = ${JSON.stringify(nextState)}::jsonb, updated_at = now(), revision = revision + 1
          WHERE id = ${APP_STATE_ID} AND revision = ${current[0].revision}
          RETURNING data, updated_at, revision
        `;

        if (saved.length > 0) {
          return res.status(200).json({
            ok: true,
            state: { ...normalizeState(saved[0].data), _revision: String(saved[0].revision) }
          });
        }
      }

      return res.status(409).json({ error: 'Unable to apply changes. Please retry.' });
    }

    if (req.method === 'PUT') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      if (!body || typeof body !== 'object') {
        return res.status(400).json({ error: 'Invalid payload.' });
      }

      const { _revision: revision, ...state } = body;
      const normalized = normalizeState(state);
      const current = await sql`SELECT data, updated_at, revision FROM app_state WHERE id = ${APP_STATE_ID} LIMIT 1`;

      if (current.length > 0 && (!revision || revision !== String(current[0].revision))) {
        return res.status(409).json({
          error: 'State conflict.',
          state: { ...normalizeState(current[0].data), _revision: String(current[0].revision) }
        });
      }

      const saved = await sql`
        INSERT INTO app_state (id, data, updated_at)
        VALUES (${APP_STATE_ID}, ${JSON.stringify(normalized)}::jsonb, now())
        ON CONFLICT (id)
        DO UPDATE SET data = excluded.data, updated_at = now(), revision = app_state.revision + 1
        RETURNING updated_at, revision
      `;

      return res.status(200).json({ ok: true, _revision: String(saved[0].revision) });
    }

    res.setHeader('Allow', 'GET, PUT, PATCH');
    return res.status(405).json({ error: 'Method not allowed.' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal error.',
    });
  }
}
