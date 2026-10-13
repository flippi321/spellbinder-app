import type { CollectionItem, Game, LoanRequest, Profile, Rsvp, RsvpStatus } from '@/types';

export const goingCount = (rsvps: readonly Rsvp[]) => rsvps.filter((rsvp) => rsvp.status === 'going').length;

export const rsvpOf = (rsvps: readonly Rsvp[], userId: string): RsvpStatus | null =>
  rsvps.find((rsvp) => rsvp.userId === userId)?.status ?? null;

export interface LeaderboardRow {
  profile: Profile;
  wins: number;
}

/** Wins per member (members without wins included), most wins first. */
export function leaderboard(games: readonly Game[], members: readonly Profile[]): LeaderboardRow[] {
  const wins = new Map<string, number>();
  for (const game of games) wins.set(game.winnerId, (wins.get(game.winnerId) ?? 0) + 1);
  return members
    .map((profile) => ({ profile, wins: wins.get(profile.id) ?? 0 }))
    .sort((a, b) => b.wins - a.wins || a.profile.displayName.localeCompare(b.profile.displayName));
}

/** Pending requests other members sent you. */
export const incomingRequests = (loans: readonly LoanRequest[], me: string) =>
  loans.filter((loan) => loan.ownerId === me && loan.status === 'pending');

/** Pending requests you sent. */
export const outgoingRequests = (loans: readonly LoanRequest[], me: string) =>
  loans.filter((loan) => loan.requesterId === me && loan.status === 'pending');

export interface ActiveLoan {
  loan: LoanRequest;
  /** borrowed: you have a friend's card. lent: a friend has yours. */
  direction: 'borrowed' | 'lent';
  otherId: string;
}

export function activeLoans(loans: readonly LoanRequest[], me: string): ActiveLoan[] {
  return loans
    .filter((loan) => loan.status === 'lent' && (loan.requesterId === me || loan.ownerId === me))
    .map((loan) =>
      loan.requesterId === me
        ? { loan, direction: 'borrowed' as const, otherId: loan.ownerId }
        : { loan, direction: 'lent' as const, otherId: loan.requesterId },
    );
}

export interface WhoHasResult {
  cardId: string;
  name: string;
  owners: { userId: string; quantity: number }[];
}

/** "Who has it?" — cards matching `query` across the group's collections (yours included). */
export function whoHas(
  query: string,
  items: readonly CollectionItem[],
  nameOf: (cardId: string) => string | undefined,
  limit = 25,
): WhoHasResult[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  const results = new Map<string, WhoHasResult>();
  for (const item of items) {
    if (item.quantity <= 0) continue;
    const name = nameOf(item.cardId);
    if (!name || !name.toLowerCase().includes(q)) continue;
    const result = results.get(item.cardId) ?? { cardId: item.cardId, name, owners: [] };
    const owner = result.owners.find((o) => o.userId === item.userId);
    if (owner) owner.quantity += item.quantity;
    else result.owners.push({ userId: item.userId, quantity: item.quantity });
    results.set(item.cardId, result);
  }
  return [...results.values()].sort((a, b) => a.name.localeCompare(b.name)).slice(0, limit);
}
