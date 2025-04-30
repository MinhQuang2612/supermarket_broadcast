import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { BroadcastProgram, AudioFile, PlaylistItem } from "@shared/schema";
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
  Clock 
} from "lucide-react";
import { format } from "date-fns";

export default function PlaylistPreview() {
  const [selectedProgram, setSelectedProgram] = useState<number | null>(null);
  const [currentAudioIndex, setCurrentAudioIndex] = useState<number>(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playlistItems, setPlaylistItems] = useState<PlaylistItem[]>([]);

  // Fetch broadcast programs
  const { data: programs = [], isLoading: isLoadingPrograms } = useQuery<BroadcastProgram[]>({
    queryKey: ['/api/broadcast-programs'],
  });

  // Fetch audio files
  const { data: audioFiles = [], isLoading: isLoadingAudio } = useQuery<AudioFile[]>({
    queryKey: ['/api/audio-files'],
  });

  // Fetch playlist for selected program
  const { 
    data: existingPlaylist, 
    isLoading: isLoadingPlaylist 
  } = useQuery({
    queryKey: ['/api/broadcast-programs', selectedProgram, 'playlist'],
    enabled: !!selectedProgram,
  });

  // Load playlist items from existing playlist
  useEffect(() => {
    if (existingPlaylist) {
      const items = existingPlaylist.items as PlaylistItem[];
      // Sort by play time
      const sortedItems = [...items].sort((a, b) => {
        const timeA = a.playTime.split(':').map(Number);
        const timeB = b.playTime.split(':').map(Number);
        return (timeA[0] * 60 + timeA[1]) - (timeB[0] * 60 + timeB[1]);
      });
      setPlaylistItems(sortedItems);
      setCurrentAudioIndex(-1);
      setIsPlaying(false);
    } else {
      setPlaylistItems([]);
      setCurrentAudioIndex(-1);
      setIsPlaying(false);
    }
  }, [existingPlaylist]);

  // Handle program selection
  const handleProgramSelect = (programId: string) => {
    setSelectedProgram(parseInt(programId));
    setCurrentAudioIndex(-1);
    setIsPlaying(false);
  };

  // Start playback
  const handleStartPlayback = () => {
    if (playlistItems.length === 0) return;
    setCurrentAudioIndex(0);
    setIsPlaying(true);
  };

  // Handle audio ended
  const handleAudioEnded = () => {
    if (currentAudioIndex < playlistItems.length - 1) {
      setCurrentAudioIndex(currentAudioIndex + 1);
    } else {
      // Playlist finished
      setIsPlaying(false);
      setCurrentAudioIndex(-1);
    }
  };

  // Skip to next track
  const handleSkipNext = () => {
    if (currentAudioIndex < playlistItems.length - 1) {
      setCurrentAudioIndex(currentAudioIndex + 1);
    }
  };

  // Skip to previous track
  const handleSkipPrevious = () => {
    if (currentAudioIndex > 0) {
      setCurrentAudioIndex(currentAudioIndex - 1);
    }
  };

  // Play specific track
  const handlePlayTrack = (index: number) => {
    setCurrentAudioIndex(index);
    setIsPlaying(true);
  };

  // Get audio file by ID
  const getAudioFile = (id: number) => {
    return audioFiles.find(file => file.id === id);
  };

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
            <CardTitle>Nghe thử chương trình</CardTitle>
            <CardDescription>
              Nghe thử danh sách phát trước khi phát sóng
            </CardDescription>
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
                
                {existingPlaylist ? (
                  <>
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
                                Nhấn nút phát để bắt đầu nghe thử danh sách phát
                              </p>
                              <Button 
                                onClick={handleStartPlayback}
                                disabled={playlistItems.length === 0 || isPlaying}
                                className="mx-auto"
                              >
                                <Play className="h-4 w-4 mr-2" />
                                Bắt đầu phát
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="lg:col-span-2">
                        <div className="bg-white p-6 rounded-md shadow-md h-full">
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="font-medium">Tiến độ phát</h3>
                            <span className="text-sm text-neutral-medium">
                              {currentAudioIndex + 1 > 0 ? currentAudioIndex + 1 : 0}/{playlistItems.length} files
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
                                  if (!audioFile) return null;
                                  
                                  const isActive = index === currentAudioIndex;
                                  
                                  return (
                                    <TableRow 
                                      key={index}
                                      className={isActive ? "bg-primary/5" : undefined}
                                    >
                                      <TableCell className="font-medium">
                                        {index + 1}
                                      </TableCell>
                                      <TableCell className={isActive ? "font-medium" : ""}>
                                        {audioFile.displayName}
                                      </TableCell>
                                      <TableCell>
                                        <div className="flex items-center">
                                          <Clock className="h-4 w-4 mr-1 text-neutral-medium" />
                                          {item.playTime}
                                        </div>
                                      </TableCell>
                                      <TableCell>
                                        <Badge 
                                          variant="outline" 
                                          className={getGroupBadgeClass(audioFile.group)}
                                        >
                                          {formatGroup(audioFile.group)}
                                        </Badge>
                                      </TableCell>
                                      <TableCell>{formatTime(audioFile.duration)}</TableCell>
                                      <TableCell>
                                        <Button 
                                          variant="ghost" 
                                          size="icon" 
                                          className="h-8 w-8" 
                                          onClick={() => handlePlayTrack(index)}
                                        >
                                          <Play className="h-4 w-4" />
                                        </Button>
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
                            <p className="text-2xl font-bold">{playlistItems.length}</p>
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
    </DashboardLayout>
  );
}
