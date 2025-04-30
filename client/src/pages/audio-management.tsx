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
  Music 
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
  const [selectedFile, setSelectedFile] = useState<AudioFile | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<AudioFile[]>([]);
  const [groupFilter, setGroupFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploadGroup, setUploadGroup] = useState("greetings");
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // Fetch audio files
  const { data: audioFiles = [], isLoading } = useQuery<AudioFile[]>({
    queryKey: ['/api/audio-files'],
  });

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

  // Download file
  const handleDownload = (file: AudioFile) => {
    // Sử dụng URL có timestamp để tránh cache
    const timestamp = new Date().getTime();
    window.open(`/api/audio-files/${file.id}/stream?t=${timestamp}`, "_blank");
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
      default: return group;
    }
  };

  // Get group badge class
  const getGroupBadgeClass = (group: string) => {
    switch (group) {
      case "greetings": return "bg-primary-light/20 text-primary";
      case "promotions": return "bg-accent-light/20 text-accent";
      case "tips": return "bg-success-light/20 text-success";
      case "announcements": return "bg-neutral-dark/20 text-neutral-dark";
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
                <Button variant="outline">
                  <Tag className="mr-2 h-4 w-4" />
                  Thay đổi nhóm
                </Button>
                <Button variant="outline">
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
            <AudioPlayer 
              src={`/api/audio-files/${selectedFile.id}/stream?t=${new Date().getTime()}`}
              title={selectedFile.displayName}
            />
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
    </DashboardLayout>
  );
}
