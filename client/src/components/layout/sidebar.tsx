import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  LayoutDashboard, 
  Users, 
  Store, 
  Music, 
  Radio, 
  ListOrdered, 
  Headphones,
  ListChecks,
  Settings,
  LogOut,
  Menu,
  Plus
} from "lucide-react";

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  setCollapsed?: (collapsed: boolean) => void;
}

export default function Sidebar({ collapsed, onToggleCollapse, setCollapsed }: SidebarProps) {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const navItems = [
    {
      title: "Dashboard",
      href: "/",
      icon: <LayoutDashboard className="h-5 w-5" />,
    },
    {
      title: "Quản lý tài khoản",
      href: "/users",
      icon: <Users className="h-5 w-5" />,
      roles: ["admin"],
    },
    {
      title: "Quản lý siêu thị",
      href: "/supermarkets",
      icon: <Store className="h-5 w-5" />,
    },
    {
      title: "Quản lý file audio",
      href: "/audio-files",
      icon: <Music className="h-5 w-5" />,
    },
    {
      title: "Tạo danh sách phát",
      href: "/playlists",
      icon: <Plus className="h-5 w-5" />,
    },
  ];

  // Filter menu items based on user role
  const filteredNavItems = navItems.filter(item => {
    if (!item.roles) return true;
    return item.roles.includes(user?.role || "");
  });

  return (
    <div className={cn(
      "fixed md:relative h-full bg-white shadow-md z-20 flex flex-col transition-all duration-300 transform",
      collapsed ? "w-16 -translate-x-full md:translate-x-0" : "w-64",
    )}>
      <div className="p-3 sm:p-4 border-b border-neutral-light flex items-center justify-between">
        {!collapsed && (
          <h1 className="text-base sm:text-lg font-bold text-primary truncate">Quản lý Phát Thanh</h1>
        )}
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onToggleCollapse}
          className="text-neutral-medium hover:text-primary"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>
      
      {!collapsed && (
        <div className="p-2">
          <div className="flex items-center space-x-3 p-2 sm:p-3 mb-2 sm:mb-4">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-primary text-white flex items-center justify-center">
              {user?.fullName ? user.fullName.charAt(0).toUpperCase() : "U"}
            </div>
            <div>
              <p className="font-medium text-xs sm:text-sm">{user?.fullName || "User"}</p>
              <p className="text-xs text-neutral-medium">
                {user?.role === "admin" ? "Quản trị viên" : 
                 user?.role === "manager" ? "Quản lý" : "Người dùng"}
              </p>
            </div>
          </div>
        </div>
      )}
      
      <nav className="flex-1 overflow-y-auto py-2">
        <ul className="space-y-1 px-2">
          {filteredNavItems.map((item) => {
            const isActive = location === item.href;
            return (
              <li key={item.href}>
                <Link href={item.href}>
                  <div 
                    className={cn(
                      "flex items-center py-2 sm:py-3 px-2 sm:px-3 text-xs sm:text-sm rounded-md hover:bg-neutral-lightest transition-colors cursor-pointer",
                      isActive ? "text-primary font-medium border-l-4 border-primary pl-1 sm:pl-2" : "",
                      collapsed && "justify-center"
                    )}
                    onClick={e => {
                      // Nếu sidebar đang thu nhỏ, không thay đổi trạng thái
                      if (setCollapsed) setCollapsed(collapsed);
                    }}
                  >
                    <span className={cn(
                      collapsed ? "" : "min-w-6",
                      isActive ? "text-primary" : "text-neutral-dark"
                    )}>{item.icon}</span>
                    {!collapsed && <span className="ml-2 whitespace-nowrap overflow-hidden text-ellipsis">{item.title}</span>}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      
      <div className="p-3 sm:p-4 border-t border-neutral-light">
        <Button 
          variant="ghost" 
          className={cn(
            "flex items-center text-neutral-dark hover:text-danger w-full justify-start text-xs sm:text-sm",
            collapsed && "justify-center"
          )}
          onClick={handleLogout}
          disabled={logoutMutation.isPending}
        >
          <LogOut className={cn("h-4 w-4 sm:h-5 sm:w-5", collapsed ? "" : "mr-2")} />
          {!collapsed && <span>Đăng xuất</span>}
        </Button>
      </div>
    </div>
  );
}
