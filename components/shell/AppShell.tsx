/**
 * One scroll region: the top bar stays put and only the workspace scrolls
 * (100dvh avoids the jumping address bar on phones). Stage content decides its own
 * inner layout and can use `sticky` pieces that stick to this scroll container.
 */
export default function AppShell({ topBar, children }: { topBar: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      {topBar}
      <main id="workspace" className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {children}
      </main>
    </div>
  )
}
