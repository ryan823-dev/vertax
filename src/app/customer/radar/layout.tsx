import type { ReactNode } from "react";
import { RadarSecondaryNav } from "@/components/radar/radar-secondary-nav";

export default function RadarLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="relative overflow-hidden bg-[var(--ci-bg)]">
      <div className="mx-auto flex min-h-screen w-full max-w-[1680px] flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <RadarSecondaryNav />
        {children}
      </div>
    </div>
  );
}
