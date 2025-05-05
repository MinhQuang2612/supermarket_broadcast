import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  BroadcastProgram, 
  Supermarket as SupermarketBase, 
  BroadcastAssignment as Assignment,
  Playlist,
  Region,
  Province,
  Commune
} from "@shared/schema";

// Mở rộng kiểu dữ liệu Supermarket để có thêm programCount
interface Supermarket extends SupermarketBase {
  programCount?: number;
}

// Mở rộng kiểu dữ liệu Assignment để có thêm các trường bổ sung
interface EnrichedAssignment extends Assignment {
  programName?: string;
  programDate?: Date;
  supermarketName?: string;
  supermarketAddress?: string;
}
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatFullAddress, formatDate } from "@/lib/format-utils";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/layout/dashboard-layout";
import DataTable from "@/components/data-table";
import { Pagination } from "@/components/pagination";
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
  Loader2,
  Pencil
} from "lucide-react";
import { format } from "date-fns";
// Define pagination metadata interface
interface PaginationMetadata {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function BroadcastAssignment() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"bySupermarket" | "byProgram">("bySupermarket");
  
  // Pagination
  const [supermarketPage, setSupermarketPage] = useState(1);
  const [supermarketLimit, setSupermarketLimit] = useState(10);
  const [supermarketSearch, setSupermarketSearch] = useState("");
  const [supermarketTotal, setSupermarketTotal] = useState(0);
  
  const [programPage, setProgramPage] = useState(1);
  const [programLimit, setProgramLimit] = useState(10);
  const [programTotal, setProgramTotal] = useState(0);
  
  const [assignmentPage, setAssignmentPage] = useState(1);
  const [assignmentLimit, setAssignmentLimit] = useState(10);
  const [assignmentTotal, setAssignmentTotal] = useState(0);
  
  // State for selected items
  const [selectedSupermarket, setSelectedSupermarket] = useState<Supermarket | null>(null);
  const [selectedProgram, setSelectedProgram] = useState<BroadcastProgram | null>(null);
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
  
  // State for dialogs
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [showConfirmDeleteDialog, setShowConfirmDeleteDialog] = useState(false);
  const [showSelectSupermarketDialog, setShowSelectSupermarketDialog] = useState(false);
  const [assignmentToDelete, setAssignmentToDelete] = useState<EnrichedAssignment | null>(null);
  const [assignmentToUpdate, setAssignmentToUpdate] = useState<number | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState<{
    title: string;
    description: React.ReactNode;
    confirmText: string;
    onConfirm: () => void;
  } | null>(null);
  
  // Fetch supermarkets with pagination
  const {
    data: supermarketData,
    isLoading: loadingSupermarkets,
  } = useQuery<{ supermarkets: Supermarket[], pagination: PaginationMetadata }>({
    queryKey: ['/api/supermarkets', supermarketPage, supermarketLimit, supermarketSearch],
    queryFn: () => 
      fetch(`/api/supermarkets?page=${supermarketPage}&limit=${supermarketLimit}&search=${supermarketSearch}`)
        .then(res => res.json()),
  });
  
  // Extract supermarkets and update total
  const supermarkets = supermarketData?.supermarkets || [];
  useEffect(() => {
    if (supermarketData?.pagination) {
      setSupermarketTotal(supermarketData.pagination.total);
    }
  }, [supermarketData]);
  
  // Fetch programs with pagination
  const {
    data: programData,
    isLoading: loadingPrograms,
  } = useQuery<{ programs: BroadcastProgram[], pagination: PaginationMetadata }>({
    queryKey: ['/api/broadcast-programs', programPage, programLimit],
    queryFn: () => 
      fetch(`/api/broadcast-programs?page=${programPage}&limit=${programLimit}`)
        .then(res => res.json()),
  });
  
  // Extract programs and update total
  const programs = programData?.programs || [];
  useEffect(() => {
    if (programData?.pagination) {
      setProgramTotal(programData.pagination.total);
    }
  }, [programData]);
  
  // Fetch regions
  const { data: regionsData } = useQuery<Region[]>({
    queryKey: ['/api/regions']
  });
  
  const regions = regionsData || [];
  
  // Fetch all provinces (for display in table)
  const { data: provincesData = [] } = useQuery<Province[]>({
    queryKey: ['/api/provinces'],
  });
  
  const provinces = provincesData || [];
  
  // Fetch all communes (for display in table)
  const { data: communesData = [] } = useQuery<Commune[]>({
    queryKey: ['/api/communes'],
  });
  
  const communes = communesData || [];
  
  // Fetch assignments for selected supermarket
  const {
    data: assignmentData,
    isLoading: loadingAssignments,
    refetch: refetchAssignments,
  } = useQuery<{ assignments: EnrichedAssignment[], pagination: PaginationMetadata }>({
    queryKey: [
      '/api/broadcast-assignments/by-supermarket', 
      selectedSupermarket?.id, 
      assignmentPage, 
      assignmentLimit
    ],
    queryFn: () => 
      selectedSupermarket 
        ? fetch(`/api/broadcast-assignments/by-supermarket/${selectedSupermarket.id}?page=${assignmentPage}&limit=${assignmentLimit}`)
            .then(res => res.json())
        : Promise.resolve({ assignments: [], pagination: { total: 0, page: 1, limit: 10, totalPages: 0 } }),
    enabled: !!selectedSupermarket,
  });
  
  // Extract assignments and update total
  const assignments = assignmentData?.assignments || [];
  useEffect(() => {
    if (assignmentData?.pagination) {
      setAssignmentTotal(assignmentData.pagination.total);
    }
  }, [assignmentData]);
  
  // Fetch assignments for selected program
  const {
    data: programAssignmentsData,
    isLoading: loadingProgramAssignments,
    refetch: refetchProgramAssignments,
  } = useQuery<{ assignments: EnrichedAssignment[], pagination: PaginationMetadata }>({
    queryKey: [
      '/api/broadcast-assignments/by-program', 
      selectedProgram?.id,
      assignmentPage,
      assignmentLimit
    ],
    queryFn: () => 
      selectedProgram 
        ? fetch(`/api/broadcast-assignments/by-program/${selectedProgram.id}?page=${assignmentPage}&limit=${assignmentLimit}`)
            .then(res => res.json())
        : Promise.resolve({ assignments: [], pagination: { total: 0, page: 1, limit: 10, totalPages: 0 } }),
    enabled: !!selectedProgram,
  });
  
  // Extract program assignments
  const programAssignments = programAssignmentsData?.assignments || [];
  
  // Fetch playlists for the selected program
  const {
    data: playlistsData,
    isLoading: loadingPlaylists,
  } = useQuery<{ playlists: Playlist[] }>({
    queryKey: ['/api/broadcast-programs', selectedProgram?.id, 'playlists'],
    queryFn: () => 
      selectedProgram 
        ? fetch(`/api/broadcast-programs/${selectedProgram.id}/playlists`)
            .then(res => res.json())
        : Promise.resolve({ playlists: [] }),
    enabled: !!selectedProgram,
  });
  
  const playlists = playlistsData?.playlists || [];
  
  // Create assignment mutation
  const createAssignmentMutation = useMutation({
    mutationFn: (data: { 
      supermarketId: number; 
      broadcastProgramId: number;
      playlistId?: number;
    }) => {
      // Kiểm tra nếu chương trình đã được gán cho siêu thị này
      if (selectedSupermarket && assignments) {
        // Tìm xem đã tồn tại gán với cùng broadcastProgramId chưa
        const existingAssignment = assignments.find(
          assignment => assignment.broadcastProgramId === data.broadcastProgramId
        );
        
        if (existingAssignment) {
          throw new Error("Chương trình này đã được gán cho siêu thị. Vui lòng chọn chương trình khác.");
        }
      }
      
      return apiRequest('POST', '/api/broadcast-assignments', data);
    },
    onSuccess: () => {
      toast({
        title: "Gán chương trình thành công",
        description: "Chương trình phát sóng đã được gán cho siêu thị.",
      });
      setShowAssignDialog(false);
      setSelectedSupermarket(null);
      setSelectedProgram(null);
      setSelectedPlaylist(null);
      queryClient.invalidateQueries({ queryKey: ['/api/broadcast-assignments/by-supermarket'] });
      queryClient.invalidateQueries({ queryKey: ['/api/broadcast-assignments/by-program'] });
      queryClient.invalidateQueries({ queryKey: ['/api/supermarkets'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Lỗi khi gán chương trình",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Update assignment playlist mutation
  const updateAssignmentPlaylistMutation = useMutation({
    mutationFn: (data: { 
      assignmentId: number;
      playlistId: number;
    }) => {
      return apiRequest('PATCH', `/api/broadcast-assignments/${data.assignmentId}`, {
        playlistId: data.playlistId
      });
    },
    onSuccess: () => {
      toast({
        title: "Cập nhật thành công",
        description: "Danh sách phát đã được cập nhật thành công.",
      });
      setShowAssignDialog(false);
      setSelectedSupermarket(null);
      setSelectedProgram(null);
      setSelectedPlaylist(null);
      queryClient.invalidateQueries({ queryKey: ['/api/broadcast-assignments/by-supermarket'] });
      queryClient.invalidateQueries({ queryKey: ['/api/broadcast-assignments/by-program'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Lỗi khi cập nhật danh sách phát",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Delete assignment mutation
  const deleteAssignmentMutation = useMutation({
    mutationFn: (assignmentId: number) => {
      return apiRequest('DELETE', `/api/broadcast-assignments/${assignmentId}`);
    },
    onSuccess: () => {
      toast({
        title: "Hủy gán chương trình thành công",
        description: "Chương trình phát sóng đã được hủy khỏi siêu thị.",
      });
      setShowConfirmDeleteDialog(false);
      setAssignmentToDelete(null);
      refetchAssignments();
      refetchProgramAssignments();
      queryClient.invalidateQueries({ queryKey: ['/api/supermarkets'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Lỗi khi hủy gán chương trình",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  const handleSelectSupermarket = (supermarket: Supermarket) => {
    setSelectedSupermarket(supermarket);
    setAssignmentPage(1);
  };
  
  const handleSelectProgram = (program: BroadcastProgram) => {
    setSelectedProgram(program);
    setSelectedPlaylist(null);
    setAssignmentPage(1);
    setShowSelectSupermarketDialog(true);
  };
  
  // Use the imported formatFullAddress utility instead of the local function
  const getFullAddress = (supermarket: Supermarket) => {
    if (!supermarket) return '';
    
    const commune = communes.find(c => c.id === supermarket.communeId);
    const province = provinces.find(p => p.id === supermarket.provinceId);
    
    return formatFullAddress(
      supermarket.address,
      commune?.name,
      province?.name
    );
  };

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Phân bổ chương trình phát</h1>
      </div>
      <p className="text-neutral-medium mb-4">Gán chương trình phát cho các siêu thị</p>
      
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "bySupermarket" | "byProgram")}>
        <TabsList className="mb-4">
          <TabsTrigger value="bySupermarket">Theo siêu thị</TabsTrigger>
          <TabsTrigger value="byProgram">Theo chương trình</TabsTrigger>
        </TabsList>
        
        <TabsContent value="bySupermarket">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Supermarket List */}
            <Card className="col-span-1">
              <CardHeader className="px-4 py-3">
                <CardTitle className="text-lg">Danh sách siêu thị</CardTitle>
                <CardDescription>Chọn siêu thị để xem các chương trình đã gán</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="p-4 border-b">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-neutral-medium" />
                    <Input
                      placeholder="Tìm siêu thị..."
                      className="pl-8"
                      value={supermarketSearch}
                      onChange={(e) => {
                        setSupermarketSearch(e.target.value);
                        setSupermarketPage(1);
                      }}
                    />
                  </div>
                </div>
                
                {loadingSupermarkets ? (
                  <div className="p-8 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-neutral-medium" />
                    <p className="text-neutral-medium">Đang tải danh sách siêu thị...</p>
                  </div>
                ) : (
                  <>
                    <div className="max-h-[500px] overflow-auto">
                      <Table>
                        <TableBody>
                          {supermarkets.map((supermarket) => (
                            <TableRow 
                              key={supermarket.id}
                              className={`cursor-pointer ${selectedSupermarket?.id === supermarket.id ? 'bg-neutral-lightest' : ''}`}
                              onClick={() => handleSelectSupermarket(supermarket)}
                            >
                              <TableCell className="py-3">
                                <div className="flex items-start">
                                  <Store className={`h-5 w-5 mr-2 mt-0.5 ${supermarket.status === 'active' ? 'text-green-500' : 'text-yellow-500'}`} />
                                  <div>
                                    <div className="font-medium">{supermarket.name}</div>
                                    <div className="text-xs text-neutral-medium mt-1 line-clamp-1">
                                      {getFullAddress(supermarket)}
                                    </div>
                                    {supermarket.programCount ? (
                                      <Badge 
                                        variant="outline" 
                                        className="mt-1 bg-blue-50 text-blue-700 border-blue-200"
                                      >
                                        Đã có {supermarket.programCount} chương trình
                                      </Badge>
                                    ) : null}
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                          
                          {supermarkets.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={3} className="h-24 text-center">
                                Không có siêu thị nào.
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                    
                    <div className="p-4 border-t">
                      <Pagination
                        totalItems={supermarketTotal}
                        pageSize={supermarketLimit}
                        page={supermarketPage}
                        onPageChange={setSupermarketPage}
                        onPageSizeChange={setSupermarketLimit}
                      />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
            
            {/* Program Assignment List */}
            <Card className="col-span-1 lg:col-span-2">
              <CardHeader className="px-4 py-3">
                <CardTitle className="text-lg">
                  {selectedSupermarket ? (
                    <>
                      Chương trình phát tại {selectedSupermarket.name}
                      <span className="block text-sm font-normal text-neutral-medium mt-1">
                        {getFullAddress(selectedSupermarket)}
                      </span>
                    </>
                  ) : (
                    "Chương trình phát sóng đã gán"
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {!selectedSupermarket ? (
                  <div className="p-8 text-center">
                    <Store className="h-12 w-12 mx-auto mb-3 text-neutral-medium" />
                    <p className="text-lg font-medium">Chưa chọn siêu thị</p>
                    <p className="text-neutral-medium">Vui lòng chọn một siêu thị từ danh sách bên trái</p>
                  </div>
                ) : loadingAssignments ? (
                  <div className="p-8 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-neutral-medium" />
                    <p className="text-neutral-medium">Đang tải dữ liệu...</p>
                  </div>
                ) : (
                  <>
                    <div className="p-4 border-b flex items-center justify-between">
                      <h3 className="font-medium">Danh sách chương trình đã gán</h3>
                      <Button
                        size="sm"
                        onClick={() => {
                          if (programs.length > 0) {
                            setSelectedProgram(programs[0]);
                            setSelectedPlaylist(null);
                            setShowAssignDialog(true);
                          } else {
                            toast({
                              title: "Không có chương trình nào",
                              description: "Không có chương trình nào để gán cho siêu thị này.",
                              variant: "destructive"
                            });
                          }
                        }}
                      >
                        Gán chương trình mới
                      </Button>
                    </div>
                    
                    <div className="max-h-[500px] overflow-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Tên chương trình</TableHead>
                            <TableHead>Ngày phát</TableHead>
                            <TableHead>Danh sách phát</TableHead>
                            <TableHead></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {assignments.map((assignment) => (
                            <TableRow key={assignment.id}>
                              <TableCell>
                                <div className="font-medium">
                                  {(() => {
                                    // Tìm chương trình phát từ danh sách đã fetched
                                    const program = programs.find(p => p.id === assignment.broadcastProgramId);
                                    return program ? program.name : 'Unknown Program';
                                  })()}
                                </div>
                              </TableCell>
                              <TableCell>
                                {(() => {
                                  // Tìm chương trình phát từ danh sách đã fetched
                                  const program = programs.find(p => p.id === assignment.broadcastProgramId);
                                  return program ? format(new Date(program.date), "dd/MM/yyyy") : 'Unknown Date';
                                })()}
                              </TableCell>
                              <TableCell>
                                {assignment.playlistId ? (
                                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                    Có (ID: {assignment.playlistId})
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="bg-yellow-50 text-yellow-600 border-yellow-200">
                                    Không có
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-2">
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    title="Cập nhật danh sách phát"
                                    onClick={() => {
                                      // Lấy chương trình hiện tại
                                      const program = programs.find(p => p.id === assignment.broadcastProgramId);
                                      if (program) {
                                        setSelectedProgram(program);
                                        // Lưu trữ assignment ID để cập nhật sau này
                                        setAssignmentToUpdate(assignment.id);
                                        
                                        // Lấy danh sách playlist của chương trình này
                                        fetch(`/api/broadcast-programs/${program.id}/playlists`)
                                          .then(res => res.json())
                                          .then(data => {
                                            // Chọn playlist đầu tiên (nếu có)
                                            if (data.playlists && data.playlists.length > 0) {
                                              const currentPlaylist = assignment.playlistId 
                                                ? data.playlists.find(p => p.id === assignment.playlistId)
                                                : null;
                                                
                                              setSelectedPlaylist(currentPlaylist || data.playlists[0]);
                                              
                                              // Hiển thị dialog xác nhận
                                              setShowConfirmDialog({
                                                title: "Cập nhật danh sách phát",
                                                description: (
                                                  <>
                                                    <p className="mb-4">Chọn danh sách phát mới cho chương trình <strong>{program.name}</strong></p>
                                                    <div className="mb-4">
                                                      <label className="block text-sm font-medium mb-2">
                                                        Chọn danh sách phát:
                                                      </label>
                                                      <Select 
                                                        value={currentPlaylist?.id?.toString() || data.playlists[0].id.toString()}
                                                        onValueChange={(value) => {
                                                          const playlist = data.playlists.find(p => p.id.toString() === value);
                                                          setSelectedPlaylist(playlist || null);
                                                        }}
                                                      >
                                                        <SelectTrigger>
                                                          <SelectValue placeholder="Chọn danh sách phát" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                          {data.playlists.map((playlist) => (
                                                            <SelectItem key={playlist.id} value={playlist.id.toString()}>
                                                              Danh sách phát ID: {playlist.id} - {new Date(playlist.createdAt).toLocaleString()}
                                                            </SelectItem>
                                                          ))}
                                                        </SelectContent>
                                                      </Select>
                                                    </div>
                                                  </>
                                                ),
                                                confirmText: "Cập nhật",
                                                onConfirm: () => {
                                                  if (selectedPlaylist) {
                                                    updateAssignmentPlaylistMutation.mutate({
                                                      assignmentId: assignmentToUpdate,
                                                      playlistId: selectedPlaylist.id
                                                    });
                                                  }
                                                }
                                              });
                                            } else {
                                              toast({
                                                title: "Không có playlist",
                                                description: "Chương trình này chưa có playlist nào. Vui lòng tạo playlist trước.",
                                                variant: "destructive"
                                              });
                                            }
                                          });
                                      }
                                    }}
                                  >
                                    <Pencil className="h-4 w-4 text-blue-500" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    title="Hủy gán chương trình"
                                    onClick={() => {
                                      setAssignmentToDelete(assignment);
                                      setShowConfirmDeleteDialog(true);
                                    }}
                                  >
                                    <Unlink className="h-4 w-4 text-red-500" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                          
                          {assignments.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={4} className="h-24 text-center">
                                Chưa có chương trình nào được gán cho siêu thị này.
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                    
                    {assignments.length > 0 && (
                      <div className="p-4 border-t">
                        <Pagination
                          totalItems={assignmentTotal}
                          pageSize={assignmentLimit}
                          page={assignmentPage}
                          onPageChange={setAssignmentPage}
                          onPageSizeChange={setAssignmentLimit}
                        />
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="byProgram">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Program List */}
            <Card className="col-span-1">
              <CardHeader className="px-4 py-3">
                <CardTitle className="text-lg">Danh sách chương trình</CardTitle>
                <CardDescription>Chọn chương trình để xem và quản lý các siêu thị đã gán</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {loadingPrograms ? (
                  <div className="p-8 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-neutral-medium" />
                    <p className="text-neutral-medium">Đang tải danh sách chương trình...</p>
                  </div>
                ) : (
                  <>
                    <div className="max-h-[500px] overflow-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Tên chương trình</TableHead>
                            <TableHead>Ngày phát</TableHead>
                            <TableHead>Số siêu thị gán:</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {programs.map((program) => (
                            <TableRow 
                              key={program.id}
                              className={`cursor-pointer ${selectedProgram?.id === program.id ? 'bg-neutral-lightest' : ''}`}
                              onClick={() => setSelectedProgram(program)}
                            >
                              <TableCell className="font-medium">
                                {program.name}
                              </TableCell>
                              <TableCell>
                                {format(new Date(program.date), "dd/MM/yyyy")}
                              </TableCell>
                              <TableCell>
                                <Badge>
                                  {program.assignedSupermarketCount || 0}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                          
                          {programs.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={3} className="h-24 text-center">
                                Không có chương trình nào.
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                    
                    <div className="p-4 border-t">
                      <Pagination
                        totalItems={programTotal}
                        pageSize={programLimit}
                        page={programPage}
                        onPageChange={setProgramPage}
                        onPageSizeChange={setProgramLimit}
                      />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
            
            {/* Supermarket Assignment List */}
            <Card className="col-span-1 lg:col-span-2">
              <CardHeader className="px-4 py-3">
                <CardTitle className="text-lg">
                  {selectedProgram ? (
                    <>
                      Siêu thị đã gán chương trình: {selectedProgram.name}
                      <span className="block text-sm font-normal text-neutral-medium mt-1">
                        Ngày {format(new Date(selectedProgram.date), "dd/MM/yyyy")}
                      </span>
                    </>
                  ) : (
                    "Danh sách siêu thị đã gán"
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {!selectedProgram ? (
                  <div className="p-8 text-center">
                    <Radio className="h-12 w-12 mx-auto mb-3 text-neutral-medium" />
                    <p className="text-lg font-medium">Chưa chọn chương trình</p>
                    <p className="text-neutral-medium">Vui lòng chọn một chương trình từ danh sách bên trái</p>
                  </div>
                ) : loadingProgramAssignments ? (
                  <div className="p-8 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-neutral-medium" />
                    <p className="text-neutral-medium">Đang tải dữ liệu...</p>
                  </div>
                ) : (
                  <>
                    <div className="p-4 border-b flex items-center justify-between">
                      <h3 className="font-medium">Danh sách siêu thị được gán</h3>
                      <Button
                        size="sm"
                        onClick={() => {
                          setShowSelectSupermarketDialog(true);
                        }}
                      >
                        Gán cho siêu thị khác
                      </Button>
                    </div>
                    
                    <div className="max-h-[500px] overflow-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Tên siêu thị</TableHead>
                            <TableHead>Địa chỉ</TableHead>
                            <TableHead>Danh sách phát</TableHead>
                            <TableHead></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {programAssignments.map((assignment) => (
                            <TableRow key={assignment.id}>
                              <TableCell>
                                <div className="font-medium">
                                  {(() => {
                                    // Tìm siêu thị từ danh sách đã fetched
                                    const supermarket = supermarkets.find(s => s.id === assignment.supermarketId);
                                    return supermarket ? supermarket.name : 'Unknown Supermarket';
                                  })()}
                                </div>
                              </TableCell>
                              <TableCell className="max-w-[250px]">
                                {(() => {
                                  // Find supermarket from fetched list
                                  const supermarket = supermarkets.find(s => s.id === assignment.supermarketId);
                                  if (!supermarket) return 'Unknown Address';
                                  
                                  // Find commune, province - no region display per user request
                                  const commune = communes.find(c => c.id === supermarket.communeId);
                                  const province = provinces.find(p => p.id === supermarket.provinceId);
                                  
                                  return (
                                    <div className="truncate">
                                      {supermarket.address}
                                      {commune && `, ${commune.name}`}
                                      {province && `, ${province.name}`}
                                    </div>
                                  );
                                })()}
                              </TableCell>
                              <TableCell>
                                {assignment.playlistId ? (
                                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                    Có (ID: {assignment.playlistId})
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="bg-yellow-50 text-yellow-600 border-yellow-200">
                                    Không có
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-2">
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    title="Cập nhật danh sách phát"
                                    onClick={() => {
                                      if (selectedProgram) {
                                        // Lưu trữ assignment ID để cập nhật sau này
                                        setAssignmentToUpdate(assignment.id);
                                        
                                        // Lấy danh sách playlist của chương trình này
                                        fetch(`/api/broadcast-programs/${selectedProgram.id}/playlists`)
                                          .then(res => res.json())
                                          .then(data => {
                                            // Chọn playlist đầu tiên (nếu có)
                                            if (data.playlists && data.playlists.length > 0) {
                                              const currentPlaylist = assignment.playlistId 
                                                ? data.playlists.find(p => p.id === assignment.playlistId)
                                                : null;
                                                
                                              setSelectedPlaylist(currentPlaylist || data.playlists[0]);
                                              
                                              // Hiển thị dialog xác nhận
                                              setShowConfirmDialog({
                                                title: "Cập nhật danh sách phát",
                                                description: (
                                                  <>
                                                    <p className="mb-4">Chọn danh sách phát mới cho chương trình <strong>{selectedProgram.name}</strong></p>
                                                    <div className="mb-4">
                                                      <label className="block text-sm font-medium mb-2">
                                                        Chọn danh sách phát:
                                                      </label>
                                                      <Select 
                                                        value={currentPlaylist?.id?.toString() || data.playlists[0].id.toString()}
                                                        onValueChange={(value) => {
                                                          const playlist = data.playlists.find(p => p.id.toString() === value);
                                                          setSelectedPlaylist(playlist || null);
                                                        }}
                                                      >
                                                        <SelectTrigger>
                                                          <SelectValue placeholder="Chọn danh sách phát" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                          {data.playlists.map((playlist) => (
                                                            <SelectItem key={playlist.id} value={playlist.id.toString()}>
                                                              Danh sách phát ID: {playlist.id} - {new Date(playlist.createdAt).toLocaleString()}
                                                            </SelectItem>
                                                          ))}
                                                        </SelectContent>
                                                      </Select>
                                                    </div>
                                                  </>
                                                ),
                                                confirmText: "Cập nhật",
                                                onConfirm: () => {
                                                  if (selectedPlaylist) {
                                                    updateAssignmentPlaylistMutation.mutate({
                                                      assignmentId: assignmentToUpdate,
                                                      playlistId: selectedPlaylist.id
                                                    });
                                                  }
                                                }
                                              });
                                            } else {
                                              toast({
                                                title: "Không có playlist",
                                                description: "Chương trình này chưa có playlist nào. Vui lòng tạo playlist trước.",
                                                variant: "destructive"
                                              });
                                            }
                                          });
                                      }
                                    }}
                                  >
                                    <Pencil className="h-4 w-4 text-blue-500" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    title="Hủy gán chương trình"
                                    onClick={() => {
                                      setAssignmentToDelete(assignment);
                                      setShowConfirmDeleteDialog(true);
                                    }}
                                  >
                                    <Unlink className="h-4 w-4 text-red-500" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                          
                          {programAssignments.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={4} className="h-24 text-center">
                                Chương trình này chưa được gán cho siêu thị nào.
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                    
                    {programAssignments.length > 0 && (
                      <div className="p-4 border-t">
                        <Pagination
                          totalItems={assignmentTotal}
                          pageSize={assignmentLimit}
                          page={assignmentPage}
                          onPageChange={setAssignmentPage}
                          onPageSizeChange={setAssignmentLimit}
                        />
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
      
      {/* Assign Program Dialog */}
      <ConfirmDialog
        open={showAssignDialog}
        onOpenChange={setShowAssignDialog}
        title="Gán chương trình phát"
        description={
          <>
            <p className="mb-4">
              Bạn muốn gán chương trình nào cho siêu thị <strong>{selectedSupermarket?.name}</strong>?
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                Chọn chương trình:
              </label>
              <Select 
                value={selectedProgram?.id?.toString()}
                onValueChange={(value) => {
                  const program = programs.find(p => p.id.toString() === value);
                  if (program) {
                    setSelectedProgram(program);
                    setSelectedPlaylist(null);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn chương trình" />
                </SelectTrigger>
                <SelectContent>
                  {programs.map((program) => (
                    <SelectItem key={program.id} value={program.id.toString()}>
                      {program.name} ({format(new Date(program.date), "dd/MM/yyyy")})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {loadingPlaylists ? (
              <div className="mb-4 flex items-center">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <span className="text-sm text-neutral-medium">Đang tải danh sách phát...</span>
              </div>
            ) : (
              selectedProgram && playlists.length > 0 ? (
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">
                    Chọn danh sách phát:
                  </label>
                  <Select 
                    value={selectedPlaylist?.id?.toString() || ""}
                    onValueChange={(value) => {
                      const playlist = playlists.find(p => p.id.toString() === value);
                      setSelectedPlaylist(playlist || null);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn danh sách phát" />
                    </SelectTrigger>
                    <SelectContent>
                      {playlists.map((playlist) => (
                        <SelectItem key={playlist.id} value={playlist.id.toString()}>
                          Danh sách phát ID: {playlist.id} - {new Date(playlist.createdAt).toLocaleString()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-neutral-medium mt-1">
                    Bạn có thể chọn danh sách phát khác nhau cho mỗi siêu thị trong cùng một chương trình.
                  </p>
                </div>
              ) : (
                selectedProgram && (
                  <div className="mb-4 p-3 rounded-md bg-yellow-50 text-yellow-700 border border-yellow-200 flex items-start">
                    <AlertTriangle className="h-4 w-4 mr-2 mt-0.5" />
                    <div>
                      Chương trình này chưa có danh sách phát nào. Vui lòng tạo danh sách phát trước.
                    </div>
                  </div>
                )
              )
            )}
          </>
        }
        confirmText="Gán chương trình"
        onConfirm={() => {
          if (!selectedProgram) {
            toast({
              title: "Vui lòng chọn chương trình",
              description: "Bạn cần chọn một chương trình để tiếp tục",
              variant: "destructive"
            });
            return;
          }
          
          if (playlists.length > 0 && !selectedPlaylist) {
            toast({
              title: "Vui lòng chọn danh sách phát",
              description: "Bạn cần chọn một danh sách phát để tiếp tục",
              variant: "destructive"
            });
            return;
          }
          
          if (playlists.length === 0) {
            toast({
              title: "Không có danh sách phát",
              description: "Chương trình này chưa có danh sách phát nào. Vui lòng tạo danh sách phát trước.",
              variant: "destructive"
            });
            return;
          }
          
          createAssignmentMutation.mutate({
            supermarketId: selectedSupermarket!.id,
            broadcastProgramId: selectedProgram.id,
            ...(selectedPlaylist ? { playlistId: selectedPlaylist.id } : {})
          });
        }}
        isLoading={createAssignmentMutation.isPending}
      />
      
      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={showConfirmDeleteDialog}
        onOpenChange={setShowConfirmDeleteDialog}
        title="Xác nhận hủy gán"
        description={
          <>
            <p>
              Bạn có chắc chắn muốn hủy chương trình <strong>{assignmentToDelete?.programName}</strong> 
              khỏi siêu thị <strong>{assignmentToDelete?.supermarketName}</strong> không?
            </p>
          </>
        }
        confirmText="Hủy gán"
        onConfirm={() => {
          if (assignmentToDelete) {
            deleteAssignmentMutation.mutate(assignmentToDelete.id);
          }
        }}
        isLoading={deleteAssignmentMutation.isPending}
        variant="destructive"
      />
      
      {/* Select Supermarket Dialog */}
      <ConfirmDialog
        open={showSelectSupermarketDialog}
        onOpenChange={setShowSelectSupermarketDialog}
        title="Gán chương trình phát cho siêu thị"
        description={
          <>
            <div className="mb-4">
              <div className="p-3 rounded-md mb-3 bg-neutral-lightest">
                <div className="flex items-center">
                  <Radio className="h-5 w-5 mr-2 text-primary" />
                  <div className="font-medium">
                    {selectedProgram?.name} 
                    {selectedProgram && <span className="text-sm font-normal text-neutral-medium ml-2">
                      ({format(new Date(selectedProgram.date), "dd/MM/yyyy")})
                    </span>}
                  </div>
                </div>
              </div>
              
              {/* Playlist Selection */}
              {playlists.length > 0 && (
                <div className="mb-4 p-3 rounded-md bg-neutral-lightest">
                  <label className="block text-sm font-medium mb-2">
                    Chọn danh sách phát:
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
                      {playlists.map((playlist) => (
                        <SelectItem key={playlist.id} value={playlist.id.toString()}>
                          Danh sách phát ID: {playlist.id} - {new Date(playlist.createdAt).toLocaleString()}
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
                <div className="mb-4">
                  <div className="p-3 rounded-md bg-yellow-50 text-yellow-700 border border-yellow-200 flex items-start">
                    <AlertTriangle className="h-4 w-4 mr-2 mt-0.5" />
                    <div>
                      Chương trình này chưa có danh sách phát nào. Vui lòng tạo danh sách phát trước.
                    </div>
                  </div>
                </div>
              )}
              
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
        confirmText="Gán chương trình"
        onConfirm={() => {
          if (!selectedSupermarket) {
            toast({
              title: "Vui lòng chọn siêu thị",
              description: "Bạn cần chọn một siêu thị để tiếp tục",
              variant: "destructive"
            });
            return;
          }
          
          if (playlists.length > 0 && !selectedPlaylist) {
            toast({
              title: "Vui lòng chọn danh sách phát",
              description: "Bạn cần chọn một danh sách phát để tiếp tục",
              variant: "destructive"
            });
            return;
          }
          
          if (playlists.length === 0) {
            toast({
              title: "Không có danh sách phát",
              description: "Chương trình này chưa có danh sách phát nào. Vui lòng tạo danh sách phát trước.",
              variant: "destructive"
            });
            return;
          }
          
          // Gán trực tiếp
          const assignmentData: {
            supermarketId: number;
            broadcastProgramId: number;
            playlistId?: number;
          } = {
            supermarketId: selectedSupermarket.id,
            broadcastProgramId: selectedProgram!.id
          };
          
          // Thêm playlistId nếu đã chọn playlist
          if (selectedPlaylist) {
            assignmentData.playlistId = selectedPlaylist.id;
          }
          
          createAssignmentMutation.mutate(assignmentData);
          setShowSelectSupermarketDialog(false);
        }}
      />
      
      {/* Playlist Update Confirmation Dialog */}
      {showConfirmDialog && (
        <ConfirmDialog
          open={!!showConfirmDialog}
          onOpenChange={(open) => {
            if (!open) setShowConfirmDialog(null);
          }}
          title={showConfirmDialog.title}
          description={showConfirmDialog.description}
          confirmText={showConfirmDialog.confirmText}
          onConfirm={showConfirmDialog.onConfirm}
        />
      )}
    </DashboardLayout>
  );
}