import { neon } from '@neondatabase/serverless';

const APP_STATE_ID = 'cmv-hoteis';
const MAX_BODY_BYTES = 2_000_000;
const MAX_COLLECTION_ITEMS = 20_000;

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
  allUtensilios: [],
  allMovimentacoesUtensilios: [],
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
  await sql`
    CREATE OR REPLACE FUNCTION cmv_merge_json_collection(current_items jsonb, collection_patch jsonb)
    RETURNS jsonb LANGUAGE plpgsql IMMUTABLE AS $function$
    DECLARE
      item jsonb;
      replacement jsonb;
      item_key text;
      result jsonb := '[]'::jsonb;
    BEGIN
      FOR item IN SELECT value FROM jsonb_array_elements(COALESCE(current_items, '[]'::jsonb)) LOOP
        item_key := COALESCE(NULLIF(item->>'id', ''), NULLIF(item->>'email', ''), '');
        replacement := NULL;
        SELECT candidate INTO replacement
        FROM jsonb_array_elements(COALESCE(collection_patch->'upserts', '[]'::jsonb)) AS candidate
        WHERE COALESCE(NULLIF(candidate->>'id', ''), NULLIF(candidate->>'email', ''), '') = item_key
        LIMIT 1;
        IF NOT EXISTS (
          SELECT 1 FROM jsonb_array_elements(COALESCE(collection_patch->'deleted', '[]'::jsonb)) AS deleted_item
          WHERE deleted_item #>> '{}' = item_key
        ) THEN
          result := result || jsonb_build_array(COALESCE(replacement, item));
        END IF;
      END LOOP;
      FOR item IN SELECT value FROM jsonb_array_elements(COALESCE(collection_patch->'upserts', '[]'::jsonb)) LOOP
        item_key := COALESCE(NULLIF(item->>'id', ''), NULLIF(item->>'email', ''), '');
        IF item_key <> '' AND NOT EXISTS (
          SELECT 1 FROM jsonb_array_elements(COALESCE(current_items, '[]'::jsonb)) AS existing_item
          WHERE COALESCE(NULLIF(existing_item->>'id', ''), NULLIF(existing_item->>'email', ''), '') = item_key
        ) THEN
          result := result || jsonb_build_array(item);
        END IF;
      END LOOP;
      RETURN result;
    END;
    $function$`;

  await sql`
    CREATE OR REPLACE FUNCTION cmv_apply_state_patch(current_state jsonb, state_patch jsonb)
    RETURNS jsonb LANGUAGE plpgsql IMMUTABLE AS $function$
    DECLARE
      next_state jsonb := COALESCE(current_state, '{}'::jsonb);
      collection_key text;
    BEGIN
      IF state_patch ? 'currentUnit' THEN
        next_state := jsonb_set(next_state, '{currentUnit}', state_patch->'currentUnit', true);
      END IF;
      IF state_patch ? 'user' THEN
        next_state := jsonb_set(next_state, '{user}', state_patch->'user', true);
      END IF;
      FOREACH collection_key IN ARRAY ARRAY['users', 'allInsumos', 'allFichas', 'allMovimentacoes', 'allVendas', 'allUtensilios', 'allMovimentacoesUtensilios'] LOOP
        IF state_patch ? collection_key THEN
          next_state := jsonb_set(next_state, ARRAY[collection_key], cmv_merge_json_collection(next_state->collection_key, state_patch->collection_key), true);
        END IF;
      END LOOP;
      RETURN next_state;
    END;
    $function$`;
};

let schemaReady: Promise<void> | null = null;

const ensureSchemaOnce = (sql: ReturnType<typeof neon>) => {
  if (!schemaReady) {
    schemaReady = ensureSchema(sql).catch(error => {
      schemaReady = null;
      throw error;
    });
  }
  return schemaReady;
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

const collectionKeys = ['users', 'allInsumos', 'allFichas', 'allMovimentacoes', 'allVendas', 'allUtensilios', 'allMovimentacoesUtensilios'] as const;

const isPlainObject = (value: unknown): value is Record<string, any> => (
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)
);

const isValidCollectionPatch = (value: unknown) => {
  if (!isPlainObject(value)) return false;
  if (Object.keys(value).some(key => key !== 'upserts' && key !== 'deleted')) return false;
  if (value.upserts !== undefined && !Array.isArray(value.upserts)) return false;
  if (value.deleted !== undefined && !Array.isArray(value.deleted)) return false;
  const upserts = value.upserts || [];
  const deleted = value.deleted || [];
  return upserts.length <= MAX_COLLECTION_ITEMS
    && deleted.length <= MAX_COLLECTION_ITEMS
    && upserts.every(isPlainObject)
    && deleted.every(item => typeof item === 'string' && item.length <= 200);
};

const isValidPatch = (value: unknown) => {
  if (!isPlainObject(value)) return false;
  const allowedKeys = new Set(['currentUnit', 'user', ...collectionKeys]);
  if (Object.keys(value).some(key => !allowedKeys.has(key))) return false;
  if (value.currentUnit !== undefined && value.currentUnit !== 'AeB Villa Mayor' && value.currentUnit !== 'VM Cumbuco') return false;
  if (value.user !== undefined && !isPlainObject(value.user)) return false;
  return collectionKeys.every(key => value[key] === undefined || isValidCollectionPatch(value[key]));
};

const getEntityKey = (item: any) => String(item?.id || item?.email || '');

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
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  try {
    const sql = getSql();
    await ensureSchemaOnce(sql);

    if (req.method === 'GET') {
      const requestUrl = new URL(req.url || '/', `http://${req.headers?.host || 'localhost'}`);
      if (requestUrl.searchParams.get('meta') === '1') {
        const rows = await sql`SELECT revision FROM app_state WHERE id = ${APP_STATE_ID} LIMIT 1`;
        return res.status(200).json({
          _revision: rows.length > 0 ? String(rows[0].revision) : '0'
        });
      }

      const rows = await sql`SELECT data, revision FROM app_state WHERE id = ${APP_STATE_ID} LIMIT 1`;
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
      const body = readJsonBody(req);
      if (!body?.patch || !isValidPatch(body.patch)) {
        return res.status(400).json({ error: 'Invalid patch.' });
      }

      for (let attempt = 0; attempt < 3; attempt += 1) {
        if (body.revision === undefined) {
          const conflictRows = await sql`SELECT data, revision FROM app_state WHERE id = ${APP_STATE_ID} LIMIT 1`;
          if (conflictRows.length === 0) {
            await sql`
              INSERT INTO app_state (id, data)
              VALUES (${APP_STATE_ID}, ${JSON.stringify(initialState)}::jsonb)
              ON CONFLICT (id) DO NOTHING
            `;
            continue;
          }
          return res.status(409).json({
            error: 'State conflict.',
            state: { ...normalizeState(conflictRows[0].data), _revision: String(conflictRows[0].revision) }
          });
        }

        const patchJson = JSON.stringify(body.patch);
        const saved = await sql`
          UPDATE app_state
          SET data = cmv_apply_state_patch(app_state.data, ${patchJson}::jsonb), updated_at = now(), revision = revision + 1
          WHERE id = ${APP_STATE_ID} AND revision = ${String(body.revision)}::bigint
          RETURNING revision
        `;

        if (saved.length > 0) {
          const savedRevision = String(saved[0].revision);
          if (body.returnState === true) {
            const stateRows = await sql`SELECT data FROM app_state WHERE id = ${APP_STATE_ID} LIMIT 1`;
            return res.status(200).json({
              ok: true,
              state: { ...normalizeState(stateRows[0]?.data || initialState), _revision: savedRevision }
            });
          }
          return res.status(200).json({ ok: true, _revision: savedRevision });
        }

        const conflictRows = await sql`SELECT data, revision FROM app_state WHERE id = ${APP_STATE_ID} LIMIT 1`;
        if (conflictRows.length === 0) {
          await sql`
            INSERT INTO app_state (id, data)
            VALUES (${APP_STATE_ID}, ${JSON.stringify(initialState)}::jsonb)
            ON CONFLICT (id) DO NOTHING
          `;
          continue;
        }
        return res.status(409).json({
          error: 'State conflict.',
          state: { ...normalizeState(conflictRows[0].data), _revision: String(conflictRows[0].revision) }
        });
      }

      return res.status(409).json({ error: 'Unable to apply changes. Please retry.' });
    }

    if (req.method === 'PUT') {
      const body = readJsonBody(req);
      if (!body || typeof body !== 'object') {
        return res.status(400).json({ error: 'Invalid payload.' });
      }

      const { _revision: revision, ...state } = body;
      const normalized = normalizeState(state);
      const current = await sql`SELECT data, revision FROM app_state WHERE id = ${APP_STATE_ID} LIMIT 1`;

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
        RETURNING revision
      `;

      return res.status(200).json({ ok: true, _revision: String(saved[0].revision) });
    }

    res.setHeader('Allow', 'GET, PUT, PATCH');
    return res.status(405).json({ error: 'Method not allowed.' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: 'Internal server error.',
    });
  }
}
