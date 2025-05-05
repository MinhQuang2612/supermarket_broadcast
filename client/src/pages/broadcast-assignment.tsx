import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  BroadcastProgram, 
  Supermarket, 
  BroadcastAssignment as Assignment,
  Playlist
} from "@shared/schema";
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
  CardDescription 
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Store, 
  Radio, 
  Link, 
  Check, 
  X, 
  AlertTriangle, 
  Search,
  Unlink,
  ListChecks,
  ArrowRight
} from "lucide-react";
import { format } from "date-fns";

export default function BroadcastAssignment() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<string>("supermarkets");
  const [selectedSupermarket, setSelectedSupermarket] = useState<Supermarket | null>(null);
  const [selectedProgram, setSelectedProgram] = useState<BroadcastProgram | null>(null);
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [showUnassignDialog, setShowUnassignDialog] = useState(false);
  const [showSelectSupermarketDialog, setShowSelectSupermarketDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [regionFilter, setRegionFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Fetch supermarkets with pagination
  const [supermarketsPage, setSupermarketsPage] = useState(1);
  const [supermarketsPageSize, setSupermarketsPageSize] = useState(10);
  
  const { data: supermarketsData, isLoading: isLoadingSupermarkets } = useQuery<{
    supermarkets: Supermarket[],
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }
  }>({
    queryKey: ['/api/supermarkets', supermarketsPage, supermarketsPageSize],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('page', supermarketsPage.toString());
      params.append('limit', supermarketsPageSize.toString());
      
      const response = await fetch(`/api/supermarkets?${params.toString()}`);
      return await response.json();
    },
  });
  
  // Extract supermarkets array from paginated response
  const supermarkets = supermarketsData?.supermarkets || [];

  // State for pagination
  const [programPage, setProgramPage] = useState(1);
  const [programPageSize, setProgramPageSize] = useState(10);
  
  const [assignmentsPage, setAssignmentsPage] = useState(1);
  const [assignmentsPageSize, setAssignmentsPageSize] = useState(10);
  
  // Fetch broadcast programs with pagination
  const { data: programsData, isLoading: isLoadingPrograms } = useQuery<{
    programs: BroadcastProgram[],
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }
  }>({
    queryKey: ['/api/broadcast-programs', programPage, programPageSize],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('page', programPage.toString());
      params.append('limit', programPageSize.toString());
      
      const response = await fetch(`/api/broadcast-programs?${params.toString()}`);
      return await response.json();
    },
  });
  
  // Extract programs array and pagination info
  const programs = programsData?.programs || [];
  
  // Fetch broadcast assignments with pagination
  const { data: assignmentsData, isLoading: isLoadingAssignments } = useQuery<{
    assignments: Assignment[],
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }
  }>({
    queryKey: ['/api/broadcast-assignments', assignmentsPage, assignmentsPageSize],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('page', assignmentsPage.toString());
      params.append('limit', assignmentsPageSize.toString());
      
      const response = await fetch(`/api/broadcast-assignments?${params.toString()}`);
      return await response.json();
    },
  });
  
  // Extract assignments array and pagination info
  const assignments = assignmentsData?.assignments || [];

  // State for supermarket assignments pagination
  const [supermarketAssignmentsPage, setSupermarketAssignmentsPage] = useState(1);
  const [supermarketAssignmentsPageSize, setSupermarketAssignmentsPageSize] = useState(10);
  
  // Fetch supermarket assignments when a supermarket is selected, with pagination
  const { 
    data: supermarketAssignmentsData, 
    isLoading: isLoadingSupermarketAssignments,
    refetch: refetchSupermarketAssignments
  } = useQuery<{
    assignments: Assignment[],
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }
  }>({
    queryKey: ['/api/supermarkets', selectedSupermarket?.id, 'broadcast-assignments', supermarketAssignmentsPage, supermarketAssignmentsPageSize],
    queryFn: async () => {
      if (!selectedSupermarket) return { assignments: [], pagination: { total: 0, page: 1, limit: 10, totalPages: 0 }};
      
      const params = new URLSearchParams();
      params.append('page', supermarketAssignmentsPage.toString());
      params.append('limit', supermarketAssignmentsPageSize.toString());
      
      const response = await fetch(`/api/supermarkets/${selectedSupermarket.id}/broadcast-assignments?${params.toString()}`);
      return await response.json();
    },
    enabled: !!selectedSupermarket,
  });
  
  // Extract assignments array and pagination info
  const supermarketAssignments = supermarketAssignmentsData?.assignments || [];

  // Create assignment mutation
  const createAssignmentMutation = useMutation({
    mutationFn: async (data: { supermarketId: number, broadcastProgramId: number, playlistId?: number }) => {
      const res = await apiRequest("POST", "/api/broadcast-assignments", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/broadcast-assignments'] });
      queryClient.invalidateQueries({ 
        queryKey: ['/api/supermarkets', selectedSupermarket?.id, 'broadcast-assignments']
      });
      queryClient.invalidateQueries({ queryKey: ['/api/supermarkets'] });
      setShowAssignDialog(false);
      toast({
        title: "Gán chương trình thành công",
        description: "Chương trình đã được gán cho siêu thị",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Gán chương trình thất bại",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete assignment mutation
  const deleteAssignmentMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/broadcast-assignments/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/broadcast-assignments'] });
      queryClient.invalidateQueries({ 
        queryKey: ['/api/supermarkets', selectedSupermarket?.id, 'broadcast-assignments']
      });
      queryClient.invalidateQueries({ queryKey: ['/api/supermarkets'] });
      setShowUnassignDialog(false);
      toast({
        title: "Hủy gán chương trình thành công",
        description: "Chương trình đã được hủy gán khỏi siêu thị",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Hủy gán chương trình thất bại",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Effect to reset selected items when tab changes
  useEffect(() => {
    setSelectedSupermarket(null);
    setSelectedProgram(null);
  }, [activeTab]);

  // Handle supermarket selection
  const handleSelectSupermarket = (supermarket: Supermarket) => {
    setSelectedSupermarket(supermarket);
  };

  // Handle program selection
  const handleSelectProgram = (program: BroadcastProgram) => {
    setSelectedProgram(program);
    
    // Khi chọn chương trình, tải danh sách playlist của chương trình đó
    if (program) {
      loadProgramPlaylists(program.id);
    } else {
      setPlaylists([]);
      setSelectedPlaylist(null);
    }
  };
  
  // Handle program assign button click
  const handleProgramAssignClick = () => {
    // First show the supermarket selection dialog
    setShowSelectSupermarketDialog(true);
  };
  
  // Load playlists for a program
  const loadProgramPlaylists = async (programId: number) => {
    try {
      const response = await fetch(`/api/broadcast-programs/${programId}/playlists`);
      if (!response.ok) {
        throw new Error(`Failed to fetch playlists: ${response.status}`);
      }
      const data = await response.json();
      console.log("Loaded playlists for program:", data);
      
      setPlaylists(data.playlists || []);
      
      // Nếu có ít nhất một playlist, chọn playlist đầu tiên
      if (data.playlists && data.playlists.length > 0) {
        setSelectedPlaylist(data.playlists[0]);
      } else {
        setSelectedPlaylist(null);
      }
    } catch (error) {
      console.error("Error loading program playlists:", error);
      toast({
        title: "Không thể tải danh sách playlist",
        description: error instanceof Error ? error.message : "Đã xảy ra lỗi",
        variant: "destructive",
      });
      setPlaylists([]);
      setSelectedPlaylist(null);
    }
  };

  // Open assign dialog
  const openAssignDialog = () => {
    if (activeTab === "supermarkets" && selectedSupermarket && programs.length > 0) {
      // Chọn program đầu tiên và load playlists của nó
      const initialProgram = programs[0];
      setSelectedProgram(initialProgram);
      loadProgramPlaylists(initialProgram.id);
      setShowAssignDialog(true);
    } else if (activeTab === "programs" && selectedProgram && supermarkets.length > 0) {
      // Đã chọn program, chỉ cần load playlists nếu chưa load
      if (!playlists.length) {
        loadProgramPlaylists(selectedProgram.id);
      }
      
      // Mở dropdown chọn siêu thị thay vì tự chọn siêu thị đầu tiên
      setShowSelectSupermarketDialog(true);
    }
  };

  // Open unassign dialog
  const openUnassignDialog = () => {
    if (activeTab === "supermarkets" && selectedSupermarket && supermarketAssignments.length > 0) {
      setShowUnassignDialog(true);
    }
  };

  // Handle assignment confirmation
  const confirmAssignment = () => {
    if (selectedSupermarket && selectedProgram) {
      const assignmentData: {
        supermarketId: number;
        broadcastProgramId: number;
        playlistId?: number;
      } = {
        supermarketId: selectedSupermarket.id,
        broadcastProgramId: selectedProgram.id
      };
      
      // Thêm playlistId nếu đã chọn playlist
      if (selectedPlaylist) {
        assignmentData.playlistId = selectedPlaylist.id;
      }
      
      createAssignmentMutation.mutate(assignmentData);
    }
  };

  // Handle unassignment confirmation
  const confirmUnassignment = () => {
    if (selectedSupermarket && supermarketAssignments.length > 0) {
      deleteAssignmentMutation.mutate(supermarketAssignments[0].id);
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
  
  // Fetch provinces - these endpoints don't use pagination yet
  const { data: provinces = [] } = useQuery<any[]>({
    queryKey: ['/api/provinces'],
  });
  
  // Fetch communes
  const { data: communes = [] } = useQuery<any[]>({
    queryKey: ['/api/communes'],
  });
  
  // Fetch regions
  const { data: regions = [] } = useQuery<any[]>({
    queryKey: ['/api/regions'],
  });
  
  // Format full address
  const formatFullAddress = (supermarket: Supermarket) => {
    const commune = communes.find(c => c.id === supermarket.communeId);
    const province = provinces.find(p => p.id === supermarket.provinceId);
    const region = regions.find(r => r.id === supermarket.regionId);
    
    let fullAddress = supermarket.address;
    if (commune) fullAddress += `, ${commune.name}`;
    if (province) fullAddress += `, ${province.name}`;
    
    return fullAddress;
  };

  // Check if supermarket has an assignment
  const hasBroadcastAssignment = (supermarketId: number) => {
    return assignments.some(assignment => assignment.supermarketId === supermarketId);
  };

  // Get assigned program for supermarket
  const getAssignedProgram = (supermarketId: number) => {
    const assignment = assignments.find(a => a.supermarketId === supermarketId);
    if (!assignment) return null;
    
    return programs.find(p => p.id === assignment.broadcastProgramId);
  };
  
  // Get assignment for supermarket
  const getAssignment = (supermarketId: number) => {
    return assignments.find(a => a.supermarketId === supermarketId) || null;
  };

  // Get supermarkets assigned to program
  const getSupermarketsForProgram = (programId: number) => {
    return assignments
      .filter(a => a.broadcastProgramId === programId)
      .map(a => supermarkets.find(s => s.id === a.supermarketId))
      .filter(Boolean) as Supermarket[];
  };

  // Filter supermarkets based on search and filters
  const filteredSupermarkets = supermarkets.filter(supermarket => {
    // Get region code from region ID
    const region = regions.find(r => r.id === supermarket.regionId);
    const regionCode = region ? region.code : '';
    
    const matchesRegion = regionFilter === "all" || regionCode === regionFilter;
    const matchesStatus = statusFilter === "all" || supermarket.status === statusFilter;
    const matchesSearch = 
      supermarket.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      supermarket.address.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesRegion && matchesStatus && matchesSearch;
  });

  const isLoading = isLoadingSupermarkets || isLoadingPrograms || isLoadingAssignments;

  return (
    <DashboardLayout>
      <Card>
        <CardHeader>
          <CardTitle>Phân bổ chương trình phát</CardTitle>
          <CardDescription>
            Gán chương trình phát cho các siêu thị
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Tab Navigation */}
          <Tabs 
            defaultValue="supermarkets" 
            value={activeTab} 
            onValueChange={setActiveTab} 
            className="mb-6"
          >
            <TabsList className="grid w-full md:w-auto grid-cols-2">
              <TabsTrigger value="supermarkets" className="flex items-center">
                <Store className="h-4 w-4 mr-2" />
                Theo siêu thị
              </TabsTrigger>
              <TabsTrigger value="programs" className="flex items-center">
                <Radio className="h-4 w-4 mr-2" />
                Theo chương trình
              </TabsTrigger>
            </TabsList>
            
            {/* Supermarkets Tab */}
            <TabsContent value="supermarkets">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Supermarket List */}
                <div className="lg:col-span-2">
                  <div className="mb-4">
                    <h3 className="text-lg font-medium mb-2">Danh sách siêu thị</h3>
                    
                    {/* Filter and Search Bar */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 space-y-3 sm:space-y-0">
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
                  </div>
                  
                  {isLoading ? (
                    <div className="flex justify-center items-center h-60 bg-neutral-lightest rounded-md">
                      <p className="text-neutral-medium">Đang tải dữ liệu...</p>
                    </div>
                  ) : (
                    <div className="border rounded-md overflow-hidden">
                      <DataTable
                        columns={[
                          {
                            header: "Tên siêu thị",
                            accessorKey: "name",
                            cell: ({ row }) => {
                              const supermarket = row.original as Supermarket;
                              const isSelected = selectedSupermarket?.id === supermarket.id;
                              
                              return (
                                <div className={`text-sm ${isSelected ? "font-bold" : "font-medium"} text-neutral-darkest`}>
                                  {supermarket.name}
                                </div>
                              );
                            },
                          },
                          {
                            header: "Khu vực",
                            accessorKey: "regionId",
                            cell: ({ row }) => {
                              const supermarket = row.original as Supermarket;
                              const region = regions.find(r => r.id === supermarket.regionId);
                              
                              return (
                                <div className="text-sm text-neutral-dark">
                                  {region?.name || ''}
                                </div>
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
                            id: "program",
                            cell: ({ row }) => {
                              const supermarket = row.original as Supermarket;
                              const hasAssignment = hasBroadcastAssignment(supermarket.id);
                              const assignedProgram = getAssignedProgram(supermarket.id);
                              const assignment = getAssignment(supermarket.id);
                              
                              return (
                                <div className="flex flex-col">
                                  {hasAssignment && assignedProgram ? (
                                    <>
                                      <Badge variant="outline" className="bg-success-light/20 text-success flex items-center mb-1">
                                        <Check className="h-3 w-3 mr-1" /> 
                                        {assignedProgram.name}
                                      </Badge>
                                      
                                      {/* Hiển thị thông tin playlist nếu có */}
                                      {assignment?.playlistId ? (
                                        <div className="text-xs text-neutral-dark flex items-center">
                                          <ListChecks className="h-3 w-3 mr-1" />
                                          Playlist ID: {assignment.playlistId}
                                        </div>
                                      ) : (
                                        <div className="text-xs text-yellow-600 flex items-center">
                                          <AlertTriangle className="h-3 w-3 mr-1" />
                                          Chưa chọn playlist
                                        </div>
                                      )}
                                    </>
                                  ) : (
                                    <Badge variant="outline" className="bg-neutral-medium/20 text-neutral-dark flex items-center">
                                      <X className="h-3 w-3 mr-1" /> 
                                      Chưa có
                                    </Badge>
                                  )}
                                </div>
                              );
                            },
                          },
                          {
                            header: "",
                            id: "select",
                            cell: ({ row }) => {
                              const supermarket = row.original as Supermarket;
                              const isSelected = selectedSupermarket?.id === supermarket.id;
                              
                              return (
                                <Button 
                                  variant={isSelected ? "default" : "outline"} 
                                  size="sm"
                                  onClick={() => handleSelectSupermarket(supermarket)}
                                >
                                  {isSelected ? "Đã chọn" : "Chọn"}
                                </Button>
                              );
                            },
                          },
                          {
                            header: "Địa chỉ",
                            accessorKey: "address",
                            cell: ({ row }) => {
                              const supermarket = row.original as Supermarket;
                              
                              return (
                                <div className="text-sm text-neutral-dark max-w-xs truncate" title={formatFullAddress(supermarket)}>
                                  {formatFullAddress(supermarket)}
                                </div>
                              );
                            },
                          },
                        ]}
                        data={filteredSupermarkets}
                        isLoading={isLoading}
                      />
                    </div>
                  )}
                </div>
                
                {/* Supermarket Details */}
                <div className="lg:col-span-1">
                  {selectedSupermarket ? (
                    <div className="border rounded-md overflow-hidden">
                      <div className="p-4 bg-neutral-lightest border-b">
                        <h3 className="font-medium flex items-center">
                          <Store className="h-5 w-5 mr-2 text-primary" />
                          Chi tiết siêu thị
                        </h3>
                      </div>
                      
                      <div className="p-4">
                        <div className="space-y-4">
                          <div>
                            <label className="text-sm text-neutral-medium">Tên siêu thị</label>
                            <p className="font-medium">{selectedSupermarket.name}</p>
                          </div>
                          
                          <div>
                            <label className="text-sm text-neutral-medium">Địa chỉ</label>
                            <p>{formatFullAddress(selectedSupermarket)}</p>
                          </div>
                          
                          <div>
                            <label className="text-sm text-neutral-medium">Khu vực</label>
                            <p>{regions.find(r => r.id === selectedSupermarket.regionId)?.name || ''}</p>
                          </div>
                          
                          <div>
                            <label className="text-sm text-neutral-medium">Trạng thái</label>
                            <p>
                              <Badge variant="outline" className={
                                selectedSupermarket.status === "active"
                                  ? "bg-success-light/20 text-success"
                                  : "bg-neutral-medium/20 text-neutral-dark"
                              }>
                                {selectedSupermarket.status === "active" ? "Đang hoạt động" : "Tạm dừng"}
                              </Badge>
                            </p>
                          </div>
                        </div>
                        
                        <div className="mt-6 border-t pt-4">
                          <label className="text-sm text-neutral-medium mb-2 block">
                            Chương trình phát hiện tại
                          </label>
                          
                          {isLoadingSupermarketAssignments ? (
                            <div className="flex justify-center items-center h-20 bg-neutral-lightest rounded-md">
                              <p className="text-neutral-medium">Đang tải...</p>
                            </div>
                          ) : supermarketAssignments.length > 0 && getAssignedProgram(selectedSupermarket.id) ? (
                            <div className="bg-success-light/10 border border-success rounded-md p-3">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center">
                                  <Radio className="h-4 w-4 mr-2 text-success" />
                                  <div>
                                    <p className="font-medium">
                                      {getAssignedProgram(selectedSupermarket.id)?.name}
                                    </p>
                                    <p className="text-xs text-neutral-medium">
                                      Ngày phát: {format(new Date(getAssignedProgram(selectedSupermarket.id)?.date || new Date()), "dd/MM/yyyy")}
                                    </p>
                                  </div>
                                </div>
                                
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  className="border-danger text-danger"
                                  onClick={openUnassignDialog}
                                >
                                  <Unlink className="h-4 w-4 mr-1" />
                                  Hủy gán
                                </Button>
                              </div>
                              
                              {/* Thông tin playlist được gán */}
                              {getAssignment(selectedSupermarket.id)?.playlistId ? (
                                <div className="pt-2 border-t mt-2">
                                  <p className="text-sm font-medium flex items-center mb-1">
                                    <ListChecks className="h-4 w-4 mr-1" />
                                    Thông tin playlist
                                  </p>
                                  <p className="text-xs bg-neutral-lightest p-2 rounded">
                                    ID playlist: {getAssignment(selectedSupermarket.id)?.playlistId}
                                  </p>
                                </div>
                              ) : (
                                <div className="pt-2 border-t mt-2">
                                  <p className="text-sm text-yellow-600 flex items-center">
                                    <AlertTriangle className="h-4 w-4 mr-1" />
                                    Chưa có playlist được gán cho siêu thị này
                                  </p>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="bg-neutral-lightest rounded-md p-3">
                              <p className="text-neutral-medium text-sm">
                                Chưa có chương trình phát nào được gán
                              </p>
                            </div>
                          )}
                        </div>
                        
                        {(user?.role === "admin" || user?.role === "manager") && (
                          <div className="mt-6">
                            <Button 
                              className="w-full" 
                              onClick={openAssignDialog}
                              disabled={programs.length === 0}
                            >
                              <Link className="h-4 w-4 mr-2" />
                              Gán chương trình phát
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-center items-center h-60 bg-neutral-lightest rounded-md">
                      <div className="text-center">
                        <Store className="h-12 w-12 text-neutral-medium mx-auto mb-2" />
                        <p className="text-neutral-medium">Vui lòng chọn một siêu thị</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
            
            {/* Programs Tab */}
            <TabsContent value="programs">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Programs List */}
                <div className="lg:col-span-1">
                  <h3 className="text-lg font-medium mb-4">Danh sách chương trình</h3>
                  
                  {isLoading ? (
                    <div className="flex justify-center items-center h-60 bg-neutral-lightest rounded-md">
                      <p className="text-neutral-medium">Đang tải dữ liệu...</p>
                    </div>
                  ) : programs.length === 0 ? (
                    <Alert variant="destructive" className="bg-danger/5">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        Chưa có chương trình phát nào. Vui lòng tạo chương trình phát trước.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <div className="border rounded-md overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Tên chương trình</TableHead>
                            <TableHead>Ngày phát</TableHead>
                            <TableHead className="w-16"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {programs.map((program) => {
                            const isSelected = selectedProgram?.id === program.id;
                            
                            return (
                              <TableRow 
                                key={program.id}
                                className={isSelected ? "bg-primary/5" : undefined}
                              >
                                <TableCell className={`font-medium ${isSelected ? "text-primary" : ""}`}>
                                  {program.name}
                                </TableCell>
                                <TableCell>
                                  {format(new Date(program.date), "dd/MM/yyyy")}
                                </TableCell>
                                <TableCell>
                                  <Button 
                                    variant={isSelected ? "default" : "outline"} 
                                    size="sm"
                                    onClick={() => handleSelectProgram(program)}
                                    className="w-full"
                                  >
                                    {isSelected ? "Đã chọn" : "Chọn"}
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
                
                {/* Program Details and Assigned Supermarkets */}
                <div className="lg:col-span-2">
                  {selectedProgram ? (
                    <>
                      <div className="mb-4">
                        <h3 className="text-lg font-medium mb-2 flex items-center">
                          <Radio className="h-5 w-5 mr-2 text-primary" />
                          {selectedProgram.name}
                        </h3>
                        <div className="bg-neutral-lightest p-3 rounded-md mb-4">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            <div>
                              <span className="text-neutral-medium">Ngày phát:</span>{" "}
                              <span className="font-medium">
                                {format(new Date(selectedProgram.date), "dd/MM/yyyy")}
                              </span>
                            </div>
                            <div>
                              <span className="text-neutral-medium">Số siêu thị gán:</span>{" "}
                              <span className="font-medium">
                                {getSupermarketsForProgram(selectedProgram.id).length}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="border rounded-md overflow-hidden">
                        <div className="p-4 bg-neutral-lightest border-b flex justify-between items-center">
                          <h4 className="font-medium flex items-center">
                            <ListChecks className="h-5 w-5 mr-2" />
                            Siêu thị đã gán chương trình
                          </h4>
                          
                          {(user?.role === "admin" || user?.role === "manager") && (
                            <Button 
                              size="sm" 
                              onClick={openAssignDialog}
                              disabled={isLoadingSupermarkets || supermarkets.length === 0}
                            >
                              <Link className="h-4 w-4 mr-2" />
                              Gán siêu thị
                            </Button>
                          )}
                        </div>
                        
                        <div className="p-4">
                          {getSupermarketsForProgram(selectedProgram.id).length === 0 ? (
                            <div className="flex justify-center items-center h-20 bg-neutral-lightest rounded-md">
                              <p className="text-neutral-medium">
                                Chưa có siêu thị nào được gán chương trình này
                              </p>
                            </div>
                          ) : (
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Tên siêu thị</TableHead>
                                  <TableHead>Địa chỉ</TableHead>
                                  <TableHead>Khu vực</TableHead>
                                  <TableHead>Trạng thái</TableHead>
                                  <TableHead>Playlist</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {getSupermarketsForProgram(selectedProgram.id).map((supermarket) => (
                                  <TableRow key={supermarket.id}>
                                    <TableCell className="font-medium">
                                      {supermarket.name}
                                    </TableCell>
                                    <TableCell>
                                      {formatFullAddress(supermarket)}
                                    </TableCell>
                                    <TableCell>
                                      {regions.find(r => r.id === supermarket.regionId)?.name || ''}
                                    </TableCell>
                                    <TableCell>
                                      <Badge variant="outline" className={
                                        supermarket.status === "active"
                                          ? "bg-success-light/20 text-success"
                                          : "bg-neutral-medium/20 text-neutral-dark"
                                      }>
                                        {supermarket.status === "active" ? "Đang hoạt động" : "Tạm dừng"}
                                      </Badge>
                                    </TableCell>
                                    <TableCell>
                                      {getAssignment(supermarket.id)?.playlistId ? (
                                        <div className="text-xs flex items-center">
                                          <ListChecks className="h-3 w-3 mr-1" />
                                          ID: {getAssignment(supermarket.id)?.playlistId}
                                        </div>
                                      ) : (
                                        <div className="text-xs text-yellow-600 flex items-center">
                                          <AlertTriangle className="h-3 w-3 mr-1" />
                                          Chưa chọn
                                        </div>
                                      )}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          )}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-center items-center h-60 bg-neutral-lightest rounded-md">
                      <div className="text-center">
                        <Radio className="h-12 w-12 text-neutral-medium mx-auto mb-2" />
                        <p className="text-neutral-medium">Vui lòng chọn một chương trình phát</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      
      {/* Assignment Dialog */}
      <ConfirmDialog
        open={showAssignDialog}
        onOpenChange={setShowAssignDialog}
        title="Gán chương trình phát"
        description={
          <>
            <p className="mb-4">
              Bạn có chắc chắn muốn gán:
            </p>
            <div className="bg-neutral-lightest p-3 rounded-md mb-4">
              <div className="flex items-center mb-3">
                <Radio className="h-5 w-5 mr-2 text-primary" />
                <div className="font-medium">
                  {selectedProgram?.name} 
                  {selectedProgram && <span className="text-sm font-normal text-neutral-medium ml-2">
                    ({format(new Date(selectedProgram.date), "dd/MM/yyyy")})
                  </span>}
                </div>
              </div>
              
              {/* Playlist Selection */}
              {playlists.length > 0 && (
                <div className="mt-2 border-t pt-2">
                  <label className="block text-sm font-medium mb-2">
                    Chọn danh sách phát cho siêu thị này:
                  </label>
                  <Select 
                    value={selectedPlaylist?.id?.toString() || ""}
                    onValueChange={(value) => {
                      const playlist = playlists.find(p => p.id.toString() === value);
                      setSelectedPlaylist(playlist || null);
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Chọn danh sách phát" />
                    </SelectTrigger>
                    <SelectContent>
                      {playlists.map((playlist, index) => (
                        <SelectItem key={playlist.id} value={playlist.id.toString()}>
                          Danh sách phát #{index + 1} - {new Date(playlist.createdAt).toLocaleString()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-neutral-medium mt-1">
                    Mỗi siêu thị có thể có danh sách phát riêng trong cùng một chương trình phát.
                  </p>
                </div>
              )}
              
              {playlists.length === 0 && (
                <div className="mt-2 border-t pt-2">
                  <p className="text-sm text-yellow-600 flex items-center">
                    <AlertTriangle className="h-4 w-4 mr-1" />
                    Chương trình này chưa có danh sách phát nào. Vui lòng tạo danh sách phát trước.
                  </p>
                </div>
              )}
            </div>
            <div className="flex items-center justify-center my-2">
              <ArrowRight className="h-6 w-6 text-neutral-medium" />
            </div>
            <div className="bg-neutral-lightest p-3 rounded-md flex items-center">
              <Store className="h-5 w-5 mr-2 text-primary" />
              <div className="font-medium">
                {selectedSupermarket?.name}
                {selectedSupermarket && <span className="text-sm font-normal text-neutral-medium ml-2">
                  ({regions.find(r => r.id === selectedSupermarket.regionId)?.name || ''})
                </span>}
              </div>
            </div>
            
            {activeTab === "supermarkets" && supermarketAssignments.length > 0 && (
              <Alert variant="destructive" className="mt-4 bg-danger/5">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Siêu thị này đã được gán cho chương trình khác. Tiếp tục sẽ thay thế chương trình cũ.
                </AlertDescription>
              </Alert>
            )}
          </>
        }
        onConfirm={confirmAssignment}
        isLoading={createAssignmentMutation.isPending}
      />
      
      {/* Unassignment Dialog */}
      <ConfirmDialog
        open={showUnassignDialog}
        onOpenChange={setShowUnassignDialog}
        title="Hủy gán chương trình phát"
        description={
          <>
            <p className="mb-4">
              Bạn có chắc chắn muốn hủy gán chương trình:
            </p>
            <div className="bg-neutral-lightest p-3 rounded-md mb-4 flex items-center">
              <Radio className="h-5 w-5 mr-2 text-primary" />
              <div className="font-medium">
                {getAssignedProgram(selectedSupermarket?.id || 0)?.name}
              </div>
            </div>
            <p className="my-2 text-center">khỏi</p>
            <div className="bg-neutral-lightest p-3 rounded-md flex items-center">
              <Store className="h-5 w-5 mr-2 text-primary" />
              <div className="font-medium">
                {selectedSupermarket?.name}
              </div>
            </div>
          </>
        }
        onConfirm={confirmUnassignment}
        isLoading={deleteAssignmentMutation.isPending}
        variant="destructive"
      />
      
      {/* Select Supermarket Dialog */}
      <ConfirmDialog
        open={showSelectSupermarketDialog}
        onOpenChange={setShowSelectSupermarketDialog}
        title="Chọn siêu thị để gán"
        description={
          <>
            <p className="mb-4">
              Bạn muốn gán chương trình <strong>{selectedProgram?.name}</strong> cho siêu thị nào?
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                Chọn siêu thị:
              </label>
              <Select 
                onValueChange={(value) => {
                  const supermarket = supermarkets.find(s => s.id.toString() === value);
                  if (supermarket) {
                    setSelectedSupermarket(supermarket);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn siêu thị" />
                </SelectTrigger>
                <SelectContent>
                  {supermarkets.map((supermarket) => (
                    <SelectItem key={supermarket.id} value={supermarket.id.toString()}>
                      {supermarket.name} ({regions.find(r => r.id === supermarket.regionId)?.name})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-neutral-medium mt-1">
                Chọn siêu thị mà bạn muốn áp dụng chương trình phát sóng
              </p>
            </div>
          </>
        }
        confirmText="Tiếp tục"
        onConfirm={() => {
          if (selectedSupermarket) {
            setShowSelectSupermarketDialog(false);
            setShowAssignDialog(true);
          } else {
            toast({
              title: "Vui lòng chọn siêu thị",
              description: "Bạn cần chọn một siêu thị để tiếp tục",
              variant: "destructive"
            });
          }
        }}
      />
    </DashboardLayout>
  );
}
