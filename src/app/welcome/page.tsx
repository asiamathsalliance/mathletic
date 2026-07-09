import { Suspense } from "react";
import { WelcomeClient } from "./WelcomeClient";

export const metadata = { title: "Welcome | Mathletic" };

export default function WelcomePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center text-muted-foreground">
          Loading…
        </div>
      }
    >
      <WelcomeClient />
    </Suspense>
  );
}
