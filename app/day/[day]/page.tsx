import { Suspense } from "react";
import { DayScreen } from "@/components/screens";
import { Loading } from "@/components/ui";
import { programLength } from "@/lib/program";

// Every day is known up front, so the client reads it with useParams and navigation stays instant.
// The boundary only covers the generic fallback shell for days outside the list.
export function generateStaticParams() {
  return Array.from({ length: programLength }, (_, i) => ({ day: String(i + 1) }));
}

export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <DayScreen />
    </Suspense>
  );
}
