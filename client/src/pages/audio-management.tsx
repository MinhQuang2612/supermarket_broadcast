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
  CheckSquare,
  Square
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
  const { data: audioFilesData, isLoading } = useQuery<{ audioFiles: AudioFile[], pagination: any }>({
    queryKey: ['/api/audio-files'],
  });
  
  const audioFiles = audioFilesData?.audioFiles || [];

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
  
  // Hàm để chọn tất cả file
  const selectAllFiles = () => {
    setSelectedFiles(filteredFiles);
  };
  
  // Hàm để bỏ chọn tất cả file
  const deselectAllFiles = () => {
    setSelectedFiles([]);
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
                  const sampleRate = row.getValue("sampleRate") as number;
                  
                  return (
                    <div className="text-sm text-neutral-dark">
                      {sampleRate ? `${sampleRate / 1000} kHz` : "N/A"}
                    </div>
                  );
                },
              },
              {
                header: "Trạng thái",
                accessorKey: "status",
                cell: ({ row }) => {
                  const status = row.getValue("status") as string;
                  
                  return (
                    <Badge variant={status === "used" ? "default" : "outline"}>
                      {status === "used" ? "Đang sử dụng" : "Chưa sử dụng"}
                    </Badge>
                  );
                },
              },
              {
                header: "Ngày tạo",
                accessorKey: "uploadedAt",
                cell: ({ row }) => {
                  const date = row.getValue("uploadedAt");
                  
                  return (
                    <div className="text-sm text-neutral-dark">
                      {date ? format(new Date(date as string), "dd/MM/yyyy HH:mm") : "N/A"}
                    </div>
                  );
                },
              },
              {
                header: "Thao tác",
                id: "actions",
                cell: ({ row }) => {
                  const file = row.original as AudioFile;
                  
                  return (
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleFileAction(file, "preview")}
                        title="Nghe thử"
                      >
                        <PlayCircle className="h-4 w-4 text-primary" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDownload(file)}
                        title="Tải xuống"
                      >
                        <Download className="h-4 w-4 text-primary" />
                      </Button>
                      {(user?.role === "admin" || user?.role === "manager") && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleFileAction(file, "delete")}
                          title="Xóa"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
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
          
          {/* Select All Actions */}
          <div className="mt-4 p-4 bg-white rounded-lg shadow flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Button 
                variant="outline"
                onClick={selectAllFiles}
                className="flex items-center"
              >
                <CheckSquare className="mr-2 h-4 w-4" />
                Chọn tất cả
              </Button>
              <Button 
                variant="outline"
                onClick={deselectAllFiles}
                className="flex items-center"
              >
                <Square className="mr-2 h-4 w-4" />
                Bỏ chọn tất cả
              </Button>
            </div>
            <div>
              {selectedFiles.length > 0 && (
                <div>Đã chọn {selectedFiles.length} file</div>
              )}
            </div>
          </div>
          
          {/* Bulk Actions */}
          {selectedFiles.length > 0 && (
            <div className="mt-4 p-4 bg-white rounded-lg shadow">
              <h3 className="font-semibold mb-4">Thao tác hàng loạt ({selectedFiles.length} file được chọn)</h3>
              <div className="flex flex-wrap gap-2">
                <Button 
                  variant="destructive" 
                  onClick={handleBulkDelete}
                  className="flex items-center"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Xóa file đã chọn
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tải lên file audio</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Danh sách file ({uploadFiles.length})</Label>
              <div className="max-h-40 overflow-y-auto mt-2 p-3 border rounded-md">
                {uploadFiles.map((file, index) => (
                  <div key={index} className="text-sm py-1">
                    {file.name} ({formatFileSize(file.size)})
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <Label>Chọn nhóm cho file audio</Label>
              <Select value={uploadGroup} onValueChange={setUploadGroup}>
                <SelectTrigger className="w-full mt-2">
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
            
            {uploadProgress > 0 && (
              <div>
                <Label>Tiến trình</Label>
                <div className="h-2 w-full bg-neutral-light rounded-full mt-2">
                  <div 
                    className="h-full bg-primary rounded-full" 
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="text-xs text-right mt-1">{uploadProgress}%</p>
              </div>
            )}
            
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowUploadDialog(false);
                  setUploadFiles([]);
                  setUploadProgress(0);
                }}
              >
                Hủy
              </Button>
              <Button
                onClick={handleUpload}
                disabled={uploadFiles.length === 0 || uploadProgress > 0}
              >
                <CloudUpload className="mr-2 h-4 w-4" />
                Tải lên
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Preview Dialog */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedFile?.displayName}
            </DialogTitle>
          </DialogHeader>
          
          {selectedFile && (
            <div className="space-y-4">
              <div className="flex items-center justify-center">
                <Badge variant="outline" className={getGroupBadgeClass(selectedFile.group)}>
                  {formatGroup(selectedFile.group)}
                </Badge>
              </div>
              
              <AudioPlayer 
                audioUrl={`/api/audio-files/${selectedFile.id}/stream`} 
                artistName="Audio File"
                trackName={selectedFile.displayName}
              />
              
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-neutral-medium">Thời lượng:</div>
                <div>{formatTime(selectedFile.duration)}</div>
                
                <div className="text-neutral-medium">Sample Rate:</div>
                <div>{selectedFile.sampleRate ? `${selectedFile.sampleRate / 1000} kHz` : "N/A"}</div>
                
                <div className="text-neutral-medium">Kích thước:</div>
                <div>{formatFileSize(selectedFile.fileSize)}</div>
                
                <div className="text-neutral-medium">Ngày tạo:</div>
                <div>{format(new Date(selectedFile.uploadedAt), "dd/MM/yyyy HH:mm")}</div>
                
                <div className="text-neutral-medium">Trạng thái:</div>
                <div>
                  <Badge variant={selectedFile.status === "used" ? "default" : "outline"}>
                    {selectedFile.status === "used" ? "Đang sử dụng" : "Chưa sử dụng"}
                  </Badge>
                </div>
              </div>
              
              <div className="flex justify-end gap-2">
                <Button
                  onClick={() => handleDownload(selectedFile)}
                  variant="outline"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Tải xuống
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Xóa file audio"
        description="Bạn có chắc chắn muốn xóa file audio này? Hành động này không thể hoàn tác."
        confirmText="Xóa"
        cancelText="Hủy"
        onConfirm={confirmDelete}
        destructive
      />
      
      {/* Bulk Delete Confirmation Dialog */}
      <ConfirmDialog
        open={showBulkDeleteDialog}
        onOpenChange={setShowBulkDeleteDialog}
        title="Xóa nhiều file audio"
        description={`Bạn có chắc chắn muốn xóa ${selectedFiles.length} file audio đã chọn? Hành động này không thể hoàn tác.`}
        confirmText="Xóa"
        cancelText="Hủy"
        onConfirm={confirmBulkDelete}
        destructive
      />
    </DashboardLayout>
  );
}