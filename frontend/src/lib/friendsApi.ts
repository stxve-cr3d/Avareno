import { api } from "./api";

/* Real friends API (backend: /api/friends). v1 = invite + accept + list.
   No shared progress (XP/streak) yet — that is a deliberate v2 with
   server-side privacy enforcement. */

export type ApiFriend = {
  id: string; // the friend's userId
  friendshipId: string;
  displayName: string;
  avatarUrl?: string | null;
  status: string; // "accepted"
  addedAt: string;
  // v2 progress — null when the friend's privacy prefs hide it (enforced server-side).
  weeklyXp?: number | null;
  currentStreakDays?: number | null;
  hidesXp?: boolean;
  hidesStreak?: boolean;
};

export type SelfProgress = {
  weeklyXp: number;
  currentStreakDays: number;
};

export type MotivationPrivacy = {
  motivationEnabled: boolean;
  leaderboardEnabled: boolean;
  hideXpFromFriends: boolean;
  hideStreakFromFriends: boolean;
  allowFriendInvites: boolean;
};

export type ApiInvite = {
  id: string;
  inviteCode: string;
  status: string; // "active"
  createdAt: string;
  expiresAt?: string | null;
};

export type FriendsOverview = {
  friends: ApiFriend[];
  invite: ApiInvite;
  self: SelfProgress;
};

export function getFriendsOverview() {
  return api<FriendsOverview>("/api/friends");
}

export function getPrivacy() {
  return api<MotivationPrivacy>("/api/friends/privacy");
}

export function patchPrivacy(patch: Partial<MotivationPrivacy>) {
  return api<MotivationPrivacy>("/api/friends/privacy", {
    method: "PATCH",
    body: JSON.stringify(patch)
  });
}

export function rotateInvite() {
  return api<ApiInvite>("/api/friends/invite/rotate", { method: "POST" });
}

export type ApiCircleMember = { id: string; displayName: string; avatarUrl?: string | null };
export type ApiCircle = { id: string; name: string; createdAt: string; members: ApiCircleMember[] };

export function getCircles() {
  return api<{ circles: ApiCircle[] }>("/api/friends/circles");
}

export function createCircle(name: string) {
  return api<ApiCircle>("/api/friends/circles", { method: "POST", body: JSON.stringify({ name }) });
}

export function deleteCircle(id: string) {
  return api<{ removed: boolean }>(`/api/friends/circles/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export function addCircleMember(id: string, friendUserId: string) {
  return api<ApiCircle>(`/api/friends/circles/${encodeURIComponent(id)}/members`, {
    method: "POST",
    body: JSON.stringify({ friendUserId })
  });
}

export function removeCircleMember(id: string, friendUserId: string) {
  return api<ApiCircle>(`/api/friends/circles/${encodeURIComponent(id)}/members/${encodeURIComponent(friendUserId)}`, {
    method: "DELETE"
  });
}

export function acceptInvite(code: string) {
  return api<{ friend: ApiFriend; alreadyConnected: boolean }>("/api/friends/accept", {
    method: "POST",
    body: JSON.stringify({ code })
  });
}

export function removeFriend(friendUserId: string) {
  return api<{ removed: boolean }>(`/api/friends/${encodeURIComponent(friendUserId)}`, { method: "DELETE" });
}
