"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { format } from "date-fns";
import type { TrendPoint, DriverPerformance, SellerAnalytics } from "@/types/analytics";

function fmtFullDate(t: string): string {
  const d = new Date(`${t}T00:00:00`);
  return Number.isNaN(d.getTime()) ? t : format(d, "d MMM yyyy");
}

function fmtTick(t: string): string {
  const d = new Date(`${t}T00:00:00`);
  if (Number.isNaN(d.getTime())) return t;
  return d.getMonth() === 0 ? format(d, "d MMM yyyy") : format(d, "d MMM");
}

export function TrendAreaChart({ data }: { data: TrendPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="gTotal" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0c1e3a" stopOpacity={0.25} />
            <stop offset="100%" stopColor="#0c1e3a" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gSelesai" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#64748b" stopOpacity={0.28} />
            <stop offset="100%" stopColor="#64748b" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis dataKey="tanggal" tickFormatter={fmtTick} minTickGap={28} tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip labelFormatter={(l) => fmtFullDate(String(l))} />
        <Legend />
        <Area type="monotone" dataKey="ritase_total" name="Total" stroke="#0c1e3a" strokeWidth={2} fill="url(#gTotal)" />
        <Area type="monotone" dataKey="ritase_selesai" name="Selesai" stroke="#64748b" strokeWidth={2} fill="url(#gSelesai)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function TrendDirectionChart({ data }: { data: TrendPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis dataKey="tanggal" tickFormatter={fmtTick} minTickGap={28} tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip labelFormatter={(l) => fmtFullDate(String(l))} />
        <Legend />
        <Bar dataKey="outgoing" name="Outgoing (JKT)" stackId="a" fill="#0c1e3a" />
        <Bar dataKey="incoming" name="Incoming (SEG)" stackId="a" fill="#cbd5e1" />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function DriverBarChart({ data }: { data: DriverPerformance[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={false} allowDecimals={false} />
        <YAxis type="category" dataKey="nama_driver" width={120} tick={{ fontSize: 11, fill: "#334155" }} tickLine={false} axisLine={false} />
        <Tooltip />
        <Bar dataKey="ritase_total" name="Ritase" fill="#0c1e3a" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function SellerBarChart({ data }: { data: SellerAnalytics[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={false} allowDecimals={false} />
        <YAxis type="category" dataKey="nama_seller" width={130} tick={{ fontSize: 11, fill: "#334155" }} tickLine={false} axisLine={false} />
        <Tooltip />
        <Bar dataKey="kunjungan" name="Kunjungan" fill="#0c1e3a" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
