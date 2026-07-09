import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import SettingsClient from "./SettingsClient";

export const metadata = { title: "Settings | Mathletic" };

type PageProps = {
  searchParams: Promise<{ from?: string }>;
};

export default async function SettingsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const fromProfile = params.from === "profile";

  return (
    <div className="space-y-6">
      <div>
        {fromProfile ? (
          <div className="flex items-start gap-3">
            <Link
              href="/profile"
              className="mt-1 flex size-9 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Back to profile"
            >
              <ArrowLeft className="size-4" strokeWidth={2.25} />
            </Link>
            <div>
              <h1 className="text-page-title">Settings</h1>
              <p className="mt-1 text-muted-foreground">Manage your account and preferences</p>
            </div>
          </div>
        ) : (
          <>
            <h1 className="text-page-title">Settings</h1>
            <p className="mt-1 text-muted-foreground">Manage your account and preferences</p>
          </>
        )}
      </div>
      <SettingsClient />
    </div>
  );
}
