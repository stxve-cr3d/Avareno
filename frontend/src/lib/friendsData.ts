import type { Friend, FriendCircle, FriendInvite, UserProfile } from "./types";

export type MotivationPrivacyPreferences = {
  motivationEnabled: boolean;
  leaderboardEnabled: boolean;
  hideXpFromFriends: boolean;
  hideStreakFromFriends: boolean;
  allowFriendInvites: boolean;
};

export type FriendProgress = Friend & {
  weeklyXp: number;
  helpfulActions: number;
  currentStreakDays: number;
  consistencyScore: number;
  label: string;
  note: string;
  sourceBreakdown: { label: string; count: number }[];
  hidesXp?: boolean;
  hidesStreak?: boolean;
  isCurrentUser?: boolean;
};

export const defaultMotivationPrivacy: MotivationPrivacyPreferences = {
  motivationEnabled: true,
  leaderboardEnabled: true,
  hideXpFromFriends: false,
  hideStreakFromFriends: true,
  allowFriendInvites: true
};

export const mockFriends: FriendProgress[] = [
  {
    id: "friend_alex",
    displayName: "Alex",
    avatarUrl: null,
    status: "accepted",
    addedAt: "2026-06-18T13:20:00.000Z",
    weeklyXp: 220,
    helpfulActions: 6,
    currentStreakDays: 4,
    consistencyScore: 72,
    label: "Diese Woche aktiv",
    note: "Hat Belege und eine Erinnerung gepflegt.",
    sourceBreakdown: [
      { label: "Belege", count: 2 },
      { label: "Erinnerungen", count: 2 },
      { label: "Resolve", count: 1 }
    ]
  },
  {
    id: "friend_nina",
    displayName: "Nina",
    avatarUrl: null,
    status: "accepted",
    addedAt: "2026-06-14T09:10:00.000Z",
    weeklyXp: 150,
    helpfulActions: 4,
    currentStreakDays: 8,
    consistencyScore: 88,
    label: "Drangeblieben",
    note: "Zeigt XP privat, bleibt aber im Kreis sichtbar.",
    sourceBreakdown: [
      { label: "Dinge", count: 1 },
      { label: "Dokumente", count: 2 },
      { label: "Care", count: 1 }
    ],
    hidesXp: true
  },
  {
    id: "friend_max",
    displayName: "Max",
    avatarUrl: null,
    status: "accepted",
    addedAt: "2026-06-10T17:45:00.000Z",
    weeklyXp: 60,
    helpfulActions: 2,
    currentStreakDays: 2,
    consistencyScore: 46,
    label: "Kleine Schritte",
    note: "Hat einen offenen Punkt geschlossen.",
    sourceBreakdown: [
      { label: "Care", count: 1 },
      { label: "Dinge", count: 1 }
    ],
    hidesStreak: true
  },
  {
    id: "friend_chris",
    displayName: "Chris",
    avatarUrl: null,
    status: "pending",
    addedAt: "2026-06-26T11:30:00.000Z",
    weeklyXp: 0,
    helpfulActions: 0,
    currentStreakDays: 0,
    consistencyScore: 0,
    label: "Einladung offen",
    note: "Wartet noch auf Annahme.",
    sourceBreakdown: []
  }
];

export const mockFriendInvite: FriendInvite = {
  id: "invite_stefan_01",
  inviteCode: "AVARENO-STEFAN-42",
  createdByUserId: "user_stefan",
  status: "active",
  createdAt: "2026-06-26T08:00:00.000Z",
  expiresAt: "2026-07-03T08:00:00.000Z"
};

export const mockFriendCircle: FriendCircle = {
  id: "circle_private_01",
  name: "Enge Freunde",
  memberIds: ["user_stefan", "friend_alex", "friend_nina", "friend_max"],
  createdByUserId: "user_stefan",
  visibility: "private"
};

export function buildCurrentUserProgress(profile: UserProfile, preferences: MotivationPrivacyPreferences): FriendProgress {
  return {
    id: profile.id,
    displayName: profile.displayName,
    avatarUrl: profile.avatarUrl,
    status: "accepted",
    addedAt: profile.createdAt,
    weeklyXp: profile.weeklyXp,
    helpfulActions: 5,
    currentStreakDays: profile.currentStreakDays,
    consistencyScore: 78,
    label: "Gemeinsam aktiv",
    note: "Du entscheidest, welche Werte Freunde sehen duerfen.",
    sourceBreakdown: [
      { label: "Produkte", count: 2 },
      { label: "Dokumente", count: 1 },
      { label: "Erinnerungen", count: 2 }
    ],
    hidesXp: preferences.hideXpFromFriends,
    hidesStreak: preferences.hideStreakFromFriends,
    isCurrentUser: true
  };
}
