import type { Metadata } from "next";
import OffTheMap from "@/components/system/OffTheMap";

export const metadata: Metadata = {
  title: "404 · Off the map | CR-CIPI",
  robots: { index: false },
};

// Outside the locale layout (unknown top-level paths): the view stands alone.
export default function NotFound() {
  return (
    <main id="main">
      <OffTheMap />
    </main>
  );
}
