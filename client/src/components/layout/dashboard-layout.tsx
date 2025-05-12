import { ReactNode, useState, useEffect } from "react";
import { useLocation, Redirect } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import Sidebar from "./sidebar";
import Header from "./header";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest } from "@/lib/queryClient";

interface DashboardLayoutProps {
  children: ReactNode;
}

const passwordChangeSchema = z.object({
  currentPassword: z.string().min(6, "Mật khẩu hiện tại phải có ít nhất 6 ký tự"),
  newPassword: z.string().min(6, "Mật khẩu mới phải có ít nhất 6 ký tự"),
  confirmPassword: z.string().min(6, "Mật khẩu xác nhận phải có ít nhất 6 ký tự"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Mật khẩu xác nhận không khớp",
  path: ["confirmPassword"],
});

type PasswordFormValues = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, isLoading } = useAuth();
  const [location] = useLocation();
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sidebarCollapsed');
      if (saved !== null) return saved === 'true';
      return window.innerWidth < 768;
    }
    return false;
  });
  const { toast } = useToast();
  const [showChangePassword, setShowChangePassword] = useState(false);
  const passwordForm = useForm({
    resolver: zodResolver(passwordChangeSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });
  
  // Effect to check for window resize and update mobile state
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      // Chỉ auto-collapse khi resize sang mobile
      if (mobile && !sidebarCollapsed) {
        setSidebarCollapsed(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [sidebarCollapsed]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('sidebarCollapsed', sidebarCollapsed ? 'true' : 'false');
    }
  }, [sidebarCollapsed]);

  const handlePasswordSubmit = async (values: PasswordFormValues) => {
    if (!user) return;
    try {
      const res = await apiRequest("POST", "/api/change-password", {
        ...values,
        userId: user.id,
      });
      const data = await res.json();
      if (res.ok) {
        toast({ title: "Đổi mật khẩu thành công", description: "Mật khẩu đã được cập nhật" });
        setShowChangePassword(false);
        passwordForm.reset();
      } else {
        toast({ title: "Đổi mật khẩu thất bại", description: data.message || "Có lỗi xảy ra", variant: "destructive" });
      }
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      toast({ title: "Đổi mật khẩu thất bại", description: errMsg, variant: "destructive" });
    }
  };

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
        setCollapsed={setSidebarCollapsed}
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
          onOpenChangePassword={() => setShowChangePassword(true)}
        />
        
        <main className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6">
          {children}
        </main>
        {/* Dialog đổi mật khẩu cho user thường/manager */}
        {user && user.role !== "admin" && (
          <Dialog open={showChangePassword} onOpenChange={setShowChangePassword}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Đổi mật khẩu</DialogTitle>
              </DialogHeader>
              <form onSubmit={passwordForm.handleSubmit(handlePasswordSubmit)} className="space-y-4 mt-2">
                <div>
                  <label className="block text-sm mb-1">Mật khẩu hiện tại</label>
                  <Input type="password" {...passwordForm.register("currentPassword")} />
                  <span className="text-xs text-red-500">{passwordForm.formState.errors.currentPassword?.message}</span>
                </div>
                <div>
                  <label className="block text-sm mb-1">Mật khẩu mới</label>
                  <Input type="password" {...passwordForm.register("newPassword")} />
                  <span className="text-xs text-red-500">{passwordForm.formState.errors.newPassword?.message}</span>
                </div>
                <div>
                  <label className="block text-sm mb-1">Xác nhận mật khẩu mới</label>
                  <Input type="password" {...passwordForm.register("confirmPassword")} />
                  <span className="text-xs text-red-500">{passwordForm.formState.errors.confirmPassword?.message}</span>
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <Button type="button" variant="outline" onClick={() => setShowChangePassword(false)}>Hủy</Button>
                  <Button type="submit">Cập nhật</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}
