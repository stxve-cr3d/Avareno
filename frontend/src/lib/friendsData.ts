/* Motivation-privacy preferences (stored locally). These forward-looking
   toggles gate what a friend could see once progress-sharing (v2) exists.
   The old mock friends/invite/circle fixtures were removed when the real
   /api/friends backend landed — see lib/friendsApi.ts. */

export type MotivationPrivacyPreferences = {
  motivationEnabled: boolean;
  leaderboardEnabled: boolean;
  hideXpFromFriends: boolean;
  hideStreakFromFriends: boolean;
  allowFriendInvites: boolean;
};

export const defaultMotivationPrivacy: MotivationPrivacyPreferences = {
  motivationEnabled: true,
  leaderboardEnabled: true,
  hideXpFromFriends: false,
  hideStreakFromFriends: true,
  allowFriendInvites: true
};
