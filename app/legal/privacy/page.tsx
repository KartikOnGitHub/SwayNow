"use client";

import { useRouter } from "next/navigation";

export default function PrivacyPage() {
    const router = useRouter();

    return (
        <main className="min-h-screen bg-[#080808] text-white">
            <header className="sticky top-0 z-10 flex items-center gap-3 px-5 py-4 border-b border-white/5 bg-[#080808]/90 backdrop-blur">
                <button onClick={() => router.back()} className="text-neutral-500 hover:text-white text-sm transition-colors">← Back</button>
                <h1 className="text-base font-bold">Privacy Policy</h1>
            </header>

            <div className="max-w-2xl mx-auto px-5 py-8 space-y-6 text-sm text-neutral-300 leading-relaxed">

                <div>
                    <p className="text-neutral-500 text-xs">Last updated: April 26, 2026</p>
                </div>

                <Section title="1. Introduction">
                    Welcome to SwayNow. This Privacy Policy explains how we collect, use, and protect your personal information when you use our service. By using SwayNow, you agree to the collection and use of information in accordance with this policy.
                </Section>

                <Section title="2. Information We Collect">
                    <p className="mb-3">We collect the following information when you use SwayNow:</p>
                    <ul className="space-y-2 list-disc pl-5 marker:text-neutral-600">
                        <li><strong className="text-white">Account information:</strong> name, email address, profile photo (provided via Google Sign-In).</li>
                        <li><strong className="text-white">Location data:</strong> GPS coordinates (latitude and longitude) when you create or browse posts. Used to show nearby content within a 5 km radius.</li>
                        <li><strong className="text-white">Content you create:</strong> posts, messages, city tags, intent labels, reviews, and interactions with other users.</li>
                        <li><strong className="text-white">Usage data:</strong> requests, accepts, rejects, blocks, reports, and meeting feedback.</li>
                    </ul>
                </Section>

                <Section title="3. How We Use Your Information">
                    <ul className="space-y-2 list-disc pl-5 marker:text-neutral-600">
                        <li>To match you with nearby users and posts.</li>
                        <li>To enable real-time communication after a join request is accepted.</li>
                        <li>To display public profile information including your name, posts, and reviews.</li>
                        <li>To maintain a trust system based on user feedback.</li>
                        <li>To moderate content via reports and blocks.</li>
                    </ul>
                </Section>

                <Section title="4. Location Data">
                    SwayNow requires access to your device&apos;s location to function. Your precise GPS coordinates are stored only with posts you create, and only used to calculate distance to other users for the duration of the post (max 4 hours). You can revoke location access at any time via your browser settings.
                </Section>

                <Section title="5. Public Information">
                    The following information is visible to other SwayNow users:
                    <ul className="space-y-1 list-disc pl-5 mt-3 marker:text-neutral-600">
                        <li>Your display name and profile photo</li>
                        <li>Posts you create (text, intent, city, location, expiry)</li>
                        <li>Reviews other users have written about you</li>
                        <li>Trust score (number of meetings, positive feedback count)</li>
                    </ul>
                </Section>

                <Section title="6. Data Storage">
                    Your data is stored using Google Firebase (Firestore Database) hosted on Google Cloud servers. We retain your data for as long as your account is active. Posts automatically expire and become hidden from feeds after their set duration but remain in our database for moderation purposes for up to 30 days.
                </Section>

                <Section title="7. Data Sharing">
                    We do not sell, trade, or rent your personal information to third parties. We may share data with:
                    <ul className="space-y-1 list-disc pl-5 mt-3 marker:text-neutral-600">
                        <li><strong className="text-white">Other users:</strong> as described in Section 5.</li>
                        <li><strong className="text-white">Service providers:</strong> Google Firebase for authentication, database, and hosting.</li>
                        <li><strong className="text-white">Legal authorities:</strong> if required by law or to investigate violations of our Terms.</li>
                    </ul>
                </Section>

                <Section title="8. Your Rights (GDPR)">
                    If you are in the European Economic Area, you have the right to:
                    <ul className="space-y-1 list-disc pl-5 mt-3 marker:text-neutral-600">
                        <li>Access your personal data</li>
                        <li>Request correction or deletion of your data</li>
                        <li>Object to or restrict processing</li>
                        <li>Data portability</li>
                        <li>Withdraw consent at any time</li>
                        <li>Lodge a complaint with a supervisory authority</li>
                    </ul>
                    <p className="mt-3">To exercise these rights, contact us at the email below.</p>
                </Section>

                <Section title="9. Account Deletion">
                    You can delete your account at any time by contacting us. Upon deletion, your profile, posts, messages, and reviews will be permanently removed within 30 days. Some data may be retained where required by law or for security purposes (e.g. fraud prevention).
                </Section>

                <Section title="10. Children's Privacy">
                    SwayNow is not intended for users under 16 years of age. We do not knowingly collect personal information from children. If you believe a minor has created an account, please contact us immediately.
                </Section>

                <Section title="11. Cookies and Tracking">
                    We use essential cookies for authentication via Google Sign-In. We do not use advertising or tracking cookies.
                </Section>

                <Section title="12. Security">
                    We implement reasonable security measures including authentication, encrypted connections (HTTPS), and Firestore security rules. However, no method of transmission over the internet is 100% secure.
                </Section>

                <Section title="13. Changes to This Policy">
                    We may update this Privacy Policy from time to time. We will notify you of material changes by posting the new policy on this page and updating the &quot;Last updated&quot; date.
                </Section>

                <Section title="14. Contact">
                    For privacy questions or requests, contact us at:<br />
                    <a href="mailto:privacy@sway.app" className="text-white underline">privacy@sway.app</a>
                </Section>

                <div className="pt-6 border-t border-white/5 text-xs text-neutral-600">
                    By using SwayNow, you acknowledge that you have read and understood this Privacy Policy.
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