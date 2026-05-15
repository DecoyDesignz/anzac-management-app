/** Remounts on each dashboard navigation so enter animations replay. */
export default function DashboardTemplate({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 ease-out">
      {children}
    </div>
  )
}
