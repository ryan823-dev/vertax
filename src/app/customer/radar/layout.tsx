import type { ReactNode } from "react";
import { RadarSecondaryNav } from "@/components/radar/radar-secondary-nav";

export default function RadarLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="space-y-4">
      <RadarSecondaryNav />
      {children}
    </div>
  );
}
