"use client";

import { X } from "lucide-react";
import { getFullPhotoUrl } from "@/lib/constants";

interface ManifestLightboxProps {
  foto: { url: string; title: string } | null;
  onClose: () => void;
}

export function ManifestLightbox({ foto, onClose }: ManifestLightboxProps) {
  if (!foto) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
              {foto.title}
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Foto Manifest
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex min-h-[250px] flex-1 items-center justify-center overflow-auto bg-slate-950 p-2 sm:p-4">
          <img
            src={getFullPhotoUrl(foto.url)}
            alt="Foto Manifest"
            className="max-h-[70vh] max-w-full rounded object-contain"
          />
        </div>
      </div>
    </div>
  );
}

