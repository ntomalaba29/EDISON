import crypto from 'node:crypto';
import type { CampaignRecord, RevenueLedgerSnapshot } from '../types/edison.ts';

export type CommercialDisputeType =
  | 'rate_card_adjustment'
  | 'delivery_shortfall_credit'
  | 'pro_forma_dispute'
  | 'charity_fee_zero_audit';

export type CommercialDisputeStatus =
  | 'open'
  | 'under_review'
  | 'credit_approved_simulated'
  | 'rejected'
  | 'closed';

export interface CommercialDisputeRecord {
  id: string;
  advertiserUserId: string;
  campaignId: string | null;
  billingPeriodLabel: string;
  disputeType: CommercialDisputeType;
  disputedAmountUsd: number;
  approvedCreditUsd: number;
  status: CommercialDisputeStatus;
  reason: string;
  resolutionNote: string;
  paymentCollectionActive: false;
  charityZeroCostLocked: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CommercialReconciliationSummary {
  generatedAt: string;
  paymentCollectionActive: false;
  charityCampaignsTotalUsd: 0;
  directPaidProjectedUsd: number;
  adNetworkMockBackfillUsd: number;
  approvedSimulatedCreditsUsd: number;
  netProjectedCommercialUsd: number;
  openDisputesCount: number;
  priorityRuleVerified: true;
}

export class CommercialDisputeEngine {
  private readonly disputes = new Map<string, CommercialDisputeRecord>();

  submitDispute(params: {
    advertiserUserId: string;
    campaign: CampaignRecord | null;
    billingPeriodLabel: string;
    disputeType: CommercialDisputeType;
    disputedAmountUsd: number;
    reason: string;
  }): CommercialDisputeRecord {
    const isCharity = params.campaign?.contentCategory === 'opportunity_promotion';
    if (isCharity && params.disputedAmountUsd > 0) {
      throw new Error(
        'CHARITY_PERMANENT_ZERO_LOCK: Charity & opportunity listings are permanently $0.00 / FREE; non-zero billing disputes are invalid.'
      );
    }

    const id = `disp_${crypto.randomBytes(5).toString('hex')}`;
    const now = new Date().toISOString();
    const record: CommercialDisputeRecord = {
      id,
      advertiserUserId: params.advertiserUserId,
      campaignId: params.campaign?.id ?? null,
      billingPeriodLabel: params.billingPeriodLabel.trim(),
      disputeType: params.disputeType,
      disputedAmountUsd: isCharity ? 0 : Math.max(0, Number(params.disputedAmountUsd.toFixed(2))),
      approvedCreditUsd: 0,
      status: 'open',
      reason: params.reason.trim(),
      resolutionNote: '',
      paymentCollectionActive: false,
      charityZeroCostLocked: isCharity,
      createdAt: now,
      updatedAt: now,
    };
    this.disputes.set(id, record);
    return record;
  }

  resolveDispute(params: {
    disputeId: string;
    decision: 'credit_approved_simulated' | 'rejected' | 'closed';
    approvedCreditUsd: number;
    resolutionNote: string;
  }): CommercialDisputeRecord {
    const existing = this.disputes.get(params.disputeId);
    if (!existing) {
      throw new Error('COMMERCIAL_DISPUTE_NOT_FOUND');
    }
    const cappedCredit = existing.charityZeroCostLocked
      ? 0
      : Math.min(existing.disputedAmountUsd, Math.max(0, Number(params.approvedCreditUsd.toFixed(2))));
    existing.status = params.decision;
    existing.approvedCreditUsd = params.decision === 'credit_approved_simulated' ? cappedCredit : 0;
    existing.resolutionNote = params.resolutionNote.trim();
    existing.updatedAt = new Date().toISOString();
    return existing;
  }

  listDisputes(filter?: { advertiserUserId?: string }): CommercialDisputeRecord[] {
    let items = Array.from(this.disputes.values());
    if (filter?.advertiserUserId) {
      items = items.filter((d) => d.advertiserUserId === filter.advertiserUserId);
    }
    return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  replaceDisputesFromPersistence(records: CommercialDisputeRecord[]): void {
    this.disputes.clear();
    for (const dispute of records) {
      this.disputes.set(dispute.id, { ...dispute });
    }
  }

  reconcileRevenueStreams(
    ledger: RevenueLedgerSnapshot,
    persistedDisputes?: CommercialDisputeRecord[]
  ): CommercialReconciliationSummary {
    const directRow = ledger.streams.find((s) => s.stream === 'direct_commercial_paid');
    const backfillRow = ledger.streams.find((s) => s.stream === 'ad_network_estimated');
    const allDisputes = persistedDisputes ?? this.listDisputes();
    const approvedCredits = Number(
      allDisputes
        .filter((d) => d.status === 'credit_approved_simulated')
        .reduce((sum, d) => sum + d.approvedCreditUsd, 0)
        .toFixed(2)
    );
    const directUsd = directRow?.amountUsd ?? 0;

    return {
      generatedAt: new Date().toISOString(),
      paymentCollectionActive: false,
      charityCampaignsTotalUsd: 0,
      directPaidProjectedUsd: directUsd,
      adNetworkMockBackfillUsd: backfillRow?.amountUsd ?? 0,
      approvedSimulatedCreditsUsd: approvedCredits,
      netProjectedCommercialUsd: Number(Math.max(0, directUsd - approvedCredits).toFixed(2)),
      openDisputesCount: allDisputes.filter((d) => d.status === 'open' || d.status === 'under_review').length,
      priorityRuleVerified: true,
    };
  }
}

export const commercialDisputeEngine = new CommercialDisputeEngine();
