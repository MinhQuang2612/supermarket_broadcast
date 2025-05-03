import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { BroadcastProgram, AudioFile, PlaylistItem, Playlist } from "@shared/schema";
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
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { SelectSeparator } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  ArrowUp, 
  ArrowDown, 
  AlertTriangle, 
  ListOrdered, 
  Music, 
  Save, 
  Clock, 
  CheckCircle,
  Trash2,
  RefreshCcw,
  PlusCircle
} from "lucide-react";
import { format, parse, addMinutes } from "date-fns";

export default function PlaylistCreation() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedProgram, setSelectedProgram] = useState<number | null>(null);
  const [existingPlaylist, setExistingPlaylist] = useState<Playlist | null>(null);
  const [playlistItems, setPlaylistItems] = useState<PlaylistItem[]>([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);

  // Fetch broadcast programs
  const { data: programs = [], isLoading: isLoadingPrograms } = useQuery<BroadcastProgram[]>({
    queryKey: ['/api/broadcast-programs'],
  });

  // Fetch audio files
  const { data: audioFiles = [], isLoading: isLoadingAudio } = useQuery<AudioFile[]>({
    queryKey: ['/api/audio-files'],
  });

  // Fetch playlists for selected program
  const {
    data: playlists = [],
    isLoading: isLoadingPlaylists,
    refetch: refetchPlaylists
  } = useQuery<Playlist[]>({
    queryKey: ['/api/broadcast-programs', selectedProgram, 'playlists'],
    enabled: !!selectedProgram,
  });
  
  // Derived state for loading
  const isLoadingPlaylist = isLoadingPlaylists;

  // Create playlist mutation
  const createPlaylistMutation = useMutation({
    mutationFn: async (data: { broadcastProgramId: number, items: PlaylistItem[] }) => {
      const res = await apiRequest("POST", "/api/playlists", data);
      return await res.json();
    },
    onSuccess: () => {
      // Invalidate both single playlist and playlists list queries
      queryClient.invalidateQueries({ queryKey: ['/api/broadcast-programs', selectedProgram, 'playlist'] });
      queryClient.invalidateQueries({ queryKey: ['/api/broadcast-programs', selectedProgram, 'playlists'] });
      setShowSaveDialog(false);
      toast({
        title: "Danh sách phát đã được lưu",
        description: "Danh sách phát đã được lưu thành công",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Lưu danh sách phát thất bại",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update playlist mutation
  const updatePlaylistMutation = useMutation({
    mutationFn: async (data: { id: number, items: PlaylistItem[] }) => {
      console.log("Updating playlist:", data.id, data.items);
      const res = await apiRequest("PUT", `/api/playlists/${data.id}`, { items: data.items });
      return await res.json();
    },
    onSuccess: () => {
      // Invalidate both single playlist and playlists list queries
      queryClient.invalidateQueries({ queryKey: ['/api/broadcast-programs', selectedProgram, 'playlist'] });
      queryClient.invalidateQueries({ queryKey: ['/api/broadcast-programs', selectedProgram, 'playlists'] });
      setShowSaveDialog(false);
      toast({
        title: "Danh sách phát đã được cập nhật",
        description: "Danh sách phát đã được cập nhật thành công",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Cập nhật danh sách phát thất bại",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Load playlist items from existing playlist
  useEffect(() => {
    if (existingPlaylist) {
      setPlaylistItems(existingPlaylist.items as PlaylistItem[]);
    } else {
      setPlaylistItems([]);
    }
  }, [existingPlaylist]);

  // Handle program selection
  const handleProgramSelect = (programId: string) => {
    setSelectedProgram(parseInt(programId));
    // Khi chọn chương trình mới, reset playlist đang chỉnh sửa
    setExistingPlaylist(null);
    setPlaylistItems([]);
  };
  
  // Handle playlist selection
  const handlePlaylistSelect = async (playlistId: string) => {
    console.log("handlePlaylistSelect called with:", playlistId);
    
    if (playlistId === "new") {
      // Chọn tạo mới
      console.log("Creating new playlist...");
      setExistingPlaylist(null);
      setPlaylistItems([]);
    } else if (playlistId && playlists) {
      try {
        // Tìm và load playlist đã chọn
        const id = parseInt(playlistId);
        console.log("Looking for playlist with ID:", id);
        
        // Vì có thể mất đồng bộ giữa client và server, hãy tìm playlist từ server
        // mỗi khi người dùng chọn ID
        await queryClient.invalidateQueries({
          queryKey: ['/api/broadcast-programs', selectedProgram, 'playlists']
        });
        
        // Lấy lại danh sách playlist mới nhất sau khi invalidate
        await refetchPlaylists();
        
        // Tìm lại với danh sách đã được refresh
        const selectedPlaylist = playlists.find(p => p.id === id);
        console.log("Found playlist:", selectedPlaylist);
        
        if (selectedPlaylist) {
          setExistingPlaylist(selectedPlaylist);
          // Đảm bảo items là một mảng và parse về dạng PlaylistItem
          const items = Array.isArray(selectedPlaylist.items) 
            ? selectedPlaylist.items as PlaylistItem[]
            : [];
          
          // In ra ID của các audio file để debug
          console.log("Playlist items audio IDs:", items.map(item => item.audioFileId));
          console.log("Available audio file IDs:", audioFiles.map(file => file.id));
          
          console.log("Setting playlist items:", items);
          setPlaylistItems(items);
        } else {
          console.error(`⚠️ Không tìm thấy playlist với ID ${id}. Danh sách hiện có:`, 
            playlists.map(p => ({ id: p.id, date: new Date(p.createdAt).toLocaleString() })));
          toast({
            title: "Lỗi tải danh sách phát",
            description: `Không tìm thấy danh sách phát với ID ${id}. Vui lòng thử làm mới lại hoặc tạo mới.`,
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Error loading playlist:", error);
        toast({
          title: "Lỗi tải danh sách phát",
          description: "Đã xảy ra lỗi khi tải danh sách phát. Vui lòng thử lại.",
          variant: "destructive",
        });
      }
    }
  };

  // Handle save playlist
  const handleSavePlaylist = () => {
    if (!selectedProgram) return;
    
    if (playlistItems.length === 0) {
      toast({
        title: "Danh sách phát trống",
        description: "Vui lòng thêm ít nhất một file âm thanh vào danh sách phát",
        variant: "destructive",
      });
      return;
    }
    
    setShowSaveDialog(true);
  };

  // Confirm save playlist
  const confirmSavePlaylist = () => {
    if (!selectedProgram) return;
    
    console.log("existingPlaylist:", existingPlaylist);
    
    if (existingPlaylist) {
      // Cập nhật playlist hiện tại
      console.log("Updating playlist:", existingPlaylist.id);
      updatePlaylistMutation.mutate({
        id: existingPlaylist.id,
        items: playlistItems,
      });
    } else {
      // Tạo mới playlist
      console.log("Creating new playlist for program:", selectedProgram);
      createPlaylistMutation.mutate({
        broadcastProgramId: selectedProgram,
        items: playlistItems,
      });
    }
  };

  // Move playlist item up
  const moveItemUp = (index: number) => {
    if (index === 0) return;
    const newItems = [...playlistItems];
    [newItems[index - 1], newItems[index]] = [newItems[index], newItems[index - 1]];
    setPlaylistItems(newItems);
  };

  // Move playlist item down
  const moveItemDown = (index: number) => {
    if (index === playlistItems.length - 1) return;
    const newItems = [...playlistItems];
    [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
    setPlaylistItems(newItems);
  };

  // Remove playlist item
  const removeItem = (index: number) => {
    const newItems = [...playlistItems];
    newItems.splice(index, 1);
    setPlaylistItems(newItems);
  };

  // Add audio file to playlist
  const addAudioToPlaylist = (audioFile: AudioFile) => {
    // Kiểm tra audioFile và xác nhận rằng nó không undefined
    if (!audioFile || !audioFile.id) {
      console.error("Audio file is undefined or missing ID");
      toast({
        title: "Lỗi thêm file",
        description: "Không thể thêm file âm thanh này vào danh sách phát",
        variant: "destructive",
      });
      return;
    }

    // Generate a time slot (simple implementation - would need to be more sophisticated)
    let playTime = "08:00";
    if (playlistItems && playlistItems.length > 0) {
      try {
        const lastItem = playlistItems[playlistItems.length - 1];
        if (lastItem && lastItem.playTime) {
          const lastTime = lastItem.playTime;
          const lastTimeObj = parse(lastTime, "HH:mm", new Date());
          const nextTimeObj = addMinutes(lastTimeObj, 15); // 15 min after previous
          playTime = format(nextTimeObj, "HH:mm");
        }
      } catch (error) {
        console.error("Error calculating next play time:", error);
        // Fallback to default time
        playTime = "08:00";
      }
    }
    
    const newItem: PlaylistItem = {
      audioFileId: audioFile.id,
      playTime
    };
    
    setPlaylistItems(playlistItems ? [...playlistItems, newItem] : [newItem]);
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

  // Generate automatic playlist
  const handleGeneratePlaylist = () => {
    if (!selectedProgram) return;
    setShowGenerateDialog(true);
  };

  // Confirm generate playlist
  const confirmGeneratePlaylist = () => {
    if (!selectedProgram) return;
    
    const program = programs.find(p => p.id === selectedProgram);
    if (!program) return;
    
    // Get the program settings
    const settings = program.settings as any;
    const newPlaylistItems: PlaylistItem[] = [];
    
    // Start time at 8:00 AM
    let currentTime = new Date();
    currentTime.setHours(8, 0, 0, 0);
    
    // Helper function to add items for a group
    const addItemsForGroup = (group: string, groupSettings: any) => {
      if (!groupSettings?.enabled) return;
      
      // Get files for this group
      const groupFiles = audioFiles.filter(file => file.group === group);
      if (groupFiles.length === 0) return;
      
      // Get frequency, start time, end time, max plays
      const frequency = groupSettings.frequencyMinutes || 60; // in minutes
      const startTime = parse(groupSettings.startTime || "08:00", "HH:mm", new Date());
      const endTime = parse(groupSettings.endTime || "20:00", "HH:mm", new Date());
      const maxPlays = groupSettings.maxPlays || 10;
      
      // Set current time to start time if it's earlier
      if (currentTime < startTime) {
        currentTime = new Date(startTime);
      }
      
      // Add items at frequency intervals up to max plays or end time
      let playCount = 0;
      while (playCount < maxPlays && currentTime < endTime) {
        // Randomly pick a file from the group
        const randomIndex = Math.floor(Math.random() * groupFiles.length);
        const file = groupFiles[randomIndex];
        
        newPlaylistItems.push({
          audioFileId: file.id,
          playTime: format(currentTime, "HH:mm")
        });
        
        // Increment time by frequency
        currentTime = addMinutes(currentTime, frequency);
        playCount++;
      }
    };
    
    // Process each group
    if (settings.greetings) addItemsForGroup("greetings", settings.greetings);
    if (settings.promotions) addItemsForGroup("promotions", settings.promotions);
    if (settings.tips) addItemsForGroup("tips", settings.tips);
    if (settings.announcements) addItemsForGroup("announcements", settings.announcements);
    if (settings.music) addItemsForGroup("music", settings.music);
    
    // Sort by play time
    newPlaylistItems.sort((a, b) => {
      const timeA = parse(a.playTime, "HH:mm", new Date());
      const timeB = parse(b.playTime, "HH:mm", new Date());
      return timeA.getTime() - timeB.getTime();
    });
    
    setPlaylistItems(newPlaylistItems);
    setShowGenerateDialog(false);
    
    toast({
      title: "Danh sách phát đã được tạo",
      description: `Đã tạo ${newPlaylistItems.length} mục phát sóng theo thiết lập chương trình`,
    });
  };

  // Get badge color for audio group
  const getGroupBadgeClass = (group: string) => {
    switch (group) {
      case "greetings": return "bg-primary-light/20 text-primary";
      case "promotions": return "bg-orange-100 text-orange-700";
      case "tips": return "bg-success-light/20 text-success";
      case "announcements": return "bg-neutral-dark/20 text-neutral-dark";
      case "music": return "bg-purple-100 text-purple-700";
      default: return "bg-neutral-light/50 text-neutral-dark";
    }
  };

  // Format time (seconds -> MM:SS)
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const isLoading = isLoadingPrograms || isLoadingAudio || isLoadingPlaylist;
  const selectedProgramData = programs.find(p => p.id === selectedProgram);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Tạo danh sách phát</CardTitle>
            <CardDescription>
              Tạo và quản lý danh sách phát cho chương trình phát sóng
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Program Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">
                Chọn chương trình phát
              </label>
              <div className="flex space-x-2">
                <Select 
                  value={selectedProgram?.toString() || ""} 
                  onValueChange={handleProgramSelect}
                >
                  <SelectTrigger className="w-full">
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
                
                <Button 
                  variant="outline" 
                  disabled={!selectedProgram || isLoading}
                  onClick={() => refetchPlaylists()}
                >
                  <RefreshCcw className="h-4 w-4 mr-2" />
                  Làm mới
                </Button>
              </div>
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
                        <span className="text-neutral-medium">Số playlist hiện có:</span>{" "}
                        <span className="font-medium">
                          {playlists?.length || 0}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Playlist Selection */}
                {playlists && playlists.length > 0 && (
                  <div className="mb-6">
                    <label className="block text-sm font-medium mb-2">
                      Chọn playlist
                    </label>
                    <div className="flex flex-col md:flex-row md:items-center gap-3">
                      <Select 
                        onValueChange={handlePlaylistSelect}
                        defaultValue="new"
                      >
                        <SelectTrigger className="w-full md:w-1/2">
                          <SelectValue placeholder="Chọn playlist" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="new">
                            <div className="flex items-center">
                              <PlusCircle className="h-4 w-4 mr-2 text-primary" />
                              Tạo mới playlist
                            </div>
                          </SelectItem>
                          <SelectSeparator />
                          {playlists.map((playlist) => (
                            <SelectItem key={playlist.id} value={playlist.id.toString()}>
                              Danh sách phát ID: {playlist.id} - {new Date(playlist.createdAt).toLocaleString()}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      
                      <div className="flex items-center space-x-2">
                        {existingPlaylist ? (
                          <Badge variant="outline" className="bg-success-light/20 text-success">
                            <CheckCircle className="h-3 w-3 mr-1" /> Đang chỉnh sửa playlist
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-primary-light/20 text-primary">
                            <PlusCircle className="h-3 w-3 mr-1" /> Đang tạo playlist mới
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Playlist management */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Current Playlist */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-medium flex items-center">
                        <ListOrdered className="h-5 w-5 mr-2" />
                        Danh sách phát hiện tại
                      </h3>
                      <div className="flex space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={handleGeneratePlaylist}
                          disabled={isLoading}
                        >
                          <RefreshCcw className="h-4 w-4 mr-1" />
                          Tạo tự động
                        </Button>
                        <Button 
                          size="sm"
                          onClick={handleSavePlaylist}
                          disabled={isLoading}
                        >
                          <Save className="h-4 w-4 mr-1" />
                          Lưu mới
                        </Button>
                      </div>
                    </div>
                    
                    {isLoadingPlaylist ? (
                      <div className="flex justify-center items-center h-60 bg-neutral-lightest rounded-md">
                        <p className="text-neutral-medium">Đang tải...</p>
                      </div>
                    ) : !playlistItems || playlistItems.length === 0 ? (
                      <div className="flex flex-col justify-center items-center h-60 bg-neutral-lightest rounded-md">
                        <AlertTriangle className="h-8 w-8 text-neutral-medium mb-2" />
                        <p className="text-neutral-medium">Chưa có file audio nào trong danh sách phát</p>
                        <p className="text-sm text-neutral-medium mt-1">
                          Thêm file từ danh sách bên phải hoặc tạo tự động
                        </p>
                      </div>
                    ) : (
                      <div className="border rounded-md overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-16">STT</TableHead>
                              <TableHead>Thời gian</TableHead>
                              <TableHead>Tên file</TableHead>
                              <TableHead>Nhóm</TableHead>
                              <TableHead className="w-24">Thao tác</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {playlistItems.map((item, index) => {
                              const audioFile = getAudioFile(item.audioFileId);
                              if (!audioFile) return null;
                              
                              return (
                                <TableRow key={index}>
                                  <TableCell className="font-medium">{index + 1}</TableCell>
                                  <TableCell>
                                    <div className="flex items-center">
                                      <Clock className="h-4 w-4 mr-1 text-neutral-medium" />
                                      {item.playTime}
                                    </div>
                                  </TableCell>
                                  <TableCell>{audioFile.displayName}</TableCell>
                                  <TableCell>
                                    <Badge variant="outline" className={getGroupBadgeClass(audioFile.group)}>
                                      {formatGroup(audioFile.group)}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex space-x-1">
                                      <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-7 w-7"
                                        onClick={() => moveItemUp(index)}
                                        disabled={index === 0}
                                      >
                                        <ArrowUp className="h-4 w-4" />
                                      </Button>
                                      <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-7 w-7"
                                        onClick={() => moveItemDown(index)}
                                        disabled={index === playlistItems.length - 1}
                                      >
                                        <ArrowDown className="h-4 w-4" />
                                      </Button>
                                      <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-7 w-7 text-danger"
                                        onClick={() => removeItem(index)}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>
                  
                  {/* Available Audio Files */}
                  <div>
                    <h3 className="font-medium flex items-center mb-4">
                      <Music className="h-5 w-5 mr-2" />
                      File audio có sẵn
                    </h3>
                    
                    {isLoadingAudio ? (
                      <div className="flex justify-center items-center h-60 bg-neutral-lightest rounded-md">
                        <p className="text-neutral-medium">Đang tải...</p>
                      </div>
                    ) : audioFiles.length === 0 ? (
                      <div className="flex justify-center items-center h-60 bg-neutral-lightest rounded-md">
                        <p className="text-neutral-medium">Không có file audio nào</p>
                      </div>
                    ) : (
                      <div className="border rounded-md overflow-hidden">
                        <DataTable 
                          columns={[
                            {
                              header: "Tên file",
                              accessorKey: "displayName",
                              cell: ({ row }) => {
                                const file = row.original as AudioFile;
                                return (
                                  <div className="text-sm font-medium">
                                    {file.displayName}
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
                              header: "",
                              id: "actions",
                              cell: ({ row }) => {
                                const file = row.original as AudioFile;
                                return (
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => addAudioToPlaylist(file)}
                                  >
                                    Thêm
                                  </Button>
                                );
                              },
                            },
                          ]}
                          data={audioFiles}
                          isLoading={isLoadingAudio}
                        />
                      </div>
                    )}
                  </div>
                </div>
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
      
      {/* Save Confirmation Dialog */}
      <ConfirmDialog
        open={showSaveDialog}
        onOpenChange={setShowSaveDialog}
        title={existingPlaylist ? "Cập nhật danh sách phát" : "Tạo danh sách phát mới"}
        description={existingPlaylist 
          ? "Bạn có chắc chắn muốn cập nhật danh sách phát này không?" 
          : "Bạn có chắc chắn muốn tạo danh sách phát mới cho chương trình này không? Danh sách phát cũ vẫn sẽ được giữ lại."
        }
        onConfirm={confirmSavePlaylist}
        isLoading={createPlaylistMutation.isPending || updatePlaylistMutation.isPending}
      />
      
      {/* Generate Playlist Confirmation Dialog */}
      <ConfirmDialog
        open={showGenerateDialog}
        onOpenChange={setShowGenerateDialog}
        title="Tạo danh sách phát tự động"
        description="Hệ thống sẽ tạo danh sách phát dựa trên thiết lập tần suất và khung giờ của chương trình. Danh sách phát hiện tại sẽ bị xóa. Bạn có chắc chắn muốn tiếp tục?"
        onConfirm={confirmGeneratePlaylist}
      />
    </DashboardLayout>
  );
}
