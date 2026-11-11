import Link from "next/link";
import { Brand } from "@/components/brand";
import { VisitorVoices } from "@/features/join/visitor-voices";
export const metadata = {
  title: "Your previous voices",
  robots: { index: false, follow: false },
};
export default function VoicesPage() {
  return (
    <div className="join-page">
      <header className="join-header">
        <Brand />
        <Link href="/join" className="text-xs">
          Add a hope
        </Link>
      </header>
      <main className="mx-auto w-full max-w-2xl px-4 py-8">
        <VisitorVoices />
      </main>
      <footer className="join-footer">
        <Link href="/privacy">Participation &amp; privacy</Link>
      </footer>
    </div>
  );
}
