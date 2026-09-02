"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface StackedChartDatum {
  name: string;
  "Koli Reguler": number;
  "High Value": number;
}

export function ProductivityStackedChart({ data }: { data: StackedChartDatum[] }) {
  if (data.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center text-xs font-medium text-slate-400">
        Belum ada data ritase pada periode ini.
      </div>
    );
  }
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
        <XAxis
          dataKey="name"
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 11, fill: "#64748b", fontWeight: 600 }}
          dy={6}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 11, fill: "#64748b", fontWeight: 600 }}
        />
        <RechartsTooltip
          cursor={{ fill: "#f8fafc" }}
          contentStyle={{
            borderRadius: "6px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.08)",
          }}
          itemStyle={{ fontSize: "12px", fontWeight: 600 }}
          labelStyle={{ fontSize: "12px", fontWeight: 700, color: "#0f172a", marginBottom: "2px" }}
        />
        <Legend iconType="circle" wrapperStyle={{ fontSize: "11px", fontWeight: 600, paddingTop: "10px" }} />
        <Bar dataKey="Koli Reguler" stackId="a" fill="#0f172a" radius={[0, 0, 2, 2]} barSize={26} />
        <Bar dataKey="High Value" stackId="a" fill="#f59e0b" radius={[2, 2, 0, 0]} barSize={26} />
      </BarChart>
    </ResponsiveContainer>
  );
}
