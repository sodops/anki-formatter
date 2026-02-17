import { AppSkeleton } from "@/components/app/AppSkeleton";

export default function Loading() {
  return (
    <main id="app-main">
      <div className="app-background"></div>
      <AppSkeleton />
    </main>
  );
}
