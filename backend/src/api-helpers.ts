/**
 * Shared request-value normalisers and case helpers for the API routes.
 */

import type { Prisma } from '@prisma/client';
import { prisma } from './db';
import { coarseStatusForStages } from './lifecycle-stages';

const materialityScoreByLevel: Record<string, number> = {
  Low: 2,
  Medium: 5,
  High: 8,
};

const sourceVerificationStatuses = ['Unverified', 'Verified', 'Needs checking', 'Broken'] as const;
const sourceConfidenceLevels = ['Official court source', 'Official regulator publication', 'Court-adjacent source', 'Secondary source', 'Unknown'] as const;
const caseLifecycleStatuses = ['Active', 'Pending', 'Settled', 'Dismissed', 'Closed'] as const;

export function normaliseMaterialityLevel(value: unknown) {
  const level = String(value || 'Low');
  return ['Low', 'Medium', 'High'].includes(level) ? level : 'Low';
}

export function scoreFromMateriality(value: unknown) {
  const level = normaliseMaterialityLevel(value);
  return materialityScoreByLevel[level] ?? 2;
}

export function normaliseSourceVerificationStatus(value: unknown) {
  const status = String(value || 'Unverified');
  return sourceVerificationStatuses.includes(status as typeof sourceVerificationStatuses[number]) ? status : 'Unverified';
}

export function normaliseCaseLifecycleStatus(value: unknown) {
  const status = String(value || 'Active');
  return caseLifecycleStatuses.includes(status as typeof caseLifecycleStatuses[number]) ? status : 'Active';
}

export function normaliseSourceConfidence(value: unknown) {
  const confidence = String(value || 'Unknown');
  return sourceConfidenceLevels.includes(confidence as typeof sourceConfidenceLevels[number]) ? confidence : 'Unknown';
}

export function normaliseMatchedKeywords(value: unknown) {
  if (!value) {
    return null;
  }

  if (Array.isArray(value)) {
    return JSON.stringify(value.filter((keyword): keyword is string => typeof keyword === 'string'));
  }

  return String(value);
}

export function normaliseOptionalBoolean(value: unknown) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const normalised = value.trim().toLowerCase();

    if (normalised === 'true') {
      return true;
    }

    if (normalised === 'false') {
      return false;
    }
  }

  return null;
}

export function normaliseOptionalScore(value: unknown) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  if (typeof value === 'string' && value.trim() === '') {
    return null;
  }

  const score = Number(value);

  if (!Number.isFinite(score) || score < 0 || score > 1) {
    return null;
  }

  return score;
}

export function slugifyCaseName(caseName: string) {
  return caseName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').substring(0, 100);
}

// Re-derives Case.caseLifecycleStatus from the case's whole stage tree, so
// the mirrored status follows the latest-dated stage rather than whichever
// stage happened to be entered last.
export async function syncCaseLifecycleStatus(tx: Prisma.TransactionClient, caseId: string) {
  const stages = await tx.lifecycleStage.findMany({ where: { caseId } });
  const caseLifecycleStatus = coarseStatusForStages(stages);

  return tx.case.update({ where: { id: caseId }, data: caseLifecycleStatus ? { caseLifecycleStatus } : {} });
}

export async function createUniqueCaseSlug(caseName: string) {
  const baseSlug = slugifyCaseName(caseName) || 'case';
  let slug = baseSlug;
  let suffix = 2;

  while (await prisma.case.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  return slug;
}

export function buildCandidateWhere(status: unknown) {
  if (!status) {
    return {};
  }

  return {
    candidateStatus: {
      in: String(status).split(','),
    },
  };
}
