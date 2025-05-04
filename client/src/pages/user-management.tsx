import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { User } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import DashboardLayout from "@/components/layout/dashboard-layout";
import DataTable from "@/components/data-table";
import ConfirmDialog from "@/components/confirm-dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Pencil, Key, Trash2, UserPlus, Ban, Check } from "lucide-react";
import { format } from "date-fns";

// Zod schema for user creation
const userSchema = z.object({
  username: z.string().min(3, "Tài khoản phải có ít nhất 3 ký tự"),
  fullName: z.string().min(2, "Họ tên phải có ít nhất 2 ký tự"),
  password: z.string().min(6, "Mật khẩu phải có ít nhất 6 ký tự"),
  confirmPassword: z.string().min(6, "Mật khẩu phải có ít nhất 6 ký tự"),
  role: z.enum(["admin", "manager", "user"]),
  status: z.enum(["active", "inactive"]).default("active"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Mật khẩu xác nhận không khớp",
  path: ["confirmPassword"],
});

// Zod schema for password change
const passwordChangeSchema = z.object({
  userId: z.number(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(6, "Mật khẩu mới phải có ít nhất 6 ký tự"),
  confirmPassword: z.string().min(6, "Mật khẩu xác nhận phải có ít nhất 6 ký tự"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Mật khẩu xác nhận không khớp",
  path: ["confirmPassword"],
});

type UserFormValues = z.infer<typeof userSchema>;
type PasswordChangeFormValues = z.infer<typeof passwordChangeSchema>;

export default function UserManagement() {
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const [showNewUserDialog, setShowNewUserDialog] = useState(false);
  const [showPasswordChangeDialog, setShowPasswordChangeDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showPermanentDeleteDialog, setShowPermanentDeleteDialog] = useState(false);
  const [activeFilter, setActiveFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Fetch users
  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ['/api/users'],
  });

  // State for activity logs pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // Fetch activity logs with pagination
  const { data: activityLogsData, isLoading: isLogsLoading } = useQuery<{
    logs: any[],
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }
  }>({
    queryKey: ['/api/activity-logs', { page: currentPage }],
  });
  
  // Extract logs and pagination info
  const activityLogs = activityLogsData?.logs || [];
  
  // Update total pages when data changes
  useEffect(() => {
    if (activityLogsData?.pagination) {
      setTotalPages(activityLogsData.pagination.totalPages);
    }
  }, [activityLogsData]);

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (userData: Omit<UserFormValues, "confirmPassword">) => {
      const res = await apiRequest("POST", "/api/register", userData);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      setShowNewUserDialog(false);
      toast({
        title: "Tạo tài khoản thành công",
        description: "Người dùng mới đã được tạo",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Tạo tài khoản thất bại",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: async (data: PasswordChangeFormValues) => {
      const res = await apiRequest("POST", "/api/change-password", data);
      return await res.json();
    },
    onSuccess: () => {
      setShowPasswordChangeDialog(false);
      toast({
        title: "Đổi mật khẩu thành công",
        description: "Mật khẩu đã được cập nhật",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Đổi mật khẩu thất bại",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Change user status mutation
  const changeStatusMutation = useMutation({
    mutationFn: async ({ userId, status }: { userId: number; status: string }) => {
      const res = await apiRequest("POST", `/api/users/${userId}/status`, { status });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      setShowDeleteDialog(false);
      toast({
        title: "Cập nhật trạng thái thành công",
        description: "Trạng thái người dùng đã được cập nhật",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Cập nhật trạng thái thất bại",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // User permanent deletion mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      const res = await apiRequest("DELETE", `/api/users/${userId}`);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Xóa người dùng thất bại");
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/activity-logs'] });
      toast({
        title: "Đã xóa người dùng thành công",
        description: `Tài khoản đã được xóa vĩnh viễn.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Xóa người dùng thất bại",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // User form
  const userForm = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      username: "",
      fullName: "",
      password: "",
      confirmPassword: "",
      role: "user",
      status: "active",
    },
  });

  // Password change form
  const passwordChangeForm = useForm<PasswordChangeFormValues>({
    resolver: zodResolver(passwordChangeSchema),
    defaultValues: {
      userId: 0,
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  // Handle user creation
  const onUserSubmit = (values: UserFormValues) => {
    const { confirmPassword, ...userData } = values;
    createUserMutation.mutate(userData);
  };

  // Handle password change
  const onPasswordChangeSubmit = (values: PasswordChangeFormValues) => {
    changePasswordMutation.mutate(values);
  };

  // Open password change dialog
  const handleOpenPasswordDialog = (user: User) => {
    setSelectedUser(user);
    passwordChangeForm.reset({
      userId: user.id,
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
    setShowPasswordChangeDialog(true);
  };

  // Open delete/deactivate dialog
  const handleOpenDeleteDialog = (user: User) => {
    setSelectedUser(user);
    setShowDeleteDialog(true);
  };

  // Open permanent delete dialog
  const handleOpenPermanentDeleteDialog = (user: User) => {
    setSelectedUser(user);
    setShowPermanentDeleteDialog(true);
  };

  // Handle user status change
  const handleChangeStatus = () => {
    if (selectedUser) {
      const newStatus = selectedUser.status === "active" ? "inactive" : "active";
      changeStatusMutation.mutate({
        userId: selectedUser.id,
        status: newStatus,
      });
    }
  };
  
  // Handle permanent user deletion
  const handlePermanentDelete = () => {
    if (selectedUser) {
      deleteUserMutation.mutate(selectedUser.id);
      setShowPermanentDeleteDialog(false);
    }
  };

  // Filter users based on status, role, and search term
  const filteredUsers = users.filter(user => {
    const matchesStatus = activeFilter === "all" || user.status === activeFilter;
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    const matchesSearch = 
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) || 
      user.fullName.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesStatus && matchesRole && matchesSearch;
  });

  // Format date
  const formatDate = (dateString: string | Date) => {
    return format(new Date(dateString), "dd/MM/yyyy");
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <Card>
          <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-2 sm:space-y-0">
            <CardTitle>Quản lý tài khoản</CardTitle>
            {currentUser?.role === "admin" && (
              <Button onClick={() => setShowNewUserDialog(true)} className="w-full sm:w-auto">
                <UserPlus className="mr-2 h-4 w-4" />
                Thêm tài khoản
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {/* Filter and Search Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 space-y-3 sm:space-y-0">
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 w-full sm:w-auto">
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="w-full sm:w-40">
                    <SelectValue placeholder="Tất cả vai trò" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả vai trò</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="manager">Quản lý</SelectItem>
                    <SelectItem value="user">Người dùng</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={activeFilter} onValueChange={setActiveFilter}>
                  <SelectTrigger className="w-full sm:w-40">
                    <SelectValue placeholder="Tất cả trạng thái" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả trạng thái</SelectItem>
                    <SelectItem value="active">Hoạt động</SelectItem>
                    <SelectItem value="inactive">Tạm khóa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="relative w-full sm:w-auto">
                <Input
                  type="text"
                  placeholder="Tìm kiếm tài khoản..."
                  className="pl-9 w-full sm:w-64"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-medium">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </span>
              </div>
            </div>
            
            {/* Users Table */}
            <DataTable
              columns={[
                {
                  header: "Tên tài khoản",
                  accessorKey: "username",
                  cell: ({ row }) => {
                    const user = row.original as User;
                    const initial = user.fullName.charAt(0).toUpperCase();
                    
                    // Determine background color based on role
                    let bgColor = "bg-primary-light";
                    let textColor = "text-primary";
                    
                    if (user.role === "manager") {
                      bgColor = "bg-accent-light";
                      textColor = "text-accent";
                    } else if (user.role === "user") {
                      bgColor = "bg-success-light";
                      textColor = "text-success";
                    }
                    
                    return (
                      <div className="flex items-center">
                        <div className={`w-8 h-8 rounded-full ${bgColor} ${textColor} flex items-center justify-center font-medium`}>
                          <span>{initial}</span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-neutral-darkest">{user.username}</div>
                          <div className="text-sm text-neutral-medium">{user.fullName}</div>
                        </div>
                      </div>
                    );
                  },
                },
                {
                  header: "Vai trò",
                  accessorKey: "role",
                  cell: ({ row }) => {
                    const role = row.getValue("role") as string;
                    let badgeClass = "";
                    let label = "";
                    
                    switch (role) {
                      case "admin":
                        badgeClass = "bg-primary-light/20 text-primary";
                        label = "Admin";
                        break;
                      case "manager":
                        badgeClass = "bg-blue-100 text-blue-700";
                        label = "Quản lý";
                        break;
                      case "user":
                        badgeClass = "bg-neutral-light/50 text-neutral-dark";
                        label = "Người dùng";
                        break;
                    }
                    
                    return (
                      <Badge variant="outline" className={badgeClass}>
                        {label}
                      </Badge>
                    );
                  },
                },
                {
                  header: "Trạng thái",
                  accessorKey: "status",
                  cell: ({ row }) => {
                    const status = row.getValue("status") as string;
                    const badgeClass = status === "active"
                      ? "bg-success-light/20 text-success"
                      : "bg-neutral-medium/20 text-neutral-dark";
                    const label = status === "active" ? "Hoạt động" : "Tạm khóa";
                    
                    return (
                      <Badge variant="outline" className={badgeClass}>
                        {label}
                      </Badge>
                    );
                  },
                },
                {
                  header: "Ngày tạo",
                  accessorKey: "createdAt",
                  cell: ({ row }) => {
                    const createdAt = row.getValue("createdAt") as string;
                    return <span className="text-sm text-neutral-dark">{formatDate(createdAt)}</span>;
                  },
                },
                {
                  header: "Thao tác",
                  id: "actions",
                  cell: ({ row }) => {
                    const user = row.original as User;
                    const isCurrentUser = user.id === currentUser?.id;
                    const isAdmin = currentUser?.role === "admin";
                    
                    return (
                      <div className="flex space-x-2">
                        {isAdmin && !isCurrentUser && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenPasswordDialog(user)}
                            className="h-8 w-8 text-neutral-medium hover:text-neutral-dark"
                          >
                            <Key className="h-4 w-4" />
                          </Button>
                        )}
                        
                        {isCurrentUser && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenPasswordDialog(user)}
                            className="h-8 w-8 text-primary hover:text-primary-dark"
                          >
                            <Key className="h-4 w-4" />
                          </Button>
                        )}
                        
                        {isAdmin && !isCurrentUser && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenDeleteDialog(user)}
                              className={`h-8 w-8 ${user.status === "active" ? "text-warning hover:text-warning-dark" : "text-success hover:text-success-dark"}`}
                            >
                              {user.status === "active" ? <Ban className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenPermanentDeleteDialog(user)}
                              className="h-8 w-8 text-danger hover:text-danger-dark"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    );
                  },
                },
              ]}
              data={filteredUsers}
              isLoading={isLoading}
            />
          </CardContent>
        </Card>
        
        {/* User Activity Logs */}
        {currentUser?.role === "admin" && (
          <Card>
            <CardHeader>
              <CardTitle>Lịch sử hoạt động (10 ngày gần nhất)</CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={[
                  {
                    header: "Thời gian",
                    accessorKey: "timestamp",
                    cell: ({ row }) => {
                      const timestamp = row.getValue("timestamp") as string;
                      return (
                        <span className="text-sm text-neutral-dark">
                          {format(new Date(timestamp), "dd/MM/yyyy HH:mm")}
                        </span>
                      );
                    },
                  },
                  {
                    header: "Người dùng",
                    accessorKey: "userId",
                    cell: ({ row }) => {
                      const userId = row.getValue("userId") as number;
                      const user = users.find(u => u.id === userId);
                      
                      return (
                        <div className="flex items-center">
                          <div className="text-sm font-medium text-neutral-darkest">
                            {user?.fullName || `User #${userId}`}
                          </div>
                        </div>
                      );
                    },
                  },
                  {
                    header: "Hoạt động",
                    accessorKey: "action",
                    cell: ({ row }) => {
                      const action = row.getValue("action") as string;
                      let badgeClass = "bg-primary-light/20 text-primary";
                      let label = action;
                      
                      switch (action) {
                        case "login":
                          label = "Đăng nhập";
                          break;
                        case "logout":
                          label = "Đăng xuất";
                          break;
                        case "create_user":
                          label = "Tạo tài khoản";
                          break;
                        case "change_password":
                          label = "Đổi mật khẩu";
                          badgeClass = "bg-blue-100 text-blue-700";
                          break;
                        case "activate_user":
                          label = "Kích hoạt tài khoản";
                          badgeClass = "bg-success-light/20 text-success";
                          break;
                        case "deactivate_user":
                          label = "Khóa tài khoản";
                          badgeClass = "bg-danger-light/20 text-danger";
                          break;
                      }
                      
                      return (
                        <Badge variant="outline" className={badgeClass}>
                          {label}
                        </Badge>
                      );
                    },
                  },
                  {
                    header: "Chi tiết",
                    accessorKey: "details",
                    cell: ({ row }) => {
                      const details = row.getValue("details") as string;
                      return <span className="text-sm text-neutral-dark">{details}</span>;
                    },
                  },
                ]}
                data={activityLogs}
                isLoading={isLogsLoading}
                pagination={true}
                serverSidePagination={{
                  totalItems: activityLogsData?.pagination?.total || 0,
                  currentPage: currentPage,
                  onPageChange: (page: number) => {
                    setCurrentPage(page);
                    // Invalidate query to fetch new page
                    queryClient.invalidateQueries({ 
                      queryKey: ['/api/activity-logs', { page }]
                    });
                  }
                }}
              />
              {/* Pagination footer */}
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-neutral-medium">
                  {activityLogsData?.pagination && (
                    <>Hiển thị {activityLogs.length} / {activityLogsData.pagination.total} nhật ký</>
                  )}
                </div>
                <div className="flex justify-end space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage <= 1 || isLogsLoading}
                  >
                    Trang trước
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => p + 1)}
                    disabled={currentPage >= totalPages || isLogsLoading}
                  >
                    Trang sau
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
      
      {/* New User Dialog */}
      <Dialog open={showNewUserDialog} onOpenChange={setShowNewUserDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Tạo tài khoản mới</DialogTitle>
          </DialogHeader>
          <Form {...userForm}>
            <form onSubmit={userForm.handleSubmit(onUserSubmit)} className="space-y-4">
              <FormField
                control={userForm.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tài khoản</FormLabel>
                    <FormControl>
                      <Input placeholder="Nhập tài khoản" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={userForm.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Họ tên</FormLabel>
                    <FormControl>
                      <Input placeholder="Nhập họ tên đầy đủ" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={userForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mật khẩu</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Nhập mật khẩu" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={userForm.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Xác nhận mật khẩu</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Nhập lại mật khẩu" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={userForm.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vai trò</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn vai trò" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="manager">Quản lý</SelectItem>
                        <SelectItem value="user">Người dùng</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowNewUserDialog(false)}
                >
                  Hủy
                </Button>
                <Button type="submit">Tạo tài khoản</Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Password Change Dialog */}
      <Dialog open={showPasswordChangeDialog} onOpenChange={setShowPasswordChangeDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedUser?.id === currentUser?.id
                ? "Đổi mật khẩu"
                : `Đổi mật khẩu cho ${selectedUser?.fullName}`}
            </DialogTitle>
          </DialogHeader>
          <Form {...passwordChangeForm}>
            <form onSubmit={passwordChangeForm.handleSubmit(onPasswordChangeSubmit)} className="space-y-4">
              {selectedUser?.id === currentUser?.id && (
                <FormField
                  control={passwordChangeForm.control}
                  name="currentPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mật khẩu hiện tại</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Nhập mật khẩu hiện tại" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              
              <FormField
                control={passwordChangeForm.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mật khẩu mới</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Nhập mật khẩu mới" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={passwordChangeForm.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Xác nhận mật khẩu mới</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Nhập lại mật khẩu mới" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowPasswordChangeDialog(false)}
                >
                  Hủy
                </Button>
                <Button type="submit">Lưu thay đổi</Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Delete/Deactivate User Dialog */}
      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title={selectedUser?.status === "active" ? "Khóa tài khoản" : "Mở khóa tài khoản"}
        description={
          selectedUser?.status === "active"
            ? `Bạn có chắc chắn muốn khóa tài khoản của ${selectedUser?.fullName}?`
            : `Bạn có chắc chắn muốn mở khóa tài khoản của ${selectedUser?.fullName}?`
        }
        onConfirm={handleChangeStatus}
        isLoading={changeStatusMutation.isPending}
      />
      
      {/* Permanent Delete User Dialog */}
      <ConfirmDialog
        open={showPermanentDeleteDialog}
        onOpenChange={setShowPermanentDeleteDialog}
        title="Xóa vĩnh viễn tài khoản"
        description={
          <>
            <p className="mb-2">Bạn có chắc chắn muốn xóa vĩnh viễn tài khoản <span className="font-semibold">{selectedUser?.fullName}</span>?</p>
            <p className="text-danger">Lưu ý: Hành động này không thể hoàn tác và tất cả dữ liệu liên quan đến tài khoản sẽ bị xóa vĩnh viễn.</p>
          </>
        }
        onConfirm={handlePermanentDelete}
        isLoading={deleteUserMutation.isPending}
        variant="destructive"
        confirmText="Xóa vĩnh viễn"
      />
    </DashboardLayout>
  );
}
