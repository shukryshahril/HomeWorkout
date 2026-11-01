import { ExternalLink, TvMinimalPlay } from "lucide-react";
import type { Exercise } from "@/lib/exercise";

export function ExerciseVideo({ exercise }: { exercise: Exercise }) {
  return (
    <div className="flex w-full flex-col gap-2">
      <iframe
        key={exercise.videoID}
        src={`https://www.youtube-nocookie.com/embed/${exercise.videoID}?playsinline=1&rel=0&modestbranding=1`}
        title={exercise.videoTitle}
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
        referrerPolicy="strict-origin-when-cross-origin"
        allowFullScreen
        className="aspect-video w-full rounded-[12px] border-0 bg-black"
      />
      <div className="flex items-center gap-1.5 text-[12px] text-muted">
        <TvMinimalPlay size={14} className="shrink-0" />
        <span className="truncate">{exercise.videoTitle}</span>
        <a
          href={`https://www.youtube.com/watch?v=${exercise.videoID}`}
          target="_blank"
          rel="noreferrer"
          aria-label="Open in YouTube"
          className="ml-auto p-1"
        >
          <ExternalLink size={14} />
        </a>
      </div>
    </div>
  );
}
