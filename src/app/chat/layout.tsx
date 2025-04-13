import ClientLayout from '@/components/ClientLayout'

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClientLayout>
      {children}
    </ClientLayout>
  )
} 