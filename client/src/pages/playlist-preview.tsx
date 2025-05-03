import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { BroadcastProgram, AudioFile, PlaylistItem, Playlist } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import ConfirmDialog from "@/components/confirm-dialog";
import DashboardLayout from "@/components/layout/dashboard-layout";
import AudioPlayer from "@/components/audio-player";
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
import { Progress } from "@/components/ui/progress";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Play, 
  Headphones, 
  AlertTriangle, 
  SkipForward, 
  Music, 
  Clock,
  Trash2
} from "lucide-react";
import { format } from "date-fns";

export default function PlaylistPreview() {
  const { toast } = useToast();
  const [selectedProgram, setSelectedProgram] = useState<number | null>(null);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<number | null>(null);
  const [currentAudioIndex, setCurrentAudioIndex] = useState<number>(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playlistItems, setPlaylistItems] = useState<PlaylistItem[]>([]);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Fetch broadcast programs
  const { data: programs = [], isLoading: isLoadingPrograms } = useQuery<BroadcastProgram[]>({
    queryKey: ['/api/broadcast-programs'],
  });

  // Fetch audio files
  const { data: audioFiles = [], isLoading: isLoadingAudio } = useQuery<AudioFile[]>({
    queryKey: ['/api/audio-files'],
  });
  
  // Fetch all playlists for selected program
  const { 
    data: programPlaylists = [], 
    isLoading: isLoadingProgramPlaylists
  } = useQuery<Playlist[]>({
    queryKey: ['/api/broadcast-programs', selectedProgram, 'playlists'],
    enabled: !!selectedProgram,
    staleTime: 0,
    refetchOnWindowFocus: true
  });
  
  // Automatically select the first playlist if available
  useEffect(() => {
    if (programPlaylists.length > 0 && !selectedPlaylistId) {
      console.log("Auto-selecting first playlist:", programPlaylists[0]);
      setSelectedPlaylistId(programPlaylists[0].id);
    } else if (programPlaylists.length === 0) {
      setSelectedPlaylistId(null);
    }
  }, [programPlaylists, selectedPlaylistId]);

  // Fetch selected playlist details
  const { 
    data: existingPlaylist, 
    isLoading: isLoadingPlaylist 
  } = useQuery<Playlist>({
    queryKey: ['/api/playlists', selectedPlaylistId],
    enabled: !!selectedPlaylistId,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  // Load playlist items from existing playlist
  useEffect(() => {
    // Add more detailed debugging
    console.log("ExistingPlaylist:", JSON.stringify(existingPlaylist, null, 2));
    
    if (existingPlaylist && existingPlaylist.items && Array.isArray(existingPlaylist.items)) {
      try {
        console.log("Processing playlist items:", existingPlaylist.items);
        
        const items = existingPlaylist.items as PlaylistItem[];
        // Sort by play time
        const sortedItems = [...items].sort((a, b) => {
          const timeA = a.playTime.split(':').map(Number);
          const timeB = b.playTime.split(':').map(Number);
          return (timeA[0] * 60 + timeA[1]) - (timeB[0] * 60 + timeB[1]);
        });
        
        console.log("Sorted playlist items:", sortedItems);
        
        setPlaylistItems(sortedItems);
        setCurrentAudioIndex(-1);
        setIsPlaying(false);
      } catch (error) {
        console.error("Error processing playlist items:", error);
        // Fallback to empty array to avoid crashes
        setPlaylistItems([]);
      }
    } else {
      setPlaylistItems([]);
      setCurrentAudioIndex(-1);
      setIsPlaying(false);
    }
  }, [existingPlaylist]);

  // Handle program selection
  const handleProgramSelect = (programId: string) => {
    setSelectedProgram(parseInt(programId));
    setSelectedPlaylistId(null); // Reset selected playlist
    setCurrentAudioIndex(-1);
    setIsPlaying(false);
  };
  
  // Handle playlist selection
  const handlePlaylistSelect = async (playlistId: string) => {
    const id = parseInt(playlistId);
    console.log("Selected playlist ID:", id);
    
    // Set the state
    setSelectedPlaylistId(id);
    setCurrentAudioIndex(-1);
    setIsPlaying(false);
    
    try {
      // Invalidate the query to force a refresh
      await queryClient.invalidateQueries({
        queryKey: ['/api/playlists', id]
      });
      
      // Force refetch for this specific playlist
      await queryClient.refetchQueries({
        queryKey: ['/api/playlists', id]
      });
      
      console.log("Invalidated and refetched playlist data for ID:", id);
    } catch (error) {
      console.error("Error refreshing playlist data:", error);
      toast({
        title: "Lỗi tải danh sách phát",
        description: "Đã xảy ra lỗi khi tải danh sách phát. Vui lòng thử lại.",
        variant: "destructive",
      });
    }
  };

  // Start playback
  const handleStartPlayback = () => {
    const availableItems = playlistItems.filter(item => getAudioFile(item.audioFileId));
    if (availableItems.length === 0) return;
    
    // Find the index of the first available audio file in the original playlist
    const firstAvailableIndex = playlistItems.findIndex(item => getAudioFile(item.audioFileId));
    if (firstAvailableIndex >= 0) {
      console.log("Starting playback with first available file at index:", firstAvailableIndex);
      setCurrentAudioIndex(firstAvailableIndex);
      setIsPlaying(true);
    } else {
      console.warn("No available audio files found despite filtering");
      toast({
        title: "Không thể phát",
        description: "Không tìm thấy file âm thanh khả dụng để phát",
        variant: "destructive",
      });
    }
  };

  // Handle audio ended
  const handleAudioEnded = () => {
    if (currentAudioIndex < playlistItems.length - 1) {
      // Find the next available audio file starting from the current index + 1
      const nextAvailableIndex = playlistItems.findIndex(
        (item, idx) => idx > currentAudioIndex && getAudioFile(item.audioFileId)
      );
      
      if (nextAvailableIndex >= 0) {
        console.log("Moving to next available audio at index:", nextAvailableIndex);
        setCurrentAudioIndex(nextAvailableIndex);
      } else {
        // No more available audio files, playlist finished
        console.log("No more available audio files, playlist finished");
        setIsPlaying(false);
        setCurrentAudioIndex(-1);
        
        toast({
          title: "Đã phát xong",
          description: "Đã phát hết các file âm thanh khả dụng trong danh sách",
        });
      }
    } else {
      // Playlist finished
      setIsPlaying(false);
      setCurrentAudioIndex(-1);
    }
  };

  // Skip to next track
  const handleSkipNext = () => {
    if (currentAudioIndex < playlistItems.length - 1) {
      // Find the next available audio file
      const nextAvailableIndex = playlistItems.findIndex(
        (item, idx) => idx > currentAudioIndex && getAudioFile(item.audioFileId)
      );
      
      if (nextAvailableIndex >= 0) {
        console.log("Skipping to next available track at index:", nextAvailableIndex);
        setCurrentAudioIndex(nextAvailableIndex);
      } else {
        console.log("No next available track found");
        toast({
          title: "Đã đến cuối",
          description: "Không còn file âm thanh nào phía sau",
        });
      }
    }
  };

  // Skip to previous track
  const handleSkipPrevious = () => {
    if (currentAudioIndex > 0) {
      // Find the previous available audio file
      const prevIndices = Array.from(
        { length: currentAudioIndex }, 
        (_, i) => currentAudioIndex - 1 - i
      );
      
      const prevAvailableIndex = prevIndices.find(
        idx => getAudioFile(playlistItems[idx].audioFileId)
      );
      
      if (prevAvailableIndex !== undefined) {
        console.log("Skipping to previous available track at index:", prevAvailableIndex);
        setCurrentAudioIndex(prevAvailableIndex);
      } else {
        console.log("No previous available track found");
        toast({
          title: "Đã đến đầu",
          description: "Không còn file âm thanh nào phía trước",
        });
      }
    }
  };

  // Play specific track
  const handlePlayTrack = (index: number) => {
    // Kiểm tra xem audio file có tồn tại không
    const item = playlistItems[index];
    if (!item) return;
    
    const audioFile = getAudioFile(item.audioFileId);
    if (!audioFile) {
      toast({
        title: "Không thể phát",
        description: `File âm thanh với ID ${item.audioFileId} không tồn tại`,
        variant: "destructive",
      });
      return;
    }
    
    setCurrentAudioIndex(index);
    setIsPlaying(true);
  };

  // Get audio file by ID
  const getAudioFile = (id: number) => {
    console.log("Looking for audio file with ID:", id);
    const found = audioFiles.find(file => file.id === id);
    if (!found) {
      console.warn(`⚠️ Audio file with ID ${id} not found in audioFiles list. Available IDs:`, 
        audioFiles.map(f => f.id));
    }
    return found;
  };
  
  // State to track missing audio files
  const [missingAudioFileIds, setMissingAudioFileIds] = useState<number[]>([]);
  
  // Check if there are missing audio files in the playlist
  useEffect(() => {
    if (!playlistItems || !audioFiles || audioFiles.length === 0) return;
    
    const missingIds = playlistItems
      .map(item => item.audioFileId)
      .filter(id => !audioFiles.some(file => file.id === id));
    
    setMissingAudioFileIds(missingIds);
    
    if (missingIds.length > 0) {
      console.warn("Phát hiện audio files bị thiếu:", missingIds);
      console.warn("Audio file IDs trong playlist:", playlistItems.map(item => item.audioFileId));
      console.warn("Audio file IDs có sẵn:", audioFiles.map(file => file.id));
    }
  }, [playlistItems, audioFiles]);

  // Format time (seconds -> MM:SS)
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
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

  // Calculate total duration
  const getTotalDuration = () => {
    let totalDuration = 0;
    for (const item of playlistItems) {
      const audioFile = getAudioFile(item.audioFileId);
      if (audioFile) {
        totalDuration += audioFile.duration;
      }
    }
    return totalDuration;
  };

  // Calculate playlist progress
  const getPlaylistProgress = () => {
    if (currentAudioIndex === -1 || playlistItems.length === 0) return 0;
    return ((currentAudioIndex + 1) / playlistItems.length) * 100;
  };
  
  // Delete playlist mutation
  const deletePlaylistMutation = useMutation({
    mutationFn: async () => {
      try {
        console.log("Starting deletion process for playlist ID:", selectedPlaylistId);
        
        if (!selectedPlaylistId) {
          throw new Error("Không có danh sách phát nào được chọn để xóa");
        }
        
        // Thực hiện xóa với ID được chọn
        const res = await apiRequest("DELETE", `/api/playlists/${selectedPlaylistId}`);
        console.log("Delete response status:", res.status);
        
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({ message: "Không thể đọc thông tin lỗi" }));
          console.error("Delete error response:", errorData);
          throw new Error(errorData.message || "Không thể xóa danh sách phát");
        }
        
        return true;
      } catch (error) {
        console.error("Error during delete operation:", error);
        throw error;
      }
    },
    onSuccess: () => {
      // Invalidate both the playlists list and the specific playlist
      queryClient.invalidateQueries({ queryKey: ['/api/broadcast-programs', selectedProgram, 'playlists'] });
      queryClient.invalidateQueries({ queryKey: ['/api/playlists', selectedPlaylistId] });
      
      setShowDeleteDialog(false);
      toast({
        title: "Đã xóa danh sách phát",
        description: "Danh sách phát đã được xóa thành công",
      });
      
      // Reset selected playlist
      setSelectedPlaylistId(null);
    },
    onError: (error: Error) => {
      console.error("Delete mutation error:", error);
      toast({
        title: "Không thể xóa danh sách phát",
        description: error.message || "Đã xảy ra lỗi khi xóa danh sách phát",
        variant: "destructive",
      });
    },
  });
  
  // Handle delete playlist
  const handleDeletePlaylist = () => {
    if (!existingPlaylist) return;
    setShowDeleteDialog(true);
  };
  
  // Confirm delete playlist
  const confirmDeletePlaylist = () => {
    deletePlaylistMutation.mutate();
  };

  const isLoading = isLoadingPrograms || isLoadingAudio || isLoadingPlaylist;
  const selectedProgramData = programs.find(p => p.id === selectedProgram);
  const currentAudioFile = currentAudioIndex >= 0 && currentAudioIndex < playlistItems.length
    ? getAudioFile(playlistItems[currentAudioIndex].audioFileId)
    : null;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle>Nghe thử chương trình</CardTitle>
                <CardDescription>
                  Nghe thử danh sách phát trước khi phát sóng
                </CardDescription>
              </div>
              {existingPlaylist && (
                <Button
                  variant="destructive"
                  onClick={handleDeletePlaylist}
                  disabled={deletePlaylistMutation.isPending}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Xóa danh sách phát
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {/* Program Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">
                Chọn chương trình phát
              </label>
              <Select 
                value={selectedProgram?.toString() || ""} 
                onValueChange={handleProgramSelect}
              >
                <SelectTrigger className="w-full md:w-1/2">
                  <SelectValue placeholder="Chọn chương trình phát" />
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
            
            {selectedProgram ? (
              <>
                {/* Program information */}
                <div className="mb-6 p-4 bg-neutral-lightest rounded-md">
                  <h3 className="font-medium mb-2">Thông tin chương trình</h3>
                  {selectedProgramData && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-neutral-medium">Tên:</span>{" "}
                        <span className="font-medium">{selectedProgramData.name}</span>
                      </div>
                      <div>
                        <span className="text-neutral-medium">Ngày phát:</span>{" "}
                        <span className="font-medium">{format(new Date(selectedProgramData.date), "dd/MM/yyyy")}</span>
                      </div>
                      <div>
                        <span className="text-neutral-medium">Tổng thời lượng:</span>{" "}
                        <span className="font-medium">{formatTime(getTotalDuration())}</span>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Playlist selection */}
                {programPlaylists.length > 0 && (
                  <div className="mb-6">
                    <label className="block text-sm font-medium mb-2">
                      Chọn danh sách phát
                    </label>
                    <Select 
                      value={selectedPlaylistId?.toString() || ""} 
                      onValueChange={handlePlaylistSelect}
                    >
                      <SelectTrigger className="w-full md:w-1/2">
                        <SelectValue placeholder="Chọn danh sách phát" />
                      </SelectTrigger>
                      <SelectContent>
                        {programPlaylists.map((playlist) => (
                          <SelectItem key={playlist.id} value={playlist.id.toString()}>
                            Danh sách phát ID: {playlist.id} - {new Date(playlist.createdAt).toLocaleString()}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-muted-foreground mt-2">
                      Chương trình này có {programPlaylists.length} danh sách phát
                    </p>
                  </div>
                )}
                
                {existingPlaylist ? (
                  <>
                    {missingAudioFileIds.length > 0 && (
                      <div className="p-4 mb-4 border border-yellow-200 bg-yellow-50 rounded-md">
                        <div className="flex gap-2">
                          <AlertTriangle className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
                          <div>
                            <h4 className="font-medium text-yellow-800">Có file âm thanh bị thiếu</h4>
                            <p className="text-sm text-yellow-700 mt-1">
                              Một số file âm thanh trong danh sách phát này không còn tồn tại trong hệ thống. 
                              Những file này sẽ bị bỏ qua khi phát.
                            </p>
                            <p className="text-sm text-yellow-700 mt-1">
                              ID của các file bị thiếu: {missingAudioFileIds.join(', ')}
                            </p>
                            <p className="text-sm text-yellow-700 mt-1">
                              ID của các file có sẵn: {audioFiles.map(file => file.id).join(', ')}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  
                    {/* Audio Player */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                      <div className="lg:col-span-1">
                        <div className="bg-white p-6 rounded-md shadow-md">
                          <h3 className="font-medium flex items-center mb-4">
                            <Headphones className="h-5 w-5 mr-2" />
                            Trình phát nhạc
                          </h3>
                          
                          {currentAudioFile ? (
                            <AudioPlayer 
                              src={`/api/audio-files/${currentAudioFile.id}/stream`}
                              title={currentAudioFile.displayName}
                              onEnded={handleAudioEnded}
                              onNext={handleSkipNext}
                              onPrevious={handleSkipPrevious}
                              showControls={true}
                            />
                          ) : (
                            <div className="bg-neutral-lightest rounded-lg p-6 text-center">
                              <Music className="h-12 w-12 mx-auto text-neutral-medium mb-3" />
                              <p className="text-neutral-dark mb-4">
                                {playlistItems.filter(item => getAudioFile(item.audioFileId)).length > 0 
                                  ? "Nhấn nút phát để bắt đầu nghe thử danh sách phát"
                                  : "Không có file âm thanh khả dụng để phát"}
                              </p>
                              {playlistItems.filter(item => getAudioFile(item.audioFileId)).length > 0 && (
                                <Button 
                                  onClick={handleStartPlayback}
                                  disabled={playlistItems.filter(item => getAudioFile(item.audioFileId)).length === 0 || isPlaying}
                                  className="mx-auto"
                                >
                                  <Play className="h-4 w-4 mr-2" />
                                  Bắt đầu phát
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="lg:col-span-2">
                        <div className="bg-white p-6 rounded-md shadow-md h-full">
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="font-medium">Tiến độ phát</h3>
                            <span className="text-sm text-neutral-medium">
                              {currentAudioIndex + 1 > 0 ? currentAudioIndex + 1 : 0}/{playlistItems.filter(item => getAudioFile(item.audioFileId)).length} files khả dụng
                            </span>
                          </div>
                          
                          <Progress value={getPlaylistProgress()} className="h-2 mb-6" />
                          
                          <div className="overflow-y-auto max-h-60">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="w-12">#</TableHead>
                                  <TableHead>File</TableHead>
                                  <TableHead>Thời gian</TableHead>
                                  <TableHead>Nhóm</TableHead>
                                  <TableHead>Thời lượng</TableHead>
                                  <TableHead className="w-16"></TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {playlistItems.map((item, index) => {
                                  const audioFile = getAudioFile(item.audioFileId);
                                  const isMissing = !audioFile;
                                  
                                  // If file is missing, show a warning row
                                  // Otherwise, show the normal row with audio file details
                                  return (
                                    <TableRow 
                                      key={index}
                                      className={
                                        isMissing 
                                          ? "bg-yellow-50" 
                                          : index === currentAudioIndex 
                                            ? "bg-primary/5" 
                                            : undefined
                                      }
                                    >
                                      <TableCell className="font-medium">
                                        {index + 1}
                                      </TableCell>
                                      <TableCell>
                                        {isMissing ? (
                                          <div className="flex items-center text-yellow-700">
                                            <AlertTriangle className="h-4 w-4 mr-1" />
                                            File đã bị xóa (ID: {item.audioFileId})
                                          </div>
                                        ) : (
                                          <div className={index === currentAudioIndex ? "font-medium" : ""}>
                                            {audioFile.displayName}
                                          </div>
                                        )}
                                      </TableCell>
                                      <TableCell>
                                        <div className="flex items-center">
                                          <Clock className="h-4 w-4 mr-1 text-neutral-medium" />
                                          {item.playTime}
                                        </div>
                                      </TableCell>
                                      <TableCell>
                                        {isMissing ? (
                                          <Badge variant="outline" className="bg-yellow-100 text-yellow-700">
                                            Không xác định
                                          </Badge>
                                        ) : (
                                          <Badge 
                                            variant="outline" 
                                            className={getGroupBadgeClass(audioFile.group)}
                                          >
                                            {formatGroup(audioFile.group)}
                                          </Badge>
                                        )}
                                      </TableCell>
                                      <TableCell>
                                        {isMissing ? "—" : formatTime(audioFile.duration)}
                                      </TableCell>
                                      <TableCell>
                                        {!isMissing && (
                                          <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-8 w-8" 
                                            onClick={() => handlePlayTrack(index)}
                                          >
                                            <Play className="h-4 w-4" />
                                          </Button>
                                        )}
                                      </TableCell>
                                    </TableRow>
                                  );
                                })}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Quality Check */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Kiểm tra chất lượng</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="p-4 bg-neutral-lightest rounded-md">
                            <h4 className="text-sm font-medium mb-2">Tổng số file audio</h4>
                            <p className="text-2xl font-bold">
                              {playlistItems.length} 
                              {missingAudioFileIds.length > 0 && (
                                <span className="text-sm text-yellow-700 ml-2">
                                  ({playlistItems.filter(item => getAudioFile(item.audioFileId)).length} khả dụng)
                                </span>
                              )}
                            </p>
                          </div>
                          
                          <div className="p-4 bg-neutral-lightest rounded-md">
                            <h4 className="text-sm font-medium mb-2">Thời lượng phát</h4>
                            <p className="text-2xl font-bold">{formatTime(getTotalDuration())}</p>
                          </div>
                          
                          <div className="p-4 bg-neutral-lightest rounded-md">
                            <h4 className="text-sm font-medium mb-2">Sample Rate</h4>
                            <p className="text-2xl font-bold">44.1kHz</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </>
                ) : isLoadingPlaylist ? (
                  <div className="flex justify-center items-center h-60 bg-neutral-lightest rounded-md">
                    <p className="text-neutral-medium">Đang tải dữ liệu...</p>
                  </div>
                ) : (
                  <Alert variant="destructive" className="bg-danger/5">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Chương trình phát này chưa có danh sách phát. Vui lòng tạo danh sách phát trước khi nghe thử.
                    </AlertDescription>
                  </Alert>
                )}
              </>
            ) : (
              <div className="flex justify-center items-center h-60 bg-neutral-lightest rounded-md">
                <div className="text-center">
                  <AlertTriangle className="h-8 w-8 text-neutral-medium mx-auto mb-2" />
                  <p className="text-neutral-medium">Vui lòng chọn một chương trình phát</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Xóa danh sách phát"
        description="Bạn có chắc chắn muốn xóa danh sách phát này? Hành động này không thể hoàn tác."
        onConfirm={confirmDeletePlaylist}
        confirmText="Xóa"
        cancelText="Hủy"
        isLoading={deletePlaylistMutation.isPending}
        variant="destructive"
      />
    </DashboardLayout>
  );
}
