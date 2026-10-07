"use client";
import { Phone } from "lucide-react";
import { whatsappUrl } from "@/lib/whatsapp";
export function WhatsAppContact({ phone, name, compact = false }: { phone?: string | null; name?: string | null; compact?: boolean }) {
  const href = whatsappUrl(phone);
  const label = `Hubungi ${name || "driver"} via WhatsApp`;
  if (!href) return compact ? <span title="Nomor WhatsApp belum tersedia atau tidak valid" aria-label="Nomor WhatsApp belum tersedia atau tidak valid" className="inline-flex p-2 text-slate-300"><Phone className="h-4 w-4" /></span> : <span className="text-xs text-slate-400">Nomor WhatsApp belum tersedia atau tidak valid</span>;
  return <a href={href} target="_blank" rel="noopener noreferrer" aria-label={label} title={`${label}. Gunakan ikon telepon di WhatsApp untuk menelepon.`} onClick={(event) => event.stopPropagation()} className="inline-flex items-center justify-center gap-2 rounded-md p-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 focus-visible:outline-emerald-600"><Phone aria-hidden="true" className="h-4 w-4 shrink-0" />{!compact && "Hubungi via WhatsApp"}</a>;
}