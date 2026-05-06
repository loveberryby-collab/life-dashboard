import NavBar from '@/components/nav-bar'

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background">
      <NavBar />
      <main className="md:ml-56 pb-20 md:pb-8">
        {children}
      </main>
    </div>
  )
}
