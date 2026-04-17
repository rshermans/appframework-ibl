export default function Loading() {
  return (
    <main className="relative flex min-h-screen items-center justify-center p-6">
      <div className="absolute inset-x-0 top-0 h-1 overflow-hidden bg-[var(--surface_container_low)]">
        <div className="h-full w-1/3 animate-pulse bg-[var(--primary)]" />
      </div>
      <div className="flex flex-col items-center gap-3 rounded-[var(--radius-md)] bg-[var(--surface_container_low)] px-6 py-5">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--surface_container_high)] border-t-[var(--primary)]" />
        <p className="text-sm font-medium text-[var(--on_surface)]">A carregar IBL-AI...</p>
      </div>
    </main>
  )
}
