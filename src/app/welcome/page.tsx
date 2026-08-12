import { Suspense } from "react";
import { WelcomeClient } from "./WelcomeClient";
import { ProfilePageSkeleton } from "@/components/PageLoading";

export const metadata = { title: "Welcome | Mathletic" };

export default function WelcomePage() {
  return (
    <Suspense fallback={<ProfilePageSkeleton label="Loading welcome…" />}>
      <WelcomeClient />
    </Suspense>
  );
}
