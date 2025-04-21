"use client"

import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import WhatsAppChat from '@/components/ui/whatsapp-chat'

interface MainLayoutProps {
  children: React.ReactNode
}

const MainLayout = ({ children }: MainLayoutProps) => {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow pt-16">
        {children}
      </main>
      <Footer />
      <WhatsAppChat />
    </div>
  )
}

export default MainLayout
