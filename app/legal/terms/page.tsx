"use client";

import { useRouter } from "next/navigation";

export default function TermsPage() {
  const router = useRouter();

  return (
      <main className="min-h-screen bg-[#080808] text-white">
        <header className="sticky top-0 z-10 flex items-center gap-3 px-5 py-4 border-b border-white/5 bg-[#080808]/90 backdrop-blur">
          <button onClick={() => router.back()} className="text-neutral-500 hover:text-white text-sm transition-colors">← Back</button>
          <h1 className="text-base font-bold">Terms of Service</h1>
        </header>

        <div className="max-w-2xl mx-auto px-5 py-8 space-y-6 text-sm text-neutral-300 leading-relaxed">

          <p className="text-neutral-500 text-xs">Last updated: April 26, 2026</p>

          <Section title="1. Acceptance of Terms">
            By creating an account or using SwayNow (&quot;the Service&quot;), you agree to be bound by these Terms of Service. If you do not agree, do not use the Service.
          </Section>

          <Section title="2. Eligibility">
            You must be at least 16 years old to use SwayNow. By using the Service, you confirm that you meet this age requirement and have the legal capacity to enter into this agreement.
          </Section>

          <Section title="3. Account">
            You are responsible for:
            <ul className="space-y-1 list-disc pl-5 mt-3 marker:text-neutral-600">
              <li>Maintaining the confidentiality of your Google account used to sign in</li>
              <li>All activity that occurs under your account</li>
              <li>Providing accurate, real information about yourself</li>
              <li>Not impersonating other people or creating fake accounts</li>
            </ul>
          </Section>

          <Section title="4. User Conduct">
            When using SwayNow, you agree NOT to:
            <ul className="space-y-1 list-disc pl-5 mt-3 marker:text-neutral-600">
              <li>Harass, threaten, abuse, or harm other users</li>
              <li>Post content that is illegal, hateful, sexual, violent, or discriminatory</li>
              <li>Send spam, scams, advertising, or unsolicited promotional content</li>
              <li>Impersonate any person or entity</li>
              <li>Solicit minors or expose them to inappropriate content</li>
              <li>Use the Service for commercial purposes without permission</li>
              <li>Attempt to access other accounts or circumvent security measures</li>
              <li>Use automated tools, bots, or scrapers</li>
              <li>Sell, trade, or transfer your account</li>
              <li>Reverse engineer, decompile, or modify the Service</li>
            </ul>
          </Section>

          <Section title="5. Meeting in Person — IMPORTANT">
            <p className="bg-amber-950/30 border border-amber-900/30 rounded-xl px-4 py-3 mb-3 text-amber-200/90">
              ⚠️ SwayNow connects you with strangers. <strong>Always exercise caution when meeting people in person.</strong>
            </p>
            By using SwayNow you acknowledge:
            <ul className="space-y-1 list-disc pl-5 mt-3 marker:text-neutral-600">
              <li>You meet other users at your own risk</li>
              <li>We do not verify the identity, background, or intentions of users</li>
              <li>You should meet only in public places</li>
              <li>You should tell a trusted contact where you&apos;re going</li>
              <li>You should trust your instincts and leave if uncomfortable</li>
              <li>You should never share personal financial or sensitive information</li>
            </ul>
          </Section>

          <Section title="6. User Content">
            You retain ownership of the content you post. By posting on SwayNow, you grant us a worldwide, non-exclusive, royalty-free license to display, distribute, and use your content within the Service. You represent that:
            <ul className="space-y-1 list-disc pl-5 mt-3 marker:text-neutral-600">
              <li>You own or have rights to all content you post</li>
              <li>Your content does not violate any laws or third-party rights</li>
              <li>Reviews you write about other users are honest and based on actual experience</li>
            </ul>
          </Section>

          <Section title="7. Reviews and Trust System">
            You may leave reviews about users you have met through SwayNow. Reviews must be truthful, based on real interactions, and free from defamation, hate speech, or harassment. We reserve the right to remove reviews that violate these standards.
          </Section>

          <Section title="8. Reporting and Moderation">
            If you encounter abusive content or behaviour, use the in-app Report or Block functions. We reserve the right to investigate reports and take action including content removal, account warnings, suspension, or permanent ban without prior notice.
          </Section>

          <Section title="9. Service Availability">
            SwayNow is provided &quot;as is&quot; and &quot;as available&quot;. We do not guarantee uninterrupted service, error-free operation, or that any defects will be corrected. We may modify, suspend, or discontinue any part of the Service at any time without notice.
          </Section>

          <Section title="10. Disclaimer of Warranties">
            To the fullest extent permitted by law, SwayNow and its operators disclaim all warranties, express or implied, including but not limited to fitness for a particular purpose, merchantability, non-infringement, and accuracy of content. Use the Service at your own risk.
          </Section>

          <Section title="11. Limitation of Liability">
            To the maximum extent permitted by law, SwayNow and its operators shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of profits, data, use, goodwill, or other intangible losses, resulting from:
            <ul className="space-y-1 list-disc pl-5 mt-3 marker:text-neutral-600">
              <li>Your use of or inability to use the Service</li>
              <li>Any conduct or content of any third party (including other users) on the Service</li>
              <li>Any in-person meetings arranged through the Service</li>
              <li>Unauthorised access to or alteration of your data</li>
            </ul>
          </Section>

          <Section title="12. Indemnification">
            You agree to indemnify and hold harmless SwayNow and its operators from any claims, damages, losses, liabilities, and expenses (including legal fees) arising from your use of the Service, violation of these Terms, or violation of any third-party rights.
          </Section>

          <Section title="13. Account Termination">
            We may suspend or terminate your account at any time, with or without cause or notice, including if you violate these Terms. You may delete your account at any time by contacting us.
          </Section>

          <Section title="14. Privacy">
            Your use of the Service is also governed by our <a href="/legal/privacy" className="text-white underline">Privacy Policy</a>.
          </Section>

          <Section title="15. Changes to Terms">
            We may update these Terms periodically. Material changes will be posted on this page with a new &quot;Last updated&quot; date. Continued use of the Service after changes constitutes acceptance of the updated Terms.
          </Section>

          <Section title="16. Governing Law">
            These Terms are governed by the laws of Germany. Any disputes shall be resolved in the courts of Berlin, Germany, unless otherwise required by applicable consumer protection law.
          </Section>

          <Section title="17. Contact">
            For questions about these Terms, contact us at:<br />
            <a href="mailto:hello@sway.app" className="text-white underline">hello@sway.app</a>
          </Section>

          <div className="pt-6 border-t border-white/5 text-xs text-neutral-600">
            By using SwayNow, you acknowledge that you have read, understood, and agreed to these Terms of Service.
          </div>
        </div>
      </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
      <section className="space-y-2">
        <h2 className="text-base font-bold text-white">{title}</h2>
        <div className="text-neutral-300 leading-relaxed">{children}</div>
      </section>
  );
}