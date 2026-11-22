import crypto from 'node:crypto';
import type {
  AuditLogRecord,
  PublicUser,
  SessionRecord,
  UserAccount,
  UserRole,
} from '../../types/edison.ts';
import { SESSION_IDLE_TTL_MS, SESSION_TOUCH_INTERVAL_MS, SESSION_TTL_MS } from '../authPolicy.ts';
import { hashPassword, toPublicUser, verifyPassword } from '../authCredentials.ts';
import { generateCsrfToken, hashSessionToken } from '../security.ts';

type D1AuthSqlValue = string | number | null;

interface D1AuthResult<T = unknown> {
  success: boolean;
  results?: T[];
  meta?: { changes?: number };
  error?: string;
}

interface D1AuthPreparedStatement {
  bind(...values: D1AuthSqlValue[]): D1AuthPreparedStatement;
  all<T = Record<string, unknown>>(): Promise<D1AuthResult<T>>;
  run(): Promise<D1AuthResult>;
}

export interface D1AuthDatabaseBinding {
  prepare(query: string): D1AuthPreparedStatement;
  batch(statements: D1AuthPreparedStatement[]): Promise<D1AuthResult[]>;
}

interface D1AuthUserRow {
  user_id: unknown;
  email: unknown;
  password_hash: unknown;
  name: unknown;
  organisation_name: unknown;
  role: unknown;
  verification_status: unknown;
  is_prototype_seed: unknown;
  created_at: unknown;
}

interface D1SessionJoinRow extends D1AuthUserRow {
  session_id: unknown;
  token_hash: unknown;
  csrf_token: unknown;
  session_created_at: unknown;
  last_activity_at: unknown;
  idle_expires_at: unknown;
  expires_at: unknown;
}

interface D1SessionAuditRow {
  session_id: unknown;
  user_id: unknown;
  role: unknown;
}

interface D1AuthAuditRow {
  audit_id: unknown;
  actor_id: unknown;
  actor_role: unknown;
  action: unknown;
  target_type: unknown;
  target_id: unknown;
  detail: unknown;
  created_at: unknown;
}

export interface D1SelfRegistration {
  email: string;
  password: string;
  name: string;
  organisationName: string;
  role: 'advertiser' | 'opportunity_submitter' | 'household_viewer';
}

export interface D1AuthSessionStoreOptions {
  now?: () => number;
  isProduction?: () => boolean;
}

const AUDIT_ROLES = new Set<AuditLogRecord['actorRole']>([
  'advertiser',
  'opportunity_submitter',
  'admin',
  'household_viewer',
  'anonymous',
  'system',
]);
const MAX_AUDIT_ROWS = 500;

function isCanonicalUtc(value: string): boolean {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString() === value;
}

function isUserRole(value: unknown): value is UserRole {
  return (
    value === 'advertiser' ||
    value === 'opportunity_submitter' ||
    value === 'admin' ||
    value === 'household_viewer'
  );
}

function isAccountStatus(value: unknown): value is UserAccount['verificationStatus'] {
  return (
    value === 'unverified' ||
    value === 'pending_review' ||
    value === 'verified' ||
    value === 'suspended'
  );
}

function isAuditRole(value: unknown): value is AuditLogRecord['actorRole'] {
  return (
    value === 'advertiser' ||
    value === 'opportunity_submitter' ||
    value === 'admin' ||
    value === 'household_viewer' ||
    value === 'anonymous' ||
    value === 'system'
  );
}

function isSelfRegistrationRole(value: unknown): value is D1SelfRegistration['role'] {
  return (
    value === 'advertiser' ||
    value === 'opportunity_submitter' ||
    value === 'household_viewer'
  );
}

function assertD1Success<T>(result: D1AuthResult<T>, operation: string): void {
  if (!result.success) {
    throw new Error(
      `D1_AUTH_${operation}_FAILED: ${result.error ?? 'D1 reported an unsuccessful operation.'}`
    );
  }
}

function decodeUser(row: D1AuthUserRow): UserAccount {
  if (
    typeof row.user_id !== 'string' ||
    !row.user_id ||
    typeof row.email !== 'string' ||
    row.email !== row.email.trim().toLowerCase() ||
    typeof row.password_hash !== 'string' ||
    !row.password_hash ||
    typeof row.name !== 'string' ||
    typeof row.organisation_name !== 'string' ||
    !isUserRole(row.role) ||
    !isAccountStatus(row.verification_status) ||
    (row.is_prototype_seed !== 0 && row.is_prototype_seed !== 1) ||
    typeof row.created_at !== 'string' ||
    !isCanonicalUtc(row.created_at)
  ) {
    throw new Error('D1_AUTH_USER_INVALID: Stored account failed validation.');
  }

  return {
    id: row.user_id,
    email: row.email,
    passwordHash: row.password_hash,
    name: row.name,
    organisationName: row.organisation_name,
    role: row.role,
    verificationStatus: row.verification_status,
    isPrototypeSeed: row.is_prototype_seed === 1,
    createdAt: row.created_at,
  };
}

function decodeSessionJoin(row: D1SessionJoinRow): {
  user: PublicUser;
  session: SessionRecord;
} {
  const user = decodeUser(row);
  if (
    typeof row.session_id !== 'string' ||
    !row.session_id ||
    typeof row.token_hash !== 'string' ||
    !/^[a-f0-9]{64}$/.test(row.token_hash) ||
    typeof row.csrf_token !== 'string' ||
    !/^[a-f0-9]{48}$/.test(row.csrf_token) ||
    row.role !== user.role ||
    typeof row.session_created_at !== 'string' ||
    !isCanonicalUtc(row.session_created_at) ||
    typeof row.last_activity_at !== 'string' ||
    !isCanonicalUtc(row.last_activity_at) ||
    typeof row.idle_expires_at !== 'string' ||
    !isCanonicalUtc(row.idle_expires_at) ||
    typeof row.expires_at !== 'string' ||
    !isCanonicalUtc(row.expires_at)
  ) {
    throw new Error('D1_AUTH_SESSION_INVALID: Stored session failed validation.');
  }

  return {
    user: toPublicUser(user),
    session: {
      id: row.session_id,
      tokenHash: row.token_hash,
      csrfToken: row.csrf_token,
      userId: user.id,
      role: user.role,
      createdAt: row.session_created_at,
      lastActivityAt: row.last_activity_at,
      idleExpiresAt: row.idle_expires_at,
      expiresAt: row.expires_at,
    },
  };
}

function decodeAudit(row: D1AuthAuditRow): AuditLogRecord {
  if (
    typeof row.audit_id !== 'string' ||
    row.audit_id.length < 1 ||
    row.audit_id.length > 64 ||
    (typeof row.actor_id !== 'string' && row.actor_id !== null) ||
    (typeof row.actor_id === 'string' && row.actor_id.length > 512) ||
    !isAuditRole(row.actor_role) ||
    typeof row.action !== 'string' ||
    row.action.length < 1 ||
    row.action.length > 120 ||
    typeof row.target_type !== 'string' ||
    row.target_type !== 'auth' ||
    typeof row.target_id !== 'string' ||
    row.target_id.length < 1 ||
    row.target_id.length > 512 ||
    typeof row.detail !== 'string' ||
    row.detail.length > 8192 ||
    typeof row.created_at !== 'string' ||
    !isCanonicalUtc(row.created_at)
  ) {
    throw new Error('D1_AUTH_AUDIT_INVALID: Stored audit record failed validation.');
  }
  return {
    id: row.audit_id,
    actorId: row.actor_id,
    actorRole: row.actor_role,
    action: row.action,
    targetType: 'auth',
    targetId: row.target_id,
    detail: row.detail,
    createdAt: row.created_at,
  };
}

function buildAuditRecord(
  actorId: string | null,
  actorRole: AuditLogRecord['actorRole'],
  action: string,
  targetId: string,
  detail: string,
  createdAt: string
): AuditLogRecord {
  if (
    !AUDIT_ROLES.has(actorRole) ||
    (actorId !== null && actorId.length > 512) ||
    !action.trim() ||
    action.length > 120 ||
    !targetId.trim() ||
    targetId.length > 512 ||
    detail.length > 8192
  ) {
    throw new Error('D1_AUTH_AUDIT_INVALID: Audit fields exceed supported bounds.');
  }
  return {
    id: `aud_${crypto.randomBytes(6).toString('hex')}`,
    actorId,
    actorRole,
    action,
    targetType: 'auth',
    targetId,
    detail,
    createdAt,
  };
}

export class D1AuthSessionStore {
  private readonly now: () => number;
  private readonly isProduction: () => boolean;

  constructor(
    private readonly database: D1AuthDatabaseBinding,
    options: D1AuthSessionStoreOptions = {}
  ) {
    this.now = options.now ?? Date.now;
    this.isProduction =
      options.isProduction ?? (() => process.env.NODE_ENV === 'production');
  }

  private async runBatch(
    statements: D1AuthPreparedStatement[],
    operation: string
  ): Promise<void> {
    let results: D1AuthResult[];
    try {
      results = await this.database.batch(statements);
    } catch (error) {
      throw this.operationError(operation, error);
    }
    if (!Array.isArray(results) || results.length !== statements.length) {
      throw new Error(`D1_AUTH_${operation}_FAILED: D1 returned an invalid batch result.`);
    }
    results.forEach((result) => assertD1Success(result, operation));
  }

  private async execute<T>(
    operation: string,
    action: () => Promise<D1AuthResult<T>>
  ): Promise<D1AuthResult<T>> {
    try {
      return await action();
    } catch (error) {
      throw this.operationError(operation, error);
    }
  }

  private operationError(operation: string, error: unknown): Error {
    if (error instanceof Error && error.message.startsWith('D1_AUTH_')) {
      return error;
    }
    const detail = error instanceof Error ? error.message : 'D1 operation threw an unknown error.';
    return new Error(`D1_AUTH_${operation}_FAILED: ${detail}`);
  }

  private createSession(
    user: UserAccount,
    previousSessionToken?: string
  ): { session: SessionRecord & { token: string }; statements: D1AuthPreparedStatement[] } {
    const nowMs = this.now();
    const nowUtc = new Date(nowMs).toISOString();
    const rawToken = `sess_${crypto.randomBytes(24).toString('hex')}`;
    const tokenHash = hashSessionToken(rawToken);
    const expiresAt = new Date(nowMs + SESSION_TTL_MS).toISOString();
    const sessionId = `sid_${crypto.randomBytes(6).toString('hex')}`;
    const session: SessionRecord & { token: string } = {
      id: sessionId,
      token: rawToken,
      tokenHash,
      csrfToken: generateCsrfToken(),
      userId: user.id,
      role: user.role,
      createdAt: nowUtc,
      lastActivityAt: nowUtc,
      idleExpiresAt: new Date(Math.min(nowMs + SESSION_IDLE_TTL_MS, Date.parse(expiresAt))).toISOString(),
      expiresAt,
    };
    const previousHash = previousSessionToken
      ? hashSessionToken(previousSessionToken)
      : null;
    const prune = this.database
      .prepare(
        `DELETE FROM edison_auth_sessions
         WHERE expires_at <= ? OR idle_expires_at <= ?
            OR (? IS NOT NULL AND token_hash = ?)`
      )
      .bind(nowUtc, nowUtc, previousHash, previousHash);
    const insert = this.database
      .prepare(
        `INSERT INTO edison_auth_sessions (
           token_hash, session_id, user_id, role, csrf_token,
           created_at, last_activity_at, idle_expires_at, expires_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        tokenHash,
        sessionId,
        user.id,
        user.role,
        session.csrfToken,
        session.createdAt,
        session.lastActivityAt,
        session.idleExpiresAt,
        session.expiresAt
      );
    return {
      session,
      statements: [prune, insert],
    };
  }

  private async insertAudit(record: AuditLogRecord): Promise<void> {
    await this.runBatch(
      [this.auditInsertStatement(record), this.auditPruneStatement()],
      'AUDIT_WRITE'
    );
  }

  private auditInsertStatement(record: AuditLogRecord): D1AuthPreparedStatement {
    return this.database
      .prepare(
        `INSERT INTO edison_auth_audit_logs (
           audit_id, actor_id, actor_role, action, target_type, target_id, detail, created_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        record.id,
        record.actorId,
        record.actorRole,
        record.action,
        record.targetType,
        record.targetId,
        record.detail,
        record.createdAt
      );
  }

  private auditPruneStatement(): D1AuthPreparedStatement {
    return this.database.prepare(
      `DELETE FROM edison_auth_audit_logs
       WHERE audit_id NOT IN (
         SELECT audit_id
         FROM edison_auth_audit_logs
         ORDER BY created_at DESC, audit_id DESC
         LIMIT ?
       )`
    ).bind(MAX_AUDIT_ROWS);
  }

  async registerUser(
    params: D1SelfRegistration,
    previousSessionToken?: string
  ): Promise<{ user: PublicUser; session: SessionRecord & { token: string } }> {
    const email = params.email.trim().toLowerCase();
    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      email.length > 160 ||
      params.password.length < 8 ||
      params.password.length > 128 ||
      params.name.trim().length < 2 ||
      params.name.trim().length > 120 ||
      params.organisationName.trim().length > 160 ||
      !isSelfRegistrationRole(params.role)
    ) {
      throw new Error('D1_AUTH_REGISTRATION_INVALID: Registration fields are invalid.');
    }
    if (this.isProduction() && email.endsWith('.demo')) {
      throw new Error('FORBIDDEN: Reserved .demo accounts cannot be registered in production.');
    }

    const nowUtc = new Date(this.now()).toISOString();
    const organisationName = params.organisationName.trim() || 'Independent / Individual';
    const user: UserAccount = {
      id: `usr_${crypto.randomBytes(6).toString('hex')}`,
      email,
      passwordHash: hashPassword(params.password),
      name: params.name.trim(),
      organisationName,
      role: params.role,
      verificationStatus: 'unverified',
      isPrototypeSeed: false,
      createdAt: nowUtc,
    };
    const { session, statements: sessionStatements } = this.createSession(
      user,
      previousSessionToken
    );
    const audit = buildAuditRecord(
      user.id,
      user.role,
      'USER_REGISTERED',
      user.id,
      `Registered ${user.role} account (${user.email}).`,
      nowUtc
    );
    const userInsert = this.database
      .prepare(
        `INSERT INTO edison_auth_users (
           user_id, email, password_hash, name, organisation_name, role,
           verification_status, is_prototype_seed, created_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)`
      )
      .bind(
        user.id,
        user.email,
        user.passwordHash,
        user.name,
        user.organisationName,
        user.role,
        user.verificationStatus,
        user.createdAt
      );

    try {
      await this.runBatch(
        [
          userInsert,
          ...sessionStatements,
          this.auditInsertStatement(audit),
          this.auditPruneStatement(),
        ],
        'REGISTER'
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (message.includes('UNIQUE constraint failed: edison_auth_users.email')) {
        throw new Error('An account with this email already exists.');
      }
      throw error;
    }
    return { user: toPublicUser(user), session };
  }

  async loginUser(
    emailInput: string,
    password: string,
    previousSessionToken?: string
  ): Promise<{ user: PublicUser; session: SessionRecord & { token: string } }> {
    const email = emailInput.trim().toLowerCase();
    if (!email || email.length > 160 || !password || password.length > 200) {
      throw new Error('D1_AUTH_LOGIN_INVALID: Email or password is invalid.');
    }

    const query = await this.execute('USER_READ', () =>
      this.database
        .prepare(
          `SELECT user_id, email, password_hash, name, organisation_name, role,
                  verification_status, is_prototype_seed, created_at
           FROM edison_auth_users WHERE email = ? LIMIT 1`
        )
        .bind(email)
        .all<D1AuthUserRow>()
    );
    assertD1Success(query, 'USER_READ');
    if (!Array.isArray(query.results)) {
      throw new Error('D1_AUTH_USER_READ_FAILED: D1 returned no result rows.');
    }
    const user = query.results[0] ? decodeUser(query.results[0]) : null;

    if (
      this.isProduction() &&
      (email.endsWith('.demo') || (user && user.isPrototypeSeed))
    ) {
      const audit = buildAuditRecord(
        null,
        'anonymous',
        'DEMO_AUTH_BLOCKED_IN_PRODUCTION',
        email,
        'Rejected prototype/demo account authentication while NODE_ENV=production.',
        new Date(this.now()).toISOString()
      );
      await this.insertAudit(audit);
      throw new Error(
        'FORBIDDEN: Demo and prototype seed accounts are disabled in production environments.'
      );
    }

    if (!user || !verifyPassword(password, user.passwordHash)) {
      const audit = buildAuditRecord(
        null,
        'anonymous',
        'LOGIN_FAILED',
        email,
        'Invalid login attempt.',
        new Date(this.now()).toISOString()
      );
      await this.insertAudit(audit);
      throw new Error('Invalid email or password.');
    }

    const { session, statements } = this.createSession(user, previousSessionToken);
    const audit = buildAuditRecord(
      user.id,
      user.role,
      'USER_LOGGED_IN',
      user.id,
      `Signed in as ${user.role} (${user.email}).`,
      new Date(this.now()).toISOString()
    );
    await this.runBatch(
      [...statements, this.auditInsertStatement(audit), this.auditPruneStatement()],
      'LOGIN'
    );
    return { user: toPublicUser(user), session };
  }

  async getSessionByToken(
    rawToken: string | undefined
  ): Promise<{ user: PublicUser; session: SessionRecord } | null> {
    if (!rawToken) return null;
    const nowUtc = new Date(this.now()).toISOString();
    const result = await this.execute('SESSION_READ', () =>
      this.database
        .prepare(
          `SELECT u.user_id, u.email, u.password_hash, u.name, u.organisation_name,
                  u.role, u.verification_status, u.is_prototype_seed, u.created_at,
                  s.session_id, s.token_hash, s.csrf_token, s.created_at AS session_created_at,
                  s.last_activity_at,
                  s.idle_expires_at, s.expires_at
           FROM edison_auth_sessions s
           JOIN edison_auth_users u ON u.user_id = s.user_id
           WHERE s.token_hash = ? AND s.expires_at > ? AND s.idle_expires_at > ?
           LIMIT 1`
        )
        .bind(hashSessionToken(rawToken), nowUtc, nowUtc)
        .all<D1SessionJoinRow>()
    );
    assertD1Success(result, 'SESSION_READ');
    if (!Array.isArray(result.results)) {
      throw new Error('D1_AUTH_SESSION_READ_FAILED: D1 returned no result rows.');
    }
    const row = result.results[0];
    if (!row) return null;
    const decoded = decodeSessionJoin(row);
    if (
      this.isProduction() &&
      (decoded.user.isPrototypeSeed || decoded.user.email.endsWith('.demo'))
    ) {
      return null;
    }
    return decoded;
  }

  async listSessionRetentionRecords(): Promise<
    Array<Pick<SessionRecord, 'expiresAt' | 'idleExpiresAt'>>
  > {
    const result = await this.execute('SESSION_RETENTION_READ', () =>
      this.database
        .prepare(
          `SELECT idle_expires_at, expires_at
           FROM edison_auth_sessions
           ORDER BY expires_at, session_id`
        )
        .all<{ idle_expires_at: unknown; expires_at: unknown }>()
    );
    assertD1Success(result, 'SESSION_RETENTION_READ');
    if (!Array.isArray(result.results)) {
      throw new Error(
        'D1_AUTH_SESSION_RETENTION_READ_FAILED: D1 returned no result rows.'
      );
    }
    return result.results.map((row) => {
      if (
        typeof row.idle_expires_at !== 'string' ||
        !isCanonicalUtc(row.idle_expires_at) ||
        typeof row.expires_at !== 'string' ||
        !isCanonicalUtc(row.expires_at)
      ) {
        throw new Error(
          'D1_AUTH_SESSION_INVALID: Stored session retention data failed validation.'
        );
      }
      return {
        idleExpiresAt: row.idle_expires_at,
        expiresAt: row.expires_at,
      };
    });
  }

  async getUserBySessionToken(token: string | undefined): Promise<PublicUser | null> {
    return (await this.getSessionByToken(token))?.user ?? null;
  }

  async touchSessionActivity(rawToken: string | undefined): Promise<void> {
    if (!rawToken) return;
    const nowMs = this.now();
    const nowUtc = new Date(nowMs).toISOString();
    const idleExpiry = new Date(nowMs + SESSION_IDLE_TTL_MS).toISOString();
    const touchBefore = new Date(nowMs - SESSION_TOUCH_INTERVAL_MS).toISOString();
    const result = await this.execute('SESSION_TOUCH', () =>
      this.database
        .prepare(
          `UPDATE edison_auth_sessions
           SET last_activity_at = ?,
               idle_expires_at = MIN(expires_at, ?)
           WHERE token_hash = ? AND expires_at > ? AND idle_expires_at > ?
             AND last_activity_at <= ?`
        )
        .bind(
          nowUtc,
          idleExpiry,
          hashSessionToken(rawToken),
          nowUtc,
          nowUtc,
          touchBefore
        )
        .run()
    );
    assertD1Success(result, 'SESSION_TOUCH');
  }

  async logoutSession(token: string | undefined): Promise<void> {
    if (!token) return;
    const tokenHash = hashSessionToken(token);
    const lookup = await this.execute('SESSION_READ', () =>
      this.database
        .prepare(
          `SELECT s.session_id, s.user_id, s.role
           FROM edison_auth_sessions s WHERE s.token_hash = ? LIMIT 1`
        )
        .bind(tokenHash)
        .all<D1SessionAuditRow>()
    );
    assertD1Success(lookup, 'SESSION_READ');
    if (!Array.isArray(lookup.results)) {
      throw new Error('D1_AUTH_SESSION_READ_FAILED: D1 returned no result rows.');
    }
    const session = lookup.results[0];
    if (!session) return;
    if (
      typeof session.session_id !== 'string' ||
      typeof session.user_id !== 'string' ||
      !isUserRole(session.role)
    ) {
      throw new Error('D1_AUTH_SESSION_INVALID: Stored session failed validation.');
    }

    const nowUtc = new Date(this.now()).toISOString();
    const audit = buildAuditRecord(
      session.user_id,
      session.role,
      'USER_LOGGED_OUT',
      session.user_id,
      'Session terminated.',
      nowUtc
    );
    await this.runBatch(
      [
        this.database
          .prepare('DELETE FROM edison_auth_sessions WHERE token_hash = ?')
          .bind(tokenHash),
        this.auditInsertStatement(audit),
        this.auditPruneStatement(),
      ],
      'LOGOUT'
    );
  }

  async recordSecurityAudit(
    actor: PublicUser | null,
    action: string,
    targetId: string,
    detail: string
  ): Promise<void> {
    const audit = buildAuditRecord(
      actor?.id ?? null,
      actor?.role ?? 'anonymous',
      action,
      targetId,
      detail,
      new Date(this.now()).toISOString()
    );
    await this.insertAudit(audit);
  }

  async listAuditRecords(limit = MAX_AUDIT_ROWS): Promise<AuditLogRecord[]> {
    if (!Number.isInteger(limit) || limit < 1 || limit > MAX_AUDIT_ROWS) {
      throw new Error(
        `D1_AUTH_AUDIT_QUERY_INVALID: Limit must be between 1 and ${MAX_AUDIT_ROWS}.`
      );
    }
    const result = await this.execute('AUDIT_READ', () =>
      this.database
        .prepare(
          `SELECT audit_id, actor_id, actor_role, action, target_type, target_id, detail, created_at
           FROM edison_auth_audit_logs
           ORDER BY created_at DESC, audit_id DESC
           LIMIT ?`
        )
        .bind(limit)
        .all<D1AuthAuditRow>()
    );
    assertD1Success(result, 'AUDIT_READ');
    if (!Array.isArray(result.results)) {
      throw new Error('D1_AUTH_AUDIT_READ_FAILED: D1 returned no result rows.');
    }
    return result.results.map(decodeAudit);
  }

  async getUserCount(): Promise<number> {
    const result = await this.execute('USER_COUNT', () =>
      this.database
        .prepare('SELECT COUNT(*) AS user_count FROM edison_auth_users')
        .all<{ user_count: unknown }>()
    );
    assertD1Success(result, 'USER_COUNT');
    if (!Array.isArray(result.results) || result.results.length !== 1) {
      throw new Error('D1_AUTH_USER_COUNT_FAILED: D1 returned no count row.');
    }
    const count = result.results[0].user_count;
    if (typeof count !== 'number' || !Number.isSafeInteger(count) || count < 0) {
      throw new Error('D1_AUTH_USER_COUNT_FAILED: D1 returned an invalid count.');
    }
    return count;
  }
}
