import React, { useState } from 'react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { Button } from '@/components/ui/button';
import { Loader2 } from "lucide-react";
import { toast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';

type MissingAudioAlertProps = {
  missingAudioIds: number[];
  playlistId: number | null;
  onComplete?: () => void;
}

/**
 * Component to display alerts and actions for missing audio files
 */
export default function MissingAudioAlert({ 
  missingAudioIds, 
  playlistId,
  onComplete
}: MissingAudioAlertProps) {
  const [isCleaning, setIsCleaning] = useState(false);
  
  if (missingAudioIds.length === 0) return null;
  
  // Function to normalize the playlist (remove missing files)
  const handleCleanPlaylist = async () => {
    if (!playlistId) {
      toast({
        title: "Không thể chuẩn hóa",
        description: "Không xác định được ID của danh sách phát",
        variant: "destructive",
      });
      return;
    }
    
    // Show loading
    setIsCleaning(true);
    
    try {
      console.log(`Đang chuẩn hóa playlist ID ${playlistId}. Xóa ${missingAudioIds.length} file âm thanh bị thiếu.`);
      
      const response = await fetch(`/api/playlists/${playlistId}/clean`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log("Kết quả chuẩn hóa:", data);
      
      // Show success message
      toast({
        title: "Đã chuẩn hóa danh sách phát",
        description: `Đã loại bỏ ${data.removedItems || 0} file âm thanh không hợp lệ khỏi danh sách phát.`,
        variant: "default"
      });
      
      // Reload data
      queryClient.invalidateQueries({ queryKey: ['/api/playlists', playlistId] });
      queryClient.invalidateQueries({ queryKey: ['/api/audio-files'] });
      
      // Call the completion callback if provided
      if (onComplete) {
        onComplete();
      }
    } catch (error) {
      console.error("Lỗi khi chuẩn hóa playlist:", error);
      
      toast({
        title: "Lỗi chuẩn hóa danh sách phát",
        description: error instanceof Error ? error.message : "Lỗi không xác định",
        variant: "destructive",
      });
    } finally {
      setIsCleaning(false);
    }
  };
  
  return (
    <Alert className="mb-4 bg-destructive-light/15 border-destructive/20">
      <AlertTriangle className="h-5 w-5 text-destructive" />
      <AlertDescription className="flex flex-col gap-2">
        <div className="ml-2">
          <strong className="font-medium">Cảnh báo:</strong> Có {missingAudioIds.length} file âm thanh 
          trong danh sách phát không tồn tại hoặc đã bị xóa 
          (ID: {missingAudioIds.join(', ')}). 
        </div>
        
        {playlistId && (
          <div className="ml-2 mt-2">
            <Button 
              variant="destructive" 
              size="sm"
              onClick={handleCleanPlaylist}
              disabled={isCleaning}
            >
              {isCleaning ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang xử lý...
                </>
              ) : (
                "Chuẩn hóa danh sách phát"
              )}
            </Button>
            <span className="ml-2 text-xs text-muted-foreground">
              (Xóa các file âm thanh không tồn tại khỏi danh sách phát)
            </span>
          </div>
        )}
      </AlertDescription>
    </Alert>
  );
}