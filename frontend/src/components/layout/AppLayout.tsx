import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { BottomNav } from './BottomNav';
import { MobileMenu } from './MobileMenu';

export function AppLayout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop Sidebar (hidden on mobile) */}
      <div className="hidden lg:flex h-full">
        <Sidebar />
      </div>

      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        {/* Desktop Header */}
        <div className="hidden lg:block">
          <Header />
        </div>
        
        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto pb-20 lg:pb-0">
          <div className="max-w-md mx-auto lg:max-w-7xl lg:mx-auto px-0 sm:px-6 lg:py-8 w-full min-h-screen lg:min-h-0 bg-slate-50 lg:bg-transparent">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile Navigation (hidden on desktop) */}
      <div className="lg:hidden fixed bottom-0 w-full max-w-md left-1/2 -translate-x-1/2 z-50">
        <BottomNav onMenuClick={() => setIsMobileMenuOpen(true)} />
      </div>
      <MobileMenu isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
    </div>
  );
}
