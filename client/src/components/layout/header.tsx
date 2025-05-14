import { useState } from "react";
import { Bell, Settings, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

interface HeaderProps {
  title: string;
  onMobileMenuToggle?: () => void;
  onOpenChangePassword?: () => void;
}

export default function Header({ title, onMobileMenuToggle, onOpenChangePassword }: HeaderProps) {
  const [hasNotifications] = useState(true);
  
  // Determine page title based on current route
  const [location] = useLocation();
  let pageTitle = title;
  
  if (location === "/") {
    pageTitle = "Dashboard";
  } else if (location === "/users") {
    pageTitle = "Quản lý tài khoản";
  } else if (location === "/supermarkets") {
    pageTitle = "Quản lý siêu thị";
  } else if (location === "/audio-files") {
    pageTitle = "Quản lý file audio";
  } else if (location === "/broadcast-programs") {
    pageTitle = "Quản lý chương trình phát";
  } else if (location === "/playlists") {
    pageTitle = "Tạo danh sách phát";
  } else if (location === "/playlist-preview") {
    pageTitle = "Nghe thử chương trình";
  } else if (location === "/broadcast-assignments") {
    pageTitle = "Phân bổ chương trình";
  } else if (location === "/system-management") {
    pageTitle = "Quản lý hệ thống";
  } else if (location === "/broadcast-management") {
    pageTitle = "Quản lý chương trình phát";
  }

  return (
    <header className="bg-white shadow-sm h-16 flex items-center px-3 sm:px-6">
      <div className="flex items-center md:hidden mr-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={onMobileMenuToggle}
          className="text-neutral-medium hover:text-primary"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>
      <div className="flex-1">
        <h2 className="text-lg sm:text-xl font-semibold text-neutral-darkest">{pageTitle}</h2>
      </div>
      <div className="flex items-center space-x-2 sm:space-x-4">
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5 text-neutral-dark" />
          {hasNotifications && (
            <span className="absolute top-1 right-1 w-2 h-2 bg-danger rounded-full"></span>
          )}
        </Button>
        <Button variant="ghost" size="icon" onClick={onOpenChangePassword}>
          <Settings className="h-5 w-5 text-neutral-dark" />
        </Button>
      </div>
    </header>
  );
}
