import type { Metadata } from "next";
import Link from "next/link";
import { LegalSection, LegalShell } from "@/components/legal/LegalDoc";
import { PRIVACY_CONTACT_EMAIL, PRIVACY_CONTACT_MAILTO } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Privacy Policy | Mathletic",
  description: "How Mathletic collects, uses, and protects your data.",
};

export default function PrivacyPage() {
  return (
    <LegalShell
      title="Privacy Policy"
      subtitle="How we collect, use, store, and protect your personal information on Mathletic."
      updated="13 August 2026"
      otherHref="/terms"
      otherLabel="Terms of Service"
    >
      <LegalSection id="intro" title="Overview">
        <p>
          Mathletic (&quot;we&quot;, &quot;us&quot;) is an education practice platform. This Privacy
          Policy explains what personal information we collect, why we collect it, and the choices
          you have. If you are in Australia, we aim to comply with the Privacy Act 1988 (Cth) and
          the Australian Privacy Principles (APPs). If you are under 18, please read this with a
          parent or guardian.
        </p>
        <p>
          This page is about <strong>data and privacy</strong>. Rules for using the product
          (acceptable use, eligibility, disclaimers) are in the{" "}
          <Link href="/terms">Terms of Service</Link>.
        </p>
      </LegalSection>

      <LegalSection id="who-we-are" title="Who We Are">
        <p>
          Mathletic is operated for Asia Maths Alliance education projects. Contact for privacy
          requests:{" "}
          <a href={PRIVACY_CONTACT_MAILTO}>{PRIVACY_CONTACT_EMAIL}</a>.
        </p>
      </LegalSection>

      <LegalSection id="what-we-collect" title="What We Collect">
        <ul>
          <li>
            <strong>Account (Google sign-in)</strong> — email address, name, and profile photo
            provided by Google via Supabase Auth. We do not store your Google password.
          </li>
          <li>
            <strong>Profile</strong> — username, display name, country, optional school and grade,
            language, bio, topic preferences, notification and privacy settings, theme preferences.
          </li>
          <li>
            <strong>Learning activity</strong> — which questions you attempt or solve, attempt
            counts, timestamps, sprint session scores/answers, and achievements.
          </li>
          <li>
            <strong>Onboarding attestations</strong> — that you are 13+ (or have parental permission)
            and that you accepted these Terms/Privacy.
          </li>
          <li>
            <strong>Device / local data</strong> — solved progress and draft answers may be stored in
            your browser (localStorage) until synced to your account.
          </li>
          <li>
            <strong>AI answer checking</strong> — if you use AI check features, the question text and
            your submitted answer (and any uploaded image of work) are sent to our AI processing
            pipeline to generate feedback. We do not intend to use this content to train public models.
          </li>
          <li>
            <strong>Hosting logs</strong> — our host (e.g. Vercel) and database provider (Supabase)
            may process IP addresses and request metadata for security and reliability.
          </li>
        </ul>
      </LegalSection>

      <LegalSection id="why-we-collect" title="Why We Collect It">
        <ul>
          <li>Create and secure your account</li>
          <li>Personalise practice, progress, streaks, and leaderboards</li>
          <li>Provide sprint modes and achievements</li>
          <li>Show public profile fields you choose to share</li>
          <li>Improve reliability and prevent abuse</li>
        </ul>
      </LegalSection>

      <LegalSection id="third-parties" title="Where Data Is Stored / Third Parties">
        <ul>
          <li>
            <strong>Supabase</strong> (auth + Postgres) — account, profile metadata, practice and
            sprint data
          </li>
          <li>
            <strong>Vercel</strong> — application hosting
          </li>
          <li>
            <strong>Google</strong> — identity provider for sign-in
          </li>
          <li>
            <strong>AI inference</strong> — answer-checking may call a configured LLM provider (see
            your deployment env). Student answers may be processed to return feedback.
          </li>
          <li>
            <strong>Fonts</strong> — Google Fonts loaded by Next.js font optimization
          </li>
        </ul>
        <p>
          We do not currently use advertising cookies or third-party analytics SDKs (such as Google
          Analytics or PostHog) in the application code. If that changes, we will update this policy
          and add consent where required.
        </p>
      </LegalSection>

      <LegalSection id="children" title="Children And Student Data">
        <p>
          Mathletic is intended for students aged <strong>13 and older</strong>. Users under 13
          should not create an account. During onboarding we ask you to confirm you are 13+ or have
          parental/guardian permission. We collect optional school and grade information to
          personalise learning — treat school names as potentially identifying for minors and keep
          your profile private if you prefer.
        </p>
        <p>
          <strong>COPPA (US):</strong> We do not knowingly collect personal information from children
          under 13. If you believe a child under 13 has registered, contact us to delete the account.
        </p>
        <p>
          <strong>Australia:</strong> We take reasonable steps to protect personal information of
          young people and recommend parental guidance for school-aged users.
        </p>
      </LegalSection>

      <LegalSection id="public-info" title="Public Information">
        <p>
          If your profile visibility is public, other users may see your username, avatar, selected
          country/school (if enabled), activity heatmap, achievements, and leaderboard ranks. You can
          change these in Settings → Privacy.
        </p>
      </LegalSection>

      <LegalSection id="retention" title="Retention">
        <p>
          We keep account and learning data while your account is active. You may delete your account
          in Settings → Danger Zone, which removes your Auth user and cascaded practice/sprint rows.
          Backups held by infrastructure providers may persist for a limited period according to their
          retention schedules.
        </p>
      </LegalSection>

      <LegalSection id="your-rights" title="Your Rights">
        <p>Subject to applicable law, you may request to:</p>
        <ul>
          <li>Access the personal information we hold about you</li>
          <li>Correct inaccurate information (also via Settings)</li>
          <li>Delete your account and associated data</li>
          <li>Withdraw marketing notification preferences</li>
        </ul>
        <p>
          Use Settings → Danger Zone for self-serve deletion, or email{" "}
          <a href={PRIVACY_CONTACT_MAILTO}>{PRIVACY_CONTACT_EMAIL}</a>.
        </p>
      </LegalSection>

      <LegalSection id="security" title="Security">
        <p>
          We use Supabase Auth (Google OAuth), HTTPS, row-level security on database tables, and
          server-only access for answer keys where configured. No method of transmission or storage is
          perfectly secure.
        </p>
      </LegalSection>

      <LegalSection id="changes" title="Changes">
        <p>
          We may update this policy. Material changes will be reflected by updating the &quot;Last
          updated&quot; date. Continued use after changes means you accept the updated policy.
        </p>
      </LegalSection>
    </LegalShell>
  );
}
