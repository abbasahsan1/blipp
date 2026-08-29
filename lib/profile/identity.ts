import type { Account, Creator } from '@/lib/types';

/** Row shape of the `profiles` table. */
export interface ProfileRow {
  id: string;
  display_name: string;
  handle: string | null;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
}

/** Gradient pairs used for initials avatars when a profile has no photo. */
const AVATAR_GRADIENTS: [string, string][] = [
  ['#8B5CF6', '#22D3EE'],
  ['#F472B6', '#8B5CF6'],
  ['#22D3EE', '#3B82F6'],
  ['#FBBF24', '#F97316'],
  ['#34D399', '#22D3EE'],
  ['#FB7185', '#F59E0B'],
];

function hashOf(seed: string): number {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) % 1_000_003;
  }
  return hash;
}

/** Stable gradient for a given user, so their avatar never changes colour. */
export function gradientForSeed(seed: string): [string, string] {
  return AVATAR_GRADIENTS[hashOf(seed) % AVATAR_GRADIENTS.length];
}

export function initialsFrom(name: string, email?: string | null): string {
  const words = name
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0);

  if (words.length >= 2) {
    return `${words[0][0]}${words[1][0]}`.toUpperCase();
  }
  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }
  return (email ?? '?').slice(0, 2).toUpperCase();
}

export function handleFrom(name: string, email: string): string {
  const fromName = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
  const base = fromName.length > 1 ? fromName : email.split('@')[0].replace(/[^a-z0-9]+/g, '');
  return `@${(base || 'listener').slice(0, 20)}`;
}

/** Suggested display name for a brand new account. */
export function suggestedNameFrom(
  metadata: Record<string, unknown> | undefined,
  email: string | null,
): string {
  const candidates = ['full_name', 'name', 'preferred_username', 'user_name'];
  for (const key of candidates) {
    const value = metadata?.[key];
    if (typeof value === 'string' && value.trim().length > 0) return value.trim();
  }
  if (!email) return '';
  const local = email.split('@')[0].replace(/[._-]+/g, ' ');
  return local.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function formatMemberSince(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Recently';
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

/** Maps a profile row onto the creator shown on that account's posts. */
export function toCreator(row: ProfileRow): Creator {
  const name = row.display_name.trim();
  return {
    id: row.id,
    name,
    handle: row.handle ?? handleFrom(name, ''),
    initials: initialsFrom(name),
    gradient: gradientForSeed(row.id),
    avatarUrl: row.avatar_url,
    bio: row.bio ?? '',
  };
}

/** The signed-in user's own profile, with the account details only they see. */
export function toAccount(row: ProfileRow, email: string | null): Account {
  const creator = toCreator(row);
  return {
    ...creator,
    initials: initialsFrom(creator.name, email),
    email: email ?? '',
    memberSince: formatMemberSince(row.created_at),
  };
}
