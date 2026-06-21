import { CurriculumCardIcon } from "@/components/CurriculumCardIcon";
import { StyledBrowseCard } from "@/components/CurriculumCard";
import { OLYMPIAD_CARD_THEMES, type CardTheme } from "@/lib/curriculumCards";

export interface OlympiadItem {
  label: string;
  slug: string;
  description: string;
}

interface OlympiadCardProps {
  item: OlympiadItem;
  theme?: CardTheme;
}

export function OlympiadCard({ item, theme }: OlympiadCardProps) {
  const { label, slug, description } = item;
  const cardTheme = theme ?? "card-neon";

  return (
    <StyledBrowseCard
      href={`/olympiad/${slug}`}
      theme={cardTheme}
      icon={<CurriculumCardIcon curriculum="olympiad" />}
      title={label}
      description={description}
      cta="View topics"
    />
  );
}

export { OLYMPIAD_CARD_THEMES };
