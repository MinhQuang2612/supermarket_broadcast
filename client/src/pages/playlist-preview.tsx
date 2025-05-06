import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { BroadcastProgram, AudioFile, PlaylistItem, Playlist } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import ConfirmDialog from "@/components/confirm-dialog";
import DashboardLayout from "@/components/layout/dashboard-layout";
import AudioPlayer from "@/components/audio-player";
import MissingAudioAlert from "@/components/missing-audio-alert";
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
  Filter,
  Music, 
  Clock,
  Trash2
} from "lucide-react";
import { format } from "date-fns";

export default function PlaylistPreview() {
  const { toast } = useToast();
  const [selectedProgram, setSelectedProgram] = useState<BroadcastProgram | null>(null);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<number | null>(null);
  const [currentAudioIndex, setCurrentAudioIndex] = useState<number>(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playlistItems, setPlaylistItems] = useState<PlaylistItem[]>([]);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

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
    queryKey: ['/api/broadcast-programs'],
  });
  
  // Extract programs array from paginated response
  const programs = programsData?.programs || [];

  // Fetch audio files with pagination and make query more reliable
  const { data: audioFilesData, isLoading: isLoadingAudio } = useQuery<{
    audioFiles: AudioFile[],
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }
  }>({
    queryKey: ['/api/audio-files'],
    queryFn: async () => {
      // Query with large limit to get all audio files
      const response = await fetch(`/api/audio-files?limit=999`);
      if (!response.ok) {
        throw new Error('Failed to fetch audio files');
      }
      
      const data = await response.json();
      
      // Thêm debug log để kiểm tra dữ liệu
      console.log("🔍 Successfully loaded audio files:", data.audioFiles.length);
      console.log("🔍 Audio file IDs:", data.audioFiles.map((file: AudioFile) => file.id).sort((a: number, b: number) => a - b).join(', '));
      
      // Nếu không tìm thấy audio files, thử tải lại hoặc hiển thị thông báo
      if (!data.audioFiles || data.audioFiles.length === 0) {
        console.error("No audio files found in the system!");
        toast({
          title: "Không tìm thấy file âm thanh nào",
          description: "Hệ thống không tìm thấy file âm thanh nào. Vui lòng kiểm tra lại.",
          variant: "destructive",
        });
      }
      
      return data;
    },
    staleTime: 0, // Không cache kết quả
    refetchOnWindowFocus: true, // Luôn tải lại khi focus vào cửa sổ
  });
  
  // Extract audio files array from paginated response
  const audioFiles = audioFilesData?.audioFiles || [];
  
  // Fetch all playlists for selected program
  const { 
    data: programPlaylistsData, 
    isLoading: isLoadingProgramPlaylists
  } = useQuery<{
    playlists: Playlist[],
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }
  }>({
    queryKey: ['/api/broadcast-programs', selectedProgram?.id, 'playlists'],
    queryFn: async () => {
      if (!selectedProgram) {
        return { playlists: [], pagination: { total: 0, page: 1, limit: 10, totalPages: 0 } };
      }
      
      const response = await fetch(`/api/broadcast-programs/${selectedProgram.id}/playlists`);
      if (!response.ok) {
        throw new Error('Failed to fetch playlists');
      }
      
      return await response.json();
    },
    enabled: !!selectedProgram,
    staleTime: 0,
    refetchOnWindowFocus: true
  });
  
  // Extract playlists array from paginated response
  const programPlaylists = programPlaylistsData?.playlists || [];
  
  // Automatically select the first playlist if available
  useEffect(() => {
    if (programPlaylists.length > 0 && !selectedPlaylistId) {
      console.log("Auto-selecting first playlist:", programPlaylists[0]);
      setSelectedPlaylistId(programPlaylists[0].id);
    } else if (programPlaylists.length === 0) {
      setSelectedPlaylistId(null);
    }
  }, [programPlaylists, selectedPlaylistId]);

  // Fetch selected playlist details - with direct fetch to avoid problems with TanStack Query
  const { 
    data: existingPlaylist, 
    isLoading: isLoadingPlaylist,
    refetch: refetchPlaylist
  } = useQuery<Playlist>({
    queryKey: ['/api/playlists', selectedPlaylistId],
    queryFn: async () => {
      if (!selectedPlaylistId) {
        console.warn("No playlist ID selected, can't fetch playlist");
        return null;
      }
      
      console.log(`Fetching directly from API: /api/playlists/${selectedPlaylistId}`);
      
      const response = await fetch(`/api/playlists/${selectedPlaylistId}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch playlist with ID ${selectedPlaylistId}: ${response.status}`);
      }
      
      const playlist = await response.json();
      console.log("Received playlist directly from API:", playlist);
      
      // Log playlist item IDs for debugging
      if (playlist && playlist.items && Array.isArray(playlist.items)) {
        const itemIds = playlist.items.map(item => item.audioFileId);
        console.log("Playlist item IDs:", itemIds.sort((a, b) => a - b).join(', '));
      }
      
      return playlist;
    },
    enabled: !!selectedPlaylistId,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  // Load playlist items from existing playlist
  useEffect(() => {
    // Add more detailed debugging
    console.log("ExistingPlaylist:", existingPlaylist);
    
    if (existingPlaylist && existingPlaylist.items && Array.isArray(existingPlaylist.items)) {
      try {
        console.log("Processing playlist items:", existingPlaylist.items.length);
        
        // Log audio file IDs in the playlist - convert to Number for consistency
        const audioIds = existingPlaylist.items.map(item => Number(item.audioFileId)).sort((a, b) => a - b);
        console.log("Playlist audio file IDs:", audioIds.join(', '));
        
        // Log available audio file IDs
        if (audioFiles && audioFiles.length > 0) {
          const availableIds = audioFiles.map(file => Number(file.id)).sort((a, b) => a - b);
          console.log("Available audio file IDs:", availableIds.join(', '));
          
          // Check for missing audio files - using strict number comparison
          const missingIds = audioIds.filter(id => !availableIds.includes(Number(id)));
          if (missingIds.length > 0) {
            console.warn(`⚠️ Found ${missingIds.length} missing audio files:`, missingIds.join(', '));
            
            // Try fetching these specific audio files individually
            missingIds.forEach(id => {
              fetch(`/api/audio-files/${id}`)
                .then(response => {
                  if (response.ok) return response.json();
                  throw new Error(`Audio file ${id} not found on server`);
                })
                .then(file => {
                  console.log(`✅ Found audio file ${id} in direct API call:`, file.displayName);
                  // We can't update audioFiles array here, but at least we verified it exists
                })
                .catch(error => {
                  console.error(`❌ Failed to retrieve audio file ${id}:`, error.message);
                });
            });
            
            // Display a warning toast
            toast({
              title: `Phát hiện ${missingIds.length} file âm thanh bị thiếu`,
              description: "Một số file âm thanh trong playlist không tải được. Bạn có thể cần chuẩn hóa lại danh sách phát.",
              variant: "destructive",
            });
          } else {
            console.log("✅ All audio files in the playlist are available!");
          }
        } else {
          console.error("❌ No audio files loaded yet - audioFiles is empty or null");
        }
        
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
  }, [existingPlaylist, audioFiles, toast]);

  // Handle program selection
  const handleProgramSelect = (programId: string) => {
    console.log("Selected program ID:", programId);
    const programIdNumber = parseInt(programId);
    
    if (isNaN(programIdNumber)) {
      console.error("Invalid program ID:", programId);
      toast({
        title: "Lỗi chọn chương trình",
        description: "ID chương trình không hợp lệ",
        variant: "destructive",
      });
      return;
    }
    
    // Find the program object from the list of programs
    const program = programs.find(p => p.id === programIdNumber);
    if (!program) {
      console.error("Program not found with ID:", programIdNumber);
      toast({
        title: "Lỗi chọn chương trình",
        description: "Không tìm thấy chương trình phát tương ứng",
        variant: "destructive",
      });
      return;
    }
    
    setSelectedProgram(program); // Set the full program object
    setSelectedPlaylistId(null); // Reset selected playlist
    setCurrentAudioIndex(-1);
    setIsPlaying(false);
  };
  
  // Handle playlist selection
  const handlePlaylistSelect = async (playlistId: string) => {
    const id = parseInt(playlistId);
    console.log("Selected playlist ID:", id);
    
    // Ghi log rõ ràng hơn cho việc debug
    console.log("Available playlists:", programPlaylists.map(p => `ID: ${p.id}, Created: ${p.createdAt}`));
    console.log("Selecting playlist from dropdown with ID:", id);
    
    // Set the state
    setSelectedPlaylistId(id);
    setCurrentAudioIndex(-1);
    setIsPlaying(false);
    
    try {
      // Fetch audio files first to ensure they're loaded
      console.log("Preloading audio files before loading playlist");
      const audioResponse = await fetch(`/api/audio-files?limit=999`);
      if (!audioResponse.ok) {
        throw new Error(`Không thể tải danh sách file âm thanh: ${audioResponse.status}`);
      }
      
      const audioData = await audioResponse.json();
      console.log(`Preloaded ${audioData.audioFiles.length} audio files with IDs:`, 
        audioData.audioFiles.map((file: AudioFile) => file.id).sort((a: number, b: number) => a - b).join(', '));
      
      // Truy vấn trực tiếp API để lấy playlist theo ID thực tế
      console.log("Fetching directly from API: /api/playlists/" + id);
      const playlistResponse = await fetch(`/api/playlists/${id}`);
      
      if (!playlistResponse.ok) {
        console.error(`API error (${playlistResponse.status}): /api/playlists/${id}`);
        throw new Error(`Không thể lấy danh sách phát: ${playlistResponse.status}`);
      }
      
      // Lấy dữ liệu playlist trực tiếp từ API
      const playlist = await playlistResponse.json();
      console.log("Received playlist directly from API:", playlist);
      
      if (playlist.items && Array.isArray(playlist.items)) {
        console.log("Playlist item IDs:", playlist.items.map((item: PlaylistItem) => item.audioFileId).sort((a: number, b: number) => a - b).join(', '));
        
        // Check for missing audio files
        const missingIds = playlist.items
          .map((item: PlaylistItem) => item.audioFileId)
          .filter((id: number) => !audioData.audioFiles.some((file: AudioFile) => file.id === id));
        
        if (missingIds.length > 0) {
          console.warn(`Found ${missingIds.length} missing audio files in playlist:`, missingIds);
          toast({
            title: `Phát hiện ${missingIds.length} file âm thanh bị thiếu`,
            description: "Một số file âm thanh không tồn tại trong hệ thống. Hãy sử dụng nút 'Chuẩn hóa danh sách phát' để loại bỏ chúng.",
            variant: "destructive",
          });
        }
      }
      
      // Invalidate and refetch queries
      await queryClient.invalidateQueries({
        queryKey: ['/api/audio-files']
      });
      
      await queryClient.invalidateQueries({
        queryKey: ['/api/playlists', id]
      });
      
      // Force refetch to update React Query cache
      await queryClient.refetchQueries({
        queryKey: ['/api/audio-files']
      });
      
      await queryClient.refetchQueries({
        queryKey: ['/api/playlists', id]
      });
      
      console.log("Invalidated and refetched all necessary data for playback");
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

  // Cache for individual audio file fetch results
  const [individualAudioFiles, setIndividualAudioFiles] = useState<{[key: number]: AudioFile}>({});
  
  // Get audio file by ID with enhanced error handling and direct fetch capability
  const getAudioFile = (id: number) => {
    if (!id) {
      console.error("Invalid audio file ID:", id);
      return null;
    }
    
    // First check if we've already individually fetched this file
    if (individualAudioFiles[id]) {
      console.log(`Using individually cached audio file ${id}: ${individualAudioFiles[id].displayName}`);
      return individualAudioFiles[id];
    }
    
    // Then check in the main audioFiles array - enhanced with strict ID matching and debug logs
    if (audioFiles && audioFiles.length > 0) {
      // Convert id to number to ensure type matching
      const numericId = Number(id);
      
      // Find the audio file with matching ID
      const found = audioFiles.find(file => Number(file.id) === numericId);
      
      if (found) {
        console.log(`Found audio file ${numericId} in main cache: ${found.displayName}`);
        return found;
      } else {
        // If not found, log all available IDs for debugging
        console.warn(`⚠️ Audio file with ID ${numericId} not found in main cache. Available IDs:`, 
          audioFiles.map(file => file.id).sort((a, b) => a - b).join(', '));
      }
    } else {
      console.warn("No audio files loaded - audioFiles array is empty or null");
    }
    
    // If file was not found in regular cache, try to fetch it directly and add to our individual cache
    console.warn(`⚠️ Audio file with ID ${id} not found in regular cache. Attempting direct fetch.`);
    
    // Start an async fetch but don't block the function
    (async () => {
      try {
        const response = await fetch(`/api/audio-files/${id}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch audio file with ID ${id}: ${response.status}`);
        }
        
        const file = await response.json();
        console.log(`✅ Successfully fetched audio file with ID ${id} directly:`, file.displayName);
        
        // Add to our individual cache
        setIndividualAudioFiles(prev => ({
          ...prev,
          [id]: file
        }));
        
        // Force a component update to use the newly fetched file
        // This would happen on next render anyway due to state update
      } catch (error) {
        console.error(`❌ Error fetching audio file with ID ${id}:`, error);
      }
    })();
    
    // Return null for this render cycle, but the component will update after fetch completes
    return null;
  };
  
  // State to track missing audio files
  const [missingAudioFileIds, setMissingAudioFileIds] = useState<number[]>([]);
  
  // Check if there are missing audio files in the playlist
  useEffect(() => {
    if (!playlistItems || !audioFiles || audioFiles.length === 0) return;
    
    // Convert IDs to numbers for strict comparison
    const playlistItemIds = playlistItems.map(item => Number(item.audioFileId));
    const audioFileIds = audioFiles.map(file => Number(file.id));
    
    // Find missing IDs using number comparison
    const missingIds = playlistItemIds.filter(id => !audioFileIds.includes(id));
    
    setMissingAudioFileIds(missingIds);
    
    if (missingIds.length > 0) {
      console.warn("Phát hiện audio files bị thiếu:", missingIds);
      console.warn("Audio file IDs trong playlist:", playlistItemIds.sort((a, b) => a - b).join(', '));
      console.warn("Audio file IDs có sẵn:", audioFileIds.sort((a, b) => a - b).join(', '));
      
      // Hiển thị thông báo cho người dùng về file bị thiếu
      toast({
        title: `Có ${missingIds.length} file âm thanh bị thiếu`,
        description: "Một số file âm thanh trong danh sách phát này không còn tồn tại trong hệ thống. Bạn có thể cần chuẩn hóa lại danh sách phát.",
        variant: "destructive",
      });
    } else {
      console.log("Tất cả audio files trong playlist đều tồn tại trong hệ thống.");
    }
  }, [playlistItems, audioFiles, toast]);

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
  
  // Chức năng chuẩn hóa danh sách phát đã được di chuyển sang component MissingAudioAlert
  
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
  const selectedProgramData = programs.find(p => p.id === (selectedProgram?.id || -1));
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
                <CardTitle className="mb-2">Nghe thử chương trình</CardTitle>
                <CardDescription>
                  Nghe thử danh sách phát trước khi phát sóng
                </CardDescription>
              </div>
              {existingPlaylist && (
                <div className="flex space-x-2">
                  <Button
                    variant="destructive"
                    onClick={handleDeletePlaylist}
                    disabled={deletePlaylistMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Xóa danh sách phát
                  </Button>
                </div>
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
                value={selectedProgram?.id?.toString() || ""} 
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
                            Danh sách phát ID: {playlist.id} - {format(new Date(playlist.createdAt), "dd/MM/yyyy, h:mm:ss a")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="mt-3 p-4 border rounded-md bg-background">
                      {programPlaylists.map((playlist) => (
                        selectedPlaylistId === playlist.id && (
                          <div key={`selected-${playlist.id}`} className="mb-2">
                            Danh sách phát ID: {playlist.id} - {format(new Date(playlist.createdAt), "dd/MM/yyyy, h:mm:ss a")}
                          </div>
                        )
                      ))}
                      {programPlaylists.length > 0 && !selectedPlaylistId && (
                        <div className="text-muted-foreground">Vui lòng chọn danh sách phát</div>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      Chương trình này có {programPlaylists.length} danh sách phát
                    </p>
                  </div>
                )}
                
                {existingPlaylist ? (
                  <>
                    {missingAudioFileIds.length > 0 && (
                      <MissingAudioAlert 
                        missingAudioIds={missingAudioFileIds} 
                        playlistId={selectedPlaylistId}
                        onComplete={() => {
                          console.log("Playlist cleaning complete - refreshing data");
                          // Refresh the playlist data
                          refetchPlaylist();
                          // Reset audio player state
                          setCurrentAudioIndex(-1);
                          setIsPlaying(false);
                          // Reset missing audio files
                          setMissingAudioFileIds([]);
                        }}
                      />
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
