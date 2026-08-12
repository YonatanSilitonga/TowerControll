/** Loading global (login & halaman lain) — spinner branded. */
export default function RootLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#0c1e3a] border-t-transparent" />
    </div>
  );
}
