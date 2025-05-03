import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/layout/dashboard-layout";
import ConfirmDialog from "@/components/confirm-dialog";

import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription,
  CardFooter
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  AlertTriangle, 
  RefreshCcw,
  Database, 
  Trash2
} from "lucide-react";

export default function SystemManagement() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [showResetPlaylistsDialog, setShowResetPlaylistsDialog] = useState(false);
  const [showResetProgramsDialog, setShowResetProgramsDialog] = useState(false);

  // Mutation để reset playlists
  const resetPlaylistsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("DELETE", "/api/reset-playlists");
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Đã xóa toàn bộ playlists",
        description: data.message,
      });
      
      // Invalidate cache cho playlists
      queryClient.invalidateQueries({
        queryKey: ['/api/playlists']
      });
      queryClient.invalidateQueries({
        queryKey: ['/api/broadcast-programs']
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Lỗi xóa playlists",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Mutation để reset broadcast programs
  const resetProgramsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("DELETE", "/api/reset-broadcast-programs");
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Đã xóa toàn bộ chương trình phát",
        description: data.message,
      });
      
      // Invalidate cache cho broadcast programs
      queryClient.invalidateQueries({
        queryKey: ['/api/broadcast-programs']
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Lỗi xóa chương trình phát",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Chỉ hiển thị cho admin
  if (user?.role !== "admin") {
    return (
      <DashboardLayout>
        <Card>
          <CardHeader>
            <CardTitle>Quản trị hệ thống</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Bạn không có quyền truy cập vào trang này.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  // Handle reset playlists
  const handleResetPlaylists = () => {
    setShowResetPlaylistsDialog(true);
  };

  // Confirm reset playlists
  const confirmResetPlaylists = () => {
    resetPlaylistsMutation.mutate();
    setShowResetPlaylistsDialog(false);
  };

  // Handle reset broadcast programs
  const handleResetPrograms = () => {
    setShowResetProgramsDialog(true);
  };

  // Confirm reset broadcast programs
  const confirmResetPrograms = () => {
    resetProgramsMutation.mutate();
    setShowResetProgramsDialog(false);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Quản trị hệ thống</CardTitle>
            <CardDescription>
              Công cụ quản trị nâng cao cho hệ thống
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium mb-2">Quản lý dữ liệu</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Các thao tác này sẽ ảnh hưởng trực tiếp đến dữ liệu trong hệ thống. Hãy thận trọng.
                </p>

                <Alert className="mb-4 bg-amber-50 border-amber-200">
                  <AlertTriangle className="h-4 w-4 text-amber-700" />
                  <AlertDescription className="text-amber-800">
                    Các thao tác xóa dữ liệu không thể hoàn tác. Hãy sao lưu dữ liệu trước khi tiến hành.
                  </AlertDescription>
                </Alert>

                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Quản lý Playlists</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-2">
                        Xóa tất cả danh sách phát và reset ID sequence về 1.
                      </p>
                      <p className="text-sm text-muted-foreground mb-4">
                        Hành động này sẽ khắc phục lỗi ID khi xuất hiện sự không đồng bộ giữa client và database.
                      </p>
                    </CardContent>
                    <CardFooter>
                      <Button
                        variant="destructive"
                        onClick={handleResetPlaylists}
                        disabled={resetPlaylistsMutation.isPending}
                        className="w-full"
                      >
                        {resetPlaylistsMutation.isPending ? (
                          <>
                            <RefreshCcw className="h-4 w-4 mr-2 animate-spin" />
                            Đang xóa...
                          </>
                        ) : (
                          <>
                            <Trash2 className="h-4 w-4 mr-2" />
                            Xóa tất cả Playlists
                          </>
                        )}
                      </Button>
                    </CardFooter>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Quản lý Chương trình phát</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-2">
                        Xóa tất cả chương trình phát và reset ID sequence về 1.
                      </p>
                      <p className="text-sm text-muted-foreground mb-4">
                        Các playlist liên quan cũng sẽ bị xóa. Thao tác này sẽ khởi tạo lại toàn bộ hệ thống phát thanh.
                      </p>
                    </CardContent>
                    <CardFooter>
                      <Button
                        variant="destructive"
                        onClick={handleResetPrograms}
                        disabled={resetProgramsMutation.isPending}
                        className="w-full"
                      >
                        {resetProgramsMutation.isPending ? (
                          <>
                            <RefreshCcw className="h-4 w-4 mr-2 animate-spin" />
                            Đang xóa...
                          </>
                        ) : (
                          <>
                            <Trash2 className="h-4 w-4 mr-2" />
                            Xóa tất cả Chương trình
                          </>
                        )}
                      </Button>
                    </CardFooter>
                  </Card>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="text-lg font-medium mb-2">Thông tin hệ thống</h3>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="p-4 bg-neutral-lightest rounded-md">
                    <h4 className="text-sm font-medium mb-2">Phiên bản</h4>
                    <p className="text-xl font-semibold">1.0.0</p>
                  </div>
                  <div className="p-4 bg-neutral-lightest rounded-md">
                    <h4 className="text-sm font-medium mb-2">Ngày cập nhật</h4>
                    <p className="text-xl font-semibold">03/05/2025</p>
                  </div>
                  <div className="p-4 bg-neutral-lightest rounded-md">
                    <h4 className="text-sm font-medium mb-2">Trạng thái DB</h4>
                    <p className="text-xl font-semibold flex items-center">
                      <span className="h-2 w-2 rounded-full bg-green-500 mr-2"></span>
                      Hoạt động
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Confirm Reset Playlists Dialog */}
      <ConfirmDialog
        open={showResetPlaylistsDialog}
        onOpenChange={setShowResetPlaylistsDialog}
        title="Xác nhận xóa tất cả playlists"
        description="Bạn có chắc chắn muốn xóa tất cả danh sách phát? Hành động này không thể hoàn tác."
        confirmText="Xóa tất cả"
        cancelText="Hủy"
        onConfirm={confirmResetPlaylists}
        variant="destructive"
      />

      {/* Confirm Reset Programs Dialog */}
      <ConfirmDialog
        open={showResetProgramsDialog}
        onOpenChange={setShowResetProgramsDialog}
        title="Xác nhận xóa tất cả chương trình phát"
        description="Bạn có chắc chắn muốn xóa tất cả chương trình phát sóng? Các playlist liên quan cũng sẽ bị xóa. Hành động này không thể hoàn tác."
        confirmText="Xóa tất cả"
        cancelText="Hủy"
        onConfirm={confirmResetPrograms}
        variant="destructive"
      />
    </DashboardLayout>
  );
}