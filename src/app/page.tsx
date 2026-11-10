import { SiteHeader, SiteFooter } from "@/components/brand";
import { HomeExperience } from "@/features/home/home-experience";
export default function Home() {
  return (
    <>
      <SiteHeader />
      <main>
        <HomeExperience />
      </main>
      <SiteFooter />
    </>
  );
}
