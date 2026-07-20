import type { RequestStatus } from '@prisma/client';

export type RequestAction = 'approve' | 'reject' | 'in_review' | 'needs_info';

const TRANSITIONS: Record<RequestStatus, readonly RequestAction[]> = {
  SUBMITTED: ['in_review', 'reject'],
  IN_REVIEW: ['approve', 'reject', 'needs_info'],
  NEEDS_INFO: ['in_review', 'reject'],
  APPROVED: [],
  GENERATED: [],
  SENT: [],
  REJECTED: [],
};

const TARGET_STATUS: Record<RequestAction, RequestStatus> = {
  approve: 'APPROVED',
  reject: 'REJECTED',
  in_review: 'IN_REVIEW',
  needs_info: 'NEEDS_INFO',
};

export function canTransition(from: RequestStatus, action: RequestAction) {
  return TRANSITIONS[from].includes(action);
}

export function targetStatusFor(action: RequestAction): RequestStatus {
  return TARGET_STATUS[action];
}
