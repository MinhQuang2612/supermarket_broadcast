import { ReactNode, useState, useEffect } from "react";
import { useLocation, Redirect } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import Sidebar from "./sidebar";
import Header from "./header";

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, isLoading } = useAuth();
  const [location] = useLocation();
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );
  const [sidebarCollapsed, setSidebarCollapsed] = useState(isMobile);
  
  // Effect to check for window resize and update mobile state
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      // Auto-collapse sidebar on mobile
      if (mobile) {
        setSidebarCollapsed(true);
      }
    };
    
    // Add event listener
    window.addEventListener('resize', handleResize);
    
    // Call once to initialize
    handleResize();
    
    // Cleanup
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/auth" />;
  }

  // Check role-based access
  if (user.role !== "admin" && (location === "/users" || location === "/system")) {
    return <Redirect to="/" />;
  }

  return (
    <div className="flex h-screen bg-neutral-lightest">
      <Sidebar 
        collapsed={sidebarCollapsed} 
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)} 
      />
      
      {/* Mobile overlay that darkens the screen when sidebar is open */}
      {!sidebarCollapsed && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-10 md:hidden" 
          onClick={() => setSidebarCollapsed(true)}
        />
      )}
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          title="Dashboard" 
          onMobileMenuToggle={() => setSidebarCollapsed(!sidebarCollapsed)} 
        />
        
        <main className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
