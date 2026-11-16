"use client";

import { RotateCcw } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InfoTip } from "@/components/ui/info-tip";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { CATEGORY_LABEL, CATEGORY_ORDER, CATEGORY_TONE, formatDayLabel } from "@/lib/day-category";
import type { DayCategory, DayCategoryItem } from "@/types/utilisasi";

interface Props {
  items: DayCategoryItem[];
  loading?: boolean;
  saving?: boolean;
  onSave: (tanggal: string, kategori: DayCategory) => void;
  onReset: (tanggal: string) => void;
}

export function DayCategoryEditor({ items, loading, saving, onSave, onReset }: Props) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <CardTitle className="text-sm">Kategori Hari</CardTitle>
          <InfoTip text="Default: Senin = Peak, Selasa–Sabtu = Normal, Minggu = Low, dan tanggal kembar (dd = mm) = Peak. Override manual selalu menang." />
        </div>
        <CardDescription className="text-xs">
          Ubah kategori untuk menghitung rata-rata mingguan per Peak/Normal/Low.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="py-6 text-center text-sm text-slate-400">Memuat kategori hari...</p>
        ) : items.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">Tidak ada tanggal pada rentang ini.</p>
        ) : (
          <div className="max-h-[340px] overflow-auto rounded-lg border">
            <table className="min-w-full text-sm">
              <thead className="sticky top-0 bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500 dark:bg-slate-900">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">Tanggal</th>
                  <th className="px-2 py-2 text-left font-semibold">Sumber</th>
                  <th className="px-2 py-2 text-left font-semibold">Kategori</th>
                  <th className="px-2 py-2" />
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.tanggal} className="border-b border-slate-100 last:border-b-0 dark:border-slate-800">
                    <td className="whitespace-nowrap px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200">
                      {formatDayLabel(item.tanggal)}
                    </td>
                    <td className="px-2 py-1.5">
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset",
                          item.source === "override"
                            ? "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:ring-amber-900"
                            : "bg-slate-50 text-slate-500 ring-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:ring-slate-700"
                        )}
                        title={item.keterangan || undefined}
                      >
                        {item.source === "override" ? "Manual" : "Default"}
                      </span>
                    </td>
                    <td className="px-2 py-1.5">
                      <Select
                        value={item.kategori}
                        onValueChange={(v) => onSave(item.tanggal, v as DayCategory)}
                        disabled={saving}
                      >
                        <SelectTrigger className="h-8 w-[120px] text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORY_ORDER.map((cat) => (
                            <SelectItem key={cat} value={cat}>
                              <span className={cn("inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ring-1 ring-inset", CATEGORY_TONE[cat])}>
                                {CATEGORY_LABEL[cat]}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-2 py-1.5 text-right">
                      {item.source === "override" && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => onReset(item.tanggal)}
                          disabled={saving}
                          className="h-7 px-2 text-[11px] text-slate-500"
                        >
                          <RotateCcw className="h-3 w-3" /> Reset
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
