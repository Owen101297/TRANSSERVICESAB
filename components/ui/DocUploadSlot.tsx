"use client";

import { useState } from "react";
import { Upload, FileCheck, X } from "lucide-react";

export function DocUploadSlot({
  existingFileName,
}: {
  existingFileName?: string;
}) {
  const [fileName, setFileName] = useState<string | undefined>(existingFileName);

  return (
    <div>
      {fileName ? (
        <div className="flex items-center justify-between gap-2 rounded-md border border-line-600 bg-asphalt-800/50 px-3 py-1.5">
          <div className="flex items-center gap-2 overflow-hidden">
            <FileCheck size={14} className="shrink-0 text-ok-green" />
            <span className="truncate text-xs text-mist-200">{fileName}</span>
          </div>
          <button
            type="button"
            onClick={() => setFileName(undefined)}
            className="shrink-0 text-fog-400 hover:text-alert-red"
            aria-label="Quitar documento"
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-line-600 px-3 py-1.5 text-xs text-fog-400 hover:border-radar-cyan hover:text-radar-cyan">
          <Upload size={13} />
          Subir documento
          <input
            type="file"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) setFileName(file.name);
            }}
          />
        </label>
      )}
    </div>
  );
}
