import type { ReactNode } from "react";
import { RadarSecondaryNav } from "@/components/radar/radar-secondary-nav";

export default function RadarLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="relative overflow-hidden bg-[radial-gradient(ellipse_at_top,_rgba(212,175,55,0.08),_transparent_55%),linear-gradient(180deg,#FDFBF7_0%,#F9F5EC_100%)]">
      <div className="mx-auto flex min-h-screen w-full max-w-[1680px] flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <RadarSecondaryNav />
        {children}
      </div>
    </div>
  );
}
