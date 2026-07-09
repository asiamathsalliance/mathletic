"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import {
  COUNTRIES,
  GRADES,
  LANGUAGES,
  TOPICS,
} from "@/lib/profile/constants";
import { useProfile } from "@/lib/profile/useProfile";
import { ProfileCard } from "@/components/profile/ProfileCard";
import { SaveButton } from "@/components/ui/SaveButton";
import { useTheme } from "@/components/theme/ThemeProvider";
import type { AccentColor, ThemeMode, UserProfile } from "@/types/profile";
import { cn } from "@/lib/utils";

const SECTIONS = [
  { id: "profile", label: "Profile" },
  { id: "account", label: "Account" },
  { id: "privacy", label: "Privacy" },
  { id: "appearance", label: "Appearance" },
  { id: "notifications", label: "Notifications" },
  { id: "danger", label: "Danger Zone" },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

export default function SettingsClient() {
  const router = useRouter();
  const { loading, signedIn, profile, email, save } = useProfile();
  const { theme, accent, setTheme, setAccent } = useTheme();
  const [section, setSection] = useState<SectionId>("profile");
  const [form, setForm] = useState<UserProfile | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState("");

  useEffect(() => {
    if (!loading && !signedIn) router.replace("/");
  }, [loading, signedIn, router]);

  useEffect(() => {
    if (profile) setForm(profile);
  }, [profile]);

  if (loading || !form) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  async function handleSave(): Promise<boolean> {
    if (!form) return false;
    const result = await save({ ...form, avatarType: "initials", avatarUrl: "" });
    return result !== null;
  }

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:gap-10">
      <nav className="hidden lg:flex lg:w-48 lg:shrink-0 lg:flex-col lg:gap-1">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setSection(s.id)}
            className={cn(
              "rounded-xl px-4 py-2.5 text-left text-sm font-medium transition-colors",
              section === s.id
                ? "bg-accent text-foreground"
                : "text-muted-foreground hover:bg-muted",
              s.id === "danger" && section === s.id && "bg-destructive/10 text-destructive"
            )}
          >
            {s.label}
          </button>
        ))}
      </nav>

      <select
        className="field-input lg:hidden"
        value={section}
        onChange={(e) => setSection(e.target.value as SectionId)}
      >
        {SECTIONS.map((s) => (
          <option key={s.id} value={s.id}>
            {s.label}
          </option>
        ))}
      </select>

      <div className="min-w-0 flex-1 space-y-6">
        {section === "profile" && (
          <ProfileCard title="Profile Settings">
            <div className="space-y-4 max-w-lg">
              <Field label="Username" value={form.username} onChange={(v) => setForm({ ...form, username: v })} />
              <p className="-mt-2 text-xs text-muted-foreground">
                Shown on the leaderboard and public profile.
              </p>
              <Field label="Display Name" value={form.displayName} onChange={(v) => setForm({ ...form, displayName: v })} />
              <p className="-mt-2 text-xs text-muted-foreground">
                Your real name — used on your dashboard and stats.
              </p>
              <label className="block text-sm font-medium">
                Country
                <select
                  className="field-input mt-1.5"
                  value={form.countryCode}
                  onChange={(e) => {
                    const c = COUNTRIES.find((x) => x.code === e.target.value);
                    setForm({ ...form, countryCode: e.target.value, country: c?.name ?? "" });
                  }}
                >
                  <option value="">Select</option>
                  {COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>{c.flag} {c.name}</option>
                  ))}
                </select>
              </label>
              <Field label="School" value={form.school} onChange={(v) => setForm({ ...form, school: v })} />
              <label className="block text-sm font-medium">
                Grade
                <select className="field-input mt-1.5" value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })}>
                  <option value="">Select</option>
                  {GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              </label>
              <label className="block text-sm font-medium">
                Bio
                <textarea className="field-input mt-1.5 resize-none" rows={3} maxLength={120} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
              </label>
              <SaveButton onSave={handleSave} />
            </div>
          </ProfileCard>
        )}

        {section === "account" && (
          <ProfileCard title="Account">
            <dl className="space-y-4 text-sm max-w-lg">
              <div>
                <dt className="text-muted-foreground">Email</dt>
                <dd className="font-medium">{email}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Change Password</dt>
                <dd className="text-muted-foreground">Managed through Google sign-in</dd>
              </div>
              <div>
                <dt className="mb-2 text-muted-foreground">Linked Accounts</dt>
                <dd className="flex flex-wrap gap-2">
                  <span className="rounded-full border border-border px-3 py-1">Google ✓</span>
                  <span className="rounded-full border border-dashed border-border px-3 py-1 text-muted-foreground">GitHub</span>
                  <span className="rounded-full border border-dashed border-border px-3 py-1 text-muted-foreground">Discord</span>
                </dd>
              </div>
            </dl>
          </ProfileCard>
        )}

        {section === "privacy" && (
          <ProfileCard title="Privacy">
            <div className="space-y-4 max-w-lg">
              <ToggleRow label="Profile visibility" options={["public", "friends", "private"]} value={form.privacy.visibility} onChange={(v) => setForm({ ...form, privacy: { ...form.privacy, visibility: v as typeof form.privacy.visibility } })} />
              <CheckRow label="Show Country" checked={form.privacy.showCountry} onChange={(c) => setForm({ ...form, privacy: { ...form.privacy, showCountry: c } })} />
              <CheckRow label="Show School" checked={form.privacy.showSchool} onChange={(c) => setForm({ ...form, privacy: { ...form.privacy, showSchool: c } })} />
              <CheckRow label="Show Activity" checked={form.privacy.showActivity} onChange={(c) => setForm({ ...form, privacy: { ...form.privacy, showActivity: c } })} />
              <CheckRow label="Show Leaderboard Position" checked={form.privacy.showLeaderboardRank} onChange={(c) => setForm({ ...form, privacy: { ...form.privacy, showLeaderboardRank: c } })} />
              <SaveButton onSave={handleSave} />
            </div>
          </ProfileCard>
        )}

        {section === "appearance" && (
          <ProfileCard title="Appearance">
            <div className="space-y-5 max-w-lg">
              <ToggleRow label="Theme" options={["light", "dark", "system"]} value={theme} onChange={(v) => { setTheme(v as ThemeMode); setForm({ ...form, appearance: { ...form.appearance, theme: v as ThemeMode } }); }} />
              <div>
                <p className="mb-2 text-sm font-medium">Accent Color</p>
                <div className="flex gap-2">
                  {(["green", "blue", "purple", "orange"] as AccentColor[]).map((a) => (
                    <button key={a} type="button" onClick={() => { setAccent(a); setForm({ ...form, appearance: { ...form.appearance, accent: a } }); }} className={cn("rounded-xl border px-4 py-2 text-sm capitalize", accent === a ? "border-primary bg-accent" : "border-border")}>{a}</button>
                  ))}
                </div>
              </div>
              <CheckRow label="Compact Mode" checked={form.appearance.compactMode} onChange={(c) => setForm({ ...form, appearance: { ...form.appearance, compactMode: c } })} />
              <SaveButton onSave={handleSave} />
            </div>
          </ProfileCard>
        )}

        {section === "notifications" && (
          <ProfileCard title="Notifications">
            <div className="space-y-3 max-w-lg">
              <CheckRow label="Achievement alerts" checked={form.notifications.achievements} onChange={(c) => setForm({ ...form, notifications: { ...form.notifications, achievements: c } })} />
              <CheckRow label="Contest reminders" checked={form.notifications.contestReminders} onChange={(c) => setForm({ ...form, notifications: { ...form.notifications, contestReminders: c } })} />
              <CheckRow label="Weekly reports" checked={form.notifications.weeklyReport} onChange={(c) => setForm({ ...form, notifications: { ...form.notifications, weeklyReport: c } })} />
              <CheckRow label="Leaderboard updates" checked={form.notifications.leaderboard} onChange={(c) => setForm({ ...form, notifications: { ...form.notifications, leaderboard: c } })} />
              <CheckRow label="Marketing emails" checked={form.notifications.marketing} onChange={(c) => setForm({ ...form, notifications: { ...form.notifications, marketing: c } })} />
              <SaveButton onSave={handleSave} />
            </div>
          </ProfileCard>
        )}

        {section === "danger" && (
          <div className="rounded-[24px] border-2 border-destructive/40 bg-destructive/5 p-6 sm:p-8">
            <h2 className="text-section-header text-destructive">Danger Zone</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              This action cannot be undone. All your progress, achievements, and account data will be permanently deleted.
            </p>
            <label className="mt-6 block text-sm font-medium">
              Type DELETE to confirm
              <input className="field-input mt-1.5 border-destructive/30" value={deleteConfirm} onChange={(e) => setDeleteConfirm(e.target.value)} placeholder="DELETE" />
            </label>
            <button type="button" disabled={deleteConfirm !== "DELETE"} className="mt-4 rounded-xl bg-destructive px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40">
              Delete Account
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block text-sm font-medium">
      {label}
      <input className="field-input mt-1.5" value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

function CheckRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (c: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-4 text-sm">
      {label}
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="size-4" />
    </label>
  );
}

function ToggleRow({ label, options, value, onChange }: { label: string; options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <p className="mb-2 text-sm font-medium">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button key={o} type="button" onClick={() => onChange(o)} className={cn("rounded-xl border px-3 py-1.5 text-sm capitalize", value === o ? "border-primary bg-accent" : "border-border")}>{o}</button>
        ))}
      </div>
    </div>
  );
}
