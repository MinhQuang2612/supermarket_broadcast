import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { User } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription,
  CardFooter
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { 
  Globe, 
  Server, 
  HardDrive, 
  Database, 
  Settings, 
  Users, 
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Cpu,
  Wifi,
  Clock
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

// Form schema for domain settings
const domainSchema = z.object({
  domain: z.string().min(3, {
    message: "Tên miền phải có ít nhất 3 ký tự",
  }),
  ssl: z.boolean().default(true),
});

// Form schema for server settings
const serverSchema = z.object({
  serverLocation: z.string().min(1, {
    message: "Vui lòng chọn vị trí máy chủ",
  }),
  serverType: z.string().min(1, {
    message: "Vui lòng chọn loại máy chủ",
  }),
  storageSize: z.string().min(1, {
    message: "Vui lòng nhập dung lượng lưu trữ",
  }),
  backupEnabled: z.boolean().default(true),
});

type DomainFormValues = z.infer<typeof domainSchema>;
type ServerFormValues = z.infer<typeof serverSchema>;

export default function SystemManagement() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("domain");
  const [domainRegistered, setDomainRegistered] = useState(false);
  const [serverConfigured, setServerConfigured] = useState(false);

  // System stats
  const [memoryUsage, setMemoryUsage] = useState(78);
  const [cpuUsage, setCpuUsage] = useState(42);
  const [networkUsage, setNetworkUsage] = useState(91);
  const [uptime, setUptime] = useState("32 ngày");
  const [serverVersion, setServerVersion] = useState("1.2.5");

  // Check if the user has admin role
  if (user?.role !== "admin") {
    return (
      <DashboardLayout>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Bạn không có quyền truy cập trang quản lý hệ thống. Chỉ quản trị viên mới có thể truy cập.
          </AlertDescription>
        </Alert>
      </DashboardLayout>
    );
  }

  // Fetch users (for user stats)
  const { data: users = [], isLoading: isLoadingUsers } = useQuery<User[]>({
    queryKey: ['/api/users'],
  });

  // Domain registration form
  const domainForm = useForm<DomainFormValues>({
    resolver: zodResolver(domainSchema),
    defaultValues: {
      domain: "",
      ssl: true,
    },
  });

  // Server configuration form
  const serverForm = useForm<ServerFormValues>({
    resolver: zodResolver(serverSchema),
    defaultValues: {
      serverLocation: "",
      serverType: "",
      storageSize: "",
      backupEnabled: true,
    },
  });

  // Handle domain form submission
  const onDomainSubmit = (values: DomainFormValues) => {
    console.log(values);
    // In a real implementation, this would call an API to register the domain
    setDomainRegistered(true);
  };

  // Handle server form submission
  const onServerSubmit = (values: ServerFormValues) => {
    console.log(values);
    // In a real implementation, this would call an API to configure the server
    setServerConfigured(true);
  };

  // Get admin count
  const getAdminCount = () => {
    return users.filter(user => user.role === "admin").length;
  };

  // Get manager count
  const getManagerCount = () => {
    return users.filter(user => user.role === "manager").length;
  };

  // Get user count
  const getUserCount = () => {
    return users.filter(user => user.role === "user").length;
  };

  // Format storage size
  const formatStorage = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    else if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + " KB";
    else if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + " MB";
    else return (bytes / (1024 * 1024 * 1024)).toFixed(2) + " GB";
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Quản lý hệ thống</CardTitle>
            <CardDescription>
              Cấu hình và quản lý các thiết lập hệ thống
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue={activeTab} value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full md:w-auto grid-cols-2">
                <TabsTrigger value="domain" className="flex items-center">
                  <Globe className="h-4 w-4 mr-2" />
                  Cấu hình tên miền
                </TabsTrigger>
                <TabsTrigger value="server" className="flex items-center">
                  <Server className="h-4 w-4 mr-2" />
                  Cấu hình máy chủ
                </TabsTrigger>
              </TabsList>
              
              {/* Domain Configuration Tab */}
              <TabsContent value="domain" className="mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-medium mb-4 flex items-center">
                      <Globe className="h-5 w-5 mr-2 text-primary" />
                      Đăng ký tên miền
                    </h3>
                    
                    {domainRegistered ? (
                      <Alert className="bg-success/10 border-success mb-4">
                        <CheckCircle className="h-4 w-4 text-success" />
                        <AlertDescription className="text-success">
                          Tên miền đã được đăng ký thành công.
                        </AlertDescription>
                      </Alert>
                    ) : null}
                    
                    <Form {...domainForm}>
                      <form onSubmit={domainForm.handleSubmit(onDomainSubmit)} className="space-y-4">
                        <FormField
                          control={domainForm.control}
                          name="domain"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Tên miền</FormLabel>
                              <FormControl>
                                <Input placeholder="example.com" {...field} />
                              </FormControl>
                              <FormDescription>
                                Nhập tên miền bạn muốn đăng ký cho hệ thống.
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={domainForm.control}
                          name="ssl"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                              <FormControl>
                                <input
                                  type="checkbox"
                                  className="rounded border-neutral-light text-primary focus:ring-primary"
                                  checked={field.value}
                                  onChange={field.onChange}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel>Bật SSL/TLS</FormLabel>
                                <FormDescription>
                                  Bảo mật kết nối với chứng chỉ SSL/TLS.
                                </FormDescription>
                              </div>
                            </FormItem>
                          )}
                        />
                        
                        <Button type="submit" className="mt-4">
                          Đăng ký tên miền
                        </Button>
                      </form>
                    </Form>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-medium mb-4">Thông tin tên miền</h3>
                    
                    {domainRegistered ? (
                      <div className="bg-white rounded-lg border p-4 space-y-4">
                        <div>
                          <label className="text-sm text-neutral-medium">Tên miền</label>
                          <p className="font-medium">{domainForm.getValues("domain")}</p>
                        </div>
                        
                        <div>
                          <label className="text-sm text-neutral-medium">Trạng thái</label>
                          <p>
                            <Badge className="bg-success-light/20 text-success">
                              <CheckCircle className="h-3 w-3 mr-1" /> Đang hoạt động
                            </Badge>
                          </p>
                        </div>
                        
                        <div>
                          <label className="text-sm text-neutral-medium">SSL/TLS</label>
                          <p>
                            <Badge className={domainForm.getValues("ssl") ? "bg-success-light/20 text-success" : "bg-neutral-medium/20 text-neutral-dark"}>
                              {domainForm.getValues("ssl") ? "Đã bật" : "Đã tắt"}
                            </Badge>
                          </p>
                        </div>
                        
                        <div>
                          <label className="text-sm text-neutral-medium">Nameservers</label>
                          <p className="text-sm">ns1.example.com</p>
                          <p className="text-sm">ns2.example.com</p>
                        </div>
                        
                        <div>
                          <label className="text-sm text-neutral-medium">Ngày đăng ký</label>
                          <p className="text-sm">{new Date().toLocaleDateString()}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-neutral-lightest rounded-lg p-6 h-64 flex items-center justify-center">
                        <div className="text-center">
                          <AlertTriangle className="h-12 w-12 text-neutral-medium mx-auto mb-3" />
                          <p className="text-neutral-dark">
                            Chưa có thông tin tên miền.
                          </p>
                          <p className="text-sm text-neutral-medium mt-1">
                            Vui lòng đăng ký tên miền trước.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>
              
              {/* Server Configuration Tab */}
              <TabsContent value="server" className="mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-medium mb-4 flex items-center">
                      <Server className="h-5 w-5 mr-2 text-primary" />
                      Cấu hình máy chủ
                    </h3>
                    
                    {serverConfigured ? (
                      <Alert className="bg-success/10 border-success mb-4">
                        <CheckCircle className="h-4 w-4 text-success" />
                        <AlertDescription className="text-success">
                          Máy chủ đã được cấu hình thành công.
                        </AlertDescription>
                      </Alert>
                    ) : null}
                    
                    <Form {...serverForm}>
                      <form onSubmit={serverForm.handleSubmit(onServerSubmit)} className="space-y-4">
                        <FormField
                          control={serverForm.control}
                          name="serverLocation"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Vị trí máy chủ</FormLabel>
                              <FormControl>
                                <select
                                  className="w-full px-3 py-2 border border-neutral-light rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                                  {...field}
                                >
                                  <option value="">Chọn vị trí</option>
                                  <option value="vietnam">Việt Nam</option>
                                  <option value="singapore">Singapore</option>
                                  <option value="japan">Nhật Bản</option>
                                  <option value="usa">Hoa Kỳ</option>
                                </select>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={serverForm.control}
                          name="serverType"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Loại máy chủ</FormLabel>
                              <FormControl>
                                <select
                                  className="w-full px-3 py-2 border border-neutral-light rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                                  {...field}
                                >
                                  <option value="">Chọn loại máy chủ</option>
                                  <option value="shared">Shared Hosting</option>
                                  <option value="vps">VPS</option>
                                  <option value="dedicated">Dedicated Server</option>
                                  <option value="cloud">Cloud Server</option>
                                </select>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={serverForm.control}
                          name="storageSize"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Dung lượng lưu trữ (GB)</FormLabel>
                              <FormControl>
                                <Input type="number" min="10" placeholder="50" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={serverForm.control}
                          name="backupEnabled"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                              <FormControl>
                                <input
                                  type="checkbox"
                                  className="rounded border-neutral-light text-primary focus:ring-primary"
                                  checked={field.value}
                                  onChange={field.onChange}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel>Bật sao lưu tự động</FormLabel>
                                <FormDescription>
                                  Sao lưu dữ liệu hệ thống hàng ngày.
                                </FormDescription>
                              </div>
                            </FormItem>
                          )}
                        />
                        
                        <Button type="submit" className="mt-4">
                          Cấu hình máy chủ
                        </Button>
                      </form>
                    </Form>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-medium mb-4">Trạng thái hệ thống</h3>
                    
                    <div className="bg-white rounded-lg border p-4 space-y-4">
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm text-neutral-dark">Bộ nhớ máy chủ</span>
                          <span className="text-sm font-medium text-neutral-dark">{memoryUsage}%</span>
                        </div>
                        <div className="w-full bg-neutral-light rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${memoryUsage > 90 ? "bg-danger" : memoryUsage > 70 ? "bg-accent" : "bg-primary"}`} 
                            style={{ width: `${memoryUsage}%` }}
                          ></div>
                        </div>
                      </div>
                      
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm text-neutral-dark">CPU</span>
                          <span className="text-sm font-medium text-neutral-dark">{cpuUsage}%</span>
                        </div>
                        <div className="w-full bg-neutral-light rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${cpuUsage > 90 ? "bg-danger" : cpuUsage > 70 ? "bg-accent" : "bg-success"}`} 
                            style={{ width: `${cpuUsage}%` }}
                          ></div>
                        </div>
                      </div>
                      
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm text-neutral-dark">Băng thông</span>
                          <span className="text-sm font-medium text-neutral-dark">{networkUsage}%</span>
                        </div>
                        <div className="w-full bg-neutral-light rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${networkUsage > 90 ? "bg-danger" : networkUsage > 70 ? "bg-accent" : "bg-success"}`} 
                            style={{ width: `${networkUsage}%` }}
                          ></div>
                        </div>
                      </div>
                      
                      <Separator />
                      
                      <div className="pt-2">
                        <h4 className="text-sm font-medium mb-3">Thông tin máy chủ</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="text-neutral-medium flex items-center">
                              <RefreshCw className="h-4 w-4 mr-1" /> Tình trạng
                            </span>
                            <span className="text-success font-medium">Hoạt động</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-neutral-medium flex items-center">
                              <Clock className="h-4 w-4 mr-1" /> Thời gian hoạt động
                            </span>
                            <span className="text-neutral-dark">{uptime}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-neutral-medium flex items-center">
                              <Settings className="h-4 w-4 mr-1" /> Phiên bản
                            </span>
                            <span className="text-neutral-dark">{serverVersion}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* System Overview */}
                <div className="mt-6">
                  <h3 className="text-lg font-medium mb-4">Tổng quan hệ thống</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-medium">Tài nguyên</h4>
                          <Database className="h-5 w-5 text-primary" />
                        </div>
                        
                        <div className="space-y-4">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-neutral-medium flex items-center">
                              <HardDrive className="h-4 w-4 mr-1" /> Dung lượng đĩa
                            </span>
                            <span className="font-medium">{formatStorage(1024 * 1024 * 1024 * 50)}</span>
                          </div>
                          
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-neutral-medium flex items-center">
                              <Cpu className="h-4 w-4 mr-1" /> CPU Cores
                            </span>
                            <span className="font-medium">4 cores</span>
                          </div>
                          
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-neutral-medium flex items-center">
                              <Wifi className="h-4 w-4 mr-1" /> Băng thông
                            </span>
                            <span className="font-medium">100 Mbps</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-medium">Người dùng</h4>
                          <Users className="h-5 w-5 text-primary" />
                        </div>
                        
                        <div className="space-y-4">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-neutral-medium">Admin</span>
                            <span className="font-medium">{getAdminCount()}</span>
                          </div>
                          
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-neutral-medium">Quản lý</span>
                            <span className="font-medium">{getManagerCount()}</span>
                          </div>
                          
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-neutral-medium">Người dùng</span>
                            <span className="font-medium">{getUserCount()}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-medium">Bảo mật</h4>
                          <Settings className="h-5 w-5 text-primary" />
                        </div>
                        
                        <div className="space-y-4">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-neutral-medium">SSL/TLS</span>
                            <Badge className="bg-success-light/20 text-success">Đã bật</Badge>
                          </div>
                          
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-neutral-medium">Firewall</span>
                            <Badge className="bg-success-light/20 text-success">Đã bật</Badge>
                          </div>
                          
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-neutral-medium">Sao lưu tự động</span>
                            <Badge className="bg-success-light/20 text-success">Hàng ngày</Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
