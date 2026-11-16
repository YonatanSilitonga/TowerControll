export type RitaseType = 1 | 2 | 3;

export const RITASE_CONFIG = {
  1: {
    label: "Ritase 1",
    shortTime: "00:00 - 15:59",
    timeRange: "00:00 - 15:59 WIB",
    desc: "Kloter Pagi & Siang",
  },
  2: {
    label: "Ritase 2",
    shortTime: "16:00 - 19:59",
    timeRange: "16:00 - 19:59 WIB",
    desc: "Kloter Sore / Prime",
  },
  3: {
    label: "Ritase 3",
    shortTime: "20:00 - 23:59",
    timeRange: "20:00 - 23:59 WIB",
    desc: "Kloter Malam / Closing",
  },
} as const;

export function getRitaseFromLog(log: {
  created_at?: string | null;
  updated_at?: string | null;
  tanggal?: string | null;
}): RitaseType {
  const timeStr = log.created_at || log.updated_at;
  if (!timeStr) return 1;

  try {
    const d = new Date(timeStr);
    if (isNaN(d.getTime())) return 1;

    const wibHourStr = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Jakarta",
      hour: "numeric",
      hour12: false,
    }).format(d);
    const hour = parseInt(wibHourStr, 10);

    if (hour >= 0 && hour < 16) return 1;
    if (hour >= 16 && hour < 20) return 2;
    return 3;
  } catch {
    return 1;
  }
}
