/** Loading global (login & halaman lain) — spinner branded. */
export default function RootLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#034075] border-t-transparent" />
    </div>
  );
}
