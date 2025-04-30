import { useState, useRef, useEffect } from "react";
import { Howl } from "howler";
import { Play, Pause, Volume2, VolumeX, SkipForward, SkipBack } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface AudioPlayerProps {
  src: string;
  title?: string;
  onEnded?: () => void;
  onNext?: () => void;
  onPrevious?: () => void;
  showControls?: boolean;
}

export default function AudioPlayer({
  src,
  title,
  onEnded,
  onNext,
  onPrevious,
  showControls = true,
}: AudioPlayerProps) {
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [muted, setMuted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  
  const soundRef = useRef<Howl | null>(null);
  const requestRef = useRef<number | null>(null);
  
  // Initialize Howler sound
  useEffect(() => {
    setLoading(true);
    setError(false);
    
    if (soundRef.current) {
      soundRef.current.stop();
      soundRef.current.unload();
    }
    
    soundRef.current = new Howl({
      src: [src],
      html5: true,
      volume: volume,
      format: ['mp3', 'wav', 'ogg'],
      xhr: {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache',
        },
        withCredentials: true,
      },
      onload: () => {
        setDuration(soundRef.current?.duration() || 0);
        setLoading(false);
        console.log("Audio loaded successfully:", src);
      },
      onend: () => {
        setPlaying(false);
        if (onEnded) onEnded();
      },
      onloaderror: (id, error) => {
        console.error("Error loading audio:", error);
        setError(true);
        setLoading(false);
      },
      onplayerror: (id, error) => {
        console.error("Error playing audio:", error);
        setError(true);
      },
    });
    
    return () => {
      if (soundRef.current) {
        soundRef.current.stop();
        soundRef.current.unload();
      }
      
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [src, onEnded]);
  
  // Update volume
  useEffect(() => {
    if (soundRef.current) {
      soundRef.current.volume(muted ? 0 : volume);
    }
  }, [volume, muted]);
  
  // Animation frame for time update
  const animate = () => {
    if (soundRef.current) {
      if (soundRef.current.playing()) {
        setCurrentTime(soundRef.current.seek() || 0);
        requestRef.current = requestAnimationFrame(animate);
      }
    }
  };
  
  // Handle play/pause
  const togglePlayPause = () => {
    if (!soundRef.current || error) return;
    
    if (playing) {
      soundRef.current.pause();
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
        requestRef.current = null;
      }
    } else {
      soundRef.current.play();
      // Khởi động animation frame ngay lập tức
      animate();
    }
    
    setPlaying(!playing);
  };
  
  // Handle seek
  const handleSeek = (value: number[]) => {
    if (!soundRef.current) return;
    
    const newPosition = value[0];
    soundRef.current.seek(newPosition);
    setCurrentTime(newPosition);
  };
  
  // Handle volume change
  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0];
    setVolume(newVolume);
    setMuted(newVolume === 0);
  };
  
  // Toggle mute
  const toggleMute = () => {
    setMuted(!muted);
  };
  
  // Format time (seconds -> MM:SS)
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <Card className={cn("w-full", error && "border-danger")}>
      <CardContent className="p-4">
        {error ? (
          <div className="text-center text-danger py-4">
            Không thể tải file âm thanh. Vui lòng kiểm tra lại.
          </div>
        ) : (
          <>
            {title && (
              <div className="mb-3 truncate font-medium">
                {loading ? "Đang tải..." : title}
              </div>
            )}
            
            <div className="flex items-center justify-center space-x-4 mb-4">
              {showControls && onPrevious && (
                <Button variant="ghost" size="icon" onClick={onPrevious} disabled={loading}>
                  <SkipBack className="h-5 w-5" />
                </Button>
              )}
              
              <Button 
                onClick={togglePlayPause} 
                size="icon" 
                variant="outline"
                className="h-12 w-12 rounded-full"
                disabled={loading}
              >
                {playing ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
              </Button>
              
              {showControls && onNext && (
                <Button variant="ghost" size="icon" onClick={onNext} disabled={loading}>
                  <SkipForward className="h-5 w-5" />
                </Button>
              )}
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <span className="text-xs w-10 text-right">{formatTime(currentTime)}</span>
                <Slider
                  value={[currentTime]}
                  min={0}
                  max={duration}
                  step={0.1}
                  onValueChange={handleSeek}
                  disabled={loading}
                  className="flex-1"
                />
                <span className="text-xs w-10">{formatTime(duration)}</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <Button variant="ghost" size="icon" onClick={toggleMute} className="h-8 w-8">
                  {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </Button>
                <Slider
                  value={[muted ? 0 : volume]}
                  min={0}
                  max={1}
                  step={0.01}
                  onValueChange={handleVolumeChange}
                  className="w-24"
                />
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
