import { CREATORS_BY_ID, MY_CREATOR_ID } from '@/lib/mockData';
import type { Account, Creator } from '@/lib/types';

/**
 * Resolves the creator shown on a post. Posts published from this device carry
 * the local creator id, so once someone is signed in their own profile — name,
 * handle and avatar — is what renders on them.
 */
export function creatorFor(creatorId: string, account: Account | null): Creator | undefined {
  if (creatorId === MY_CREATOR_ID && account) return account;
  return CREATORS_BY_ID[creatorId];
}
