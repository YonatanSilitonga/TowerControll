"use client";

import { ApiError } from "@/types/api";

interface MutationErrorProps {
  error: unknown;
}

/** Banner error mutation — tampil kalau request backend gagal. */
export function MutationError({ error }: MutationErrorProps) {
  if (!error) return null;
  const msg =
    error instanceof ApiError ? error.message : "Terjadi kesalahan. Coba lagi.";
  return (
    <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-600">
      {msg}
    </p>
  );
}
