import { CurriculumCard } from "@/components/CurriculumCard";
import { OlympiadCard, OLYMPIAD_CARD_THEMES } from "@/components/OlympiadCard";
import { CURRICULA } from "@/types/question";
import Link from "next/link";
import { GameButton } from "@/components/play/GameButton";

const OLYMPIAD_ITEMS = [
  { label: "AMC 8", slug: "amc-8", description: "American Mathematics Competition 8" },
  { label: "AMC 10", slug: "amc-10", description: "American Mathematics Competition 10" },
  { label: "AMC 12", slug: "amc-12", description: "American Mathematics Competition 12" },
  { label: "AIME", slug: "aime", description: "American Invitational Mathematics Examination" },
];

export default function BrowsePage() {
  return (
    <div className="play-subpage max-w-5xl mx-auto space-y-12 pb-10">
      <div className="flex flex-wrap items-start justify-between gap-4 play-section-head">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-[var(--ink)] font-[family-name:var(--font-heading)]">
            Question bank
          </h1>
          <p className="font-bold text-[var(--ink-muted)] mt-2 max-w-lg">
            Browse past exam questions by curriculum and topic.
          </p>
        </div>
        <Link href="/play">
          <GameButton variant="secondary" size="sm">
            Back to Play
          </GameButton>
        </Link>
      </div>

      <section className="space-y-6">
        <div className="flex items-center gap-4 w-full">
          <div className="flex-1 h-px bg-[var(--ink)]/20" />
          <span className="text-sm font-bold text-[var(--ink-muted)] uppercase tracking-wider shrink-0">
            High school curriculum
          </span>
          <div className="flex-1 h-px bg-[var(--ink)]/20" />
        </div>
        <div className="cards-browse">
          {CURRICULA.map((curriculum) => (
            <CurriculumCard key={curriculum} curriculum={curriculum} />
          ))}
        </div>
      </section>

      <section className="space-y-6">
        <div className="flex items-center gap-4 w-full">
          <div className="flex-1 h-px bg-[var(--ink)]/20" />
          <span className="text-sm font-bold text-[var(--ink-muted)] uppercase tracking-wider shrink-0">
            Mathematical Olympiad
          </span>
          <div className="flex-1 h-px bg-[var(--ink)]/20" />
        </div>
        <div className="cards-browse">
          {OLYMPIAD_ITEMS.map((item, i) => (
            <OlympiadCard
              key={item.slug}
              item={item}
              theme={OLYMPIAD_CARD_THEMES[i % OLYMPIAD_CARD_THEMES.length]}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
