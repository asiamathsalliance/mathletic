"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Check } from "lucide-react";
import {
  COUNTRIES,
  GRADES,
  LANGUAGES,
  PLATFORM_NAME,
  TOPICS,
} from "@/lib/profile/constants";
import { checkUsername, useProfile } from "@/lib/profile/useProfile";
import { ProfilePreviewCard, ProfileCard } from "@/components/profile/ProfileCard";
import { useTheme } from "@/components/theme/ThemeProvider";
import type { DifficultyPreference, UserProfile } from "@/types/profile";
import { cn } from "@/lib/utils";
import { ProfilePageSkeleton } from "@/components/PageLoading";

export function WelcomeClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/dashboard";
  const { loading, signedIn, profile, email, avatarUrl, save } = useProfile();
  const { setTheme } = useTheme();

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [usernameOk, setUsernameOk] = useState<boolean | null>(null);
  const [checkingUser, setCheckingUser] = useState(false);

  const [form, setForm] = useState<Partial<UserProfile>>({});

  useEffect(() => {
    if (!loading && !signedIn) router.replace("/");
  }, [loading, signedIn, router]);

  useEffect(() => {
    if (profile && !profile.onboardingComplete) {
      setForm(profile);
    } else if (profile?.onboardingComplete) {
      router.replace(next);
    }
  }, [profile, router, next]);

  const patch = useCallback((p: Partial<UserProfile>) => {
    setForm((f) => ({ ...f, ...p }));
  }, []);

  useEffect(() => {
    const u = form.username?.trim();
    if (!u || u.length < 3) {
      setUsernameOk(null);
      return;
    }
    const t = setTimeout(async () => {
      setCheckingUser(true);
      setUsernameOk(await checkUsername(u));
      setCheckingUser(false);
    }, 400);
    return () => clearTimeout(t);
  }, [form.username]);

  const canContinueStep1 =
    Boolean(form.username && form.username.length >= 3 && usernameOk && form.countryCode);

  async function finish() {
    setSaving(true);
    const saved = await save({
      ...form,
      onboardingComplete: true,
    } as UserProfile);
    setSaving(false);
    if (saved) {
      setSuccess(true);
      setTimeout(() => router.push(next), 1200);
    }
  }

  if (loading || !signedIn) {
    return <ProfilePageSkeleton label="Loading welcome…" />;
  }

  const merged = { ...profile, ...form } as UserProfile;

  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-16">
      <div className="text-center">
        <h1 className="text-page-title">Welcome to {PLATFORM_NAME}!</h1>
        <p className="mt-2 text-muted-foreground">
          Let&apos;s personalize your profile before you begin solving problems.
        </p>
        <p className="mt-4 text-sm font-medium text-muted-foreground">
          Step {step} of 2
        </p>
        <div className="mx-auto mt-3 h-1.5 max-w-xs overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: step === 1 ? "50%" : "100%" }}
          />
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          {step === 1 && (
            <ProfileCard title="Basic Profile">
              <div className="space-y-5">
                <Field label="Username *">
                  <input
                    value={form.username ?? ""}
                    onChange={(e) => patch({ username: e.target.value.replace(/[^a-zA-Z0-9_]/g, "") })}
                    className="field-input"
                    placeholder="alex_math"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Shown on the leaderboard — your public handle.
                    {checkingUser && " Checking…"}
                    {!checkingUser && usernameOk === true && (
                      <span className="text-[#2F7D4F] flex items-center gap-1">
                        <Check className="size-3" /> Available
                      </span>
                    )}
                    {!checkingUser && usernameOk === false && (
                      <span className="text-destructive"> Unavailable or invalid</span>
                    )}
                  </p>
                </Field>

                <Field label="Display Name">
                  <input
                    value={form.displayName ?? ""}
                    onChange={(e) => patch({ displayName: e.target.value })}
                    className="field-input"
                    placeholder="Alex Tan"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Your real name — used on your dashboard and stats.
                  </p>
                </Field>

                <Field label="Country *">
                  <select
                    value={form.countryCode ?? ""}
                    onChange={(e) => {
                      const c = COUNTRIES.find((x) => x.code === e.target.value);
                      patch({
                        countryCode: e.target.value,
                        country: c?.name ?? "",
                      });
                    }}
                    className="field-input"
                  >
                    <option value="">Select country</option>
                    {COUNTRIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.flag} {c.name}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="School">
                  <input
                    value={form.school ?? ""}
                    onChange={(e) => patch({ school: e.target.value })}
                    className="field-input"
                  />
                </Field>

                <Field label="Grade">
                  <select
                    value={form.grade ?? ""}
                    onChange={(e) => patch({ grade: e.target.value })}
                    className="field-input"
                  >
                    <option value="">Select grade</option>
                    {GRADES.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Primary Language">
                  <select
                    value={form.language ?? "English"}
                    onChange={(e) => patch({ language: e.target.value })}
                    className="field-input"
                  >
                    {LANGUAGES.map((l) => (
                      <option key={l} value={l}>
                        {l}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label={`Bio (${(form.bio ?? "").length}/120)`}>
                  <textarea
                    value={form.bio ?? ""}
                    maxLength={120}
                    rows={3}
                    onChange={(e) => patch({ bio: e.target.value })}
                    className="field-input resize-none"
                    placeholder="Tell others about your math journey…"
                  />
                </Field>

                <button
                  type="button"
                  disabled={!canContinueStep1}
                  onClick={() => setStep(2)}
                  className="btn-primary w-full sm:w-auto"
                >
                  Continue
                </button>
              </div>
            </ProfileCard>
          )}

          {step === 2 && (
            <ProfileCard title="Preferences">
              <div className="space-y-6">
                <div>
                  <p className="mb-3 text-sm font-medium text-foreground">Theme</p>
                  <div className="flex gap-2">
                    {(["light", "dark"] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => {
                          patch({ appearance: { ...merged.appearance, theme: t } });
                          setTheme(t);
                        }}
                        className={cn(
                          "rounded-xl border px-4 py-2 text-sm capitalize",
                          merged.appearance?.theme === t
                            ? "border-primary bg-accent"
                            : "border-border"
                        )}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="mb-3 text-sm font-medium text-foreground">Preferred topics</p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {TOPICS.map((t) => {
                      const checked = (form.topics ?? []).includes(t);
                      return (
                        <label
                          key={t}
                          className={cn(
                            "flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm",
                            checked ? "border-primary bg-accent" : "border-border"
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {
                              const cur = form.topics ?? [];
                              patch({
                                topics: checked ? cur.filter((x) => x !== t) : [...cur, t],
                              });
                            }}
                            className="sr-only"
                          />
                          {t}
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <p className="mb-3 text-sm font-medium text-foreground">Difficulty preference</p>
                  <div className="flex flex-wrap gap-2">
                    {(["Easy", "Medium", "Hard", "Mixed"] as DifficultyPreference[]).map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => patch({ difficultyPreference: d })}
                        className={cn(
                          "rounded-xl border px-4 py-2 text-sm",
                          form.difficultyPreference === d
                            ? "border-primary bg-accent"
                            : "border-border"
                        )}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="mb-3 text-sm font-medium text-foreground">Email notifications</p>
                  <div className="space-y-2">
                    {[
                      ["achievements", "Achievement notifications"],
                      ["weeklyReport", "Weekly progress report"],
                      ["leaderboard", "Leaderboard announcements"],
                      ["dailyChallenge", "Daily challenge reminder"],
                    ].map(([key, label]) => (
                      <label key={key} className="flex items-center gap-3 text-sm">
                        <input
                          type="checkbox"
                          checked={Boolean(
                            form.notifications?.[key as keyof typeof form.notifications]
                          )}
                          onChange={(e) =>
                            patch({
                              notifications: {
                                ...merged.notifications,
                                [key]: e.target.checked,
                              },
                            })
                          }
                          className="size-4 rounded border-border"
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3">
                  <button type="button" onClick={() => setStep(1)} className="btn-secondary">
                    Back
                  </button>
                  <button
                    type="button"
                    disabled={saving || success}
                    onClick={finish}
                    className={cn("btn-primary", success && "bg-[#2F7D4F]")}
                  >
                    {success ? "✓ Complete!" : saving ? "Saving…" : "Complete Setup"}
                  </button>
                </div>
              </div>
            </ProfileCard>
          )}
        </div>

        <div className="lg:sticky lg:top-24 lg:self-start">
          <ProfilePreviewCard profile={merged} email={email} avatarUrl={avatarUrl} />
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-foreground">{label}</label>
      {children}
    </div>
  );
}
