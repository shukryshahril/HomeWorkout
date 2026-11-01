import Link from "next/link";

// Inline navigation bar with a centered title and a return action.
export function PageHeader({ title }: { title: string }) {
  return (
    <div className="sticky top-0 z-20 grid grid-cols-[1fr_auto_1fr] items-center bg-canvas/85 px-5 pb-2 pt-safe backdrop-blur-xl">
      <span />
      <h1 className="pt-2 text-[17px] font-semibold text-ink">{title}</h1>
      <Link href="/" className="justify-self-end pt-2 text-[17px] font-semibold text-accent">Done</Link>
    </div>
  );
}
