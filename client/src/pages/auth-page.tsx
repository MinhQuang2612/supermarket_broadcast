import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { 
  Card, 
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle 
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, Music, Radio, Store } from "lucide-react";

const loginSchema = z.object({
  username: z.string().min(1, "Vui lòng nhập tài khoản"),
  password: z.string().min(1, "Vui lòng nhập mật khẩu"),
});

const registerSchema = z.object({
  username: z.string().min(3, "Tài khoản phải có ít nhất 3 ký tự"),
  fullName: z.string().min(2, "Họ tên phải có ít nhất 2 ký tự"),
  password: z.string().min(6, "Mật khẩu phải có ít nhất 6 ký tự"),
  confirmPassword: z.string().min(6, "Mật khẩu phải có ít nhất 6 ký tự"),
  role: z.enum(["admin", "manager", "user"]).default("user"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Mật khẩu xác nhận không khớp",
  path: ["confirmPassword"],
});

type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterFormValues = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const { user, isLoading, loginMutation, registerMutation } = useAuth();
  const [activeTab, setActiveTab] = useState<string>("login");
  const [needsInitialSetup, setNeedsInitialSetup] = useState<boolean>(false);
  const [setupCheckLoading, setSetupCheckLoading] = useState<boolean>(true);
  const [setupError, setSetupError] = useState<string | null>(null);
  
  // Check if initial setup is needed
  useEffect(() => {
    const checkInitialSetup = async () => {
      try {
        setSetupCheckLoading(true);
        const response = await apiRequest("GET", "/api/check-initial-setup");
        const data = await response.json();
        setNeedsInitialSetup(data.needsInitialSetup);
        setSetupError(null);
      } catch (error) {
        console.error("Lỗi khi kiểm tra trạng thái thiết lập:", error);
        setSetupError("Không thể kiểm tra trạng thái thiết lập ban đầu");
      } finally {
        setSetupCheckLoading(false);
      }
    };
    
    checkInitialSetup();
  }, []);
  
  // Login form
  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });
  
  // Register form
  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      fullName: "",
      password: "",
      confirmPassword: "",
      role: needsInitialSetup ? "admin" : "user", // Admin for initial setup
    },
  });

  // Update register form when needsInitialSetup changes
  useEffect(() => {
    if (needsInitialSetup) {
      registerForm.setValue("role", "admin");
    }
  }, [needsInitialSetup, registerForm]);

  // Handle form submission
  const onLoginSubmit = (values: LoginFormValues) => {
    loginMutation.mutate(values);
  };

  const onRegisterSubmit = (values: RegisterFormValues) => {
    const { confirmPassword, ...registerData } = values;
    
    // Use init-admin endpoint for initial setup, otherwise use regular register
    if (needsInitialSetup) {
      // Initialize the first admin account
      (async () => {
        try {
          const response = await apiRequest("POST", "/api/init-admin", registerData);
          const user = await response.json();
          // Reload the page after successful registration
          window.location.reload();
        } catch (error: any) {
          console.error("Lỗi đăng ký admin:", error);
          // Display error message
          registerForm.setError("root", {
            type: "manual",
            message: error.message || "Đăng ký thất bại. Vui lòng thử lại.",
          });
        }
      })();
    } else {
      // Regular registration through the auth context
      registerMutation.mutate(registerData);
    }
  };

  // Redirect if already logged in
  if (user) {
    setLocation("/");
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-neutral-lightest">
      {/* Left side - Auth form */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-4 md:p-8">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">
              Hệ thống Quản lý Phát Thanh Siêu Thị
            </CardTitle>
            <CardDescription className="text-center">
              Đăng nhập để quản lý hệ thống phát thanh
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-2 mb-4">
                <TabsTrigger value="login">Đăng nhập</TabsTrigger>
                <TabsTrigger value="register">Đăng ký</TabsTrigger>
              </TabsList>
              
              <TabsContent value="login">
                {loginMutation.isError && (
                  <Alert variant="destructive" className="mb-4">
                    <AlertDescription>
                      {loginMutation.error?.message || "Đăng nhập thất bại. Vui lòng thử lại."}
                    </AlertDescription>
                  </Alert>
                )}
                
                <Form {...loginForm}>
                  <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                    <FormField
                      control={loginForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tài khoản</FormLabel>
                          <FormControl>
                            <Input placeholder="Nhập tài khoản của bạn" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={loginForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Mật khẩu</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="Nhập mật khẩu của bạn" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <Button 
                      type="submit" 
                      className="w-full"
                      disabled={loginMutation.isPending}
                    >
                      {loginMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Đang đăng nhập...
                        </>
                      ) : (
                        "Đăng nhập"
                      )}
                    </Button>
                  </form>
                </Form>
              </TabsContent>
              
              <TabsContent value="register">
                {setupCheckLoading ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : setupError ? (
                  <Alert variant="destructive" className="mb-4">
                    <AlertDescription>{setupError}</AlertDescription>
                  </Alert>
                ) : needsInitialSetup ? (
                  <Alert className="mb-4">
                    <AlertDescription>
                      Chưa có tài khoản nào trong hệ thống. Bạn đang tạo tài khoản admin đầu tiên.
                    </AlertDescription>
                  </Alert>
                ) : registerMutation.isError && (
                  <Alert variant="destructive" className="mb-4">
                    <AlertDescription>
                      {registerMutation.error?.message || "Đăng ký thất bại. Vui lòng thử lại."}
                    </AlertDescription>
                  </Alert>
                )}
                
                {registerForm.formState.errors.root && (
                  <Alert variant="destructive" className="mb-4">
                    <AlertDescription>
                      {registerForm.formState.errors.root.message}
                    </AlertDescription>
                  </Alert>
                )}
                
                <Form {...registerForm}>
                  <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
                    <FormField
                      control={registerForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tài khoản</FormLabel>
                          <FormControl>
                            <Input placeholder="Nhập tài khoản mới" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={registerForm.control}
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
                      control={registerForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Mật khẩu</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="Nhập mật khẩu mới" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={registerForm.control}
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
                      control={registerForm.control}
                      name="role"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Vai trò</FormLabel>
                          <FormControl>
                            <select
                              className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                              {...field}
                            >
                              <option value="admin">Admin</option>
                              <option value="manager">Quản lý</option>
                              <option value="user">Người dùng</option>
                            </select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <Button 
                      type="submit" 
                      className="w-full"
                      disabled={registerMutation.isPending}
                    >
                      {registerMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Đang đăng ký...
                        </>
                      ) : (
                        "Đăng ký"
                      )}
                    </Button>
                  </form>
                </Form>
              </TabsContent>
            </Tabs>
          </CardContent>
          <CardFooter className="flex justify-center">
            <p className="text-sm text-neutral-medium">
              {activeTab === "login" 
                ? "Chưa có tài khoản? " 
                : "Đã có tài khoản? "}
              <Button 
                variant="link" 
                className="p-0 h-auto" 
                onClick={() => setActiveTab(activeTab === "login" ? "register" : "login")}
              >
                {activeTab === "login" ? "Đăng ký ngay" : "Đăng nhập"}
              </Button>
            </p>
          </CardFooter>
        </Card>
      </div>
      
      {/* Right side - Hero section */}
      <div className="w-full md:w-1/2 bg-primary p-8 md:p-12 text-white flex items-center justify-center">
        <div className="max-w-lg">
          <h1 className="text-3xl md:text-4xl font-bold mb-6">
            Giải pháp Quản lý Phát Thanh Siêu Thị Chuyên Nghiệp
          </h1>
          
          <div className="space-y-6">
            <div className="flex items-start space-x-4">
              <Store className="h-8 w-8 text-white mt-1" />
              <div>
                <h3 className="text-xl font-semibold mb-1">Quản lý Siêu thị</h3>
                <p className="text-primary-foreground opacity-90">
                  Quản lý thông tin siêu thị, trạng thái hoạt động và phân phối chương trình phát
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-4">
              <Music className="h-8 w-8 text-white mt-1" />
              <div>
                <h3 className="text-xl font-semibold mb-1">Quản lý File Audio</h3>
                <p className="text-primary-foreground opacity-90">
                  Tải lên, phân loại và quản lý các file âm thanh cho các chương trình phát
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-4">
              <Radio className="h-8 w-8 text-white mt-1" />
              <div>
                <h3 className="text-xl font-semibold mb-1">Lập lịch Phát thanh</h3>
                <p className="text-primary-foreground opacity-90">
                  Thiết lập tần suất, khung giờ phát và tạo danh sách phát tự động
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
