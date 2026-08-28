import { describe, expect, it } from 'vitest';
import { canIssueRegistrationInvite } from '@/lib/auth/invite-authorization';

describe('registration invitation authorization', () => {
  it('allows a Sites-authenticated visitor to bootstrap an empty owner-only Site', () => {
    expect(canIssueRegistrationInvite({
      creatorId: 'site-scoped-owner-id',
      isConfiguredAdmin: false,
      hasRegisteredUsers: false,
    })).toBe(true);
  });

  it('still requires the configured admin allowlist after registration', () => {
    expect(canIssueRegistrationInvite({
      creatorId: 'site-scoped-visitor-id',
      isConfiguredAdmin: false,
      hasRegisteredUsers: true,
    })).toBe(false);
    expect(canIssueRegistrationInvite({
      creatorId: 'configured-admin-id',
      isConfiguredAdmin: true,
      hasRegisteredUsers: true,
    })).toBe(true);
  });

  it('never allows a request without a Sites-authenticated identity', () => {
    expect(canIssueRegistrationInvite({
      creatorId: null,
      isConfiguredAdmin: true,
      hasRegisteredUsers: false,
    })).toBe(false);
  });
});
