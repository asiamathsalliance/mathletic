import { Suspense } from "react";
import { ChallengeRunClient } from "@/components/challenge/ChallengeRunClient";
import { Card, CardContent } from "@/components/ui/card";

interface PageProps {
  params: Promise<{ category: string }>;
}

export default async function ChallengeRunPage({ params }: PageProps) {
  const { category } = await params;
  return (
    <Suspense
      fallback={
        <Card className="max-w-2xl mx-auto">
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Loading challenge...</p>
          </CardContent>
        </Card>
      }
    >
      <ChallengeRunClient categorySlug={category} />
    </Suspense>
  );
}
