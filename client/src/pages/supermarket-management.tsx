import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Supermarket, insertSupermarketSchema, Region, Province, Commune } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/layout/dashboard-layout";
import DataTable from "@/components/data-table";
import ConfirmDialog from "@/components/confirm-dialog";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Edit, 
  Trash2, 
  Play, 
  Pause, 
  FileUp, 
  Plus,
  Search,
  AlertCircle
} from "lucide-react";

const formSchema = insertSupermarketSchema.extend({});

type SupermarketFormValues = z.infer<typeof formSchema>;

export default function SupermarketManagement() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [showDialog, setShowDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [selectedSupermarket, setSelectedSupermarket] = useState<Supermarket | null>(null);
  const [regionFilter, setRegionFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch supermarkets
  const { data: supermarkets = [], isLoading } = useQuery<Supermarket[]>({
    queryKey: ['/api/supermarkets'],
  });

  // Form for creating/editing supermarkets
  const form = useForm<SupermarketFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      address: "",
      ward: "",
      district: "",
      province: "",
      region: "north",
      status: "active",
    },
  });

  // Create supermarket mutation
  const createSupermarketMutation = useMutation({
    mutationFn: async (data: SupermarketFormValues) => {
      const res = await apiRequest("POST", "/api/supermarkets", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/supermarkets'] });
      setShowDialog(false);
      form.reset();
      toast({
        title: "Thành công",
        description: "Siêu thị đã được tạo",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Lỗi",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update supermarket mutation
  const updateSupermarketMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: SupermarketFormValues }) => {
      const res = await apiRequest("PUT", `/api/supermarkets/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/supermarkets'] });
      setShowDialog(false);
      toast({
        title: "Thành công",
        description: "Siêu thị đã được cập nhật",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Lỗi",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete supermarket mutation
  const deleteSupermarketMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/supermarkets/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/supermarkets'] });
      setShowDeleteDialog(false);
      toast({
        title: "Thành công",
        description: "Siêu thị đã được xóa",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Lỗi",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update supermarket status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await apiRequest("PATCH", `/api/supermarkets/${id}/status`, { status });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/supermarkets'] });
      setShowStatusDialog(false);
      toast({
        title: "Thành công",
        description: "Trạng thái siêu thị đã được cập nhật",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Lỗi",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle form submission
  const onSubmit = (values: SupermarketFormValues) => {
    if (isEdit && selectedSupermarket) {
      updateSupermarketMutation.mutate({ id: selectedSupermarket.id, data: values });
    } else {
      createSupermarketMutation.mutate(values);
    }
  };

  // Open dialog for creating new supermarket
  const handleAddNew = () => {
    setIsEdit(false);
    form.reset({
      name: "",
      address: "",
      ward: "",
      district: "",
      province: "",
      region: "north",
      status: "active",
    });
    setShowDialog(true);
  };

  // Open dialog for editing supermarket
  const handleEdit = (supermarket: Supermarket) => {
    setIsEdit(true);
    setSelectedSupermarket(supermarket);
    form.reset({
      name: supermarket.name,
      address: supermarket.address,
      ward: supermarket.ward || "",
      district: supermarket.district || "",
      province: supermarket.province || "",
      region: supermarket.region,
      status: supermarket.status,
    });
    setShowDialog(true);
  };

  // Open dialog for deleting supermarket
  const handleDelete = (supermarket: Supermarket) => {
    setSelectedSupermarket(supermarket);
    setShowDeleteDialog(true);
  };

  // Open dialog for changing supermarket status
  const handleStatusChange = (supermarket: Supermarket) => {
    setSelectedSupermarket(supermarket);
    setShowStatusDialog(true);
  };

  // Confirm delete supermarket
  const confirmDelete = () => {
    if (selectedSupermarket) {
      deleteSupermarketMutation.mutate(selectedSupermarket.id);
    }
  };

  // Confirm status change
  const confirmStatusChange = () => {
    if (selectedSupermarket) {
      const newStatus = selectedSupermarket.status === "active" ? "paused" : "active";
      updateStatusMutation.mutate({ id: selectedSupermarket.id, status: newStatus });
    }
  };
  
  // Handle import file
  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) {
      return;
    }
    
    const file = e.target.files[0];
    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      setImportError("Chỉ chấp nhận file CSV");
      toast({
        title: "Lỗi",
        description: "Chỉ chấp nhận file CSV",
        variant: "destructive",
      });
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      setImportError(null);
      const res = await fetch('/api/supermarkets/import', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        setImportError(data.message);
        toast({
          title: "Lỗi",
          description: data.message,
          variant: "destructive",
        });
        
        if (data.errors && data.errors.length > 0) {
          // Log errors for debugging
          console.error("Import errors:", data.errors);
        }
      } else {
        toast({
          title: "Thành công",
          description: data.message,
        });
        
        // Refresh the supermarkets list
        queryClient.invalidateQueries({ queryKey: ['/api/supermarkets'] });
      }
    } catch (error) {
      console.error("Import error:", error);
      setImportError("Đã xảy ra lỗi khi nhập dữ liệu");
      toast({
        title: "Lỗi",
        description: "Đã xảy ra lỗi khi nhập dữ liệu",
        variant: "destructive",
      });
    } finally {
      // Reset the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Format region name
  const formatRegion = (region: string) => {
    switch (region) {
      case "north": return "Miền Bắc";
      case "central": return "Miền Trung";
      case "south": return "Miền Nam";
      default: return region;
    }
  };

  // Filter supermarkets based on filters and search term
  const filteredSupermarkets = supermarkets.filter(supermarket => {
    const matchesRegion = regionFilter === "all" || supermarket.region === regionFilter;
    const matchesStatus = statusFilter === "all" || supermarket.status === statusFilter;
    
    const searchTermLower = searchTerm.toLowerCase();
    const matchesSearch = 
      supermarket.name.toLowerCase().includes(searchTermLower) || 
      supermarket.address.toLowerCase().includes(searchTermLower) ||
      (supermarket.ward && supermarket.ward.toLowerCase().includes(searchTermLower)) ||
      (supermarket.district && supermarket.district.toLowerCase().includes(searchTermLower)) ||
      (supermarket.province && supermarket.province.toLowerCase().includes(searchTermLower));
    
    return matchesRegion && matchesStatus && matchesSearch;
  });

  return (
    <DashboardLayout>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Quản lý siêu thị</CardTitle>
          {(user?.role === "admin" || user?.role === "manager") && (
            <div className="flex space-x-2">
              <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                <FileUp className="mr-2 h-4 w-4" />
                Nhập từ file
                <input
                  type="file"
                  className="hidden"
                  ref={fileInputRef}
                  onChange={handleFileImport}
                  accept=".csv"
                />
              </Button>
              <Button onClick={handleAddNew}>
                <Plus className="mr-2 h-4 w-4" />
                Thêm siêu thị
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {/* Import Error Message */}
          {importError && (
            <div className="mb-4 p-3 bg-danger-light/20 text-danger border border-danger/20 rounded flex items-center">
              <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
              <div className="text-sm">{importError}</div>
            </div>
          )}
          
          {/* Filter and Search Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 space-y-3 sm:space-y-0">
            <div className="flex items-center space-x-2">
              <Select value={regionFilter} onValueChange={setRegionFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Tất cả khu vực" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả khu vực</SelectItem>
                  <SelectItem value="north">Miền Bắc</SelectItem>
                  <SelectItem value="central">Miền Trung</SelectItem>
                  <SelectItem value="south">Miền Nam</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Tất cả trạng thái" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả trạng thái</SelectItem>
                  <SelectItem value="active">Đang hoạt động</SelectItem>
                  <SelectItem value="paused">Tạm dừng</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="relative">
              <Input
                type="text"
                placeholder="Tìm kiếm siêu thị..."
                className="pl-9 w-full sm:w-64"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-medium" />
            </div>
          </div>
          
          {/* Supermarkets Table */}
          <DataTable
            columns={[
              {
                header: "Tên siêu thị",
                accessorKey: "name",
                cell: ({ row }) => (
                  <div className="text-sm font-medium text-neutral-darkest">
                    {row.getValue("name")}
                  </div>
                ),
              },
              {
                header: "Địa chỉ chi tiết",
                accessorKey: "address",
                cell: ({ row }) => {
                  const supermarket = row.original as Supermarket;
                  const addressParts = [];
                  
                  if (supermarket.address) addressParts.push(supermarket.address);
                  if (supermarket.ward) addressParts.push(supermarket.ward);
                  if (supermarket.district) addressParts.push(supermarket.district);
                  if (supermarket.province) addressParts.push(supermarket.province);
                  
                  return (
                    <div className="text-sm text-neutral-dark max-w-xs truncate" title={addressParts.join(", ")}>
                      {addressParts.join(", ")}
                    </div>
                  );
                },
              },
              {
                header: "Khu vực",
                accessorKey: "region",
                cell: ({ row }) => (
                  <div className="text-sm text-neutral-dark">
                    {formatRegion(row.getValue("region"))}
                  </div>
                ),
              },
              {
                header: "Trạng thái",
                accessorKey: "status",
                cell: ({ row }) => {
                  const status = row.getValue("status") as string;
                  const badgeClass = status === "active"
                    ? "bg-success-light/20 text-success"
                    : "bg-warning-light/20 text-warning";
                  const label = status === "active" ? "Đang hoạt động" : "Tạm dừng";
                  
                  return (
                    <Badge variant="outline" className={badgeClass}>
                      {label}
                    </Badge>
                  );
                },
              },
              {
                header: "Chương trình",
                accessorKey: "currentProgram",
                cell: ({ row }) => {
                  const program = row.getValue("currentProgram") as string | undefined;
                  
                  return (
                    <div className="text-sm text-neutral-dark">
                      {program || "—"}
                    </div>
                  );
                },
              },
              {
                header: "Thao tác",
                id: "actions",
                cell: ({ row }) => {
                  const supermarket = row.original as Supermarket;
                  const isActive = supermarket.status === "active";
                  
                  return (
                    <div className="flex space-x-2">
                      {(user?.role === "admin" || user?.role === "manager") && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(supermarket)}
                            className="h-8 w-8 text-primary hover:text-primary-dark"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleStatusChange(supermarket)}
                            className={
                              isActive 
                                ? "h-8 w-8 text-warning hover:text-warning-dark" 
                                : "h-8 w-8 text-success hover:text-success-dark"
                            }
                          >
                            {isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                          </Button>
                          
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(supermarket)}
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
            data={filteredSupermarkets}
            isLoading={isLoading}
          />
        </CardContent>
      </Card>
      
      {/* Create/Edit Supermarket Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-[650px]">
          <DialogHeader>
            <DialogTitle>
              {isEdit ? "Chỉnh sửa siêu thị" : "Thêm siêu thị mới"}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              {/* Thông tin chính */}
              <div className="mb-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tên siêu thị</FormLabel>
                      <FormControl>
                        <Input placeholder="Nhập tên siêu thị" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              {/* Địa chỉ (bố trí thành nhiều cột) */}
              <div className="space-y-2 mb-4">
                <h3 className="text-sm font-medium">Thông tin địa chỉ</h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Địa chỉ cụ thể</FormLabel>
                        <FormControl>
                          <Input placeholder="Số nhà, tên đường" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="ward"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Xã/Phường</FormLabel>
                        <FormControl>
                          <Input placeholder="Nhập xã/phường" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="district"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Quận/Huyện</FormLabel>
                        <FormControl>
                          <Input placeholder="Nhập quận/huyện" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="province"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Tỉnh/Thành phố</FormLabel>
                        <FormControl>
                          <Input placeholder="Nhập tỉnh/thành phố" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
              
              {/* Cài đặt khác */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                <FormField
                  control={form.control}
                  name="region"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Khu vực</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Chọn khu vực" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="north">Miền Bắc</SelectItem>
                          <SelectItem value="central">Miền Trung</SelectItem>
                          <SelectItem value="south">Miền Nam</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Trạng thái</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Chọn trạng thái" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="active">Đang hoạt động</SelectItem>
                          <SelectItem value="paused">Tạm dừng</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="flex justify-end space-x-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowDialog(false)}
                >
                  Hủy
                </Button>
                <Button type="submit" disabled={createSupermarketMutation.isPending || updateSupermarketMutation.isPending}>
                  {isEdit ? "Cập nhật" : "Thêm mới"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Xóa siêu thị"
        description={`Bạn có chắc chắn muốn xóa siêu thị "${selectedSupermarket?.name}"? Hành động này không thể hoàn tác.`}
        onConfirm={confirmDelete}
        confirmText="Xóa"
        isLoading={deleteSupermarketMutation.isPending}
        variant="destructive"
      />
      
      {/* Status Change Confirmation Dialog */}
      <ConfirmDialog
        open={showStatusDialog}
        onOpenChange={setShowStatusDialog}
        title={selectedSupermarket?.status === "active" ? "Tạm dừng siêu thị" : "Kích hoạt siêu thị"}
        description={
          selectedSupermarket?.status === "active"
            ? `Bạn có chắc chắn muốn tạm dừng siêu thị "${selectedSupermarket?.name}"?`
            : `Bạn có chắc chắn muốn kích hoạt siêu thị "${selectedSupermarket?.name}"?`
        }
        onConfirm={confirmStatusChange}
        isLoading={updateStatusMutation.isPending}
      />
    </DashboardLayout>
  );
}
