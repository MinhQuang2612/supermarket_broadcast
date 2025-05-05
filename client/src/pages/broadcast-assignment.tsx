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
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { 
  AlertTriangle,
  Filter,
  Loader2, 
  Pencil, 
  Radio, 
  Search, 
  Store, 
  Unlink 
} from "lucide-react";

// Kiểu dữ liệu Pagination
interface PaginationMetadata {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function BroadcastAssignment() {
  const { toast } = useToast();
  const { user } = useAuth();
  
  // State locals
  const [activeTab, setActiveTab] = useState("bySupermarket");
  const [selectedSupermarket, setSelectedSupermarket] = useState<Supermarket | null>(null);
  const [selectedProgram, setSelectedProgram] = useState<BroadcastProgram | null>(null);
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
  const [assignmentToDelete, setAssignmentToDelete] = useState<EnrichedAssignment | null>(null);
  const [assignmentToUpdate, setAssignmentToUpdate] = useState<number | null>(null);
  // Biến state riêng cho chức năng cập nhật playlist
  const [playlistForUpdate, setPlaylistForUpdate] = useState<Playlist | null>(null);
  // Biến để debug
  const [lastSelectedPlaylistId, setLastSelectedPlaylistId] = useState<number | null>(null);
  
  // Pagination state for supermarkets
  const [supermarketPage, setSupermarketPage] = useState(1);
  const [supermarketLimit, setSupermarketLimit] = useState(10);
  const [supermarketTotal, setSupermarketTotal] = useState(0);
  
  // Pagination state for programs
  const [programPage, setProgramPage] = useState(1);
  const [programLimit, setProgramLimit] = useState(10);
  const [programTotal, setProgramTotal] = useState(0);
  
  // Pagination state for assignments
  const [assignmentPage, setAssignmentPage] = useState(1);
  const [assignmentLimit, setAssignmentLimit] = useState(10);
  const [assignmentTotal, setAssignmentTotal] = useState(0);
  
  // Search state
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  
  // Dialog visibility state
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [showSelectSupermarketDialog, setShowSelectSupermarketDialog] = useState(false);
  const [showConfirmDeleteDialog, setShowConfirmDeleteDialog] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState<{
    title: string;
    description: React.ReactNode;
    confirmText: string;
    onConfirm: () => void;
  } | null>(null);
  
  // Fetch regions, provinces and communes first (needed for address display)
  const { data: regions = [] } = useQuery<Region[]>({
    queryKey: ['/api/regions'],
  });
  
  const { data: provinces = [] } = useQuery<Province[]>({
    queryKey: ['/api/provinces'],
  });
  
  const { data: communes = [] } = useQuery<Commune[]>({
    queryKey: ['/api/communes'],
  });
  
  // Fetch Supermarkets
  const { 
    data: supermarketsData,
    isLoading: loadingSupermarkets,
  } = useQuery<{ supermarkets: Supermarket[], pagination: PaginationMetadata }>({
    queryKey: ['/api/supermarkets', { page: supermarketPage, limit: supermarketLimit, search: debouncedSearchTerm }],
    keepPreviousData: true,
  });
  
  const supermarkets = supermarketsData?.supermarkets || [];
  
  useEffect(() => {
    if (supermarketsData?.pagination) {
      setSupermarketTotal(supermarketsData.pagination.total);
    }
  }, [supermarketsData]);
  
  // Fetch Broadcast Programs
  const { 
    data: programsData,
    isLoading: loadingPrograms,
  } = useQuery<{ programs: BroadcastProgram[], pagination: PaginationMetadata }>({
    queryKey: ['/api/broadcast-programs', { page: programPage, limit: programLimit }],
    keepPreviousData: true,
  });
  
  const programs = programsData?.programs || [];
  
  useEffect(() => {
    if (programsData?.pagination) {
      setProgramTotal(programsData.pagination.total);
    }
  }, [programsData]);
  
  // Fetch Assignments for selected supermarket
  const { 
    data: assignmentsData,
    isLoading: loadingAssignments,
    refetch: refetchAssignments
  } = useQuery<{ assignments: EnrichedAssignment[], pagination: PaginationMetadata }>({
    queryKey: [`/api/broadcast-assignments/by-supermarket/${selectedSupermarket?.id}`, { page: assignmentPage, limit: assignmentLimit }],
    enabled: !!selectedSupermarket,
    keepPreviousData: true,
  });
  
  const assignments = assignmentsData?.assignments || [];
  
  useEffect(() => {
    if (assignmentsData?.pagination) {
      setAssignmentTotal(assignmentsData.pagination.total);
    }
  }, [assignmentsData]);
  
  // Fetch Assignments for selected program
  const { 
    data: programAssignmentsData,
    isLoading: loadingProgramAssignments,
    refetch: refetchProgramAssignments
  } = useQuery<{ assignments: EnrichedAssignment[], pagination: PaginationMetadata }>({
    queryKey: [`/api/broadcast-assignments/by-program/${selectedProgram?.id}`, { page: assignmentPage, limit: assignmentLimit }],
    enabled: !!selectedProgram,
    keepPreviousData: true,
  });
  
  const programAssignments = programAssignmentsData?.assignments || [];
  
  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);
    
    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm]);
  
  // Fetch playlists for selected program
  const {
    data: playlistsData = { playlists: [] },
    isLoading: loadingPlaylists,
    refetch: refetchPlaylists
  } = useQuery<{ playlists: Playlist[], pagination: PaginationMetadata }>({
    queryKey: [`/api/broadcast-programs/${selectedProgram?.id}/playlists`],
    enabled: !!selectedProgram,
  });
  
  const playlists = playlistsData.playlists || [];
  
  // Create assignment mutation
  const createAssignmentMutation = useMutation({
    mutationFn: async (data: { supermarketId: number; broadcastProgramId: number; playlistId?: number }) => {
      const response = await apiRequest('POST', '/api/broadcast-assignments', data);
      const responseData = await response.json();
      return responseData;
    },
    onSuccess: () => {
      toast({
        title: "Gán chương trình thành công",
        description: "Đã gán chương trình phát thanh cho siêu thị.",
      });
      setShowAssignDialog(false);
      setShowSelectSupermarketDialog(false);
      
      // Reset state
      setSelectedProgram(null);
      setSelectedPlaylist(null);
      
      // Refetch data
      if (activeTab === "bySupermarket" && selectedSupermarket) {
        refetchAssignments();
      } else if (activeTab === "byProgram" && selectedProgram) {
        refetchProgramAssignments();
      }
      
      // Invalidate counts
      queryClient.invalidateQueries({ queryKey: ['/api/supermarkets'] });
      queryClient.invalidateQueries({ queryKey: ['/api/broadcast-programs'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Lỗi khi gán chương trình",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  // Delete assignment mutation
  const deleteAssignmentMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest('DELETE', `/api/broadcast-assignments/${id}`);
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Hủy gán thành công",
        description: "Đã hủy gán chương trình phát thanh cho siêu thị.",
      });
      setShowConfirmDeleteDialog(false);
      
      // Reset state
      setAssignmentToDelete(null);
      
      // Refetch data
      if (activeTab === "bySupermarket" && selectedSupermarket) {
        refetchAssignments();
      } else if (activeTab === "byProgram" && selectedProgram) {
        refetchProgramAssignments();
      }
      
      // Invalidate counts
      queryClient.invalidateQueries({ queryKey: ['/api/supermarkets'] });
      queryClient.invalidateQueries({ queryKey: ['/api/broadcast-programs'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Lỗi khi hủy gán",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  // Update assignment playlist mutation
  const updateAssignmentPlaylistMutation = useMutation({
    mutationFn: async (data: { assignmentId: number; playlistId: number | null | undefined }) => {
      console.log(`Đang gửi yêu cầu cập nhật: Assignment ID=${data.assignmentId}, Playlist ID=${data.playlistId}`);
      
      // Backup nếu không có playlistId
      if (data.playlistId === null || data.playlistId === undefined) {
        if (lastSelectedPlaylistId) {
          data.playlistId = lastSelectedPlaylistId;
          console.log(`Sử dụng lastSelectedPlaylistId: ${lastSelectedPlaylistId}`);
        } else {
          throw new Error("Không tìm thấy ID playlist để cập nhật");
        }
      }
      
      const response = await apiRequest('PATCH', `/api/broadcast-assignments/${data.assignmentId}`, {
        playlistId: data.playlistId
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Cập nhật danh sách phát thành công",
        description: "Đã cập nhật danh sách phát cho chương trình.",
      });
      
      // Close the dialog
      setShowConfirmDialog(null);
      
      // Reset state
      setAssignmentToUpdate(null);
      setSelectedPlaylist(null);
      setPlaylistForUpdate(null);
      
      // Refetch data
      if (activeTab === "bySupermarket" && selectedSupermarket) {
        refetchAssignments();
      } else if (activeTab === "byProgram" && selectedProgram) {
        refetchProgramAssignments();
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Lỗi khi cập nhật danh sách phát",
        description: error.message,
        variant: "destructive"
      });
      
      // Close the dialog
      setShowConfirmDialog(null);
      
      // Reset state
      setAssignmentToUpdate(null);
      setSelectedPlaylist(null);
      setPlaylistForUpdate(null);
    }
  });

  const handleSelectSupermarket = (supermarket: Supermarket) => {
    setSelectedSupermarket(supermarket);
    setAssignmentPage(1); // Reset pagination
  };
  
  const handleSelectProgram = (program: BroadcastProgram) => {
    setSelectedProgram(program);
    setAssignmentPage(1); // Reset pagination
    setSelectedPlaylist(null);
    refetchPlaylists();
  };
  
  const getFullAddress = (supermarket: Supermarket) => {
    if (!supermarket) return '';
    
    // Lấy thông tin commune và province từ id
    const commune = communes.find(c => c.id === supermarket.communeId);
    const province = provinces.find(p => p.id === supermarket.provinceId);
    
    let address = supermarket.address || '';
    if (commune?.name) address += `, ${commune.name}`;
    if (province?.name) address += `, ${province.name}`;
    
    return address;
  };
  
  return (
    <DashboardLayout>
      <div className="w-full">
        <div className="mb-6 flex flex-col md:flex-row justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-neutral-darker">Gán chương trình phát thanh</h1>
            <p className="text-neutral-medium">Gán chương trình phát thanh cho các siêu thị</p>
          </div>
        </div>
        
        <Tabs defaultValue="bySupermarket" className="space-y-6" onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-2 lg:w-[400px]">
            <TabsTrigger value="bySupermarket">Quản lý theo siêu thị</TabsTrigger>
            <TabsTrigger value="byProgram">Quản lý theo chương trình</TabsTrigger>
          </TabsList>
          
          <TabsContent value="bySupermarket">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Supermarket List */}
              <Card className="col-span-1">
                <CardHeader className="px-4 py-3">
                  <CardTitle className="text-lg">Danh sách siêu thị</CardTitle>
                  <CardDescription>Chọn siêu thị để quản lý chương trình phát thanh</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="p-4">
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-neutral-medium" />
                      <Input 
                        placeholder="Tìm kiếm siêu thị..." 
                        className="pl-8" 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
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
                          <TableHeader>
                            <TableRow>
                              <TableHead>Tên siêu thị</TableHead>
                              <TableHead>Địa chỉ</TableHead>
                              <TableHead>Số CT:</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {supermarkets.map((supermarket) => (
                              <TableRow 
                                key={supermarket.id}
                                className={`cursor-pointer ${selectedSupermarket?.id === supermarket.id ? 'bg-neutral-lightest' : ''}`}
                                onClick={() => handleSelectSupermarket(supermarket)}
                              >
                                <TableCell className="font-medium">
                                  {supermarket.name}
                                </TableCell>
                                <TableCell className="max-w-[220px]">
                                  <div className="truncate">
                                    {getFullAddress(supermarket)}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge>
                                    {supermarket.programCount || 0}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                            
                            {supermarkets.length === 0 && (
                              <TableRow>
                                <TableCell colSpan={3} className="h-24 text-center">
                                  {debouncedSearchTerm ? 'Không tìm thấy siêu thị nào.' : 'Không có siêu thị nào.'}
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
              
              {/* Assignment List */}
              <Card className="col-span-1 lg:col-span-2">
                <CardHeader className="px-4 py-3">
                  <CardTitle className="text-lg">
                    {selectedSupermarket ? (
                      <>
                        Chương trình được gán cho: {selectedSupermarket.name}
                        <span className="block text-sm font-normal text-neutral-medium mt-1">
                          {getFullAddress(selectedSupermarket)}
                        </span>
                      </>
                    ) : (
                      "Danh sách chương trình được gán"
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
                        <h3 className="font-medium">Danh sách chương trình được gán</h3>
                        <Button
                          size="sm"
                          onClick={() => {
                            setShowAssignDialog(true);
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
                                      // Tìm chương trình từ danh sách đã fetched
                                      const program = programs.find(p => p.id === assignment.broadcastProgramId);
                                      return program ? program.name : 'Unknown Program';
                                    })()}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {(() => {
                                    // Tìm chương trình từ danh sách đã fetched
                                    const program = programs.find(p => p.id === assignment.broadcastProgramId);
                                    if (!program) return 'Unknown Date';
                                    
                                    return format(new Date(program.date), "dd/MM/yyyy");
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
                                        // Tìm chương trình từ danh sách đã fetched
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
                                                // Không tự động chọn playlist
                                                setPlaylistForUpdate(null);
                                                
                                                // Lưu danh sách playlist để sử dụng sau
                                                const availablePlaylists = data.playlists;
                                                
                                                // Tạo các radio buttons thay vì dropdown
                                                setShowConfirmDialog({
                                                  title: "Cập nhật danh sách phát",
                                                  description: (
                                                    <>
                                                      <p className="mb-4">Chọn danh sách phát mới cho chương trình <strong>{program.name}</strong></p>
                                                      <div className="mb-4">
                                                        <div className="space-y-3 mt-2">
                                                          {data.playlists.map((playlist: any) => (
                                                            <div key={playlist.id} className="flex items-center">
                                                              <input
                                                                type="radio"
                                                                id={`playlist-${playlist.id}`}
                                                                name="playlistSelection"
                                                                value={playlist.id}
                                                                className="h-4 w-4 text-primary border-gray-300 focus:ring-primary"
                                                                checked={playlistForUpdate?.id === playlist.id}
                                                                onChange={() => {
                                                                  console.log("Đã chọn playlist ID:", playlist.id);
                                                                  setPlaylistForUpdate(playlist);
                                                                  setLastSelectedPlaylistId(playlist.id);
                                                                  
                                                                  // Hiển thị thông báo để xác nhận việc chọn
                                                                  toast({
                                                                    title: "Đã chọn playlist",
                                                                    description: `Playlist ID: ${playlist.id} đã được chọn.`,
                                                                  });
                                                                }}
                                                              />
                                                              <label htmlFor={`playlist-${playlist.id}`} className="ml-2 block text-sm font-medium">
                                                                Danh sách phát ID: {playlist.id} - {new Date(playlist.createdAt).toLocaleString()}
                                                              </label>
                                                            </div>
                                                          ))}
                                                        </div>
                                                      </div>
                                                    </>
                                                  ),
                                                  confirmText: "Cập nhật",
                                                  onConfirm: () => {
                                                    if (!playlistForUpdate) {
                                                      toast({
                                                        title: "Hãy chọn danh sách phát",
                                                        description: "Vui lòng chọn một danh sách phát trước khi cập nhật.",
                                                        variant: "destructive"
                                                      });
                                                      return;
                                                    }
                                                    
                                                    if (assignmentToUpdate !== null) {
                                                      updateAssignmentPlaylistMutation.mutate({
                                                        assignmentId: assignmentToUpdate,
                                                        playlistId: playlistForUpdate.id
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
                        <div className="flex flex-col gap-2">
                          {/* Hiển thị dropdown chọn playlist ở đây */}
                          <Select 
                            value={selectedPlaylist?.id?.toString() || ""}
                            onValueChange={(value) => {
                              const playlist = playlists.find(p => p.id.toString() === value);
                              setSelectedPlaylist(playlist || null);
                            }}
                          >
                            <SelectTrigger className="h-8 text-xs w-[200px]">
                              <SelectValue placeholder="Chọn danh sách phát trước" />
                            </SelectTrigger>
                            <SelectContent>
                              {playlists.map((playlist) => (
                                <SelectItem key={playlist.id} value={playlist.id.toString()}>
                                  Danh sách phát ID: {playlist.id}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          
                          <Button
                            size="sm"
                            onClick={() => {
                              if (!selectedPlaylist) {
                                toast({
                                  title: "Vui lòng chọn danh sách phát",
                                  description: "Bạn cần chọn một danh sách phát trước khi gán cho siêu thị",
                                  variant: "destructive"
                                });
                                return;
                              }
                              setShowSelectSupermarketDialog(true);
                            }}
                          >
                            Gán cho siêu thị khác
                          </Button>
                        </div>
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
                                    
                                    // Get address using our helper function
                                    return getFullAddress(supermarket);
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
                                                // Không tự động chọn playlist
                                                setPlaylistForUpdate(null);
                                                
                                                // Hiển thị dialog xác nhận
                                                // Lưu danh sách playlist để sử dụng sau
                                                const availablePlaylists = data.playlists;
                                                
                                                // Tạo các radio buttons thay vì dropdown
                                                setShowConfirmDialog({
                                                  title: "Cập nhật danh sách phát",
                                                  description: (
                                                    <>
                                                      <p className="mb-4">Chọn danh sách phát mới cho chương trình <strong>{selectedProgram.name}</strong></p>
                                                      <div className="mb-4">
                                                        <div className="space-y-3 mt-2">
                                                          {data.playlists.map((playlist: any) => (
                                                            <div key={playlist.id} className="flex items-center">
                                                              <input
                                                                type="radio"
                                                                id={`playlist-by-program-${playlist.id}`}
                                                                name="playlistSelectionByProgram"
                                                                value={playlist.id}
                                                                className="h-4 w-4 text-primary border-gray-300 focus:ring-primary"
                                                                checked={playlistForUpdate?.id === playlist.id}
                                                                onChange={() => {
                                                                  console.log("[By Program] Đã chọn playlist ID:", playlist.id);
                                                                  setPlaylistForUpdate(playlist);
                                                                  setLastSelectedPlaylistId(playlist.id);
                                                                  
                                                                  // Hiển thị thông báo để xác nhận việc chọn
                                                                  toast({
                                                                    title: "Đã chọn playlist",
                                                                    description: `Playlist ID: ${playlist.id} đã được chọn.`,
                                                                  });
                                                                }}
                                                              />
                                                              <label htmlFor={`playlist-by-program-${playlist.id}`} className="ml-2 block text-sm font-medium">
                                                                Danh sách phát ID: {playlist.id} - {new Date(playlist.createdAt).toLocaleString()}
                                                              </label>
                                                            </div>
                                                          ))}
                                                        </div>
                                                      </div>
                                                    </>
                                                  ),
                                                  confirmText: "Cập nhật",
                                                  onConfirm: () => {
                                                    if (!playlistForUpdate) {
                                                      toast({
                                                        title: "Hãy chọn danh sách phát",
                                                        description: "Vui lòng chọn một danh sách phát trước khi cập nhật.",
                                                        variant: "destructive"
                                                      });
                                                      return;
                                                    }
                                                    
                                                    if (assignmentToUpdate !== null) {
                                                      updateAssignmentPlaylistMutation.mutate({
                                                        assignmentId: assignmentToUpdate,
                                                        playlistId: playlistForUpdate.id
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
          title="Xác nhận hủy gán chương trình"
          description={
            <>
              <p>Bạn có chắc chắn muốn hủy gán chương trình này?</p>
              {assignmentToDelete && (
                <div className="mt-4 p-4 border rounded-md">
                  <p className="font-medium mb-2">Thông tin:</p>
                  <div className="grid grid-cols-[100px_1fr] gap-1 text-sm">
                    <span className="text-neutral-medium">Siêu thị:</span>
                    <span>{assignmentToDelete.supermarketName || 'Unknown'}</span>
                    
                    <span className="text-neutral-medium">Chương trình:</span>
                    <span>{assignmentToDelete.programName || 'Unknown'}</span>
                    
                    <span className="text-neutral-medium">Ngày phát:</span>
                    <span>
                      {assignmentToDelete.programDate 
                        ? format(new Date(assignmentToDelete.programDate), "dd/MM/yyyy")
                        : 'Unknown'
                      }
                    </span>
                  </div>
                </div>
              )}
            </>
          }
          confirmText="Hủy gán"
          confirmVariant="destructive"
          onConfirm={() => {
            if (assignmentToDelete) {
              deleteAssignmentMutation.mutate(assignmentToDelete.id);
            }
          }}
          isLoading={deleteAssignmentMutation.isPending}
        />
        
        {/* Select Supermarket Dialog for Program Tab */}
        <ConfirmDialog
          open={showSelectSupermarketDialog}
          onOpenChange={setShowSelectSupermarketDialog}
          title="Chọn siêu thị để gán"
          description={
            <>
              <p className="mb-4">
                Chọn siêu thị để gán chương trình <strong>{selectedProgram?.name}</strong>:
              </p>
              <div className="mb-4">
                <div className="relative mb-4">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-neutral-medium" />
                  <Input 
                    placeholder="Tìm kiếm siêu thị..." 
                    className="pl-8" 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                
                {loadingSupermarkets ? (
                  <div className="p-4 text-center">
                    <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2 text-neutral-medium" />
                    <p className="text-sm text-neutral-medium">Đang tải dữ liệu...</p>
                  </div>
                ) : (
                  <div className="max-h-[300px] overflow-y-auto border rounded-md">
                    <div className="p-1">
                      {supermarkets.length === 0 ? (
                        <div className="text-center p-4 text-neutral-medium">
                          {debouncedSearchTerm ? 'Không tìm thấy siêu thị nào.' : 'Không có siêu thị nào.'}
                        </div>
                      ) : (
                        supermarkets.map((supermarket) => (
                          <div 
                            key={supermarket.id}
                            className={`p-3 rounded-md cursor-pointer mb-1 ${
                              selectedSupermarket?.id === supermarket.id 
                                ? 'bg-primary/10 border border-primary/30' 
                                : 'hover:bg-neutral-lightest border border-transparent'
                            }`}
                            onClick={() => setSelectedSupermarket(supermarket)}
                          >
                            <div className="font-medium">{supermarket.name}</div>
                            <div className="text-sm text-neutral-medium truncate">{getFullAddress(supermarket)}</div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
                
                {playlists.length > 0 && selectedSupermarket && (
                  <div className="mt-4">
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
                  </div>
                )}
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
            
            if (!selectedProgram) {
              toast({
                title: "Lỗi hệ thống",
                description: "Không tìm thấy chương trình đã chọn",
                variant: "destructive"
              });
              return;
            }
            
            createAssignmentMutation.mutate({
              supermarketId: selectedSupermarket.id,
              broadcastProgramId: selectedProgram.id,
              ...(selectedPlaylist ? { playlistId: selectedPlaylist.id } : {})
            });
          }}
          isLoading={createAssignmentMutation.isPending}
        />
        
        {/* Generic Confirm Dialog */}
        {showConfirmDialog && (
          <ConfirmDialog
            open={!!showConfirmDialog}
            onOpenChange={(open) => {
              if (!open) {
                setShowConfirmDialog(null);
                setAssignmentToUpdate(null);
                setSelectedPlaylist(null);
              }
            }}
            title={showConfirmDialog.title}
            description={showConfirmDialog.description}
            confirmText={showConfirmDialog.confirmText}
            onConfirm={showConfirmDialog.onConfirm}
            isLoading={updateAssignmentPlaylistMutation.isPending}
          />
        )}
      </div>
    </DashboardLayout>
  );
}