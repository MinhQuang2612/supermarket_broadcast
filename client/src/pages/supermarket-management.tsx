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
  AlertCircle,
  Download
} from "lucide-react";

const formSchema = insertSupermarketSchema.extend({
  name: z.string().min(1, { message: "Tên siêu thị không được để trống" }),
  address: z.string().min(1, { message: "Địa chỉ không được để trống" }),
  regionId: z.number().min(1, { message: "Vui lòng chọn khu vực" }),
  provinceId: z.number().min(1, { message: "Vui lòng chọn tỉnh/thành phố" }),
  communeId: z.number().min(1, { message: "Vui lòng chọn quận/huyện" }),
  supermarketTypeId: z.number().min(1, { message: "Vui lòng chọn loại siêu thị" }),
});

type SupermarketFormValues = z.infer<typeof formSchema>;

export default function SupermarketManagement() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [showDialog, setShowDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [showCreateConfirmDialog, setShowCreateConfirmDialog] = useState(false);
  const [showEditConfirmDialog, setShowEditConfirmDialog] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [selectedSupermarket, setSelectedSupermarket] = useState<Supermarket | null>(null);
  const [pendingFormValues, setPendingFormValues] = useState<SupermarketFormValues | null>(null);
  const [regionFilter, setRegionFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Chosen IDs for cascading selection
  const [selectedRegionId, setSelectedRegionId] = useState<number | null>(null);
  const [selectedProvinceId, setSelectedProvinceId] = useState<number | null>(null);

  // State for sorting
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>(null);

  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  
  // Fetch supermarkets with pagination
  const { data, isLoading } = useQuery({
    queryKey: ['/api/supermarkets', page, pageSize, sortKey, sortDirection, regionFilter, statusFilter, searchTerm],
    queryFn: async ({ queryKey }) => {
      const [endpoint, pageNum, pageSizeNum, sort, direction, region, status, search] = queryKey;
      
      // Xây dựng URL với các tham số query
      let url = `${endpoint}?page=${pageNum}&pageSize=${pageSizeNum}`;
      
      // Thêm các tham số sắp xếp nếu có
      if (sort && direction) {
        url += `&sortKey=${sort}&sortDirection=${direction}`;
      }
      
      // Thêm các bộ lọc nếu không phải "all"
      if (region !== 'all') url += `&region=${region}`;
      if (status !== 'all') url += `&status=${status}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch supermarkets');
      return res.json();
    },
  });
  
  // Extract supermarkets and pagination info from response
  const supermarkets = data?.supermarkets || [];
  
  // Update pagination state whenever data changes
  useEffect(() => {
    if (data?.pagination) {
      setTotalItems(data.pagination.total);
      setTotalPages(data.pagination.totalPages);
    }
  }, [data]);
  
  // Fetch regions
  const { data: regions = [] } = useQuery<Region[]>({
    queryKey: ['/api/regions'],
  });
  
  // Fetch all provinces (for display in table)
  const { data: allProvinces = [] } = useQuery<Province[]>({
    queryKey: ['/api/provinces'],
  });
  
  // Fetch all communes (for display in table)
  const { data: allCommunes = [] } = useQuery<Commune[]>({
    queryKey: ['/api/communes'],
  });
  
  // Fetch provinces based on selected region (for form)
  const { data: provinces = [] } = useQuery<Province[]>({
    queryKey: ['/api/provinces', selectedRegionId],
    queryFn: async ({ queryKey }) => {
      const [_, regionId] = queryKey;
      if (!regionId) return [];
      const res = await fetch(`/api/provinces?regionId=${regionId}`);
      if (!res.ok) throw new Error('Failed to fetch provinces');
      return res.json();
    },
    enabled: !!selectedRegionId,
  });
  
  // Fetch communes based on selected province (for form)
  const { data: communes = [] } = useQuery<Commune[]>({
    queryKey: ['/api/communes', selectedProvinceId],
    queryFn: async ({ queryKey }) => {
      const [_, provinceId] = queryKey;
      if (!provinceId) return [];
      const res = await fetch(`/api/communes?provinceId=${provinceId}`);
      if (!res.ok) throw new Error('Failed to fetch communes');
      return res.json();
    },
    enabled: !!selectedProvinceId,
  });

  // Fetch supermarket types
  const { data: supermarketTypes = [] } = useQuery({
    queryKey: ['/api/supermarket-types'],
    queryFn: async () => {
      try {
        console.log("Fetching supermarket types...");
        const res = await fetch('/api/supermarket-types');
        if (!res.ok) {
          console.error("Failed to fetch supermarket types:", res.status, res.statusText);
          throw new Error('Failed to fetch supermarket types');
        }
        const data = await res.json();
        console.log("Fetched supermarket types:", data);
        return data;
      } catch (error) {
        console.error("Error fetching supermarket types:", error);
        return [];
      }
    },
  });

  // Log supermarket types data for debugging
  useEffect(() => {
    console.log("Current supermarket types:", supermarketTypes);
    console.log("Current supermarkets:", supermarkets);
  }, [supermarketTypes, supermarkets]);

  // Form for creating/editing supermarkets
  const form = useForm<SupermarketFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      address: "",
      status: "active",
      regionId: 0,
      provinceId: 0,
      communeId: 0,
      supermarketTypeId: 0,
    },
  });
  
  // Effect to update regionId, provinceId, communeId when selecting items
  useEffect(() => {
    const regionId = form.watch("regionId");
    const provinceId = form.watch("provinceId");
    
    if (regionId && regionId !== selectedRegionId) {
      setSelectedRegionId(regionId);
      // Reset province when region changes
      form.setValue("provinceId", 0);
      form.setValue("communeId", 0);
      setSelectedProvinceId(null);
    }
    
    if (provinceId && provinceId !== selectedProvinceId) {
      setSelectedProvinceId(provinceId);
      // Reset commune when province changes
      form.setValue("communeId", 0);
    }
  }, [form.watch("regionId"), form.watch("provinceId"), form]);

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

  // Handle initial form submission - will show confirmation dialog
  const onSubmit = (values: SupermarketFormValues) => {
    setPendingFormValues(values);
    if (isEdit) {
      setShowEditConfirmDialog(true);
    } else {
      setShowCreateConfirmDialog(true);
    }
  };

  // Handle confirmed form submission
  const handleConfirmedSubmit = () => {
    if (!pendingFormValues) return;
    
    if (isEdit && selectedSupermarket) {
      updateSupermarketMutation.mutate({ id: selectedSupermarket.id, data: pendingFormValues });
    } else {
      createSupermarketMutation.mutate(pendingFormValues);
    }
    
    setShowCreateConfirmDialog(false);
    setShowEditConfirmDialog(false);
  };

  // Open dialog for creating new supermarket
  const handleAddNew = () => {
    setIsEdit(false);
    setSelectedRegionId(null);
    setSelectedProvinceId(null);
    form.reset({
      name: "",
      address: "",
      status: "active",
      regionId: 0,
      provinceId: 0,
      communeId: 0,
      supermarketTypeId: 0,
    });
    setShowDialog(true);
  };

  // Open dialog for editing supermarket
  const handleEdit = (supermarket: Supermarket) => {
    setIsEdit(true);
    setSelectedSupermarket(supermarket);
    
    // Set region and province for cascading dropdowns
    setSelectedRegionId(supermarket.regionId);
    setSelectedProvinceId(supermarket.provinceId);
    
    form.reset({
      name: supermarket.name,
      address: supermarket.address,
      status: supermarket.status,
      regionId: supermarket.regionId || 0,
      provinceId: supermarket.provinceId || 0,
      communeId: supermarket.communeId || 0,
      supermarketTypeId: supermarket.supermarketTypeId || 0,
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
          setImportError(`Lỗi nhập dữ liệu: ${data.errors.join(", ")}`);
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

  // Handle sort change
  
  // Handle sort change
  const handleSortChange = (key: string, direction: 'asc' | 'desc' | null) => {
    // Xác định hướng sắp xếp mới
    let newDirection: 'asc' | 'desc';
    
    // Kiểm tra xem có phải là cùng một cột không
    if (sortKey === key) {
      // Nếu là cùng một cột, đảo ngược hướng sắp xếp
      newDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      // Nếu là cột mới, mặc định sắp xếp tăng dần
      newDirection = 'asc';
    }
    
    console.log('SupermarketManagement toggling sort:', { 
      currentKey: sortKey, 
      newKey: key, 
      currentDirection: sortDirection, 
      newDirection 
    });
    
    // Cập nhật state
    setSortKey(key);
    setSortDirection(newDirection);
  };
  
  // State và hàm xử lý cho dialog tải mẫu
  const [showDownloadConfirmDialog, setShowDownloadConfirmDialog] = useState(false);
  
  // Hàm xác nhận tải mẫu
  const confirmDownloadTemplate = async () => {
    try {
      // Sử dụng fetch API để tải xuống file
      const response = await fetch('/api/supermarket-template', {
        method: 'GET',
        headers: {
          'Accept': 'text/csv',
        },
      });
      
      if (!response.ok) {
        throw new Error('Không thể tải xuống mẫu');
      }
      
      // Lấy blob từ response
      const blob = await response.blob();
      
      // Tạo URL object từ blob
      const url = window.URL.createObjectURL(blob);
      
      // Tạo một thẻ a và mô phỏng sự kiện click
      const link = document.createElement('a');
      link.href = url;
      link.download = 'mau_sieu_thi.csv';
      document.body.appendChild(link);
      link.click();
      
      // Dọn dẹp
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
      
      // Đóng dialog
      setShowDownloadConfirmDialog(false);
      
      // Hiển thị thông báo thành công
      toast({
        title: "Thành công",
        description: "Đã tải xuống mẫu siêu thị",
      });
    } catch (error) {
      console.error('Lỗi khi tải mẫu:', error);
      toast({
        title: "Lỗi",
        description: "Không thể tải xuống mẫu siêu thị",
        variant: "destructive",
      });
      setShowDownloadConfirmDialog(false);
    }
  };
  
  // Đã chuyển sang sử dụng phân trang trên server (không cần lọc ở client)
  // Khi thay đổi bộ lọc, ta sẽ yêu cầu server trả về dữ liệu đã được lọc
  
  // Theo dõi thay đổi trong các bộ lọc và cập nhật lại dữ liệu
  useEffect(() => {
    // Reset về trang 1 khi thay đổi bộ lọc
    setPage(1);
  }, [regionFilter, statusFilter, searchTerm]);

  return (
    <DashboardLayout>
      <Card>
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-2 sm:space-y-0">
          <CardTitle>Quản lý siêu thị</CardTitle>
          {(user?.role === "admin" || user?.role === "manager") && (
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 w-full sm:w-auto">
              <div className="flex space-x-2">
                <Button 
                  variant="outline" 
                  onClick={() => setShowDownloadConfirmDialog(true)} 
                  className="w-full sm:w-auto"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Tải mẫu CSV
                </Button>
                <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="w-full sm:w-auto">
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
              </div>
              <Button onClick={handleAddNew} className="w-full sm:w-auto">
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
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 w-full sm:w-auto">
              <Select value={regionFilter} onValueChange={setRegionFilter}>
                <SelectTrigger className="w-full sm:w-40">
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
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Tất cả trạng thái" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả trạng thái</SelectItem>
                  <SelectItem value="active">Đang hoạt động</SelectItem>
                  <SelectItem value="paused">Tạm dừng</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="relative w-full sm:w-auto">
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
                sortable: true,
                cell: ({ row }) => (
                  <div className="text-sm font-medium text-neutral-darkest">
                    {row.getValue("name")}
                  </div>
                ),
              },
              {
                header: "Địa chỉ chi tiết",
                accessorKey: "address",
                sortable: true,
                cell: ({ row }) => {
                  const supermarket = row.original as Supermarket;
                  const commune = allCommunes.find(c => c.id === supermarket.communeId);
                  const province = allProvinces.find(p => p.id === supermarket.provinceId);
                  const region = regions.find(r => r.id === supermarket.regionId);
                  
                  // Hiển thị đầy đủ: địa chỉ gốc, quận/huyện và tỉnh/thành phố
                  const addressParts = [];
                  if (supermarket.address) addressParts.push(supermarket.address);
                  if (commune?.name) addressParts.push(commune.name);
                  if (province?.name) addressParts.push(province.name);
                  
                  return (
                    <div className="text-sm text-neutral-dark max-w-xs" title={addressParts.join(", ")}>
                      {addressParts.join(", ")}
                    </div>
                  );
                },
              },
              {
                header: "Khu vực",
                accessorKey: "regionId",
                sortable: true,
                cell: ({ row }) => {
                  const supermarket = row.original as Supermarket;
                  const region = regions.find(r => r.id === supermarket.regionId);
                  return (
                    <div className="text-sm text-neutral-dark">
                      {region?.name || "—"}
                    </div>
                  );
                },
              },
              {
                header: "Trạng thái",
                accessorKey: "status",
                sortable: true,
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
                header: "Loại siêu thị",
                accessorKey: "supermarketTypeId",
                cell: ({ row }) => {
                  const typeId = row.getValue("supermarketTypeId");
                  const type = supermarketTypes.find((t: any) => t.id === typeId);
                  return (
                    <div className="text-sm text-neutral-dark">
                      {type ? type.displayName : "—"}
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
            data={supermarkets}
            isLoading={isLoading}
            serverSideSorting={{
              sortKey,
              sortDirection,
              onSortChange: handleSortChange
            }}
            serverSidePagination={{
              totalItems,
              currentPage: page,
              onPageChange: (newPage) => setPage(newPage)
            }}
            pageSize={pageSize}
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
                  
                  {/* Các trường vị trí mới - Khu vực, Tỉnh/Thành phố, Quận/Huyện */}
                  <FormField
                    control={form.control}
                    name="regionId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Khu vực</FormLabel>
                        <Select
                          onValueChange={(value) => field.onChange(parseInt(value))}
                          defaultValue={field.value?.toString() || "0"}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Chọn khu vực" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="0" disabled>Chọn khu vực</SelectItem>
                            {regions.map((region) => (
                              <SelectItem key={region.id} value={region.id.toString()}>
                                {region.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="provinceId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Tỉnh/Thành phố</FormLabel>
                        <Select
                          onValueChange={(value) => field.onChange(parseInt(value))}
                          defaultValue={field.value?.toString() || "0"}
                          disabled={!selectedRegionId || provinces.length === 0}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Chọn tỉnh/thành phố" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="0" disabled>Chọn tỉnh/thành phố</SelectItem>
                            {provinces.map((province) => (
                              <SelectItem key={province.id} value={province.id.toString()}>
                                {province.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="communeId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Quận/Huyện/Xã</FormLabel>
                        <Select
                          onValueChange={(value) => field.onChange(parseInt(value))}
                          defaultValue={field.value?.toString() || "0"}
                          disabled={!selectedProvinceId || communes.length === 0}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Chọn quận/huyện/xã" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="0" disabled>Chọn quận/huyện/xã</SelectItem>
                            {communes.map((commune) => (
                              <SelectItem key={commune.id} value={commune.id.toString()}>
                                {commune.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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

                <FormField
                  control={form.control}
                  name="supermarketTypeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Loại siêu thị</FormLabel>
                      <FormControl>
                        <Select
                          value={field.value ? String(field.value) : ''}
                          onValueChange={v => field.onChange(Number(v))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Chọn loại siêu thị" />
                          </SelectTrigger>
                          <SelectContent>
                            {supermarketTypes.map((type: any) => (
                              <SelectItem key={type.id} value={String(type.id)}>
                                {type.displayName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
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
                <Button 
                  type="submit"
                  disabled={createSupermarketMutation.isPending || updateSupermarketMutation.isPending}
                >
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
      
      {/* Create Confirmation Dialog */}
      <ConfirmDialog
        open={showCreateConfirmDialog}
        onOpenChange={setShowCreateConfirmDialog}
        title="Xác nhận thêm mới siêu thị"
        description="Bạn có chắc chắn muốn thêm mới siêu thị này?"
        onConfirm={handleConfirmedSubmit}
        isLoading={createSupermarketMutation.isPending}
      />
      
      {/* Edit Confirmation Dialog */}
      <ConfirmDialog
        open={showEditConfirmDialog}
        onOpenChange={setShowEditConfirmDialog}
        title="Xác nhận cập nhật siêu thị"
        description={`Bạn có chắc chắn muốn cập nhật thông tin siêu thị "${selectedSupermarket?.name}"?`}
        onConfirm={handleConfirmedSubmit}
        isLoading={updateSupermarketMutation.isPending}
      />
      
      {/* Download Confirmation Dialog */}
      <ConfirmDialog
        open={showDownloadConfirmDialog}
        onOpenChange={setShowDownloadConfirmDialog}
        title="Tải mẫu siêu thị"
        description="Bạn có chắc chắn muốn tải xuống file mẫu siêu thị CSV?"
        onConfirm={confirmDownloadTemplate}
        confirmText="Tải xuống"
      />
    </DashboardLayout>
  );
}
