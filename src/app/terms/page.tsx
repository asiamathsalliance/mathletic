import type { Metadata } from "next";
import Link from "next/link";
import { LegalSection, LegalShell } from "@/components/legal/LegalDoc";
import { PRIVACY_CONTACT_EMAIL, PRIVACY_CONTACT_MAILTO } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Terms of Service | Mathletic",
  description: "Terms of use and acceptable use for Mathletic.",
};

export default function TermsPage() {
  return (
    <LegalShell
      title="Terms of Service"
      subtitle="The rules for using Mathletic — eligibility, acceptable use, and your responsibilities."
      updated="13 August 2026"
      otherHref="/privacy"
      otherLabel="Privacy Policy"
    >
      <LegalSection id="intro" title="Overview">
        <p>
          These Terms of Service (&quot;Terms&quot;) govern your use of Mathletic. By creating an
          account or using the service you agree to these Terms and our{" "}
          <Link href="/privacy">Privacy Policy</Link>.
        </p>
        <p>
          This page covers <strong>how you may use Mathletic</strong> and our relationship with you
          as a user. How we handle personal data is described separately in the{" "}
          <Link href="/privacy">Privacy Policy</Link>.
        </p>
      </LegalSection>

      <LegalSection id="eligibility" title="Eligibility">
        <p>
          You must be at least <strong>13 years old</strong> to use Mathletic. If you are under 18,
          you confirm you have permission from a parent or guardian. Accounts for children under 13
          are not permitted.
        </p>
      </LegalSection>

      <LegalSection id="accounts" title="Accounts">
        <p>
          Sign-in is provided via Google through Supabase Auth. You are responsible for activity under
          your account. Provide accurate profile information and keep your Google account secure.
        </p>
      </LegalSection>

      <LegalSection id="acceptable-use" title="Acceptable Use">
        <p>You agree not to:</p>
        <ul>
          <li>Cheat, automate, or manipulate leaderboards or progress unfairly</li>
          <li>Attempt to extract answer keys, solutions, or other users&apos; private data</li>
          <li>Abuse AI endpoints, scrape the service, or overload infrastructure</li>
          <li>Upload unlawful, harmful, or infringing content</li>
          <li>Impersonate others or use offensive usernames</li>
          <li>Reverse engineer or disrupt the platform except as allowed by law</li>
        </ul>
      </LegalSection>

      <LegalSection id="educational-content" title="Educational Content">
        <p>
          Practice questions and solutions are provided for personal learning. Content may contain
          errors. Competition problems remain subject to their original publishers&apos; rights where
          applicable. Do not redistribute the bank as a commercial product without permission.
        </p>
      </LegalSection>

      <LegalSection id="leaderboards" title="Leaderboards And Public Profiles">
        <p>
          Features such as leaderboards and public profiles may display your username, avatar, and
          performance metrics. You can adjust visibility in Settings.
        </p>
      </LegalSection>

      <LegalSection id="ai-features" title="AI Features">
        <p>
          Optional AI answer checking may process your answers and images of work. Outputs can be
          wrong — verify important results yourself. Do not submit sensitive personal information in
          answer images.
        </p>
      </LegalSection>

      <LegalSection id="termination" title="Termination">
        <p>
          You may delete your account at any time in Settings. We may suspend or terminate accounts
          that violate these Terms or create risk for other users or the service.
        </p>
      </LegalSection>

      <LegalSection id="disclaimers" title="Disclaimers">
        <p>
          The service is provided &quot;as is&quot; without warranties of uninterrupted availability
          or exam outcomes. To the extent permitted by Australian Consumer Law and other applicable
          law, we limit liability for indirect or consequential loss arising from use of Mathletic.
        </p>
      </LegalSection>

      <LegalSection id="changes" title="Changes">
        <p>
          We may update these Terms. Continued use after an update constitutes acceptance of the
          revised Terms.
        </p>
      </LegalSection>

      <LegalSection id="contact" title="Contact">
        <p>
          For terms or account questions, contact{" "}
          <a href={PRIVACY_CONTACT_MAILTO}>{PRIVACY_CONTACT_EMAIL}</a>. For privacy-specific
          requests, see our <Link href="/privacy">Privacy Policy</Link>.
        </p>
      </LegalSection>
    </LegalShell>
  );
}
