interface Env {
  DB: D1Database;
  STATE: KVNamespace;
  ASANA_CLIENT_ID: string;
  ASANA_CLIENT_SECRET: string;
  ASANA_WORKSPACE_ID?: string;
  ASANA_REDIRECT_BASE?: string;
  ASANA_AUTH_URL?: string;
  ASANA_TOKEN_URL?: string;
}

type JsonBody = Record<string, unknown> | unknown[] | null;

type TaskStatus = 'incomplete' | 'complete' | 'blocked' | 'in_review' | 'unknown';

interface StoredTokenRow {
  access_token: string;
  refresh_token: string;
  expires_at: string;
}

interface OAuthStatePayload {
  nonce: string;
  redirectUri: string;
}

interface TaskRow {
  id: string;
  name: string;
  project: string;
  section: string;
  assignee: string | null;
  due_on: string | null;
  status: string;
  last_updated: string;
}

interface NoteRow {
  id: string;
  task_id: string;
  content: string;
  updated_at: string;
}

interface ActivityRow {
  id: string;
  task_id: string | null;
  type: string;
  description: string;
  actor: string | null;
  occurred_at: string;
}

interface TabRow {
  id: string;
  label: string;
  project: string;
  section: string | null;
}

interface AsanaTaskPayload {
  gid: string;
  name: string;
  completed: boolean;
  due_on?: string | null;
  modified_at?: string | null;
  assignee?: { name?: string | null } | null;
  memberships?: Array<{
    project?: { name?: string | null } | null;
    section?: { name?: string | null } | null;
  }>;
}

interface AsanaTasksEnvelope {
  data: AsanaTaskPayload[];
}

interface AsanaTokenEnvelope {
  data?: {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
}

interface AsanaUserEnvelope {
  data: {
    gid: string;
    name: string;
    email: string;
    photo?: {
      image_1024x1024?: string | null;
      image_128x128?: string | null;
    } | null;
  };
}

const JSON_HEADERS = { 'content-type': 'application/json; charset=utf-8' } as const;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      const url = new URL(request.url);
      const pathname = normalizePath(url.pathname);
      const method = request.method.toUpperCase();

      if (method === 'GET' && pathname === '/api/health') {
        return jsonResponse({ status: 'ok' });
      }

      if (method === 'GET' && pathname === '/api/auth/asana/start') {
        return handleOAuthStart(url, env);
      }

      if (method === 'GET' && pathname === '/api/auth/asana/callback') {
        return await handleOAuthCallback(url, env);
      }

      if (method === 'GET' && pathname === '/api/journal/tasks') {
        return await handleTasks(env);
      }

      if (method === 'GET' && pathname === '/api/journal/activity') {
        return await handleActivity(env);
      }

      if (method === 'GET' && pathname === '/api/journal/tabs') {
        return await handleTabs(env);
      }

      if (method === 'POST' && pathname === '/api/journal/notes') {
        return await handleCreateNote(request, env);
      }

      if (method === 'POST' && pathname === '/api/journal/sync') {
        return await handleSync(env);
      }

      return jsonResponse({ error: 'not_found' }, { status: 404 });
    } catch (error) {
      console.error('Worker failed to process request', error);
      return jsonResponse({ error: 'internal_error' }, { status: 500 });
    }
  }
};

function normalizePath(path: string): string {
  if (path.endsWith('/') && path !== '/') {
    return path.slice(0, -1);
  }
  return path;
}

function jsonResponse(body: JsonBody, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers ?? {});
  if (!headers.has('content-type')) {
    headers.set('content-type', JSON_HEADERS['content-type']);
  }
  const status = init.status ?? 200;
  return new Response(body !== null ? JSON.stringify(body) : null, { ...init, status, headers });
}

async function handleOAuthStart(url: URL, env: Env): Promise<Response> {
  const redirectUri = url.searchParams.get('redirect_uri')?.trim();
  if (!redirectUri) {
    return jsonResponse({ error: 'missing_redirect_uri' }, { status: 400 });
  }

  if (env.ASANA_REDIRECT_BASE && !redirectUri.startsWith(env.ASANA_REDIRECT_BASE)) {
    return jsonResponse({ error: 'invalid_redirect_uri' }, { status: 400 });
  }

  const nonce = crypto.randomUUID().replace(/-/g, '');
  const statePayload: OAuthStatePayload = { nonce, redirectUri };
  await env.STATE.put(stateCacheKey(nonce), JSON.stringify(statePayload), { expirationTtl: 600 });

  const authorizationUrl = new URL(env.ASANA_AUTH_URL || 'https://app.asana.com/-/oauth_authorize');
  authorizationUrl.searchParams.set('response_type', 'code');
  authorizationUrl.searchParams.set('client_id', requireEnv(env.ASANA_CLIENT_ID, 'ASANA_CLIENT_ID'));
  authorizationUrl.searchParams.set('redirect_uri', redirectUri);
  authorizationUrl.searchParams.set('state', encodeState(statePayload));

  return Response.redirect(authorizationUrl.toString(), 302);
}

async function handleOAuthCallback(url: URL, env: Env): Promise<Response> {
  const code = url.searchParams.get('code')?.trim();
  const stateParam = url.searchParams.get('state')?.trim();

  if (!code) {
    return jsonResponse({ error: 'missing_code' }, { status: 400 });
  }

  if (!stateParam) {
    return jsonResponse({ error: 'missing_state' }, { status: 400 });
  }

  let decodedState: OAuthStatePayload;
  try {
    decodedState = decodeState(stateParam);
  } catch (error) {
    console.warn('Failed to decode OAuth state', error);
    return jsonResponse({ error: 'invalid_state' }, { status: 400 });
  }

  const cachedState = await env.STATE.get<OAuthStatePayload>(stateCacheKey(decodedState.nonce), { type: 'json' });
  if (!cachedState) {
    return jsonResponse({ error: 'state_not_found' }, { status: 400 });
  }
  await env.STATE.delete(stateCacheKey(decodedState.nonce));

  const tokenEnvelope = await exchangeAuthorizationCode(code, cachedState.redirectUri, env);
  const tokenData = extractTokenPayload(tokenEnvelope);

  const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();
  await env.DB.prepare(
    `INSERT INTO oauth_tokens (id, access_token, refresh_token, expires_at)
     VALUES (1, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       access_token = excluded.access_token,
       refresh_token = excluded.refresh_token,
       expires_at = excluded.expires_at`
  )
    .bind(tokenData.access_token, tokenData.refresh_token, expiresAt)
    .run();

  const userEnvelope = await fetchCurrentUser(tokenData.access_token);
  const user = userEnvelope.data;
  const avatar = user.photo?.image_1024x1024 || user.photo?.image_128x128 || undefined;

  return jsonResponse({
    user: {
      id: user.gid,
      name: user.name,
      email: user.email,
      avatarUrl: avatar
    },
    accessToken: tokenData.access_token
  });
}

async function handleTasks(env: Env): Promise<Response> {
  const taskResult = await env.DB.prepare(
    `SELECT id, name, project, section, assignee, due_on, status, last_updated
     FROM tasks
     ORDER BY last_updated DESC`
  ).all<TaskRow>();

  const taskRows = (taskResult.results ?? []) as TaskRow[];
  if (taskRows.length === 0) {
    return jsonResponse({ tasks: [] });
  }

  const taskIds = taskRows.map((row) => row.id);
  const placeholders = taskIds.map(() => '?').join(',');
  const notesResult = await env.DB.prepare(
    `SELECT id, task_id, content, updated_at
     FROM notes
     WHERE task_id IN (${placeholders})
     ORDER BY updated_at DESC`
  )
    .bind(...taskIds)
    .all<NoteRow>();

  const notesByTask = new Map<string, Array<{ id: string; taskId: string; content: string; updatedAt: string }>>();
  for (const row of (notesResult.results ?? []) as NoteRow[]) {
    const note = {
      id: row.id,
      taskId: row.task_id,
      content: row.content,
      updatedAt: row.updated_at
    };
    const existing = notesByTask.get(row.task_id);
    if (existing) {
      existing.push(note);
    } else {
      notesByTask.set(row.task_id, [note]);
    }
  }

  const tasks = taskRows.map((row) => ({
    id: row.id,
    name: row.name,
    metadata: {
      project: row.project,
      section: row.section,
      assignee: row.assignee ?? undefined,
      dueDate: row.due_on ?? undefined,
      status: (row.status ?? 'unknown') as TaskStatus
    },
    notes: notesByTask.get(row.id) ?? [],
    lastUpdated: row.last_updated
  }));

  return jsonResponse({ tasks });
}

async function handleActivity(env: Env): Promise<Response> {
  const activityResult = await env.DB.prepare(
    `SELECT id, task_id, type, description, actor, occurred_at
     FROM activity_events
     ORDER BY occurred_at DESC
     LIMIT 100`
  ).all<ActivityRow>();

  const events = ((activityResult.results ?? []) as ActivityRow[]).map((row) => ({
    id: row.id,
    taskId: row.task_id ?? undefined,
    type: row.type,
    description: row.description,
    actor: row.actor ?? undefined,
    occurredAt: row.occurred_at
  }));

  return jsonResponse({ events });
}

async function handleTabs(env: Env): Promise<Response> {
  const tabsResult = await env.DB.prepare(
    `SELECT id, label, project, section
     FROM tabs
     ORDER BY sort_order, label`
  ).all<TabRow>();

  const tabs = ((tabsResult.results ?? []) as TabRow[]).map((row) => ({
    id: row.id,
    label: row.label,
    project: row.project,
    section: row.section ?? undefined
  }));

  return jsonResponse({ tabs });
}

async function handleCreateNote(request: Request, env: Env): Promise<Response> {
  let payload: { taskId?: string; content?: string };
  try {
    payload = (await request.json()) as { taskId?: string; content?: string };
  } catch {
    return jsonResponse({ error: 'invalid_json' }, { status: 400 });
  }

  const taskId = payload.taskId?.trim();
  const content = payload.content?.trim();
  if (!taskId || !content) {
    return jsonResponse({ error: 'invalid_note' }, { status: 400 });
  }

  const id = crypto.randomUUID().replace(/-/g, '');
  const updatedAt = new Date().toISOString();

  await env.DB.prepare(
    `INSERT INTO notes (id, task_id, content, updated_at)
     VALUES (?, ?, ?, ?)`
  )
    .bind(id, taskId, content, updatedAt)
    .run();

  return jsonResponse({ id, taskId, content, updatedAt }, { status: 201 });
}

async function handleSync(env: Env): Promise<Response> {
  const tokenRow = await env.DB.prepare(
    `SELECT access_token, refresh_token, expires_at
     FROM oauth_tokens
     WHERE id = 1`
  ).first<StoredTokenRow>();

  if (!tokenRow) {
    return jsonResponse({ error: 'missing_token' }, { status: 400 });
  }

  const expiresAt = Date.parse(tokenRow.expires_at);
  if (Number.isNaN(expiresAt) || expiresAt <= Date.now()) {
    return jsonResponse({ error: 'token_expired' }, { status: 401 });
  }

  const workspace = env.ASANA_WORKSPACE_ID?.trim();
  const query = new URLSearchParams({
    assignee: 'me',
    completed_since: 'now',
    opt_fields: [
      'gid',
      'name',
      'completed',
      'due_on',
      'modified_at',
      'assignee.name',
      'memberships.section.name',
      'memberships.project.name'
    ].join(',')
  });
  if (workspace) {
    query.set('workspace', workspace);
  } else {
    query.set('workspace', 'me');
  }

  const response = await fetch(`https://app.asana.com/api/1.0/tasks?${query.toString()}`, {
    headers: {
      Authorization: `Bearer ${tokenRow.access_token}`,
      Accept: 'application/json'
    }
  });

  if (!response.ok) {
    console.error('Failed to sync tasks', response.status, await safeText(response));
    return jsonResponse({ error: 'asana_sync_failed' }, { status: 502 });
  }

  const envelope = (await response.json()) as AsanaTasksEnvelope;
  const tasks = envelope.data ?? [];

  for (const task of tasks) {
    const membership = task.memberships?.[0];
    const project = membership?.project?.name?.trim() || 'Unassigned';
    const section = membership?.section?.name?.trim() || 'No Section';
    const dueOn = task.due_on ? new Date(task.due_on).toISOString() : null;
    const lastUpdated = task.modified_at ? new Date(task.modified_at).toISOString() : new Date().toISOString();
    const status: TaskStatus = task.completed ? 'complete' : 'incomplete';

    await env.DB.prepare(
      `INSERT INTO tasks (id, name, project, section, assignee, due_on, status, last_updated)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name,
         project = excluded.project,
         section = excluded.section,
         assignee = excluded.assignee,
         due_on = excluded.due_on,
         status = excluded.status,
         last_updated = excluded.last_updated`
    )
      .bind(
        task.gid,
        task.name,
        project,
        section,
        task.assignee?.name?.trim() || null,
        dueOn,
        status,
        lastUpdated
      )
      .run();
  }

  return jsonResponse({ status: 'synced', count: tasks.length });
}

function stateCacheKey(nonce: string): string {
  return `asana-oauth-state:${nonce}`;
}

function encodeState(state: OAuthStatePayload): string {
  const json = JSON.stringify(state);
  return btoa(json);
}

function decodeState(state: string): OAuthStatePayload {
  const json = atob(state);
  const payload = JSON.parse(json) as OAuthStatePayload;
  if (!payload || typeof payload.nonce !== 'string' || typeof payload.redirectUri !== 'string') {
    throw new Error('Invalid state payload');
  }
  return payload;
}

function requireEnv<T>(value: T | undefined, name: string): T {
  if (value === undefined || value === null || value === '') {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

async function exchangeAuthorizationCode(code: string, redirectUri: string, env: Env): Promise<AsanaTokenEnvelope> {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: requireEnv(env.ASANA_CLIENT_ID, 'ASANA_CLIENT_ID'),
    client_secret: requireEnv(env.ASANA_CLIENT_SECRET, 'ASANA_CLIENT_SECRET'),
    redirect_uri: redirectUri,
    code
  });

  const response = await fetch(env.ASANA_TOKEN_URL || 'https://app.asana.com/-/oauth_token', {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      Accept: 'application/json'
    },
    body: body.toString()
  });

  if (!response.ok) {
    console.error('Failed to exchange OAuth code', response.status, await safeText(response));
    throw new Error('token_exchange_failed');
  }

  return (await response.json()) as AsanaTokenEnvelope;
}

function extractTokenPayload(envelope: AsanaTokenEnvelope): { access_token: string; refresh_token: string; expires_in: number } {
  const accessToken = envelope.data?.access_token ?? envelope.access_token;
  const refreshToken = envelope.data?.refresh_token ?? envelope.refresh_token;
  const expiresIn = envelope.data?.expires_in ?? envelope.expires_in;

  if (!accessToken || !refreshToken || typeof expiresIn !== 'number') {
    throw new Error('invalid_token_payload');
  }

  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_in: expiresIn
  };
}

async function fetchCurrentUser(accessToken: string): Promise<AsanaUserEnvelope> {
  const response = await fetch('https://app.asana.com/api/1.0/users/me', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json'
    }
  });

  if (!response.ok) {
    console.error('Failed to fetch Asana user', response.status, await safeText(response));
    throw new Error('user_lookup_failed');
  }

  return (await response.json()) as AsanaUserEnvelope;
}

async function safeText(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return '<unable to read body>';
  }
}
