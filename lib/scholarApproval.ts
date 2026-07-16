import type { ProfileRole } from './roles';
import { getRoleCode } from './roles';

export const scholarStatuses = ['pending', 'approved', 'suspended'] as const;

export type ScholarStatus = (typeof scholarStatuses)[number];

export type ScholarApprovalProfile = ProfileRole & {
  scholar_status: string | null;
};

export function normalizeScholarStatus(
  status: string | null | undefined
): ScholarStatus {
  return scholarStatuses.includes(status as ScholarStatus)
    ? (status as ScholarStatus)
    : 'pending';
}

export function isApprovedScholar(profile: ScholarApprovalProfile | null) {
  return (
    getRoleCode(profile) === 'scholar' &&
    normalizeScholarStatus(profile?.scholar_status) === 'approved'
  );
}
