import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AudioFile } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/layout/dashboard-layout";
import DataTable from "@/components/data-table";
import ConfirmDialog from "@/components/confirm-dialog";
import AudioPlayer from "@/components/audio-player";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Trash2, 
  CloudUpload, 
  PlayCircle, 
  Download,
  Search,
  Tag,
  Music,
  RefreshCcw
} from "lucide-react";
import { format } from "date-fns";

export default function AudioManagement() {
  const { toast } = useToast();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [showStatusUpdateDialog, setShowStatusUpdateDialog] = useState(false);
  const [showDownloadDialog, setShowDownloadDialog] = useState(false);
  const [selectedFile, setSelectedFile] = useState<AudioFile | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<AudioFile[]>([]);
  const [groupFilter, setGroupFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploadGroup, setUploadGroup] = useState("greetings");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  
  // State for pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  
  // Fetch audio files with pagination
  const { data: audioFilesData, isLoading } = useQuery<{
    audioFiles: AudioFile[],
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }
  }>({
    queryKey: ['/api/audio-files', page, pageSize, groupFilter, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', pageSize.toString());
      
      if (groupFilter !== 'all') params.append('group', groupFilter);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      
      const response = await fetch(`/api/audio-files?${params.toString()}`);
      return await response.json();
    },
  });
  
  // Extract audio files array and pagination info
  const audioFiles = audioFilesData?.audioFiles || [];
  const totalPages = audioFilesData?.pagination?.totalPages || 1;
  
  // Handle page change
  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  // Upload audio mutation
  const uploadAudioMutation = useMutation({
    mutationFn: async ({ file, group }: { file: File, group: string }) => {
      const formData = new FormData();
      formData.append("audioFile", file);
      formData.append("displayName", file.name.replace(/\.[^/.]+$/, ""));
      formData.append("group", group);
      
      // Get audio duration (if possible)
      const duration = await getAudioDuration(file);
      if (duration) {
        formData.append("duration", Math.round(duration).toString());
      }
      
      const res = await fetch("/api/audio-files", {
        method: "POST",
        body: formData,
        credentials: "include"
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || `Failed to upload ${file.name}`);
      }
      
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/audio-files'] });
      toast({
        title: "Upload thành công",
        description: "File âm thanh đã được tải lên",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Upload thất bại",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete audio mutation
  const deleteAudioMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/audio-files/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/audio-files'] });
      setShowDeleteDialog(false);
      toast({
        title: "Xóa thành công",
        description: "File âm thanh đã được xóa",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Xóa thất bại",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Get audio duration
  const getAudioDuration = (file: File): Promise<number | null> => {
    return new Promise((resolve) => {
      const audio = new Audio();
      audio.preload = "metadata";
      
      audio.onloadedmetadata = () => {
        window.URL.revokeObjectURL(audio.src);
        resolve(audio.duration);
      };
      
      audio.onerror = () => {
        resolve(null);
      };
      
      audio.src = URL.createObjectURL(file);
    });
  };

  // Bulk delete files
  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      await Promise.all(ids.map(id => apiRequest("DELETE", `/api/audio-files/${id}`)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/audio-files'] });
      setShowBulkDeleteDialog(false);
      setSelectedFiles([]);
      toast({
        title: "Xóa thành công",
        description: `${selectedFiles.length} file âm thanh đã được xóa`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Xóa thất bại",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Change group for selected files
  const [selectedGroup, setSelectedGroup] = useState<string>("");
  const [showGroupChangeDialog, setShowGroupChangeDialog] = useState(false);
  
  const changeGroupMutation = useMutation({
    mutationFn: async ({ ids, group }: { ids: number[], group: string }) => {
      return Promise.all(ids.map(id => 
        apiRequest("PATCH", `/api/audio-files/${id}/group`, { group })
      ));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/audio-files'] });
      setShowGroupChangeDialog(false);
      setSelectedFiles([]);
      toast({
        title: "Thành công",
        description: `Đã cập nhật nhóm cho ${selectedFiles.length} file âm thanh`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Cập nhật thất bại",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // State for group change confirmation
  const [showGroupChangeConfirmDialog, setShowGroupChangeConfirmDialog] = useState(false);
  
  // Handle changing group for multiple files
  const handleChangeGroup = (group: string) => {
    if (selectedFiles.length > 0) {
      setSelectedGroup(group);
      setShowGroupChangeDialog(true);
    }
  };
  
  // Show confirmation before group change
  const handleGroupChangeConfirm = () => {
    setShowGroupChangeDialog(false);
    setShowGroupChangeConfirmDialog(true);
  };
  
  // Handle cancel from confirmation dialog
  const handleGroupChangeCancel = () => {
    setShowGroupChangeConfirmDialog(false);
    setShowGroupChangeDialog(true); // Quay lại dialog chọn nhóm thay vì thoát hẳn
  };
  
  // Confirm and execute group change
  const confirmGroupChange = () => {
    setShowGroupChangeConfirmDialog(false);
    
    if (selectedFiles.length > 0 && selectedGroup) {
      changeGroupMutation.mutate({ 
        ids: selectedFiles.map(file => file.id),
        group: selectedGroup
      });
    }
  };
  
  // Handle bulk download
  const handleBulkDownload = () => {
    if (selectedFiles.length > 0) {
      setShowDownloadDialog(true);
    }
  };
  
  // Confirm bulk download
  const confirmBulkDownload = () => {
    setShowDownloadDialog(false);
    
    toast({
      title: "Tải xuống bắt đầu",
      description: `Đang tải ${selectedFiles.length} file âm thanh`,
    });
    
    // Download files one by one with a small delay
    selectedFiles.forEach((file, index) => {
      setTimeout(() => {
        const link = document.createElement('a');
        const timestamp = new Date().getTime();
        link.href = `/api/audio-files/${file.id}/download?t=${timestamp}`;
        link.download = file.displayName + '.' + (file.fileType.split('/')[1] || 'mp3');
        document.body.appendChild(link);
        link.click();
        
        // Remove the link after click
        setTimeout(() => {
          document.body.removeChild(link);
        }, 100);
      }, index * 300); // Add a small delay between downloads
    });
  };
  
  // Reset audio file status
  const resetStatusMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/reset-audio-status");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/audio-files'] });
      setShowStatusUpdateDialog(false);
      setIsUpdatingStatus(false);
      toast({
        title: "Cập nhật thành công",
        description: data.message || "Đã cập nhật trạng thái của tất cả file âm thanh",
      });
    },
    onError: (error: Error) => {
      setIsUpdatingStatus(false);
      toast({
        title: "Cập nhật thất bại",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle file upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setUploadFiles(Array.from(e.target.files));
      setShowUploadDialog(true);
    }
  };

  // Upload files
  const handleUpload = async () => {
    if (uploadFiles.length === 0) return;
    
    setUploadProgress(0);
    const totalFiles = uploadFiles.length;
    let successCount = 0;
    
    for (let i = 0; i < totalFiles; i++) {
      try {
        await uploadAudioMutation.mutateAsync({
          file: uploadFiles[i],
          group: uploadGroup
        });
        successCount++;
      } catch (error) {
        console.error(`Failed to upload ${uploadFiles[i].name}:`, error);
      }
      
      setUploadProgress(Math.round(((i + 1) / totalFiles) * 100));
    }
    
    setShowUploadDialog(false);
    setUploadFiles([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    
    if (successCount === totalFiles) {
      toast({
        title: "Upload hoàn tất",
        description: `${successCount} file đã được tải lên thành công`,
      });
    } else {
      toast({
        title: "Upload không hoàn tất",
        description: `${successCount}/${totalFiles} file được tải lên thành công`,
        variant: "destructive",
      });
    }
  };

  // Handle file selection for download/preview/delete
  const handleFileAction = (file: AudioFile, action: "preview" | "delete") => {
    setSelectedFile(file);
    if (action === "preview") {
      setShowPreviewDialog(true);
    } else if (action === "delete") {
      setShowDeleteDialog(true);
    }
  };

  // State for single file download confirmation
  const [showSingleDownloadDialog, setShowSingleDownloadDialog] = useState(false);
  const [fileToDownload, setFileToDownload] = useState<AudioFile | null>(null);
  
  // Show download confirmation for single file
  const handleDownload = (file: AudioFile) => {
    setFileToDownload(file);
    setShowSingleDownloadDialog(true);
  };
  
  // Confirm single file download
  const confirmSingleDownload = () => {
    if (!fileToDownload) return;
    
    setShowSingleDownloadDialog(false);
    
    // Tạo một thẻ a tạm thời để download file
    const link = document.createElement('a');
    const timestamp = new Date().getTime();
    link.href = `/api/audio-files/${fileToDownload.id}/download?t=${timestamp}`;
    link.download = fileToDownload.displayName + '.' + (fileToDownload.fileType.split('/')[1] || 'mp3');
    document.body.appendChild(link);
    link.click();
    // Xóa thẻ a sau khi đã sử dụng
    setTimeout(() => {
      document.body.removeChild(link);
    }, 100);
  };

  // Bulk delete selected files
  const handleBulkDelete = () => {
    if (selectedFiles.length > 0) {
      setShowBulkDeleteDialog(true);
    }
  };

  // Confirm delete file
  const confirmDelete = () => {
    if (selectedFile) {
      deleteAudioMutation.mutate(selectedFile.id);
    }
  };

  // Confirm bulk delete
  const confirmBulkDelete = () => {
    if (selectedFiles.length > 0) {
      bulkDeleteMutation.mutate(selectedFiles.map(file => file.id));
    }
  };

  // Format time (seconds -> MM:SS)
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  // Format group name
  const formatGroup = (group: string) => {
    switch (group) {
      case "greetings": return "Lời chào";
      case "promotions": return "Khuyến mãi";
      case "tips": return "Mẹo vặt";
      case "announcements": return "Thông báo";
      case "music": return "Nhạc";
      default: return group;
    }
  };

  // Get group badge class
  const getGroupBadgeClass = (group: string) => {
    switch (group) {
      case "greetings": return "bg-blue-100 text-blue-700";         // Lời chào - Xanh dương
      case "promotions": return "bg-orange-100 text-orange-700";    // Khuyến mãi - Cam
      case "tips": return "bg-green-100 text-green-700";            // Mẹo vặt - Xanh lá
      case "announcements": return "bg-purple-100 text-purple-700"; // Thông báo - Tím
      case "music": return "bg-indigo-100 text-indigo-700";         // Nhạc - Chàm
      default: return "bg-neutral-light/50 text-neutral-dark";
    }
  };

  // Handle checkbox selection
  const handleCheckboxChange = (checked: boolean, file: AudioFile) => {
    if (checked) {
      setSelectedFiles(prev => [...prev, file]);
    } else {
      setSelectedFiles(prev => prev.filter(f => f.id !== file.id));
    }
  };

  // Handle select all checkbox
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedFiles(filteredFiles);
    } else {
      setSelectedFiles([]);
    }
  };

  // Filter files based on filters and search term
  const filteredFiles = audioFiles.filter(file => {
    const matchesGroup = groupFilter === "all" || file.group === groupFilter;
    const matchesStatus = statusFilter === "all" || file.status === statusFilter;
    const matchesSearch = 
      file.displayName.toLowerCase().includes(searchTerm.toLowerCase()) || 
      file.filename.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesGroup && matchesStatus && matchesSearch;
  });

  return (
    <DashboardLayout>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Quản lý file audio</CardTitle>
          {(user?.role === "admin" || user?.role === "manager") && (
            <Button onClick={() => fileInputRef.current?.click()}>
              <CloudUpload className="mr-2 h-4 w-4" />
              Tải lên file
              <input
                type="file"
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="audio/*"
                multiple
              />
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {/* Filter and Search Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 space-y-3 sm:space-y-0">
            <div className="flex items-center space-x-2">
              <Select value={groupFilter} onValueChange={setGroupFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Tất cả nhóm" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả nhóm</SelectItem>
                  <SelectItem value="greetings">Lời chào</SelectItem>
                  <SelectItem value="promotions">Khuyến mãi</SelectItem>
                  <SelectItem value="tips">Mẹo vặt</SelectItem>
                  <SelectItem value="announcements">Thông báo</SelectItem>
                  <SelectItem value="music">Nhạc</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Tất cả trạng thái" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả trạng thái</SelectItem>
                  <SelectItem value="used">Đang sử dụng</SelectItem>
                  <SelectItem value="unused">Chưa sử dụng</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="relative">
              <Input
                type="text"
                placeholder="Tìm kiếm file audio..."
                className="pl-9 w-full sm:w-64"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-medium" />
            </div>
          </div>
          
          {/* Audio Files Table */}
          <DataTable
            columns={[
              {
                header: "",
                id: "select",
                cell: ({ row }) => {
                  const file = row.original as AudioFile;
                  return (
                    <Checkbox
                      checked={selectedFiles.some(f => f.id === file.id)}
                      onCheckedChange={(checked) => handleCheckboxChange(checked as boolean, file)}
                    />
                  );
                },
              },
              {
                header: "Tên file",
                accessorKey: "displayName",
                cell: ({ row }) => {
                  const file = row.original as AudioFile;
                  const color = file.group === "greetings" ? "text-primary" :
                                file.group === "promotions" ? "text-accent" :
                                file.group === "tips" ? "text-success" : "text-neutral-dark";
                  
                  return (
                    <div className="flex items-center">
                      <Music className={`mr-3 h-5 w-5 ${color}`} />
                      <div>
                        <div className="text-sm font-medium text-neutral-darkest">
                          {file.displayName}
                        </div>
                        <div className="text-xs text-neutral-medium">
                          {formatFileSize(file.fileSize)}
                        </div>
                      </div>
                    </div>
                  );
                },
              },
              {
                header: "Nhóm",
                accessorKey: "group",
                cell: ({ row }) => {
                  const group = row.getValue("group") as string;
                  const badgeClass = getGroupBadgeClass(group);
                  
                  return (
                    <Badge variant="outline" className={badgeClass}>
                      {formatGroup(group)}
                    </Badge>
                  );
                },
              },
              {
                header: "Thời lượng",
                accessorKey: "duration",
                cell: ({ row }) => {
                  const duration = row.getValue("duration") as number;
                  
                  return (
                    <div className="text-sm text-neutral-dark">
                      {formatTime(duration)}
                    </div>
                  );
                },
              },
              {
                header: "Sample Rate",
                accessorKey: "sampleRate",
                cell: ({ row }) => {
                  const sampleRate = row.getValue("sampleRate") as number | null;
                  
                  return (
                    <div className="text-sm text-neutral-dark">
                      {sampleRate ? `${sampleRate} Hz` : "N/A"}
                    </div>
                  );
                },
              },
              {
                header: "Ngày tải lên",
                accessorKey: "uploadedAt",
                cell: ({ row }) => {
                  const uploadedAt = row.getValue("uploadedAt") as string;
                  
                  return (
                    <div className="text-sm text-neutral-dark">
                      {format(new Date(uploadedAt), "dd/MM/yyyy")}
                    </div>
                  );
                },
              },
              {
                header: "Trạng thái",
                accessorKey: "status",
                cell: ({ row }) => {
                  const status = row.getValue("status") as string;
                  const badgeClass = status === "used"
                    ? "bg-success-light/20 text-success"
                    : "bg-neutral-medium/20 text-neutral-dark";
                  const label = status === "used" ? "Đang sử dụng" : "Chưa sử dụng";
                  
                  return (
                    <Badge variant="outline" className={badgeClass}>
                      {label}
                    </Badge>
                  );
                },
              },
              {
                header: "Thao tác",
                id: "actions",
                cell: ({ row }) => {
                  const file = row.original as AudioFile;
                  
                  return (
                    <div className="flex space-x-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleFileAction(file, "preview")}
                        className="h-8 w-8 text-primary hover:text-primary-dark"
                      >
                        <PlayCircle className="h-4 w-4" />
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDownload(file)}
                        className="h-8 w-8 text-primary hover:text-primary-dark"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      
                      {(user?.role === "admin" || user?.role === "manager") && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleFileAction(file, "delete")}
                          className="h-8 w-8 text-danger hover:text-danger-dark"
                          disabled={file.status === "used"}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  );
                },
              },
            ]}
            data={filteredFiles}
            isLoading={isLoading}
          />
          
          {/* System Actions */}
          {(user?.role === "admin" || user?.role === "manager") && (
            <div className="mt-4 p-4 bg-muted rounded-lg border border-muted-foreground/20">
              <h3 className="font-semibold mb-4">Quản lý hệ thống</h3>
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="outline"
                  className="bg-white"
                  onClick={() => setShowStatusUpdateDialog(true)}
                  disabled={isUpdatingStatus || resetStatusMutation.isPending}
                >
                  <RefreshCcw className="mr-2 h-4 w-4" />
                  {isUpdatingStatus ? "Đang cập nhật..." : "Cập nhật trạng thái file"}
                </Button>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Cập nhật trạng thái sẽ kiểm tra tất cả file audio và đánh dấu file nào đang được sử dụng trong playlist.
                Sử dụng tính năng này nếu bạn không thể xóa, tải xuống hoặc thay đổi nhóm của file audio.
              </p>
            </div>
          )}
          
          {/* Bulk Actions */}
          {selectedFiles.length > 0 && (
            <div className="mt-4 p-4 bg-white rounded-lg shadow">
              <h3 className="font-semibold mb-4">Thao tác hàng loạt ({selectedFiles.length} file được chọn)</h3>
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="outline"
                  className="border-danger text-danger hover:bg-danger/10"
                  onClick={handleBulkDelete}
                  disabled={selectedFiles.some(file => file.status === "used")}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Xóa đã chọn
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => handleChangeGroup('greetings')} 
                  disabled={selectedFiles.some(file => file.status === "used")}
                >
                  <Tag className="mr-2 h-4 w-4" />
                  Thay đổi nhóm
                </Button>
                <Button 
                  variant="outline"
                  onClick={handleBulkDownload}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Tải xuống
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Tải lên file audio</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nhóm file</Label>
              <Select value={uploadGroup} onValueChange={setUploadGroup}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn nhóm" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="greetings">Lời chào</SelectItem>
                  <SelectItem value="promotions">Khuyến mãi</SelectItem>
                  <SelectItem value="tips">Mẹo vặt</SelectItem>
                  <SelectItem value="announcements">Thông báo</SelectItem>
                  <SelectItem value="music">Nhạc</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>File được chọn ({uploadFiles.length})</Label>
              <div className="max-h-40 overflow-y-auto border rounded-md p-2 mt-1">
                {uploadFiles.map((file, index) => (
                  <div key={index} className="flex items-center justify-between py-1 text-sm">
                    <div className="flex items-center">
                      <Music className="h-4 w-4 mr-2 text-primary" />
                      <span className="truncate">{file.name}</span>
                    </div>
                    <span>{formatFileSize(file.size)}</span>
                  </div>
                ))}
              </div>
            </div>
            
            {uploadProgress > 0 && uploadProgress < 100 && (
              <div>
                <Label>Tiến độ</Label>
                <div className="w-full bg-neutral-light rounded-full h-2 mt-1">
                  <div 
                    className="bg-primary h-2 rounded-full" 
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
                <p className="text-xs text-right mt-1">{uploadProgress}%</p>
              </div>
            )}
            
            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowUploadDialog(false)}
                disabled={uploadAudioMutation.isPending}
              >
                Hủy
              </Button>
              <Button 
                onClick={handleUpload} 
                disabled={uploadFiles.length === 0 || uploadAudioMutation.isPending}
              >
                {uploadAudioMutation.isPending ? "Đang tải lên..." : "Tải lên"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Audio Preview Dialog */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nghe thử file audio</DialogTitle>
          </DialogHeader>
          {selectedFile && (
            <>
              <AudioPlayer 
                src={`/api/audio-files/${selectedFile.id}/stream?t=${new Date().getTime()}`}
                title={selectedFile.displayName}
              />
              <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                <div className="text-neutral-medium">Thời lượng:</div>
                <div className="font-medium">{formatTime(selectedFile.duration)}</div>
                
                <div className="text-neutral-medium">Kích thước:</div>
                <div className="font-medium">{formatFileSize(selectedFile.fileSize)}</div>
                
                <div className="text-neutral-medium">Sample Rate:</div>
                <div className="font-medium">{selectedFile.sampleRate ? `${selectedFile.sampleRate} Hz` : "N/A"}</div>
                
                <div className="text-neutral-medium">Loại file:</div>
                <div className="font-medium">{selectedFile.fileType}</div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Xóa file audio"
        description={`Bạn có chắc chắn muốn xóa file "${selectedFile?.displayName}"? Hành động này không thể hoàn tác.`}
        onConfirm={confirmDelete}
        confirmText="Xóa"
        isLoading={deleteAudioMutation.isPending}
        variant="destructive"
      />
      
      {/* Bulk Delete Confirmation Dialog */}
      <ConfirmDialog
        open={showBulkDeleteDialog}
        onOpenChange={setShowBulkDeleteDialog}
        title="Xóa nhiều file audio"
        description={`Bạn có chắc chắn muốn xóa ${selectedFiles.length} file audio đã chọn? Hành động này không thể hoàn tác.`}
        onConfirm={confirmBulkDelete}
        confirmText="Xóa"
        isLoading={bulkDeleteMutation.isPending}
        variant="destructive"
      />
      
      {/* Status Update Dialog */}
      <ConfirmDialog
        open={showStatusUpdateDialog}
        onOpenChange={setShowStatusUpdateDialog}
        title="Cập nhật trạng thái file audio"
        description={`Việc này sẽ kiểm tra tất cả file audio và cập nhật trạng thái của chúng về "đang sử dụng" hoặc "chưa sử dụng" dựa trên việc chúng có đang được sử dụng trong playlist hay không. Bạn có muốn tiếp tục?`}
        onConfirm={() => {
          setIsUpdatingStatus(true);
          resetStatusMutation.mutate();
        }}
        confirmText="Cập nhật"
        isLoading={isUpdatingStatus}
        variant="default"
      />
      
      {/* Group Change Dialog */}
      <Dialog open={showGroupChangeDialog} onOpenChange={setShowGroupChangeDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Thay đổi nhóm file audio</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Chọn nhóm mới</Label>
              <Select value={selectedGroup} onValueChange={setSelectedGroup}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn nhóm" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="greetings">Lời chào</SelectItem>
                  <SelectItem value="promotions">Khuyến mãi</SelectItem>
                  <SelectItem value="tips">Mẹo vặt</SelectItem>
                  <SelectItem value="announcements">Thông báo</SelectItem>
                  <SelectItem value="music">Nhạc</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>File được chọn ({selectedFiles.length})</Label>
              <div className="max-h-40 overflow-y-auto border rounded-md p-2 mt-1">
                {selectedFiles.slice(0, 10).map((file, index) => (
                  <div key={index} className="flex items-center py-1 text-sm">
                    <Music className="h-4 w-4 mr-2 text-primary" />
                    <span className="truncate">{file.displayName}</span>
                  </div>
                ))}
                {selectedFiles.length > 10 && (
                  <div className="text-center text-sm py-1 text-muted-foreground">
                    ...và {selectedFiles.length - 10} file khác
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowGroupChangeDialog(false)}
                disabled={changeGroupMutation.isPending}
              >
                Hủy
              </Button>
              <Button 
                onClick={handleGroupChangeConfirm} 
                disabled={!selectedGroup || changeGroupMutation.isPending}
              >
                {changeGroupMutation.isPending ? "Đang cập nhật..." : "Cập nhật nhóm"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Download Confirmation Dialog */}
      <ConfirmDialog
        open={showDownloadDialog}
        onOpenChange={setShowDownloadDialog}
        title="Xác nhận tải xuống"
        description={`Bạn có chắc chắn muốn tải xuống ${selectedFiles.length} file âm thanh đã chọn?`}
        onConfirm={confirmBulkDownload}
      />
      
      {/* Group Change Confirmation Dialog */}
      <ConfirmDialog
        open={showGroupChangeConfirmDialog}
        onOpenChange={handleGroupChangeCancel}
        title="Xác nhận thay đổi nhóm"
        description={`Bạn có chắc chắn muốn thay đổi nhóm của ${selectedFiles.length} file âm thanh thành "${formatGroup(selectedGroup)}"?`}
        onConfirm={confirmGroupChange}
        confirmText="Xác nhận"
        variant="default"
      />
      
      {/* Single File Download Confirmation Dialog */}
      <ConfirmDialog
        open={showSingleDownloadDialog}
        onOpenChange={setShowSingleDownloadDialog}
        title="Xác nhận tải xuống"
        description={`Bạn có chắc chắn muốn tải xuống file ${fileToDownload?.displayName || ''}?`}
        onConfirm={confirmSingleDownload}
      />
    </DashboardLayout>
  );
}
