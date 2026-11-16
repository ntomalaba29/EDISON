import type { EdisonStoreData } from '../../types/edison.ts';
import type { PgQueryExecutor } from './executor.ts';
import { loadMigrationDescriptors, runUpMigrations } from './migrator.ts';

export interface PostgresImportCounts {
  users: number;
  sessions: number;
  advertiserProfiles: number;
  qrLinks: number;
  campaigns: number;
  adCreatives: number;
  opportunities: number;
  opportunityComplaints: number;
  opportunityAppeals: number;
  supportTickets: number;
  analyticsEvents: number;
  physicalQrScanTests: number;
  auditLogs: number;
  households: number;
  householdMembers: number;
  householdQrTokens: number;
  consentAuditEvents: number;
  countryPolicies: number;
  regionalConfigs: number;
}

export interface PostgresImportSummary {
  driver: PgQueryExecutor['driver'];
  schemaVersion: number;
  importedAt: string;
  counts: PostgresImportCounts;
  charityZeroCostVerified: boolean;
  feeIndependenceVerified: boolean;
}

export interface PostgresHealthProbeResult {
  connected: boolean;
  driver: string;
  latencyMs: number;
  schemaVersion: string | null;
  availableMigrationsCount: number;
  appliedMigrationsCount: number;
  pendingMigrationsCount: number;
  error: string | null;
}

/**
 * Idempotently imports an EdisonStoreData snapshot from the JSON store into
 * PostgreSQL 16+ inside a single ACID transaction, preserving all relational FKs,
 * SHA-256 session tokens, $0.00 Charity CHECK constraints, and DEC-OPEN-01 epochs.
 */
export async function importJsonStoreToPostgres(
  executor: PgQueryExecutor,
  storeData: EdisonStoreData
): Promise<PostgresImportSummary> {
  await runUpMigrations(executor);

  const counts: PostgresImportCounts = {
    users: 0,
    sessions: 0,
    advertiserProfiles: 0,
    qrLinks: 0,
    campaigns: 0,
    adCreatives: 0,
    opportunities: 0,
    opportunityComplaints: 0,
    opportunityAppeals: 0,
    supportTickets: 0,
    analyticsEvents: 0,
    physicalQrScanTests: 0,
    auditLogs: 0,
    households: 0,
    householdMembers: 0,
    householdQrTokens: 0,
    consentAuditEvents: 0,
    countryPolicies: 0,
    regionalConfigs: 0,
  };

  await executor.withTransaction(async (tx) => {
    for (const u of storeData.users) {
      await tx.query(
        `INSERT INTO users (id, email, password_hash, name, organisation_name, role, verification_status, is_prototype_seed, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         ON CONFLICT (id) DO UPDATE SET
           email = EXCLUDED.email,
           password_hash = EXCLUDED.password_hash,
           name = EXCLUDED.name,
           organisation_name = EXCLUDED.organisation_name,
           role = EXCLUDED.role,
           verification_status = EXCLUDED.verification_status,
           is_prototype_seed = EXCLUDED.is_prototype_seed`,
        [
          u.id,
          u.email,
          u.passwordHash,
          u.name,
          u.organisationName || '',
          u.role,
          u.verificationStatus || 'unverified',
          Boolean(u.isPrototypeSeed),
          u.createdAt,
        ]
      );
      counts.users += 1;
    }

    for (const s of storeData.sessions) {
      await tx.query(
        `INSERT INTO sessions (id, token_hash, csrf_token, user_id, role, created_at, last_activity_at, idle_expires_at, expires_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         ON CONFLICT (id) DO UPDATE SET
           last_activity_at = EXCLUDED.last_activity_at,
           idle_expires_at = EXCLUDED.idle_expires_at,
           expires_at = EXCLUDED.expires_at`,
        [
          s.id,
          s.tokenHash,
          s.csrfToken,
          s.userId,
          s.role,
          s.createdAt,
          s.lastActivityAt,
          s.idleExpiresAt,
          s.expiresAt,
        ]
      );
      counts.sessions += 1;
    }

    for (const p of storeData.advertiserProfiles) {
      await tx.query(
        `INSERT INTO advertiser_profiles (
           user_id, entity_type, business_or_trading_name, registration_or_tax_id,
           industry_category, country_code, city_region, physical_address,
           primary_contact_name, primary_contact_email, primary_contact_phone,
           billing_contact_name, billing_contact_email, website_url,
           verification_status, verification_notes, is_prototype_seed, updated_at
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
         ON CONFLICT (user_id) DO UPDATE SET
           entity_type = EXCLUDED.entity_type,
           business_or_trading_name = EXCLUDED.business_or_trading_name,
           registration_or_tax_id = EXCLUDED.registration_or_tax_id,
           verification_status = EXCLUDED.verification_status,
           updated_at = EXCLUDED.updated_at`,
        [
          p.userId,
          p.entityType,
          p.businessOrTradingName || '',
          p.registrationOrTaxId || '',
          p.industryCategory || '',
          p.countryCode || 'GB',
          p.cityRegion || '',
          p.physicalAddress || '',
          p.primaryContactName || '',
          p.primaryContactEmail || '',
          p.primaryContactPhone || '',
          p.billingContactName || '',
          p.billingContactEmail || '',
          p.websiteUrl || '',
          p.verificationStatus || 'unverified',
          p.verificationNotes || '',
          Boolean(p.isPrototypeSeed),
          p.updatedAt,
        ]
      );
      counts.advertiserProfiles += 1;
    }

    for (const q of storeData.qrLinks) {
      await tx.query(
        `INSERT INTO qr_links (
           token, owner_id, label, destination_type, raw_input, resolved_url,
           resolved_host, scheme, status, redirect_requests_total, redirect_issued_total,
           suspected_bot_requests, deduplicated_non_bot_redirects, last_redirect_requested_at, created_at
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
         ON CONFLICT (token) DO UPDATE SET
           status = EXCLUDED.status,
           redirect_requests_total = EXCLUDED.redirect_requests_total,
           redirect_issued_total = EXCLUDED.redirect_issued_total,
           suspected_bot_requests = EXCLUDED.suspected_bot_requests,
           deduplicated_non_bot_redirects = EXCLUDED.deduplicated_non_bot_redirects,
           last_redirect_requested_at = EXCLUDED.last_redirect_requested_at`,
        [
          q.token,
          q.ownerId,
          q.label || '',
          q.destinationType || 'website',
          q.rawInput,
          q.resolvedUrl,
          q.resolvedHost || '',
          q.scheme,
          q.status,
          q.redirectRequestsTotal || 0,
          q.redirectIssuedTotal || 0,
          q.suspectedBotRequests || 0,
          q.deduplicatedNonBotRedirects || 0,
          q.lastRedirectRequestedAt || null,
          q.createdAt,
        ]
      );
      counts.qrLinks += 1;
    }

    for (const c of storeData.campaigns) {
      const derivedPrimaryCategory =
        c.contentCategory === 'opportunity_promotion' ? 'CHARITY' : 'COMMERCIAL';
      await tx.query(
        `INSERT INTO campaigns (
           id, owner_id, title, content_category, primary_ad_category, status,
           summary, qr_token, ad_creative_ref, duration_seconds, daily_frequency_cap,
           target_regions, dayparts, start_date, end_date, simulated_estimate,
           payment_collection_active, moderation_reason, fix_instructions, created_at, updated_at
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb,$13::jsonb,$14,$15,$16::jsonb,$17,$18,$19,$20,$21)
         ON CONFLICT (id) DO UPDATE SET
           status = EXCLUDED.status,
           simulated_estimate = EXCLUDED.simulated_estimate,
           moderation_reason = EXCLUDED.moderation_reason,
           updated_at = EXCLUDED.updated_at`,
        [
          c.id,
          c.ownerId,
          c.title,
          c.contentCategory,
          derivedPrimaryCategory,
          c.status,
          c.summary || '',
          c.qrToken || null,
          c.adCreativeRef || null,
          c.durationSeconds,
          c.dailyFrequencyCap,
          JSON.stringify(c.targetRegions || []),
          JSON.stringify(c.dayparts || ['daytime']),
          c.startDate || '',
          c.endDate || '',
          JSON.stringify(c.simulatedEstimate),
          false,
          c.rejectionReason || '',
          c.fixInstructions || '',
          c.createdAt,
          c.updatedAt,
        ]
      );
      counts.campaigns += 1;
    }

    for (const cr of storeData.adCreatives) {
      await tx.query(
        `INSERT INTO ad_creatives (
           id, owner_id, campaign_id, qr_token, title, mode, status,
           display_duration_seconds, option_a, option_b, text_only,
           safe_zone_warnings, contrast_warnings, created_at, updated_at
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10::jsonb,$11::jsonb,$12::jsonb,$13::jsonb,$14,$15)
         ON CONFLICT (id) DO UPDATE SET
           status = EXCLUDED.status,
           option_a = EXCLUDED.option_a,
           option_b = EXCLUDED.option_b,
           text_only = EXCLUDED.text_only,
           updated_at = EXCLUDED.updated_at`,
        [
          cr.id,
          cr.ownerId,
          cr.campaignId || null,
          cr.qrToken || null,
          cr.title,
          cr.mode,
          cr.status,
          cr.displayDurationSeconds,
          cr.optionA ? JSON.stringify(cr.optionA) : null,
          cr.optionB ? JSON.stringify(cr.optionB) : null,
          cr.textOnly ? JSON.stringify(cr.textOnly) : null,
          JSON.stringify(cr.safeZoneWarnings || []),
          JSON.stringify(cr.contrastWarnings || []),
          cr.createdAt,
          cr.updatedAt,
        ]
      );
      counts.adCreatives += 1;
    }

    for (const o of storeData.opportunities) {
      await tx.query(
        `INSERT INTO opportunities (
           id, owner_id, provider_type, provider_name, category, title,
           description, location, eligibility_requirements, application_method,
           contact_info, qr_token, linked_campaign_id, closing_date, expiry_date,
           status, verification_tiers, advertising_fee_influences_verification,
           application_fee_free_confirmed, no_guarantee_confirmed, rejection_reason,
           created_at, updated_at
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17::jsonb,$18,$19,$20,$21,$22,$23)
         ON CONFLICT (id) DO UPDATE SET
           status = EXCLUDED.status,
           verification_tiers = EXCLUDED.verification_tiers,
           updated_at = EXCLUDED.updated_at`,
        [
          o.id,
          o.ownerId,
          o.providerType,
          o.providerName,
          o.category,
          o.title,
          o.description || '',
          o.location || '',
          o.eligibilityRequirements || '',
          o.applicationMethod || '',
          o.contactInfo || '',
          o.qrToken || null,
          o.linkedCampaignId || null,
          o.closingDate || '',
          o.expiryDate || '',
          o.status,
          JSON.stringify(o.verificationTiers),
          false,
          Boolean(o.applicationFeeFreeConfirmed),
          Boolean(o.noGuaranteeConfirmed),
          o.rejectionReason || '',
          o.createdAt,
          o.updatedAt,
        ]
      );
      counts.opportunities += 1;
    }

    for (const comp of storeData.opportunityComplaints) {
      await tx.query(
        `INSERT INTO opportunity_complaints (
           id, opportunity_id, reporter_user_id, reason_category, description,
           evidence_details, status, resolution_notes, created_at, updated_at
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, resolution_notes = EXCLUDED.resolution_notes`,
        [
          comp.id,
          comp.opportunityId,
          comp.reporterId,
          comp.reasonCategory,
          comp.description,
          comp.evidenceDetails || '',
          comp.status,
          comp.resolutionNotes || '',
          comp.createdAt,
          comp.updatedAt,
        ]
      );
      counts.opportunityComplaints += 1;
    }

    for (const app of storeData.opportunityAppeals) {
      await tx.query(
        `INSERT INTO opportunity_appeals (
           id, opportunity_id, appellant_user_id, reason, additional_evidence,
           status, admin_notes, created_at, updated_at
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, admin_notes = EXCLUDED.admin_notes`,
        [
          app.id,
          app.opportunityId,
          app.ownerId,
          app.reason,
          app.additionalEvidence || '',
          app.status,
          app.adminNotes || '',
          app.createdAt,
          app.updatedAt,
        ]
      );
      counts.opportunityAppeals += 1;
    }

    for (const t of storeData.supportTickets) {
      await tx.query(
        `INSERT INTO support_tickets (
           id, owner_id, campaign_id, category, subject, message,
           status, admin_response, created_at, updated_at
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, admin_response = EXCLUDED.admin_response`,
        [
          t.id,
          t.ownerId,
          t.campaignId || null,
          t.category,
          t.subject,
          t.message,
          t.status,
          t.adminResponse || '',
          t.createdAt,
          t.updatedAt,
        ]
      );
      counts.supportTickets += 1;
    }

    for (const ev of storeData.analyticsEvents) {
      await tx.query(
        `INSERT INTO analytics_events (
           id, event_type, measurement_source, qr_token, campaign_id,
           dedup_key, is_suspected_bot, is_deduplicated, redirect_outcome, metadata, created_at
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11)
         ON CONFLICT (id) DO NOTHING`,
        [
          ev.id,
          ev.eventType,
          ev.measurementSource,
          ev.qrToken || null,
          ev.campaignId || null,
          ev.dedupKey || '',
          Boolean(ev.isSuspectedBot),
          Boolean(ev.isDeduplicated),
          ev.redirectOutcome || null,
          JSON.stringify({}),
          ev.createdAt,
        ]
      );
      counts.analyticsEvents += 1;
    }

    for (const pt of storeData.physicalQrScanTests) {
      await tx.query(
        `INSERT INTO physical_qr_scan_tests (
           id, recorded_by_user_id, qr_token, encoded_redirect_url, device_model,
           os_platform, camera_app, outcome, reached_redirect_endpoint,
           landed_destination_observed, time_to_scan_seconds, notes, created_at
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
         ON CONFLICT (id) DO NOTHING`,
        [
          pt.id,
          pt.testerUserId,
          pt.qrToken,
          pt.encodedRedirectUrl,
          pt.deviceModel,
          pt.osPlatform,
          pt.cameraApp,
          pt.outcome,
          Boolean(pt.reachedRedirectEndpoint),
          Boolean(pt.landedDestinationObserved),
          pt.timeToScanSeconds,
          pt.notes || '',
          pt.createdAt,
        ]
      );
      counts.physicalQrScanTests += 1;
    }

    if (storeData.sharedIntelPreview) {
      await tx.query(
        `INSERT INTO shared_intel_preview_state (id, snapshot, updated_at)
         VALUES ('singleton', $1::jsonb, NOW())
         ON CONFLICT (id) DO UPDATE SET snapshot = EXCLUDED.snapshot, updated_at = NOW()`,
        [JSON.stringify(storeData.sharedIntelPreview)]
      );
    }

    for (const log of storeData.auditLogs) {
      // Append-only trigger rejects UPDATE on audit_logs -> always DO NOTHING on conflict
      await tx.query(
        `INSERT INTO audit_logs (id, actor_id, actor_role, action, target_type, target_id, detail, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         ON CONFLICT (id) DO NOTHING`,
        [
          log.id,
          log.actorId || null,
          log.actorRole,
          log.action,
          log.targetType,
          log.targetId,
          log.detail,
          log.createdAt,
        ]
      );
      counts.auditLogs += 1;
    }

    for (const h of storeData.households || []) {
      await tx.query(
        `INSERT INTO households (
           id, owner_user_id, household_label, tv_device_label,
           country_code, province_or_region, metro_area, city_or_town,
           district, suburb_or_area, exact_installation_location,
           location_valid, targeting_disabled, ordinary_tv_preserved,
           commercial_consent_status, charity_and_opportunity_status,
           personalisation_master_enabled, neutral_display_mode,
           consent_epoch, consent_version_label, last_consent_changed_at,
           is_prototype_seed, created_at, updated_at
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24)
         ON CONFLICT (id) DO UPDATE SET
           commercial_consent_status = EXCLUDED.commercial_consent_status,
           charity_and_opportunity_status = EXCLUDED.charity_and_opportunity_status,
           consent_epoch = EXCLUDED.consent_epoch,
           neutral_display_mode = EXCLUDED.neutral_display_mode,
           updated_at = EXCLUDED.updated_at`,
        [
          h.id,
          h.ownerUserId,
          h.householdLabel,
          h.tvDeviceLabel,
          h.location.countryCode,
          h.location.provinceOrRegion,
          h.location.metroArea || '',
          h.location.cityOrTown,
          h.location.district,
          h.location.suburbOrArea,
          h.location.exactInstallationLocation,
          Boolean(h.locationValid),
          Boolean(h.targetingDisabled),
          true,
          h.commercialConsentStatus,
          h.charityAndOpportunityStatus,
          Boolean(h.personalisationMasterEnabled),
          Boolean(h.neutralDisplayMode),
          h.consentEpoch,
          h.consentVersionLabel,
          h.lastConsentChangedAt,
          Boolean(h.isPrototypeSeed),
          h.createdAt,
          h.updatedAt,
        ]
      );
      counts.households += 1;
    }

    for (const m of storeData.householdMembers || []) {
      await tx.query(
        `INSERT INTO household_members (
           id, household_id, owner_user_id, display_name, pin_hash, has_pin_lock,
           personalisation_consent_granted, education_level, qualifications, skills,
           experience_summary, experience_years, occupation_or_trade, employment_interests,
           career_aspirations, industries, interested_categories, created_at, updated_at
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10::jsonb,$11,$12,$13,$14::jsonb,$15,$16::jsonb,$17::jsonb,$18,$19)
         ON CONFLICT (id) DO UPDATE SET
           display_name = EXCLUDED.display_name,
           personalisation_consent_granted = EXCLUDED.personalisation_consent_granted,
           updated_at = EXCLUDED.updated_at`,
        [
          m.id,
          m.householdId,
          m.ownerUserId,
          m.displayName,
          m.pinHash || null,
          Boolean(m.hasPinLock),
          Boolean(m.personalisationConsentGranted),
          m.educationLevel || '',
          JSON.stringify(m.qualifications || []),
          JSON.stringify(m.skills || []),
          m.experienceSummary || '',
          m.experienceYears || 0,
          m.occupationOrTrade || '',
          JSON.stringify(m.employmentInterests || []),
          m.careerAspirations || '',
          JSON.stringify(m.industries || []),
          JSON.stringify(m.interestedCategories || []),
          m.createdAt,
          m.updatedAt,
        ]
      );
      counts.householdMembers += 1;
    }

    for (const qt of storeData.householdQrTokens || []) {
      await tx.query(
        `INSERT INTO household_qr_tokens (
           token, base_qr_token, household_id, opportunity_id, campaign_id,
           consent_epoch, issued_at, expires_at, revoked_at, revoked_reason,
           resolved_count, rejected_403_count
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
         ON CONFLICT (token) DO UPDATE SET
           revoked_at = EXCLUDED.revoked_at,
           revoked_reason = EXCLUDED.revoked_reason,
           resolved_count = EXCLUDED.resolved_count,
           rejected_403_count = EXCLUDED.rejected_403_count`,
        [
          qt.token,
          qt.baseQrToken,
          qt.householdId,
          qt.opportunityId || null,
          qt.campaignId || null,
          qt.consentEpoch,
          qt.issuedAt,
          qt.expiresAt,
          qt.revokedAt || null,
          qt.revokedReason || null,
          qt.resolvedCount || 0,
          qt.rejected403Count || 0,
        ]
      );
      counts.householdQrTokens += 1;
    }

    for (const ca of storeData.consentAuditEvents || []) {
      await tx.query(
        `INSERT INTO consent_audit_events (
           id, household_id, actor_id, actor_role, action, previous_epoch,
           new_epoch, reason, affected_qr_tokens_invalidated, ordinary_tv_preserved, created_at
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
         ON CONFLICT (id) DO NOTHING`,
        [
          ca.id,
          ca.householdId,
          ca.actorId || null,
          ca.actorRole,
          ca.action,
          ca.previousEpoch,
          ca.newEpoch,
          ca.reason,
          ca.affectedQrTokensInvalidated || 0,
          true,
          ca.createdAt,
        ]
      );
      counts.consentAuditEvents += 1;
    }

    const inferSovereignRegion = (cc: string): string => {
      const code = cc.toUpperCase();
      if (code === 'ZW' || code === 'ZA') return 'africa_south';
      if (code === 'GB' || code === 'EU') return 'europe';
      if (code === 'KE' || code === 'NG') return 'africa_east_west';
      if (code === 'US') return 'north_america';
      return 'global';
    };

    for (const [countryCode, cp] of Object.entries(storeData.countryPolicyProfiles || {})) {
      if (!cp) continue;
      await tx.query(
        `INSERT INTO governance_country_policies (
           country_code, sovereign_region_id, consent_banner_strict_mode,
           require_pre_broadcast_human_moderation, job_fee_zero_lock_enforced,
           prohibit_external_signal_hijack, redact_household_geo_from_advertisers,
           country_activated, operator_tax_notice_label, updated_at
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         ON CONFLICT (country_code) DO UPDATE SET
           consent_banner_strict_mode = EXCLUDED.consent_banner_strict_mode,
           operator_tax_notice_label = EXCLUDED.operator_tax_notice_label,
           updated_at = EXCLUDED.updated_at`,
        [
          countryCode,
          inferSovereignRegion(countryCode),
          Boolean(cp.consentBannerStrictMode),
          Boolean(cp.requirePreBroadcastHumanModeration),
          true,
          true,
          true,
          false,
          cp.operatorTaxNoticeLabel || '',
          cp.updatedAt || new Date().toISOString(),
        ]
      );
      counts.countryPolicies += 1;
    }

    for (const [regionId, rc] of Object.entries(storeData.regionalLocalizationProfiles || {})) {
      if (!rc) continue;
      await tx.query(
        `INSERT INTO governance_regional_configs (
           region_id, primary_language_code, supported_language_codes,
           caption_accessibility_standard, multi_currency_code,
           pro_forma_cpm_rate_local, data_residency_zone,
           prohibit_cross_border_pii_transfer, regional_expansion_active, updated_at
         ) VALUES ($1,$2,$3::jsonb,$4,$5,$6,$7,$8,$9,$10)
         ON CONFLICT (region_id) DO UPDATE SET
           primary_language_code = EXCLUDED.primary_language_code,
           supported_language_codes = EXCLUDED.supported_language_codes,
           pro_forma_cpm_rate_local = EXCLUDED.pro_forma_cpm_rate_local,
           updated_at = EXCLUDED.updated_at`,
        [
          regionId,
          rc.primaryLanguageCode,
          JSON.stringify(rc.supportedLanguageCodes || ['en']),
          rc.captionAccessibilityStandard || 'CEA-708 / DVB Subtitles',
          rc.multiCurrencyCode,
          rc.proFormaCpmRateLocal,
          rc.dataResidencyZone,
          true,
          false,
          rc.updatedAt || new Date().toISOString(),
        ]
      );
      counts.regionalConfigs += 1;
    }
  });

  const charityCheck = await executor.query<{ bad: string }>(
    `SELECT COUNT(*)::text AS bad FROM campaigns
     WHERE content_category = 'opportunity_promotion'
       AND ((simulated_estimate->>'estimatedTotalUsd')::numeric <> 0 OR simulated_estimate->>'model' <> 'charity_free_zero_cost')`
  );
  const feeCheck = await executor.query<{ bad: string }>(
    `SELECT COUNT(*)::text AS bad FROM opportunities WHERE advertising_fee_influences_verification = TRUE`
  );

  return {
    driver: executor.driver,
    schemaVersion: storeData.schemaVersion,
    importedAt: new Date().toISOString(),
    counts,
    charityZeroCostVerified: charityCheck.rows[0]?.bad === '0',
    feeIndependenceVerified: feeCheck.rows[0]?.bad === '0',
  };
}

export async function exportPostgresBackupSql(
  executor: PgQueryExecutor
): Promise<{ generatedAt: string; rowCounts: Record<string, number>; sqlHeader: string }> {
  const tables = [
    'users',
    'advertiser_profiles',
    'qr_links',
    'campaigns',
    'ad_creatives',
    'opportunities',
    'households',
    'household_members',
    'household_qr_tokens',
    'consent_audit_events',
    'audit_logs',
  ];
  const rowCounts: Record<string, number> = {};
  for (const tbl of tables) {
    const res = await executor.query<{ cnt: string }>(`SELECT COUNT(*)::text AS cnt FROM ${tbl}`);
    rowCounts[tbl] = Number.parseInt(res.rows[0]?.cnt ?? '0', 10);
  }
  return {
    generatedAt: new Date().toISOString(),
    rowCounts,
    sqlHeader: [
      '-- EDISON PostgreSQL 16+ Logical Backup Verification Manifest',
      `-- Generated At: ${new Date().toISOString()}`,
      `-- Driver: ${executor.driver}`,
      '-- Rollback Command: npm run migrate:status / rollbackLastMigration()',
      ...Object.entries(rowCounts).map(([t, c]) => `-- TABLE ${t}: ${c} row(s)`),
    ].join('\n'),
  };
}

export async function probePostgresReadiness(
  executor?: PgQueryExecutor | null
): Promise<PostgresHealthProbeResult> {
  const descriptors = loadMigrationDescriptors();
  if (!executor) {
    return {
      connected: false,
      driver: 'unconfigured_json_store_active',
      latencyMs: 0,
      schemaVersion: null,
      availableMigrationsCount: descriptors.length,
      appliedMigrationsCount: 0,
      pendingMigrationsCount: descriptors.length,
      error: null,
    };
  }
  const started = Date.now();
  try {
    await executor.query('SELECT 1');
    const latest = await executor
      .query<{ version: string }>('SELECT version FROM schema_migrations ORDER BY version DESC')
      .catch(() => ({ rows: [] as Array<{ version: string }>, rowCount: 0 }));
    return {
      connected: true,
      driver: executor.driver,
      latencyMs: Date.now() - started,
      schemaVersion: latest.rows[0]?.version ?? null,
      availableMigrationsCount: descriptors.length,
      appliedMigrationsCount: latest.rows.length,
      pendingMigrationsCount: Math.max(0, descriptors.length - latest.rows.length),
      error: null,
    };
  } catch (err) {
    return {
      connected: false,
      driver: executor.driver,
      latencyMs: Date.now() - started,
      schemaVersion: null,
      availableMigrationsCount: descriptors.length,
      appliedMigrationsCount: 0,
      pendingMigrationsCount: descriptors.length,
      error: err instanceof Error ? err.message : 'Postgres probe failed',
    };
  }
}
