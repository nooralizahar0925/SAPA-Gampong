import { describe, expect, it } from 'vitest';
import { canTransition, targetStatusFor } from '../src/modules/requests/state-machine';

describe('request state machine', () => {
  it('allows only the legal transitions from the plan', () => {
    expect(canTransition('SUBMITTED', 'in_review')).toBe(true);
    expect(canTransition('SUBMITTED', 'approve')).toBe(false);

    expect(canTransition('IN_REVIEW', 'approve')).toBe(true);
    expect(canTransition('IN_REVIEW', 'needs_info')).toBe(true);

    expect(canTransition('NEEDS_INFO', 'in_review')).toBe(true);
    expect(canTransition('NEEDS_INFO', 'approve')).toBe(false);

    expect(canTransition('APPROVED', 'reject')).toBe(false);
    expect(canTransition('GENERATED', 'approve')).toBe(false);
    expect(canTransition('SENT', 'reject')).toBe(false);
    expect(canTransition('REJECTED', 'in_review')).toBe(false);
  });

  it('maps actions to their target statuses', () => {
    expect(targetStatusFor('approve')).toBe('APPROVED');
    expect(targetStatusFor('reject')).toBe('REJECTED');
    expect(targetStatusFor('in_review')).toBe('IN_REVIEW');
    expect(targetStatusFor('needs_info')).toBe('NEEDS_INFO');
  });
});
