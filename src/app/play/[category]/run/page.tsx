import { Suspense } from "react";
import { PlayRunClient } from "./PlayRunClient";
import { GameCard } from "@/components/play/GameCard";

interface PageProps {
  params: Promise<{ category: string }>;
}

export default async function PlayRunPage({ params }: PageProps) {
  const { category } = await params;
  return (
    <Suspense
      fallback={
        <GameCard className="text-center py-12">
          <p className="font-bold text-[var(--game-forest)]">Loading run...</p>
        </GameCard>
      }
    >
      <PlayRunClient categorySlug={category} />
    </Suspense>
  );
}
