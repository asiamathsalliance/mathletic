import type { AchievementDef, UserProfile } from "@/types/profile";

export const PLATFORM_NAME = "Mathletic";

export const TOPICS = [
  "Algebra",
  "Geometry",
  "Number Theory",
  "Combinatorics",
  "Calculus",
  "Probability",
  "Linear Algebra",
] as const;

export const GRADES = [
  "Year 7",
  "Year 8",
  "Year 9",
  "Year 10",
  "Year 11",
  "Year 12",
  "University",
  "Other",
] as const;

export const LANGUAGES = ["English", "Vietnamese", "Chinese", "Spanish", "French", "Other"] as const;

export const COUNTRIES = [
  { code: "SG", name: "Singapore", flag: "🇸🇬" },
  { code: "US", name: "United States", flag: "🇺🇸" },
  { code: "AU", name: "Australia", flag: "🇦🇺" },
  { code: "GB", name: "United Kingdom", flag: "🇬🇧" },
  { code: "VN", name: "Vietnam", flag: "🇻🇳" },
  { code: "CN", name: "China", flag: "🇨🇳" },
  { code: "IN", name: "India", flag: "🇮🇳" },
  { code: "CA", name: "Canada", flag: "🇨🇦" },
  { code: "JP", name: "Japan", flag: "🇯🇵" },
  { code: "KR", name: "South Korea", flag: "🇰🇷" },
  { code: "DE", name: "Germany", flag: "🇩🇪" },
  { code: "FR", name: "France", flag: "🇫🇷" },
] as const;

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: "first", title: "First Problem", description: "Solve your first problem", icon: "🎯", target: 1, category: "solved" },
  { id: "solved_10", title: "10 Solved", description: "Solve 10 problems", icon: "✨", target: 10, category: "solved" },
  { id: "solved_100", title: "100 Solved", description: "Solve 100 problems", icon: "💯", target: 100, category: "solved" },
  { id: "solved_500", title: "500 Solved", description: "Solve 500 problems", icon: "🏅", target: 500, category: "solved" },
  { id: "solved_1000", title: "1000 Solved", description: "Solve 1000 problems", icon: "👑", target: 1000, category: "solved" },
  { id: "streak_7", title: "Perfect Week", description: "7-day solving streak", icon: "🔥", target: 7, category: "streak" },
  { id: "streak_30", title: "30-Day Streak", description: "30-day solving streak", icon: "⚡", target: 30, category: "streak" },
  { id: "streak_100", title: "100-Day Streak", description: "100-day solving streak", icon: "🌟", target: 100, category: "streak" },
  { id: "geometry", title: "Geometry Master", description: "Solve 50 geometry problems", icon: "📐", target: 50, category: "topic" },
  { id: "algebra", title: "Algebra Master", description: "Solve 50 algebra problems", icon: "🔢", target: 50, category: "topic" },
  { id: "combo", title: "Combinatorics Expert", description: "Solve 50 counting problems", icon: "🎲", target: 50, category: "topic" },
  { id: "speed", title: "Speed Solver", description: "Score 500+ in a sprint", icon: "⏱️", target: 500, category: "speed" },
  { id: "first_sprint", title: "First Sprint", description: "Complete any sprint session", icon: "🏁", target: 1, category: "sprint" },
  { id: "century_multiplication", title: "Century Club", description: "Solve 100 multiplication problems total", icon: "💯", target: 100, category: "sprint" },
  { id: "streak_10", title: "On Fire", description: "Hit a 10-correct streak in one multiplication sprint", icon: "🔥", target: 10, category: "sprint" },
  { id: "speed_demon", title: "Speed Demon", description: "Solve 30+ in a multiplication sprint", icon: "⚡", target: 30, category: "sprint" },
  { id: "sharp_shooter", title: "Sharp Shooter", description: "100% accuracy with 10+ attempts in problem sprint", icon: "🎯", target: 1, category: "sprint" },
  { id: "easy_grinder", title: "Easy Grinder", description: "Solve 15+ in a problem sprint", icon: "📚", target: 15, category: "sprint" },
  { id: "top_10", title: "Leaderboard Top 10", description: "Reach top 10 on the leaderboard", icon: "🏆", target: 10, category: "leaderboard" },
  { id: "top_1", title: "Leaderboard #1", description: "Reach #1 on the leaderboard", icon: "🥇", target: 1, category: "leaderboard" },
];

export function defaultProfile(email?: string): UserProfile {
  const base = email?.split("@")[0]?.replace(/[^a-zA-Z0-9_]/g, "") ?? "user";
  return {
    username: base.slice(0, 20) || "user",
    displayName: "",
    country: "",
    countryCode: "",
    school: "",
    grade: "",
    language: "English",
    bio: "",
    topics: [],
    difficultyPreference: "Mixed",
    notifications: {
      achievements: true,
      weeklyReport: true,
      leaderboard: true,
      dailyChallenge: false,
      contestReminders: true,
      marketing: false,
    },
    privacy: {
      visibility: "public",
      showCountry: true,
      showSchool: true,
      showActivity: true,
      showLeaderboardRank: true,
    },
    appearance: {
      theme: "light",
      accent: "green",
      fontSize: "medium",
      compactMode: false,
    },
    onboardingComplete: false,
    xp: 0,
    acceptedTermsAt: undefined,
    ageAttested13Plus: undefined,
  };
}

export function countryByCode(code: string) {
  return COUNTRIES.find((c) => c.code === code);
}
