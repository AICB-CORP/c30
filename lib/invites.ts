// Invite-code gating logic, isolated so it can be unit-tested without Supabase.
//
// Invite codes are intentionally REUSABLE: a single code can be shared by many
// friends. The only thing that can block a code is an optional `max_uses` cap.

export interface InviteUsage {
  /** NULL = unlimited uses. */
  max_uses: number | null;
  /** How many accounts have already been created with this code. */
  uses_count: number;
}

/**
 * A code is usable when it exists and has not exhausted an optional usage cap.
 * A `null` cap means unlimited reuse (the shared friend code).
 */
export function isInviteUsable(invite: InviteUsage | null): boolean {
  if (!invite) return false;
  if (invite.max_uses !== null && invite.uses_count >= invite.max_uses) {
    return false;
  }
  return true;
}
