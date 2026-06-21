"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import type { Curriculum } from "@/types/question";
import { useEffect, useState } from "react";
import { getAllQuestions } from "@/lib/questions";
import { getCurriculumProgress } from "@/lib/progress";
import {
  CURRICULUM_CARD_THEME,
  CURRICULUM_INFO,
  type CardTheme,
} from "@/lib/curriculumCards";
import { CurriculumCardIcon } from "@/components/CurriculumCardIcon";

interface CurriculumCardProps {
  curriculum: Curriculum;
}

export function CurriculumCard({ curriculum }: CurriculumCardProps) {
  const { label, slug, description } = CURRICULUM_INFO[curriculum];
  const theme = CURRICULUM_CARD_THEME[curriculum];
  const [percent, setPercent] = useState<number | null>(null);

  useEffect(() => {
    const all = getAllQuestions();
    const byCurriculum = getCurriculumProgress(all);
    const entry = byCurriculum[curriculum];
    setPercent(entry ? entry.percent : 0);
  }, [curriculum]);

  return (
    <Link href={`/${slug}`} className={`card ${theme}`}>
      <div className="badge-icon">
        <CurriculumCardIcon curriculum={curriculum} />
      </div>
      <div className="card-title">{label}</div>
      <div className="card-desc">{description}</div>
      {percent != null && (
        <div className="card-sub">{percent}% complete</div>
      )}
      <span className="card-cta">Browse topics</span>
    </Link>
  );
}

export function StyledBrowseCard({
  href,
  theme,
  icon,
  title,
  description,
  subtitle,
  cta = "Browse topics",
}: {
  href: string;
  theme: CardTheme;
  icon: ReactNode;
  title: string;
  description: string;
  subtitle?: string;
  cta?: string;
}) {
  return (
    <Link href={href} className={`card ${theme}`}>
      <div className="badge-icon">{icon}</div>
      <div className="card-title">{title}</div>
      <div className="card-desc">{description}</div>
      {subtitle && <div className="card-sub">{subtitle}</div>}
      <span className="card-cta">{cta}</span>
    </Link>
  );
}
