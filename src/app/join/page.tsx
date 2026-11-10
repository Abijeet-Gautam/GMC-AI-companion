import { SiteHeader, SiteFooter } from "@/components/brand";
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
    <>
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-5 py-10 md:px-10 md:py-16">
        <JoinForm initialTheme={theme.success ? theme.data : undefined} />
      </main>
      <SiteFooter />
    </>
  );
}
