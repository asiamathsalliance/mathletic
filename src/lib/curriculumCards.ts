import type { Curriculum } from "@/types/question";

export type CardTheme =
  | "card-hsc"
  | "card-ib"
  | "card-ap"
  | "card-neon"
  | "card-alevel";

export const CURRICULUM_CARD_THEME: Record<Curriculum, CardTheme> = {
  HSC: "card-hsc",
  IB: "card-ib",
  AP: "card-ap",
  "A-Level": "card-neon",
};

export const CURRICULUM_INFO: Record<
  Curriculum,
  { label: string; slug: string; description: string }
> = {
  HSC: {
    label: "HSC",
    slug: "hsc",
    description: "NSW Higher School Certificate mathematics",
  },
  IB: {
    label: "IB",
    slug: "ib",
    description: "International Baccalaureate HL & SL",
  },
  AP: {
    label: "AP",
    slug: "ap",
    description: "Calculus & Statistics (US)",
  },
  "A-Level": {
    label: "A-Level",
    slug: "a-level",
    description: "UK A-Level pure & statistics",
  },
};

export const OLYMPIAD_CARD_THEMES: CardTheme[] = [
  "card-ap",
  "card-ib",
  "card-hsc",
  "card-neon",
];
