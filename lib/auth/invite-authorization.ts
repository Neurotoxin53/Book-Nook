export function canIssueRegistrationInvite(input: {
  creatorId: string | null;
  isConfiguredAdmin: boolean;
  hasRegisteredUsers: boolean;
}) {
  if (!input.creatorId) return false;
  return input.isConfiguredAdmin || !input.hasRegisteredUsers;
}
