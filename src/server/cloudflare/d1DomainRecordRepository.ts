import type {
  AdCreativeRecord,
  AnalyticsEventRecord,
  AdvertiserGeoAggregateRow,
  AdvertiserProfile,
  CommercialBoardDecisionRecord,
  CommercialCostAssumptionsInput,
  CampaignRecord,
  CampaignStatus,
  CountryJurisdictionPolicyConfig,
  CountryLaunchDecisionRecord,
  ConsentAuditEventRecord,
  DeliveryPreloadManifestResult,
  HouseholdMemberProfile,
  HouseholdQrTokenRecord,
  HouseholdInstallationRecord,
  HouseholdQrRedirectPersistenceState,
  InternationalExpansionDecisionRecord,
  TargetingGeographyCode,
  LiveReportSnapshot,
  OpportunityAppealRecord,
  OpportunityComplaintRecord,
  OpportunityRecord,
  PhysicalQrScanTestRecord,
  PilotCohortBlueprintRecord,
  QrLinkRecord,
  RegionalLocalizationConfig,
  ExpansionRegionId,
  StageP6StepId,
  ReliabilityChaosReport,
  PublicUser,
  SupportTicketRecord,
  SupportTicketStatus,
  SharedIntelPreviewState,
} from '../../types/edison.ts';
import type { CommercialDisputeRecord } from '../commercialDisputeEngine.ts';
import type { AuraPairedDeviceRecord } from '../auraRemoteEngine.ts';
import type { D1DatabaseBinding } from './d1BreakEventStore.ts';
import { D1ApplicationRecordStore } from './d1ApplicationRecordStore.ts';
import { computeAdvertiserGeoAggregates } from '../trackBHouseholdConsent.ts';

export class D1DomainRecordRepository {
  private readonly records: D1ApplicationRecordStore;

  constructor(database: D1DatabaseBinding) {
    this.records = new D1ApplicationRecordStore(database);
  }

  async getFoundationSummaryCounts(): Promise<
    Partial<Omit<LiveReportSnapshot['summary'], 'userCount' | 'auditLogCount'>>
  > {
    const count = (collection: string, filters?: Parameters<D1ApplicationRecordStore['count']>[1]) =>
      this.records.count(collection, filters);
    const [
      qrCount,
      campaignCount,
      activeCampaignCount,
      adCreativeCount,
      profileCount,
      openTickets,
      inReviewTickets,
      opportunityCount,
      verifiedLiveOpportunityCount,
      reportedComplaints,
      investigatingComplaints,
      submittedAppeals,
      reviewingAppeals,
      redirectRequestsTotal,
      redirectIssuedTotal,
      suspectedBotRedirects,
      verifiedDestinationOpens,
      verifiedConversionsTotal,
      simulatedEventsTotal,
      physicalQrTestsCount,
      physicalQrPassedCount,
    ] = await Promise.all([
      count('qr_links'),
      count('campaigns'),
      count('campaigns', { status: 'active' }),
      count('ad_creatives'),
      count('advertiser_profiles'),
      count('support_tickets', { status: 'open' }),
      count('support_tickets', { status: 'in_review' }),
      count('opportunities'),
      count('opportunities', { status: 'verified_live' }),
      count('opportunity_complaints', { status: 'reported' }),
      count('opportunity_complaints', { status: 'under_investigation' }),
      count('opportunity_appeals', { status: 'submitted' }),
      count('opportunity_appeals', { status: 'under_review' }),
      count('analytics_events', {
        eventType: 'redirect_requested',
        measurementSource: 'real_measured',
      }),
      count('analytics_events', {
        eventType: 'redirect_issued',
        measurementSource: 'real_measured',
      }),
      count('analytics_events', { eventType: 'redirect_requested', isSuspectedBot: true }),
      count('analytics_events', { eventType: 'destination_opened' }),
      count('analytics_events', { eventType: 'verified_conversion' }),
      count('analytics_events', { measurementSource: 'simulated_prototype' }),
      count('physical_qr_scan_tests'),
      count('physical_qr_scan_tests', { outcome: 'passed' }),
    ]);

    return {
      qrCount,
      campaignCount,
      activeCampaignCount,
      adCreativeCount,
      profileCount,
      openTicketCount: openTickets + inReviewTickets,
      opportunityCount,
      verifiedLiveOpportunityCount,
      openComplaintCount: reportedComplaints + investigatingComplaints,
      openAppealCount: submittedAppeals + reviewingAppeals,
      redirectRequestsTotal,
      redirectIssuedTotal,
      suspectedBotRedirects,
      verifiedDestinationOpens,
      verifiedConversionsTotal,
      simulatedEventsTotal,
      physicalQrTestsCount,
      physicalQrPassedCount,
      storagePath: 'Cloudflare D1 application-record store',
    };
  }

  async getCampaignStatusBreakdown(): Promise<Record<CampaignStatus, number>> {
    const statuses: CampaignStatus[] = [
      'draft',
      'submitted',
      'under_review',
      'approved',
      'rejected',
      'scheduled',
      'active',
      'paused',
      'completed',
      'expired',
    ];
    const counts = await Promise.all(
      statuses.map((status) => this.records.count('campaigns', { status }))
    );
    const breakdown = {} as Record<CampaignStatus, number>;
    statuses.forEach((status, index) => {
      breakdown[status] = counts[index];
    });
    return breakdown;
  }

  async getAdvertiserProfile(userId: string): Promise<AdvertiserProfile | null> {
    return this.records.get(
      'advertiser_profiles',
      userId,
      (value) => decodeAdvertiserProfile(value),
    );
  }

  async putAdvertiserProfile(profile: AdvertiserProfile): Promise<void> {
    await this.records.put(
      'advertiser_profiles',
      profile.userId,
      profile,
      (value) => decodeAdvertiserProfile(value),
      profile.userId,
    );
  }

  async listAdvertiserProfiles(): Promise<AdvertiserProfile[]> {
    const profiles = await this.records.list(
      'advertiser_profiles',
      (value) => decodeAdvertiserProfile(value),
    );
    return profiles.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }

  async listQrLinksForUser(userId: string): Promise<QrLinkRecord[]> {
    return this.records.list(
      'qr_links',
      (value) => decodeQrLink(value),
      { ownerId: userId },
    );
  }

  async listQrLinksForActor(user: PublicUser): Promise<QrLinkRecord[]> {
    const links =
      user.role === 'admin'
        ? await this.records.list('qr_links', (value) => decodeQrLink(value))
        : await this.records.list(
            'qr_links',
            (value) => decodeQrLink(value),
            { ownerId: user.id },
          );
    return links.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }

  async getQrLinkByToken(token: string): Promise<QrLinkRecord | null> {
    return this.records.get(
      'qr_links',
      token,
      (value) => decodeQrLink(value),
    );
  }

  async putQrLink(link: QrLinkRecord): Promise<void> {
    await this.records.put(
      'qr_links',
      link.token,
      link,
      (value) => decodeQrLink(value),
      link.ownerId,
    );
  }

  async deleteQrLink(token: string): Promise<void> {
    await this.records.delete('qr_links', token);
  }

  async listPhysicalQrScanTestsForUser(user: PublicUser): Promise<PhysicalQrScanTestRecord[]> {
    const records =
      user.role === 'admin'
        ? await this.records.list(
            'physical_qr_scan_tests',
            (value) => decodePhysicalQrScanTest(value),
          )
        : await this.records.list(
            'physical_qr_scan_tests',
            (value) => decodePhysicalQrScanTest(value),
            { ownerId: user.id },
          );
    return records.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }

  async getPhysicalQrScanTestForActor(
    user: PublicUser,
    testId: string,
  ): Promise<PhysicalQrScanTestRecord | null> {
    const record = await this.records.get(
      'physical_qr_scan_tests',
      testId,
      (value) => decodePhysicalQrScanTest(value),
    );
    if (!record) return null;
    if (user.role !== 'admin' && record.testerUserId !== user.id) {
      throw new Error('FORBIDDEN: You cannot read another user’s physical QR test log.');
    }
    return record;
  }

  async putPhysicalQrScanTest(record: PhysicalQrScanTestRecord): Promise<void> {
    await this.records.put(
      'physical_qr_scan_tests',
      record.id,
      record,
      (value) => decodePhysicalQrScanTest(value),
      record.testerUserId,
    );
  }

  async deletePhysicalQrScanTest(user: PublicUser, testId: string): Promise<void> {
    const record = await this.getPhysicalQrScanTestForActor(user, testId);
    if (!record) throw new Error('Physical QR scan test record not found.');
    await this.records.delete('physical_qr_scan_tests', testId);
  }

  async listPilotCohorts(): Promise<PilotCohortBlueprintRecord[]> {
    const cohorts = await this.records.list(
      'pilot_cohorts',
      (value) => decodePilotCohort(value),
    );
    return cohorts.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }

  async putPilotCohort(cohort: PilotCohortBlueprintRecord): Promise<void> {
    await this.records.put(
      'pilot_cohorts',
      cohort.id,
      cohort,
      (value) => decodePilotCohort(value),
    );
  }

  async listStageP6PrepNotes(): Promise<Array<{ stepId: StageP6StepId; ownerPrepNote: string }>> {
    const notes = await this.records.list(
      'stage_p6_prep_notes',
      (value) => decodeStageP6PrepNote(value),
    );
    return notes.map(({ stepId, ownerPrepNote }) => ({ stepId, ownerPrepNote }));
  }

  async putStageP6PrepNote(
    stepId: StageP6StepId,
    ownerPrepNote: string,
  ): Promise<void> {
    const record = { stepId, ownerPrepNote };
    await this.records.put(
      'stage_p6_prep_notes',
      stepId,
      record,
      (value) => decodeStageP6PrepNote(value),
    );
  }

  async getCommercialCostAssumptions(): Promise<CommercialCostAssumptionsInput | null> {
    return this.records.get(
      'commercial_cost_assumptions',
      'current',
      (value) => decodeCommercialCostAssumptions(value),
    );
  }

  async putCommercialCostAssumptions(
    assumptions: CommercialCostAssumptionsInput,
  ): Promise<void> {
    await this.records.put(
      'commercial_cost_assumptions',
      'current',
      assumptions,
      (value) => decodeCommercialCostAssumptions(value),
    );
  }

  async listCommercialBoardDecisions(): Promise<CommercialBoardDecisionRecord[]> {
    const decisions = await this.records.list(
      'commercial_board_decisions',
      (value) => decodeCommercialBoardDecision(value),
    );
    return decisions.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }

  async putCommercialBoardDecision(
    decision: CommercialBoardDecisionRecord,
  ): Promise<void> {
    await this.records.put(
      'commercial_board_decisions',
      decision.id,
      decision,
      (value) => decodeCommercialBoardDecision(value),
    );
  }

  async listCommercialDisputes(): Promise<CommercialDisputeRecord[]> {
    const disputes = await this.records.list(
      'commercial_disputes',
      (value) => decodeCommercialDispute(value),
    );
    return disputes.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }

  async putCommercialDispute(dispute: CommercialDisputeRecord): Promise<void> {
    await this.records.put(
      'commercial_disputes',
      dispute.id,
      dispute,
      (value) => decodeCommercialDispute(value),
      dispute.advertiserUserId,
    );
  }

  async listAuraDevicesForUser(user: PublicUser): Promise<AuraPairedDeviceRecord[]> {
    const devices =
      user.role === 'admin'
        ? await this.records.list(
            'aura_paired_devices',
            (value) => decodeAuraPairedDevice(value),
          )
        : await this.records.list(
            'aura_paired_devices',
            (value) => decodeAuraPairedDevice(value),
            { ownerId: user.id },
          );
    return devices
      .filter((device) => device.ownerUserId === user.id || user.role === 'admin')
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }

  async putAuraDevice(device: AuraPairedDeviceRecord): Promise<void> {
    await this.records.put(
      'aura_paired_devices',
      device.deviceId,
      device,
      (value) => decodeAuraPairedDevice(value),
      device.ownerUserId,
    );
  }

  async getSharedIntelPreviewState(): Promise<SharedIntelPreviewState | null> {
    return this.records.get(
      'shared_intel_preview',
      'latest',
      (value) => decodeSharedIntelPreview(value),
    );
  }

  async putSharedIntelPreviewState(state: SharedIntelPreviewState): Promise<void> {
    await this.records.put(
      'shared_intel_preview',
      'latest',
      state,
      (value) => decodeSharedIntelPreview(value),
    );
  }

  async listCountryPolicyProfiles(): Promise<CountryJurisdictionPolicyConfig[]> {
    const profiles = await this.records.list(
      'country_policy_profiles',
      (value) => decodeCountryPolicyProfile(value),
    );
    return profiles.sort((left, right) => left.countryCode.localeCompare(right.countryCode));
  }

  async putCountryPolicyProfile(profile: CountryJurisdictionPolicyConfig): Promise<void> {
    await this.records.put(
      'country_policy_profiles',
      profile.countryCode,
      profile,
      (value) => decodeCountryPolicyProfile(value),
    );
  }

  async listCountryLaunchDecisions(): Promise<CountryLaunchDecisionRecord[]> {
    const decisions = await this.records.list(
      'country_launch_decisions',
      (value) => decodeCountryLaunchDecision(value),
    );
    return decisions.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }

  async putCountryLaunchDecision(decision: CountryLaunchDecisionRecord): Promise<void> {
    await this.records.put(
      'country_launch_decisions',
      decision.id,
      decision,
      (value) => decodeCountryLaunchDecision(value),
    );
  }

  async listRegionalLocalizationProfiles(): Promise<RegionalLocalizationConfig[]> {
    const profiles = await this.records.list(
      'regional_localization_profiles',
      (value) => decodeRegionalLocalizationProfile(value),
    );
    return profiles.sort((left, right) => left.regionId.localeCompare(right.regionId));
  }

  async putRegionalLocalizationProfile(profile: RegionalLocalizationConfig): Promise<void> {
    await this.records.put(
      'regional_localization_profiles',
      profile.regionId,
      profile,
      (value) => decodeRegionalLocalizationProfile(value),
    );
  }

  async listInternationalExpansionDecisions(): Promise<InternationalExpansionDecisionRecord[]> {
    const decisions = await this.records.list(
      'international_expansion_decisions',
      (value) => decodeInternationalExpansionDecision(value),
    );
    return decisions.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }

  async putInternationalExpansionDecision(
    decision: InternationalExpansionDecisionRecord,
  ): Promise<void> {
    await this.records.put(
      'international_expansion_decisions',
      decision.id,
      decision,
      (value) => decodeInternationalExpansionDecision(value),
    );
  }

  async getLatestReliabilityChaosReport(): Promise<ReliabilityChaosReport | null> {
    return this.records.get(
      'reliability_chaos_reports',
      'latest',
      (value) => decodeReliabilityChaosReport(value),
    );
  }

  async putLatestReliabilityChaosReport(report: ReliabilityChaosReport): Promise<void> {
    await this.records.put(
      'reliability_chaos_reports',
      'latest',
      report,
      (value) => decodeReliabilityChaosReport(value),
    );
  }

  async listAnalyticsEvents(limit = 100): Promise<AnalyticsEventRecord[]> {
    const boundedLimit = Math.max(1, Math.min(500, Math.floor(limit)));
    const events = await this.records.list(
      'analytics_events',
      (value) => decodeAnalyticsEvent(value),
      { limit: boundedLimit },
    );
    return events.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }

  async putAnalyticsEvent(event: AnalyticsEventRecord, ownerId?: string): Promise<void> {
    await this.records.put(
      'analytics_events',
      event.id,
      event,
      (value) => decodeAnalyticsEvent(value),
      ownerId,
    );
  }

  async listCampaignsForUser(
    user: { id: string; role: string },
    statusFilter?: CampaignStatus | 'all',
  ): Promise<CampaignRecord[]> {
    const campaigns =
      user.role === 'admin'
        ? await this.records.list('campaigns', (value) => decodeCampaign(value))
        : await this.records.list(
            'campaigns',
            (value) => decodeCampaign(value),
            { ownerId: user.id },
          );
    return statusFilter && statusFilter !== 'all'
      ? campaigns.filter((campaign) => campaign.status === statusFilter)
      : campaigns;
  }

  async putCampaign(campaign: CampaignRecord): Promise<void> {
    await this.records.put(
      'campaigns',
      campaign.id,
      campaign,
      (value) => decodeCampaign(value),
      campaign.ownerId,
    );
  }

  async deleteCampaign(campaignId: string): Promise<void> {
    await this.records.delete('campaigns', campaignId);
  }

  async listDeliveryManifestsForActor(
    user: PublicUser,
  ): Promise<DeliveryPreloadManifestResult[]> {
    const manifests =
      user.role === 'admin'
        ? await this.records.list(
            'delivery_manifests',
            (value) => decodeDeliveryManifest(value),
          )
        : await this.records.list(
            'delivery_manifests',
            (value) => decodeDeliveryManifest(value),
            { ownerId: user.id },
          );
    return manifests.sort((left, right) => right.generatedAt.localeCompare(left.generatedAt));
  }

  async putDeliveryManifest(
    manifest: DeliveryPreloadManifestResult,
    ownerId: string,
  ): Promise<void> {
    await this.records.put(
      'delivery_manifests',
      manifest.manifestId,
      manifest,
      (value) => decodeDeliveryManifest(value),
      ownerId,
    );
  }

  async listSupportTicketsForUser(user: PublicUser): Promise<SupportTicketRecord[]> {
    const tickets =
      user.role === 'admin'
        ? await this.records.list('support_tickets', (value) => decodeSupportTicket(value))
        : await this.records.list(
            'support_tickets',
            (value) => decodeSupportTicket(value),
            { ownerId: user.id },
          );
    return tickets.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }

  async putSupportTicket(ticket: SupportTicketRecord): Promise<void> {
    await this.records.put(
      'support_tickets',
      ticket.id,
      ticket,
      (value) => decodeSupportTicket(value),
      ticket.ownerId,
    );
  }

  async listAdCreativesForUser(user: PublicUser): Promise<AdCreativeRecord[]> {
    const creatives =
      user.role === 'admin'
        ? await this.records.list('ad_creatives', (value) => decodeAdCreative(value))
        : await this.records.list(
            'ad_creatives',
            (value) => decodeAdCreative(value),
            { ownerId: user.id },
          );
    return creatives.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }

  async getAdCreativeById(creativeId: string): Promise<AdCreativeRecord | null> {
    return this.records.get(
      'ad_creatives',
      creativeId,
      (value) => decodeAdCreative(value),
    );
  }

  async putAdCreative(creative: AdCreativeRecord): Promise<void> {
    await this.records.put(
      'ad_creatives',
      creative.id,
      creative,
      (value) => decodeAdCreative(value),
      creative.ownerId,
    );
  }

  async deleteAdCreative(creativeId: string): Promise<void> {
    await this.records.delete('ad_creatives', creativeId);
  }

  async listOpportunitiesForUser(user: PublicUser): Promise<OpportunityRecord[]> {
    const opportunities = await this.records.list(
      'opportunities',
      (value) => decodeOpportunity(value),
    );
    return opportunities
      .filter(
        (opportunity) =>
          user.role === 'admin' ||
          opportunity.ownerId === user.id ||
          opportunity.status === 'verified_live' ||
          opportunity.status === 'expired',
      )
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }

  async putOpportunity(opportunity: OpportunityRecord): Promise<void> {
    await this.records.put(
      'opportunities',
      opportunity.id,
      opportunity,
      (value) => decodeOpportunity(value),
      opportunity.ownerId,
    );
  }

  async deleteOpportunity(opportunityId: string): Promise<void> {
    const [complaints, appeals] = await Promise.all([
      this.records.list(
        'opportunity_complaints',
        (value) => decodeOpportunityComplaint(value),
      ),
      this.records.list(
        'opportunity_appeals',
        (value) => decodeOpportunityAppeal(value),
      ),
    ]);
    for (const complaint of complaints.filter((item) => item.opportunityId === opportunityId)) {
      await this.records.delete('opportunity_complaints', complaint.id);
    }
    for (const appeal of appeals.filter((item) => item.opportunityId === opportunityId)) {
      await this.records.delete('opportunity_appeals', appeal.id);
    }
    await this.records.delete('opportunities', opportunityId);
  }

  async listOpportunityComplaintsForUser(
    user: PublicUser,
  ): Promise<OpportunityComplaintRecord[]> {
    const complaints = await this.records.list(
      'opportunity_complaints',
      (value) => decodeOpportunityComplaint(value),
    );
    if (user.role === 'admin') {
      return complaints.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
    }

    const opportunities = await this.records.list(
      'opportunities',
      (value) => decodeOpportunity(value),
      { ownerId: user.id },
    );
    const ownedOpportunityIds = new Set(opportunities.map((opportunity) => opportunity.id));
    return complaints
      .filter(
        (complaint) =>
          complaint.reporterId === user.id || ownedOpportunityIds.has(complaint.opportunityId),
      )
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }

  async putOpportunityComplaint(complaint: OpportunityComplaintRecord): Promise<void> {
    await this.records.put(
      'opportunity_complaints',
      complaint.id,
      complaint,
      (value) => decodeOpportunityComplaint(value),
    );
  }

  async listOpportunityAppealsForUser(user: PublicUser): Promise<OpportunityAppealRecord[]> {
    const appeals =
      user.role === 'admin'
        ? await this.records.list(
            'opportunity_appeals',
            (value) => decodeOpportunityAppeal(value),
          )
        : await this.records.list(
            'opportunity_appeals',
            (value) => decodeOpportunityAppeal(value),
            { ownerId: user.id },
          );
    return appeals.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }

  async putOpportunityAppeal(appeal: OpportunityAppealRecord): Promise<void> {
    await this.records.put(
      'opportunity_appeals',
      appeal.id,
      appeal,
      (value) => decodeOpportunityAppeal(value),
      appeal.ownerId,
    );
  }

  async listHouseholdsForUser(user: PublicUser): Promise<HouseholdInstallationRecord[]> {
    if (user.role !== 'admin' && user.role !== 'household_viewer') {
      throw new Error(
        'FORBIDDEN: Advertisers and opportunity submitters cannot list private household installations; use aggregate regional analytics only.',
      );
    }
    const households =
      user.role === 'admin'
        ? await this.records.list('households', (value) => decodeHousehold(value))
        : await this.records.list(
            'households',
            (value) => decodeHousehold(value),
            { ownerId: user.id },
          );
    return households.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }

  async getAdvertiserGeoAggregates(): Promise<AdvertiserGeoAggregateRow[]> {
    const households = await this.records.list(
      'households',
      (value) => decodeHousehold(value),
    );
    return computeAdvertiserGeoAggregates(households);
  }

  async getHouseholdForActor(
    user: PublicUser,
    householdId: string,
  ): Promise<HouseholdInstallationRecord | null> {
    const household = await this.records.get(
      'households',
      householdId,
      (value) => decodeHousehold(value),
    );
    if (!household) return null;

    if (
      process.env.NODE_ENV === 'production' &&
      (household.isPrototypeSeed || household.ownerUserId === 'usr_seed_viewer_01')
    ) {
      throw new Error(
        'FORBIDDEN: Prototype seed household fixtures and demo PINs are disabled in production environments.',
      );
    }
    if (user.role === 'admin') return household;
    if (user.role !== 'household_viewer' || household.ownerUserId !== user.id) {
      throw new Error(
        'FORBIDDEN: Privacy boundary prohibits advertisers, opportunity submitters, or other households from reading private household or profile data.',
      );
    }
    return household;
  }

  async putHousehold(household: HouseholdInstallationRecord): Promise<void> {
    await this.records.put(
      'households',
      household.id,
      household,
      (value) => decodeHousehold(value),
      household.ownerUserId,
    );
  }

  async listHouseholdMembersForActor(
    user: PublicUser,
    householdId: string,
  ): Promise<Array<Omit<HouseholdMemberProfile, 'pinHash'>>> {
    const members = await this.listHouseholdMemberPersistenceRecordsForActor(user, householdId);
    return members.map(({ pinHash: _pinHash, ...member }) => member);
  }

  async listHouseholdMemberPersistenceRecordsForActor(
    user: PublicUser,
    householdId: string,
  ): Promise<HouseholdMemberProfile[]> {
    const household = await this.getHouseholdForActor(user, householdId);
    if (!household) return [];
    const members =
      user.role === 'admin'
        ? await this.records.list(
            'household_members',
            (value) => decodeHouseholdMember(value),
          )
        : await this.records.list(
            'household_members',
            (value) => decodeHouseholdMember(value),
            { ownerId: household.ownerUserId },
          );
    return members
      .filter((member) => member.householdId === householdId)
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  }

  async putHouseholdMember(
    user: PublicUser,
    member: HouseholdMemberProfile,
  ): Promise<void> {
    const household = await this.getHouseholdForActor(user, member.householdId);
    if (!household || household.ownerUserId !== member.ownerUserId) {
      throw new Error('D1_DOMAIN_HOUSEHOLD_MEMBER_OWNER_MISMATCH');
    }
    await this.records.put(
      'household_members',
      member.id,
      member,
      (value) => decodeHouseholdMember(value),
      member.ownerUserId,
    );
  }

  async deleteHouseholdMember(
    user: PublicUser,
    householdId: string,
    memberId: string,
  ): Promise<void> {
    const household = await this.getHouseholdForActor(user, householdId);
    if (!household) return;
    const members =
      user.role === 'admin'
        ? await this.records.list(
            'household_members',
            (value) => decodeHouseholdMember(value),
          )
        : await this.records.list(
            'household_members',
            (value) => decodeHouseholdMember(value),
            { ownerId: household.ownerUserId },
          );
    if (members.some((member) => member.id === memberId && member.householdId === householdId)) {
      await this.records.delete('household_members', memberId);
    }
  }

  async listHouseholdQrTokensForActor(
    user: PublicUser,
    householdId: string,
  ): Promise<HouseholdQrTokenRecord[]> {
    const household = await this.getHouseholdForActor(user, householdId);
    if (!household) return [];
    const tokens =
      user.role === 'admin'
        ? await this.records.list('household_qr_tokens', (value) => decodeHouseholdQrToken(value))
        : await this.records.list(
            'household_qr_tokens',
            (value) => decodeHouseholdQrToken(value),
            { ownerId: household.ownerUserId },
          );
    return tokens
      .filter((token) => token.householdId === householdId)
      .sort((left, right) => right.issuedAt.localeCompare(left.issuedAt));
  }

  async putHouseholdQrToken(
    token: HouseholdQrTokenRecord,
    ownerUserId: string,
  ): Promise<void> {
    await this.records.put(
      'household_qr_tokens',
      token.token,
      token,
      (value) => decodeHouseholdQrToken(value),
      ownerUserId,
    );
  }

  async getHouseholdQrRedirectState(
    token: string,
  ): Promise<HouseholdQrRedirectPersistenceState | null> {
    const householdQrToken = await this.records.get(
      'household_qr_tokens',
      token,
      (value) => decodeHouseholdQrToken(value),
    );
    if (!householdQrToken) return null;

    const household = await this.records.get(
      'households',
      householdQrToken.householdId,
      (value) => decodeHousehold(value),
    );
    if (!household) {
      return {
        householdQrToken,
        household: null,
        opportunity: null,
        baseQrLink: null,
      };
    }

    const [opportunity, baseQrLink] = await Promise.all([
      householdQrToken.opportunityId
        ? this.records.get(
            'opportunities',
            householdQrToken.opportunityId,
            (value) => decodeOpportunity(value),
          )
        : Promise.resolve(null),
      this.records.get(
        'qr_links',
        householdQrToken.baseQrToken,
        (value) => decodeQrLink(value),
      ),
    ]);

    return {
      householdQrToken,
      household,
      opportunity,
      baseQrLink,
    };
  }

  async listConsentAuditEventsForActor(
    user: PublicUser,
    householdId: string,
  ): Promise<ConsentAuditEventRecord[]> {
    const household = await this.getHouseholdForActor(user, householdId);
    if (!household) return [];
    const events =
      user.role === 'admin'
        ? await this.records.list(
            'household_consent_audit',
            (value) => decodeConsentAuditEvent(value),
          )
        : await this.records.list(
            'household_consent_audit',
            (value) => decodeConsentAuditEvent(value),
            { ownerId: household.ownerUserId },
          );
    return events
      .filter((event) => event.householdId === householdId)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }

  async putConsentAuditEvent(
    event: ConsentAuditEventRecord,
    ownerUserId: string,
  ): Promise<void> {
    await this.records.put(
      'household_consent_audit',
      event.id,
      event,
      (value) => decodeConsentAuditEvent(value),
      ownerUserId,
    );
  }
}

function decodeAdvertiserProfile(value: unknown): AdvertiserProfile {
  if (
    typeof value !== 'object' ||
    value === null ||
    typeof (value as AdvertiserProfile).userId !== 'string' ||
    typeof (value as AdvertiserProfile).businessOrTradingName !== 'string' ||
    typeof (value as AdvertiserProfile).countryCode !== 'string' ||
    typeof (value as AdvertiserProfile).updatedAt !== 'string'
  ) {
    throw new Error('D1_DOMAIN_ADVERTISER_PROFILE_INVALID');
  }
  return value as AdvertiserProfile;
}

function decodeQrLink(value: unknown): QrLinkRecord {
  if (
    typeof value !== 'object' ||
    value === null ||
    typeof (value as QrLinkRecord).token !== 'string' ||
    typeof (value as QrLinkRecord).ownerId !== 'string' ||
    typeof (value as QrLinkRecord).label !== 'string' ||
    typeof (value as QrLinkRecord).createdAt !== 'string'
  ) {
    throw new Error('D1_DOMAIN_QR_LINK_INVALID');
  }
  return value as QrLinkRecord;
}

function decodeCampaign(value: unknown): CampaignRecord {
  if (
    typeof value !== 'object' ||
    value === null ||
    typeof (value as CampaignRecord).id !== 'string' ||
    typeof (value as CampaignRecord).ownerId !== 'string' ||
    typeof (value as CampaignRecord).title !== 'string' ||
    typeof (value as CampaignRecord).status !== 'string' ||
    typeof (value as CampaignRecord).createdAt !== 'string' ||
    typeof (value as CampaignRecord).updatedAt !== 'string'
  ) {
    throw new Error('D1_DOMAIN_CAMPAIGN_INVALID');
  }
  return value as CampaignRecord;
}

function decodeDeliveryManifest(value: unknown): DeliveryPreloadManifestResult {
  if (
    typeof value !== 'object' ||
    value === null ||
    typeof (value as DeliveryPreloadManifestResult).manifestId !== 'string' ||
    typeof (value as DeliveryPreloadManifestResult).generatedAt !== 'string' ||
    typeof (value as DeliveryPreloadManifestResult).expiresAt !== 'string' ||
    typeof (value as DeliveryPreloadManifestResult).manifestSha256 !== 'string' ||
    !Array.isArray((value as DeliveryPreloadManifestResult).items) ||
    !Array.isArray((value as DeliveryPreloadManifestResult).excluded) ||
    (value as DeliveryPreloadManifestResult).isSoftwareSimulationOnly !== true ||
    (value as DeliveryPreloadManifestResult).hardwareTested !== false ||
    (value as DeliveryPreloadManifestResult).ordinaryTvPreserved !== true
  ) {
    throw new Error('D1_DOMAIN_DELIVERY_MANIFEST_INVALID');
  }
  return value as DeliveryPreloadManifestResult;
}

function decodeSupportTicket(value: unknown): SupportTicketRecord {
  if (
    typeof value !== 'object' ||
    value === null ||
    typeof (value as SupportTicketRecord).id !== 'string' ||
    typeof (value as SupportTicketRecord).ownerId !== 'string' ||
    typeof (value as SupportTicketRecord).subject !== 'string' ||
    typeof (value as SupportTicketRecord).message !== 'string' ||
    typeof (value as SupportTicketRecord).status !== 'string' ||
    typeof (value as SupportTicketRecord).createdAt !== 'string' ||
    typeof (value as SupportTicketRecord).updatedAt !== 'string'
  ) {
    throw new Error('D1_DOMAIN_SUPPORT_TICKET_INVALID');
  }
  return value as SupportTicketRecord;
}

function decodeAdCreative(value: unknown): AdCreativeRecord {
  if (
    typeof value !== 'object' ||
    value === null ||
    typeof (value as AdCreativeRecord).id !== 'string' ||
    typeof (value as AdCreativeRecord).ownerId !== 'string' ||
    typeof (value as AdCreativeRecord).title !== 'string' ||
    typeof (value as AdCreativeRecord).mode !== 'string' ||
    typeof (value as AdCreativeRecord).createdAt !== 'string' ||
    typeof (value as AdCreativeRecord).updatedAt !== 'string'
  ) {
    throw new Error('D1_DOMAIN_AD_CREATIVE_INVALID');
  }
  return value as AdCreativeRecord;
}

function decodeOpportunity(value: unknown): OpportunityRecord {
  if (
    typeof value !== 'object' ||
    value === null ||
    typeof (value as OpportunityRecord).id !== 'string' ||
    typeof (value as OpportunityRecord).ownerId !== 'string' ||
    typeof (value as OpportunityRecord).title !== 'string' ||
    typeof (value as OpportunityRecord).status !== 'string' ||
    typeof (value as OpportunityRecord).verificationTiers !== 'object' ||
    !Array.isArray((value as OpportunityRecord).scamRiskFlags) ||
    typeof (value as OpportunityRecord).createdAt !== 'string' ||
    typeof (value as OpportunityRecord).updatedAt !== 'string'
  ) {
    throw new Error('D1_DOMAIN_OPPORTUNITY_INVALID');
  }
  return value as OpportunityRecord;
}

function decodeOpportunityComplaint(value: unknown): OpportunityComplaintRecord {
  if (
    typeof value !== 'object' ||
    value === null ||
    typeof (value as OpportunityComplaintRecord).id !== 'string' ||
    typeof (value as OpportunityComplaintRecord).opportunityId !== 'string' ||
    typeof (value as OpportunityComplaintRecord).reporterId !== 'string' ||
    typeof (value as OpportunityComplaintRecord).description !== 'string' ||
    typeof (value as OpportunityComplaintRecord).status !== 'string' ||
    typeof (value as OpportunityComplaintRecord).createdAt !== 'string' ||
    typeof (value as OpportunityComplaintRecord).updatedAt !== 'string'
  ) {
    throw new Error('D1_DOMAIN_OPPORTUNITY_COMPLAINT_INVALID');
  }
  return value as OpportunityComplaintRecord;
}

function decodeOpportunityAppeal(value: unknown): OpportunityAppealRecord {
  if (
    typeof value !== 'object' ||
    value === null ||
    typeof (value as OpportunityAppealRecord).id !== 'string' ||
    typeof (value as OpportunityAppealRecord).opportunityId !== 'string' ||
    typeof (value as OpportunityAppealRecord).ownerId !== 'string' ||
    typeof (value as OpportunityAppealRecord).reason !== 'string' ||
    typeof (value as OpportunityAppealRecord).status !== 'string' ||
    typeof (value as OpportunityAppealRecord).createdAt !== 'string' ||
    typeof (value as OpportunityAppealRecord).updatedAt !== 'string'
  ) {
    throw new Error('D1_DOMAIN_OPPORTUNITY_APPEAL_INVALID');
  }
  return value as OpportunityAppealRecord;
}

function decodeHousehold(value: unknown): HouseholdInstallationRecord {
  if (
    typeof value !== 'object' ||
    value === null ||
    typeof (value as HouseholdInstallationRecord).id !== 'string' ||
    typeof (value as HouseholdInstallationRecord).ownerUserId !== 'string' ||
    typeof (value as HouseholdInstallationRecord).householdLabel !== 'string' ||
    typeof (value as HouseholdInstallationRecord).location !== 'object' ||
    (value as HouseholdInstallationRecord).ordinaryTvPreserved !== true ||
    typeof (value as HouseholdInstallationRecord).consentEpoch !== 'number' ||
    typeof (value as HouseholdInstallationRecord).createdAt !== 'string' ||
    typeof (value as HouseholdInstallationRecord).updatedAt !== 'string'
  ) {
    throw new Error('D1_DOMAIN_HOUSEHOLD_INVALID');
  }
  const location = (value as HouseholdInstallationRecord).location;
  if (
    location === null ||
    typeof location.countryCode !== 'string' ||
    typeof location.provinceOrRegion !== 'string' ||
    typeof location.exactInstallationLocation !== 'string'
  ) {
    throw new Error('D1_DOMAIN_HOUSEHOLD_INVALID');
  }
  return value as HouseholdInstallationRecord;
}

function decodeHouseholdQrToken(value: unknown): HouseholdQrTokenRecord {
  if (
    typeof value !== 'object' ||
    value === null ||
    typeof (value as HouseholdQrTokenRecord).token !== 'string' ||
    typeof (value as HouseholdQrTokenRecord).householdId !== 'string' ||
    typeof (value as HouseholdQrTokenRecord).baseQrToken !== 'string' ||
    typeof (value as HouseholdQrTokenRecord).consentEpoch !== 'number' ||
    typeof (value as HouseholdQrTokenRecord).issuedAt !== 'string' ||
    typeof (value as HouseholdQrTokenRecord).expiresAt !== 'string'
  ) {
    throw new Error('D1_DOMAIN_HOUSEHOLD_QR_TOKEN_INVALID');
  }
  return value as HouseholdQrTokenRecord;
}

function decodeHouseholdMember(value: unknown): HouseholdMemberProfile {
  if (
    typeof value !== 'object' ||
    value === null ||
    typeof (value as HouseholdMemberProfile).id !== 'string' ||
    typeof (value as HouseholdMemberProfile).householdId !== 'string' ||
    typeof (value as HouseholdMemberProfile).ownerUserId !== 'string' ||
    typeof (value as HouseholdMemberProfile).displayName !== 'string' ||
    !(
      typeof (value as HouseholdMemberProfile).pinHash === 'string' ||
      (value as HouseholdMemberProfile).pinHash === null ||
      (value as HouseholdMemberProfile).pinHash === undefined
    ) ||
    typeof (value as HouseholdMemberProfile).hasPinLock !== 'boolean' ||
    typeof (value as HouseholdMemberProfile).personalisationConsentGranted !== 'boolean' ||
    !Array.isArray((value as HouseholdMemberProfile).qualifications) ||
    !Array.isArray((value as HouseholdMemberProfile).skills) ||
    !Array.isArray((value as HouseholdMemberProfile).employmentInterests) ||
    !Array.isArray((value as HouseholdMemberProfile).industries) ||
    !Array.isArray((value as HouseholdMemberProfile).interestedCategories) ||
    typeof (value as HouseholdMemberProfile).createdAt !== 'string' ||
    typeof (value as HouseholdMemberProfile).updatedAt !== 'string'
  ) {
    throw new Error('D1_DOMAIN_HOUSEHOLD_MEMBER_INVALID');
  }
  return value as HouseholdMemberProfile;
}

function decodeConsentAuditEvent(value: unknown): ConsentAuditEventRecord {
  if (
    typeof value !== 'object' ||
    value === null ||
    typeof (value as ConsentAuditEventRecord).id !== 'string' ||
    typeof (value as ConsentAuditEventRecord).householdId !== 'string' ||
    typeof (value as ConsentAuditEventRecord).action !== 'string' ||
    typeof (value as ConsentAuditEventRecord).reason !== 'string' ||
    typeof (value as ConsentAuditEventRecord).previousEpoch !== 'number' ||
    typeof (value as ConsentAuditEventRecord).newEpoch !== 'number' ||
    typeof (value as ConsentAuditEventRecord).createdAt !== 'string'
  ) {
    throw new Error('D1_DOMAIN_HOUSEHOLD_CONSENT_AUDIT_INVALID');
  }
  return value as ConsentAuditEventRecord;
}

function decodePhysicalQrScanTest(value: unknown): PhysicalQrScanTestRecord {
  if (
    typeof value !== 'object' ||
    value === null ||
    typeof (value as PhysicalQrScanTestRecord).id !== 'string' ||
    typeof (value as PhysicalQrScanTestRecord).testerUserId !== 'string' ||
    typeof (value as PhysicalQrScanTestRecord).testerEmail !== 'string' ||
    typeof (value as PhysicalQrScanTestRecord).qrToken !== 'string' ||
    typeof (value as PhysicalQrScanTestRecord).encodedRedirectUrl !== 'string' ||
    typeof (value as PhysicalQrScanTestRecord).resolvedTargetUrl !== 'string' ||
    typeof (value as PhysicalQrScanTestRecord).deviceModel !== 'string' ||
    !['iOS', 'Android', 'Other Mobile'].includes(
      (value as PhysicalQrScanTestRecord).osPlatform
    ) ||
    typeof (value as PhysicalQrScanTestRecord).cameraApp !== 'string' ||
    (value as PhysicalQrScanTestRecord).testMode !== 'physical_phone_camera' ||
    !['passed', 'failed'].includes((value as PhysicalQrScanTestRecord).outcome) ||
    typeof (value as PhysicalQrScanTestRecord).reachedRedirectEndpoint !== 'boolean' ||
    typeof (value as PhysicalQrScanTestRecord).landedDestinationObserved !== 'boolean' ||
    typeof (value as PhysicalQrScanTestRecord).timeToScanSeconds !== 'number' ||
    typeof (value as PhysicalQrScanTestRecord).observedRedirectIssuedAtLogTime !== 'number' ||
    typeof (value as PhysicalQrScanTestRecord).notes !== 'string' ||
    typeof (value as PhysicalQrScanTestRecord).createdAt !== 'string'
  ) {
    throw new Error('D1_DOMAIN_PHYSICAL_QR_SCAN_TEST_INVALID');
  }
  return value as PhysicalQrScanTestRecord;
}

function decodePilotCohort(value: unknown): PilotCohortBlueprintRecord {
  if (
    typeof value !== 'object' ||
    value === null ||
    typeof (value as PilotCohortBlueprintRecord).id !== 'string' ||
    typeof (value as PilotCohortBlueprintRecord).cohortName !== 'string' ||
    typeof (value as PilotCohortBlueprintRecord).targetCountryCode !== 'string' ||
    typeof (value as PilotCohortBlueprintRecord).targetArchitectureId !== 'string' ||
    typeof (value as PilotCohortBlueprintRecord).maxHouseholdsCap !== 'number' ||
    !Array.isArray((value as PilotCohortBlueprintRecord).enrolledHouseholdIds) ||
    typeof (value as PilotCohortBlueprintRecord).decOpen02ShortBreakRuleAcknowledged !== 'boolean' ||
    typeof (value as PilotCohortBlueprintRecord).decOpen03GamMockOnlyAcknowledged !== 'boolean' ||
    typeof (value as PilotCohortBlueprintRecord).status !== 'string' ||
    (value as PilotCohortBlueprintRecord).countryActivated !== false ||
    (value as PilotCohortBlueprintRecord).paymentCollectionActive !== false ||
    (value as PilotCohortBlueprintRecord).hardwareTested !== false ||
    (value as PilotCohortBlueprintRecord).pilotHardwareExecuted !== false ||
    (value as PilotCohortBlueprintRecord).stageP6Deferred !== true ||
    (value as PilotCohortBlueprintRecord).zeroPiiTelemetryEnforced !== true ||
    typeof (value as PilotCohortBlueprintRecord).createdByEmail !== 'string' ||
    typeof (value as PilotCohortBlueprintRecord).createdAt !== 'string' ||
    typeof (value as PilotCohortBlueprintRecord).updatedAt !== 'string' ||
    !/^[0-9a-f]{64}$/i.test((value as PilotCohortBlueprintRecord).cohortSha256)
  ) {
    throw new Error('D1_DOMAIN_PILOT_COHORT_INVALID');
  }
  return value as PilotCohortBlueprintRecord;
}

function decodeCommercialCostAssumptions(value: unknown): CommercialCostAssumptionsInput {
  const assumptions = value as CommercialCostAssumptionsInput | null;
  if (
    typeof assumptions !== 'object' ||
    assumptions === null ||
    !Number.isFinite(assumptions.activeHouseholdsEstimate) ||
    !Number.isFinite(assumptions.monthlyCommercialBreaksPerHousehold) ||
    !Number.isFinite(assumptions.estimatedDirectCampaignsCount) ||
    !Number.isFinite(assumptions.cdnEgressCostPerGbUsd) ||
    !Number.isFinite(assumptions.dbHostingTierMonthlyUsd) ||
    !Number.isFinite(assumptions.supportAgentHeadcount) ||
    !Number.isFinite(assumptions.moderationHoursPerWeek)
  ) {
    throw new Error('D1_DOMAIN_COMMERCIAL_COST_ASSUMPTIONS_INVALID');
  }
  return assumptions;
}

function decodeCommercialBoardDecision(value: unknown): CommercialBoardDecisionRecord {
  if (
    typeof value !== 'object' ||
    value === null ||
    typeof (value as CommercialBoardDecisionRecord).id !== 'string' ||
    typeof (value as CommercialBoardDecisionRecord).boardReviewerEmail !== 'string' ||
    ![
      'hold_software_ready_pending_external_gates',
      'defer_pending_stage_p6_and_compliance',
    ].includes((value as CommercialBoardDecisionRecord).decisionOutcome) ||
    typeof (value as CommercialBoardDecisionRecord).summaryNote !== 'string' ||
    (value as CommercialBoardDecisionRecord).commercialLaunchAuthorized !== false ||
    (value as CommercialBoardDecisionRecord).paymentCollectionActive !== false ||
    (value as CommercialBoardDecisionRecord).countryActivated !== false ||
    (value as CommercialBoardDecisionRecord).hardwareTested !== false ||
    !/^[0-9a-f]{64}$/i.test((value as CommercialBoardDecisionRecord).boardDecisionSha256) ||
    typeof (value as CommercialBoardDecisionRecord).createdAt !== 'string'
  ) {
    throw new Error('D1_DOMAIN_COMMERCIAL_BOARD_DECISION_INVALID');
  }
  return value as CommercialBoardDecisionRecord;
}

function decodeCountryPolicyProfile(value: unknown): CountryJurisdictionPolicyConfig {
  const profile = value as CountryJurisdictionPolicyConfig | null;
  const marketCodes: TargetingGeographyCode[] = ['ZW', 'GB', 'EU', 'US', 'ZA', 'KE_NG'];
  if (
    typeof profile !== 'object' ||
    profile === null ||
    !marketCodes.includes(profile.countryCode) ||
    typeof profile.consentBannerStrictMode !== 'boolean' ||
    typeof profile.requirePreBroadcastHumanModeration !== 'boolean' ||
    profile.jobFeeZeroLockEnforced !== true ||
    profile.prohibitExternalSignalHijack !== true ||
    profile.redactHouseholdGeoFromAdvertisers !== true ||
    typeof profile.enforceVppsOrLocalPrivacyLock !== 'boolean' ||
    typeof profile.operatorTaxNoticeLabel !== 'string' ||
    typeof profile.updatedAt !== 'string' ||
    typeof profile.updatedByEmail !== 'string'
  ) {
    throw new Error('D1_DOMAIN_COUNTRY_POLICY_PROFILE_INVALID');
  }
  return profile;
}

function decodeCountryLaunchDecision(value: unknown): CountryLaunchDecisionRecord {
  const decision = value as CountryLaunchDecisionRecord | null;
  const marketCodes: TargetingGeographyCode[] = ['ZW', 'GB', 'EU', 'US', 'ZA', 'KE_NG'];
  if (
    typeof decision !== 'object' ||
    decision === null ||
    typeof decision.id !== 'string' ||
    !marketCodes.includes(decision.countryCode) ||
    typeof decision.reviewerEmail !== 'string' ||
    ![
      'hold_country_unactivated_pending_clearances',
      'stage_software_ready_for_stage_p6_and_filing',
    ].includes(decision.decisionOutcome) ||
    typeof decision.summaryNote !== 'string' ||
    decision.countryActivated !== false ||
    decision.commercialLaunchAuthorized !== false ||
    decision.paymentCollectionActive !== false ||
    decision.hardwareTested !== false ||
    decision.legalComplianceClaimed !== false ||
    !/^[0-9a-f]{64}$/i.test(decision.decisionSha256) ||
    typeof decision.createdAt !== 'string'
  ) {
    throw new Error('D1_DOMAIN_COUNTRY_LAUNCH_DECISION_INVALID');
  }
  return decision;
}

function decodeRegionalLocalizationProfile(value: unknown): RegionalLocalizationConfig {
  const profile = value as RegionalLocalizationConfig | null;
  const regionIds: ExpansionRegionId[] = [
    'africa_south_zw_za',
    'europe_uk_eu',
    'africa_east_west_ke_ng',
    'north_america_us',
  ];
  if (
    typeof profile !== 'object' ||
    profile === null ||
    !regionIds.includes(profile.regionId) ||
    typeof profile.primaryLanguageCode !== 'string' ||
    !Array.isArray(profile.supportedLanguageCodes) ||
    typeof profile.captionAccessibilityStandard !== 'string' ||
    typeof profile.multiCurrencyCode !== 'string' ||
    typeof profile.proFormaCpmRateLocal !== 'number' ||
    typeof profile.dataResidencyZone !== 'string' ||
    profile.prohibitCrossBorderPiiTransfer !== true ||
    profile.charityZeroCostLocked !== true ||
    typeof profile.updatedAt !== 'string' ||
    typeof profile.updatedByEmail !== 'string'
  ) {
    throw new Error('D1_DOMAIN_REGIONAL_LOCALIZATION_PROFILE_INVALID');
  }
  return profile;
}

function decodeInternationalExpansionDecision(
  value: unknown,
): InternationalExpansionDecisionRecord {
  const decision = value as InternationalExpansionDecisionRecord | null;
  const regionIds: ExpansionRegionId[] = [
    'africa_south_zw_za',
    'europe_uk_eu',
    'africa_east_west_ke_ng',
    'north_america_us',
  ];
  if (
    typeof decision !== 'object' ||
    decision === null ||
    typeof decision.id !== 'string' ||
    !regionIds.includes(decision.regionId) ||
    typeof decision.reviewerEmail !== 'string' ||
    ![
      'hold_regions_unactivated_pending_p6_and_p14',
      'stage_multi_region_blueprint_for_post_launch',
    ].includes(decision.decisionOutcome) ||
    typeof decision.summaryNote !== 'string' ||
    decision.regionalExpansionActive !== false ||
    decision.countryActivated !== false ||
    decision.commercialLaunchAuthorized !== false ||
    decision.paymentCollectionActive !== false ||
    decision.hardwareTested !== false ||
    decision.legalComplianceClaimed !== false ||
    !/^[0-9a-f]{64}$/i.test(decision.decisionSha256) ||
    typeof decision.createdAt !== 'string'
  ) {
    throw new Error('D1_DOMAIN_INTERNATIONAL_EXPANSION_DECISION_INVALID');
  }
  return decision;
}

function decodeStageP6PrepNote(value: unknown): {
  stepId: StageP6StepId;
  ownerPrepNote: string;
} {
  const record = value as { stepId?: unknown; ownerPrepNote?: unknown } | null;
  const stepIds: StageP6StepId[] = [
    'P6-01',
    'P6-02',
    'P6-03',
    'P6-04',
    'P6-05',
    'P6-06',
    'P6-07',
    'P6-08',
  ];
  if (
    typeof record !== 'object' ||
    record === null ||
    typeof record.stepId !== 'string' ||
    !stepIds.includes(record.stepId as StageP6StepId) ||
    typeof record.ownerPrepNote !== 'string'
  ) {
    throw new Error('D1_DOMAIN_STAGE_P6_PREP_NOTE_INVALID');
  }
  return {
    stepId: record.stepId as StageP6StepId,
    ownerPrepNote: record.ownerPrepNote,
  };
}

function decodeReliabilityChaosReport(value: unknown): ReliabilityChaosReport {
  const report = value as ReliabilityChaosReport | null;
  if (
    typeof report !== 'object' ||
    report === null ||
    typeof report.reportId !== 'string' ||
    typeof report.executedAt !== 'string' ||
    typeof report.executedByEmail !== 'string' ||
    !(report.notes === undefined || typeof report.notes === 'string') ||
    report.isSoftwareSimulationOnly !== true ||
    report.hardwareTested !== false ||
    report.stageP6Deferred !== true ||
    report.realBroadcastTunerConnected !== false ||
    report.totalFailureModes !== 18 ||
    typeof report.passedFailureModes !== 'number' ||
    typeof report.failedFailureModes !== 'number' ||
    typeof report.all18Passed !== 'boolean' ||
    typeof report.ordinaryTvPreservedAll !== 'boolean' ||
    typeof report.zeroStuckOffLiveTv !== 'boolean' ||
    typeof report.maxRecoveryLatencyMs !== 'number' ||
    !/^[0-9a-f]{64}$/i.test(report.reportSha256) ||
    !Array.isArray(report.results)
  ) {
    throw new Error('D1_DOMAIN_RELIABILITY_CHAOS_REPORT_INVALID');
  }
  return report;
}

function decodeAnalyticsEvent(value: unknown): AnalyticsEventRecord {
  const event = value as AnalyticsEventRecord | null;
  const eventTypes = [
    'redirect_requested',
    'redirect_issued',
    'qr_scanned',
    'destination_opened',
    'verified_conversion',
    'ad_requested',
    'ad_delivered',
    'ad_played',
    'ad_viewable',
    'ad_network_backfill_simulated',
  ];
  const redirectOutcomes = [
    'issued',
    'not_found',
    'inactive',
    'flagged',
    'revoked_consent',
    'expired_token',
  ];
  if (
    typeof event !== 'object' ||
    event === null ||
    typeof event.id !== 'string' ||
    !(event.qrToken === null || typeof event.qrToken === 'string') ||
    !(event.campaignId === null || typeof event.campaignId === 'string') ||
    !eventTypes.includes(event.eventType) ||
    !['real_measured', 'simulated_prototype'].includes(event.measurementSource) ||
    typeof event.dedupKey !== 'string' ||
    !(event.isSuspectedBot === undefined || typeof event.isSuspectedBot === 'boolean') ||
    !(event.isDeduplicated === undefined || typeof event.isDeduplicated === 'boolean') ||
    !(
      event.redirectOutcome === undefined ||
      redirectOutcomes.includes(event.redirectOutcome)
    ) ||
    typeof event.createdAt !== 'string'
  ) {
    throw new Error('D1_DOMAIN_ANALYTICS_EVENT_INVALID');
  }
  return event;
}

function decodeCommercialDispute(value: unknown): CommercialDisputeRecord {
  const dispute = value as CommercialDisputeRecord | null;
  const disputeTypes = [
    'rate_card_adjustment',
    'delivery_shortfall_credit',
    'pro_forma_dispute',
    'charity_fee_zero_audit',
  ];
  const statuses = [
    'open',
    'under_review',
    'credit_approved_simulated',
    'rejected',
    'closed',
  ];
  if (
    typeof dispute !== 'object' ||
    dispute === null ||
    typeof dispute.id !== 'string' ||
    typeof dispute.advertiserUserId !== 'string' ||
    !(dispute.campaignId === null || typeof dispute.campaignId === 'string') ||
    typeof dispute.billingPeriodLabel !== 'string' ||
    !disputeTypes.includes(dispute.disputeType) ||
    !Number.isFinite(dispute.disputedAmountUsd) ||
    dispute.disputedAmountUsd < 0 ||
    !Number.isFinite(dispute.approvedCreditUsd) ||
    dispute.approvedCreditUsd < 0 ||
    dispute.approvedCreditUsd > dispute.disputedAmountUsd ||
    !statuses.includes(dispute.status) ||
    typeof dispute.reason !== 'string' ||
    typeof dispute.resolutionNote !== 'string' ||
    dispute.paymentCollectionActive !== false ||
    typeof dispute.charityZeroCostLocked !== 'boolean' ||
    (dispute.charityZeroCostLocked &&
      (dispute.disputedAmountUsd !== 0 || dispute.approvedCreditUsd !== 0)) ||
    (dispute.status !== 'credit_approved_simulated' && dispute.approvedCreditUsd !== 0) ||
    typeof dispute.createdAt !== 'string' ||
    typeof dispute.updatedAt !== 'string'
  ) {
    throw new Error('D1_DOMAIN_COMMERCIAL_DISPUTE_INVALID');
  }
  return dispute;
}

function decodeAuraPairedDevice(value: unknown): AuraPairedDeviceRecord {
  const device = value as AuraPairedDeviceRecord | null;
  const pairingStatuses = ['pending_pin', 'paired', 'reconnecting', 'disconnected'];
  const connectionStates = ['online', 'offline_queued', 'disconnected'];
  if (
    typeof device !== 'object' ||
    device === null ||
    typeof device.deviceId !== 'string' ||
    typeof device.ownerUserId !== 'string' ||
    !(device.householdId === null || typeof device.householdId === 'string') ||
    typeof device.tvLabel !== 'string' ||
    typeof device.platformId !== 'string' ||
    typeof device.pairingCode !== 'string' ||
    typeof device.qrPairingPayload !== 'string' ||
    !pairingStatuses.includes(device.pairingStatus) ||
    !connectionStates.includes(device.connectionState) ||
    !(device.activeProfileId === null || typeof device.activeProfileId === 'string') ||
    !Array.isArray(device.capabilities) ||
    !Array.isArray(device.offlineQueue) ||
    typeof device.reconnectAttemptCount !== 'number' ||
    typeof device.nextReconnectBackoffMs !== 'number' ||
    typeof device.tvState !== 'object' ||
    device.tvState === null ||
    typeof device.lastHeartbeatAt !== 'string' ||
    typeof device.createdAt !== 'string' ||
    typeof device.updatedAt !== 'string'
  ) {
    throw new Error('D1_DOMAIN_AURA_PAIRED_DEVICE_INVALID');
  }
  return device;
}

function decodeSharedIntelPreview(value: unknown): SharedIntelPreviewState {
  const state = value as SharedIntelPreviewState | null;
  if (
    typeof state !== 'object' ||
    state === null ||
    state.isPrototypeSimulation !== true ||
    typeof state.implementationNote !== 'string' ||
    typeof state.quorumThreshold !== 'number' ||
    typeof state.fprRollbackThresholdPct !== 'number' ||
    state.zeroPiiEnforced !== true ||
    typeof state.rejectedPiiAttemptCount !== 'number' ||
    !Array.isArray(state.bundles) ||
    !Array.isArray(state.deviceCaches) ||
    !Array.isArray(state.observations) ||
    !Array.isArray(state.auditTrail) ||
    state.observations.some(
      (observation) =>
        typeof observation !== 'object' ||
        observation === null ||
        typeof observation.id !== 'string' ||
        typeof observation.tvDeviceId !== 'string' ||
        typeof observation.scopeId !== 'string' ||
        observation.containsPii !== false ||
        typeof observation.createdAt !== 'string'
    )
  ) {
    throw new Error('D1_DOMAIN_SHARED_INTEL_PREVIEW_INVALID');
  }
  return state;
}
