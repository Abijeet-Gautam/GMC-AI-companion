import type { Metadata } from "next";
import "./globals.css";
import { HydrationCompatibility } from "@/components/hydration-compat";
export const metadata: Metadata = {
  title: "Gelephu Mindfulness Tree",
  description: "Rooted in values. Growing through people.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <HydrationCompatibility />
      </head>
      <body>{children}</body>
    </html>
  );
}
