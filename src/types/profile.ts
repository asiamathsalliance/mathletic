export type ThemeMode = "light" | "dark" | "system";
export type AccentColor = "green" | "blue" | "purple" | "orange";
export type DifficultyPreference = "Easy" | "Medium" | "Hard" | "Mixed";
export type ProfileVisibility = "public" | "friends" | "private";
export type FontSize = "small" | "medium" | "large";

export interface NotificationPrefs {
  achievements: boolean;
  weeklyReport: boolean;
  leaderboard: boolean;
  dailyChallenge: boolean;
  contestReminders: boolean;
  marketing: boolean;
}

export interface PrivacyPrefs {
  visibility: ProfileVisibility;
  showCountry: boolean;
  showSchool: boolean;
  showActivity: boolean;
  showLeaderboardRank: boolean;
}

export interface AppearancePrefs {
  theme: ThemeMode;
  accent: AccentColor;
  fontSize: FontSize;
  compactMode: boolean;
}

export interface UserProfile {
  username: string;
  displayName: string;
  country: string;
  countryCode: string;
  school: string;
  grade: string;
  language: string;
  bio: string;
  topics: string[];
  difficultyPreference: DifficultyPreference;
  notifications: NotificationPrefs;
  privacy: PrivacyPrefs;
  appearance: AppearancePrefs;
  onboardingComplete: boolean;
  xp: number;
}

export interface ProfileStats {
  solved: number;
  currentStreak: number;
  longestStreak: number;
  rank: number | null;
  totalUsers: number;
  achievementsEarned: number;
  bestSprint: number;
}

export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  icon: string;
  target: number;
  category: "solved" | "streak" | "topic" | "speed" | "leaderboard" | "sprint";
}

export interface AchievementProgress extends AchievementDef {
  progress: number;
  unlocked: boolean;
  unlockedAt?: string;
}
