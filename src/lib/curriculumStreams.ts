import type { Curriculum } from "@/types/question";

export interface StreamDef {
  id: string;
  label: string;
  topics: string[];
}

/** Topic name -> slug (for URLs) */
export function topicToSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s*[()]\s*/g, " ")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

/** Slug -> topic name (reverse per-stream using stream's topics) */
export function slugToTopicName(slug: string, topics: string[]): string | undefined {
  const normalized = slug.toLowerCase().replace(/\s+/g, "-");
  return topics.find((t) => topicToSlug(t) === normalized);
}

export const CURRICULUM_STREAMS: Record<Curriculum, StreamDef[]> = {
  HSC: [
    {
      id: "advanced",
      label: "Advanced",
      topics: [
        "Algebra and Functions",
        "Trigonometry",
        "Calculus (Differentiation and Integration)",
        "Sequences and Series",
        "Probability and Statistics",
        "Financial Mathematics",
        "Applications of Calculus",
      ],
    },
    {
      id: "standard",
      label: "Standard",
      topics: [
        "Algebra and Linear Relationships",
        "Measurement and Geometry",
        "Trigonometry",
        "Financial Mathematics",
        "Data and Statistics",
        "Probability",
        "Networks and Time Series",
      ],
    },
  ],
  IB: [
    {
      id: "hl",
      label: "HL",
      topics: [
        "Algebra",
        "Functions and Graphs",
        "Trigonometry",
        "Vectors",
        "Calculus",
        "Statistics and Probability",
        "Mathematical Reasoning",
      ],
    },
    {
      id: "sl",
      label: "SL",
      topics: [
        "Algebra",
        "Functions and Graphs",
        "Trigonometry",
        "Calculus",
        "Statistics and Data Analysis",
        "Probability",
        "Mathematical Modelling",
      ],
    },
  ],
  AP: [
    {
      id: "calculus",
      label: "Calculus",
      topics: [
        "Limits and Continuity",
        "Derivatives",
        "Applications of Derivatives",
        "Integrals",
        "Applications of Integrals",
        "Differential Equations",
        "Series and Parametric/Polar Functions",
      ],
    },
    {
      id: "statistics",
      label: "Statistics",
      topics: [
        "Exploring Data",
        "Sampling and Experimental Design",
        "Probability",
        "Random Variables and Distributions",
        "Sampling Distributions",
        "Statistical Inference",
        "Regression and Correlation",
      ],
    },
  ],
  "A-Level": [
    {
      id: "pure",
      label: "Pure",
      topics: [
        "Algebra",
        "Functions and Graphs",
        "Trigonometry",
        "Calculus",
        "Vectors",
        "Sequences and Series",
        "Proof",
      ],
    },
    {
      id: "statistics",
      label: "Statistics",
      topics: [
        "Probability",
        "Statistics and Data Analysis",
        "Statistical Inference",
        "Regression",
      ],
    },
  ],
};

const CURRICULUM_TITLES: Record<Curriculum, string> = {
  HSC: "HSC Mathematics",
  IB: "IB Mathematics",
  AP: "AP Calculus & Statistics",
  "A-Level": "A-Level Mathematics",
};

export function getCurriculumTitle(c: Curriculum): string {
  return CURRICULUM_TITLES[c];
}

export function getStreamBySlug(curriculum: Curriculum, streamSlug: string): StreamDef | undefined {
  return CURRICULUM_STREAMS[curriculum]?.find(
    (s) => s.id === streamSlug?.toLowerCase()
  );
}

/**
 * Maps canonical topic keywords (used in search) to all curriculum-specific topic
 * names. Used so search "algebra" matches HSC "Algebra and Functions", IB "Algebra", etc.
 */
export const TOPIC_CANONICAL_TO_NAMES: Record<string, string[]> = {
  Algebra: [
    "Algebra and Functions",
    "Algebra and Linear Relationships",
    "Algebra",
  ],
  "Functions and Graphs": ["Algebra and Functions", "Functions and Graphs"],
  Functions: ["Algebra and Functions", "Functions and Graphs"],
  Trigonometry: ["Trigonometry"],
  Calculus: [
    "Calculus (Differentiation and Integration)",
    "Applications of Calculus",
    "Calculus",
    "Limits and Continuity",
    "Derivatives",
    "Applications of Derivatives",
    "Integrals",
    "Applications of Integrals",
    "Differential Equations",
    "Series and Parametric/Polar Functions",
  ],
  Probability: [
    "Probability and Statistics",
    "Data and Statistics",
    "Probability",
    "Statistics and Probability",
    "Statistics and Data Analysis",
    "Random Variables and Distributions",
    "Exploring Data",
    "Sampling and Experimental Design",
    "Sampling Distributions",
    "Statistical Inference",
    "Regression and Correlation",
    "Regression",
  ],
  Vectors: ["Vectors"],
  "Sequences and Series": ["Sequences and Series"],
  "Financial Mathematics": ["Financial Mathematics"],
  "Measurement and Geometry": ["Measurement and Geometry"],
  "Networks and Time Series": ["Networks and Time Series"],
  "Mathematical Reasoning": ["Mathematical Reasoning"],
  "Mathematical Modelling": ["Mathematical Modelling"],
  Proof: ["Proof"],
  "Statistical Inference": ["Statistical Inference"],
  Regression: ["Regression"],
};

/** Get all topic names that match a canonical topic (for search filtering). */
export function getTopicNamesForCanonical(canonicalTopic: string): string[] | undefined {
  return TOPIC_CANONICAL_TO_NAMES[canonicalTopic];
}

/** Get the stream id that contains the given topic for a curriculum (for building topic URLs). */
export function getStreamIdForTopic(curriculum: Curriculum, topicName: string): string | undefined {
  const streams = CURRICULUM_STREAMS[curriculum];
  if (!streams) return undefined;
  const stream = streams.find((s) => s.topics.includes(topicName));
  return stream?.id;
}
