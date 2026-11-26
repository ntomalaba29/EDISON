import crypto from 'node:crypto';
import type { D1AuthDatabaseBinding } from './d1AuthSessionStore.ts';

type D1TvEnrollmentResult<T> = {
  success: boolean;
  results?: T[];
  meta?: { changes?: number };
  error?: string;
};

interface TvEnrollmentRow {
  enrollment_id: unknown;
  device_id: unknown;
  owner_id: unknown;
  device_label: unknown;
  pairing_code_hash: unknown;
  device_token_hash: unknown;
  status: unknown;
  failed_attempts: unknown;
  expires_at: unknown;
  created_at: unknown;
  approved_at: unknown;
  revoked_at: unknown;
}

export interface TvEnrollmentRecord {
  enrollmentId: string;
  deviceId: string | null;
  ownerId: string | null;
  deviceLabel: string;
  status: 'pending' | 'approved' | 'locked' | 'expired' | 'revoked';
  failedAttempts: number;
  expiresAt: string;
  createdAt: string;
  approvedAt: string | null;
  revokedAt: string | null;
}

export interface TvEnrollmentDevice {
  enrollmentId: string;
  deviceId: string;
  deviceLabel: string;
  status: 'approved' | 'revoked';
  createdAt: string;
  approvedAt: string;
  revokedAt: string | null;
}

function assertSuccess<T>(
  result: D1TvEnrollmentResult<T>,
  operation: string
): void {
  if (!result.success) {
    throw new Error(
      `D1_TV_ENROLLMENT_${operation}_FAILED: ${result.error ?? 'D1 reported an unsuccessful operation.'}`
    );
  }
}

function decodeEnrollment(row: TvEnrollmentRow): TvEnrollmentRecord {
  const statuses = new Set(['pending', 'approved', 'locked', 'expired', 'revoked']);
  if (
    typeof row.enrollment_id !== 'string' ||
    typeof row.device_label !== 'string' ||
    typeof row.status !== 'string' ||
    !statuses.has(row.status) ||
    typeof row.failed_attempts !== 'number' ||
    !Number.isInteger(row.failed_attempts) ||
    row.failed_attempts < 0 ||
    typeof row.expires_at !== 'string' ||
    typeof row.created_at !== 'string' ||
    (row.device_id !== null && typeof row.device_id !== 'string') ||
    (row.owner_id !== null && typeof row.owner_id !== 'string') ||
    (row.approved_at !== null && typeof row.approved_at !== 'string') ||
    (row.revoked_at !== null && typeof row.revoked_at !== 'string') ||
    typeof row.pairing_code_hash !== 'string' ||
    typeof row.device_token_hash !== 'string'
  ) {
    throw new Error('D1_TV_ENROLLMENT_ROW_INVALID: Stored enrollment is malformed.');
  }

  return {
    enrollmentId: row.enrollment_id,
    deviceId: row.device_id,
    ownerId: row.owner_id,
    deviceLabel: row.device_label,
    status: row.status as TvEnrollmentRecord['status'],
    failedAttempts: row.failed_attempts,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    approvedAt: row.approved_at,
    revokedAt: row.revoked_at,
  };
}

export class D1TvEnrollmentStore {
  constructor(private readonly database: D1AuthDatabaseBinding) {}

  async create(input: {
    enrollmentId: string;
    deviceId: string;
    deviceLabel: string;
    pairingCodeHash: string;
    deviceTokenHash: string;
    expiresAt: string;
    createdAt: string;
  }): Promise<void> {
    const result = await this.database
      .prepare(
        `INSERT INTO edison_tv_enrollments (
           enrollment_id, device_id, device_label, pairing_code_hash,
           device_token_hash, status, expires_at, created_at
         ) VALUES (?, ?, ?, ?, ?, 'pending', ?, ?)`
      )
      .bind(
        input.enrollmentId,
        input.deviceId,
        input.deviceLabel,
        input.pairingCodeHash,
        input.deviceTokenHash,
        input.expiresAt,
        input.createdAt
      )
      .run();
    assertSuccess(result, 'CREATE');
  }

  async approve(input: {
    enrollmentId: string;
    pairingCodeHash: string;
    ownerId: string;
    now: string;
  }): Promise<'approved' | 'invalid' | 'expired' | 'locked' | 'already_approved'> {
    const current = await this.database
      .prepare(
        `SELECT enrollment_id, device_id, owner_id, device_label,
                pairing_code_hash, device_token_hash, status, failed_attempts,
                expires_at, created_at, approved_at, revoked_at
         FROM edison_tv_enrollments
         WHERE enrollment_id = ?
         LIMIT 1`
      )
      .bind(input.enrollmentId)
      .all<TvEnrollmentRow>();
    assertSuccess(current, 'READ');
    const row = current.results?.[0];
    if (!row) return 'invalid';

    const enrollment = decodeEnrollment(row);
    if (enrollment.status === 'locked') return 'locked';
    if (enrollment.status === 'expired') return 'expired';
    if (enrollment.status !== 'pending') return 'already_approved';
    if (Date.parse(enrollment.expiresAt) <= Date.parse(input.now)) {
      const expired = await this.database
        .prepare(
          `UPDATE edison_tv_enrollments
           SET status = 'expired'
           WHERE enrollment_id = ? AND status = 'pending'`
        )
        .bind(input.enrollmentId)
        .run();
      assertSuccess(expired, 'EXPIRE');
      return 'expired';
    }

    const storedHash = row.pairing_code_hash as string;
    const storedHashBytes = Buffer.from(storedHash, 'hex');
    const candidateHashBytes = Buffer.from(input.pairingCodeHash, 'hex');
    if (
      !/^[a-f0-9]{64}$/.test(storedHash) ||
      !crypto.timingSafeEqual(storedHashBytes, candidateHashBytes)
    ) {
      const failed = await this.database
        .prepare(
          `UPDATE edison_tv_enrollments
           SET failed_attempts = failed_attempts + 1,
               status = CASE WHEN failed_attempts + 1 >= 5 THEN 'locked' ELSE status END
           WHERE enrollment_id = ? AND status = 'pending'`
        )
        .bind(input.enrollmentId)
        .run();
      assertSuccess(failed, 'ATTEMPT');
      const updated = await this.getEnrollment(input.enrollmentId);
      return updated?.status === 'locked' ? 'locked' : 'invalid';
    }

    const approved = await this.database
      .prepare(
        `UPDATE edison_tv_enrollments
         SET status = 'approved', owner_id = ?, approved_at = ?
         WHERE enrollment_id = ? AND pairing_code_hash = ?
           AND status = 'pending' AND failed_attempts < 5 AND expires_at > ?`
      )
      .bind(
        input.ownerId,
        input.now,
        input.enrollmentId,
        input.pairingCodeHash,
        input.now
      )
      .run();
    assertSuccess(approved, 'APPROVE');
    if (approved.meta?.changes === 1) return 'approved';
    const latest = await this.getEnrollment(input.enrollmentId);
    if (latest?.status === 'locked') return 'locked';
    if (latest?.status === 'expired' || Date.parse(latest?.expiresAt ?? '') <= Date.parse(input.now)) {
      return 'expired';
    }
    return 'already_approved';
  }

  async getApprovalDetails(enrollmentId: string): Promise<{
    enrollmentId: string;
    deviceLabel: string;
    status: TvEnrollmentRecord['status'];
    expiresAt: string;
  } | null> {
    const enrollment = await this.getEnrollment(enrollmentId);
    return enrollment
      ? {
          enrollmentId: enrollment.enrollmentId,
          deviceLabel: enrollment.deviceLabel,
          status: enrollment.status,
          expiresAt: enrollment.expiresAt,
        }
      : null;
  }

  async getByDeviceTokenHash(
    enrollmentId: string,
    deviceTokenHash: string,
    now = new Date().toISOString()
  ): Promise<TvEnrollmentRecord | null> {
    const result = await this.database
      .prepare(
        `SELECT enrollment_id, device_id, owner_id, device_label,
                pairing_code_hash, device_token_hash, status, failed_attempts,
                expires_at, created_at, approved_at, revoked_at
         FROM edison_tv_enrollments
         WHERE enrollment_id = ? AND device_token_hash = ?
         LIMIT 1`
      )
      .bind(enrollmentId, deviceTokenHash)
      .all<TvEnrollmentRow>();
    assertSuccess(result, 'READ');
    const row = result.results?.[0];
    if (!row) return null;
    const enrollment = decodeEnrollment(row);
    if (
      enrollment.status === 'pending' &&
      Date.parse(enrollment.expiresAt) <= Date.parse(now)
    ) {
      const expired = await this.database
        .prepare(
          `UPDATE edison_tv_enrollments
           SET status = 'expired'
           WHERE enrollment_id = ? AND status = 'pending' AND expires_at <= ?`
        )
        .bind(enrollmentId, now)
        .run();
      assertSuccess(expired, 'EXPIRE');
      return this.getEnrollment(enrollmentId);
    }
    return enrollment;
  }

  async listDevices(ownerId: string): Promise<TvEnrollmentDevice[]> {
    const result = await this.database
      .prepare(
        `SELECT enrollment_id, device_id, owner_id, device_label,
                pairing_code_hash, device_token_hash, status, failed_attempts,
                expires_at, created_at, approved_at, revoked_at
         FROM edison_tv_enrollments
         WHERE owner_id = ? AND status IN ('approved', 'revoked')
         ORDER BY created_at DESC
         LIMIT 100`
      )
      .bind(ownerId)
      .all<TvEnrollmentRow>();
    assertSuccess(result, 'LIST');
    if (!Array.isArray(result.results)) {
      throw new Error('D1_TV_ENROLLMENT_LIST_FAILED: D1 returned no result rows.');
    }
    return result.results.map((row) => {
      const record = decodeEnrollment(row);
      if (!record.deviceId || !record.ownerId || !record.approvedAt) {
        throw new Error('D1_TV_ENROLLMENT_ROW_INVALID: Approved device fields are missing.');
      }
      return {
        enrollmentId: record.enrollmentId,
        deviceId: record.deviceId,
        deviceLabel: record.deviceLabel,
        status: record.status as TvEnrollmentDevice['status'],
        createdAt: record.createdAt,
        approvedAt: record.approvedAt,
        revokedAt: record.revokedAt,
      };
    });
  }

  async revoke(input: {
    enrollmentId: string;
    ownerId: string;
    now: string;
  }): Promise<boolean> {
    const result = await this.database
      .prepare(
        `UPDATE edison_tv_enrollments
         SET status = 'revoked', revoked_at = ?
         WHERE enrollment_id = ? AND owner_id = ? AND status = 'approved'`
      )
      .bind(input.now, input.enrollmentId, input.ownerId)
      .run();
    assertSuccess(result, 'REVOKE');
    return result.meta?.changes === 1;
  }

  private async getEnrollment(
    enrollmentId: string
  ): Promise<TvEnrollmentRecord | null> {
    const result = await this.database
      .prepare(
        `SELECT enrollment_id, device_id, owner_id, device_label,
                pairing_code_hash, device_token_hash, status, failed_attempts,
                expires_at, created_at, approved_at, revoked_at
         FROM edison_tv_enrollments
         WHERE enrollment_id = ?
         LIMIT 1`
      )
      .bind(enrollmentId)
      .all<TvEnrollmentRow>();
    assertSuccess(result, 'READ');
    const row = result.results?.[0];
    return row ? decodeEnrollment(row) : null;
  }
}
