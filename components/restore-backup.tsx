"use client";

import { Download } from "lucide-react";
import { useRef, useState } from "react";
import { useStore } from "./store";

// Restore entry point for a fresh start, before any profile (and so Settings) exists.
export function RestoreBackupButton() {
  const { restoreBackup } = useStore();
  const input = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function restore(file: File) {
    try {
      await restoreBackup(JSON.parse(await file.text()));
    } catch (error) {
      setMessage(error instanceof SyntaxError ? "That file isn't a Home Workout backup." : (error as Error).message);
    }
  }

  return (
    <div className="flex w-full flex-col items-center gap-1.5">
      <button type="button" onClick={() => input.current?.click()} className="flex items-center gap-2 py-2 text-[15px] font-semibold text-accent">
        <Download size={17} />
        Restore from a backup
      </button>
      <input
        ref={input}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void restore(file);
        }}
      />
      {message && <p className="text-[13px] text-muted">{message}</p>}
    </div>
  );
}
