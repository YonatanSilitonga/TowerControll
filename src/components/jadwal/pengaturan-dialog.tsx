"use client";

import { X } from "lucide-react";
import { PengaturanTab } from "@/components/jadwal/pengaturan-tab";

interface PengaturanDialogProps {
  open: boolean;
  onClose: () => void;
}

export function PengaturanDialog({ open, onClose }: PengaturanDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-3 sm:p-4 backdrop-blur-sm">
      <div className="w-full max-w-4xl max-h-[90vh] flex flex-col rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 sm:px-5 sm:py-3.5 dark:border-slate-800">
          <div className="min-w-0">
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
              Pengaturan Jadwal
            </h3>
            <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400">
              Atur jam ritase & template rute yang dipakai saat generate otomatis
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 sm:p-5">
          <PengaturanTab />
        </div>
      </div>
    </div>
  );
}

