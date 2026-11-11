import { Brand } from "@/components/brand";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { JoinForm } from "@/features/join/join-form";
import { themeSchema } from "@/lib/schemas";
export default async function JoinPage({
  searchParams,
}: {
  searchParams: Promise<{ theme?: string }>;
}) {
  const params = await searchParams,
    theme = themeSchema.safeParse(params.theme);
  return (
    <div className="join-page">
      <header className="join-header">
        <Brand />
        <Link
          href="/display"
          className="flex min-h-10 items-center gap-1 text-xs"
        >
          Live tree
          <ArrowUpRight size={13} />
        </Link>
      </header>
      <main className="join-main">
        <JoinForm initialTheme={theme.success ? theme.data : undefined} />
      </main>
      <footer className="join-footer">
        <span>A moment for a shared future.</span>
        <Link href="/privacy">Participation &amp; privacy</Link>
      </footer>
    </div>
  );
}
