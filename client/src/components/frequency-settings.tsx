import { useState } from "react";
import { GroupFrequencySettings } from "@shared/schema";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface FrequencySettingsProps {
  title: string;
  icon: React.ReactNode;
  settings: GroupFrequencySettings;
  onChange: (settings: GroupFrequencySettings) => void;
  defaultExpanded?: boolean;
}

export default function FrequencySettings({
  title,
  icon,
  settings,
  onChange,
  defaultExpanded = true,
}: FrequencySettingsProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  
  const handleEnabledChange = (enabled: boolean) => {
    onChange({
      ...settings,
      enabled,
    });
  };
  
  const handleFrequencyChange = (value: string) => {
    onChange({
      ...settings,
      frequencyMinutes: parseInt(value) || 30,
    });
  };
  
  const handleMaxPlaysChange = (value: string) => {
    onChange({
      ...settings,
      maxPlays: parseInt(value) || 10,
    });
  };
  
  const handleStartTimeChange = (value: string) => {
    onChange({
      ...settings,
      startTime: value,
    });
  };
  
  const handleEndTimeChange = (value: string) => {
    onChange({
      ...settings,
      endTime: value,
    });
  };

  return (
    <div className="p-4 border border-neutral-light rounded-md">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          {icon}
          <h4 className="font-medium ml-2">{title}</h4>
        </div>
        <div className="flex items-center">
          <Label className="text-sm text-neutral-medium mr-2">Bật/Tắt</Label>
          <Switch 
            checked={settings.enabled} 
            onCheckedChange={handleEnabledChange}
          />
          <button 
            className="ml-2 text-neutral-medium" 
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
        </div>
      </div>
      
      <div className={cn(expanded ? "block" : "hidden")}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="block text-sm font-medium text-neutral-darkest mb-1">
              Tần suất phát (phút/lần)
            </Label>
            <Input 
              type="number" 
              min="5" 
              max="120" 
              value={settings.frequencyMinutes}
              onChange={(e) => handleFrequencyChange(e.target.value)} 
              disabled={!settings.enabled}
            />
          </div>
          
          <div>
            <Label className="block text-sm font-medium text-neutral-darkest mb-1">
              Số lần phát tối đa
            </Label>
            <Input 
              type="number" 
              min="1" 
              max="50" 
              value={settings.maxPlays}
              onChange={(e) => handleMaxPlaysChange(e.target.value)}
              disabled={!settings.enabled}
            />
          </div>
        </div>
        
        <div className="mt-4">
          <Label className="block text-sm font-medium text-neutral-darkest mb-1">
            Khung giờ phát
          </Label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <Label className="block text-xs text-neutral-medium mb-1">
                Bắt đầu
              </Label>
              <Input 
                type="time"
                value={settings.startTime}
                onChange={(e) => handleStartTimeChange(e.target.value)}
                disabled={!settings.enabled}
              />
            </div>
            <div>
              <Label className="block text-xs text-neutral-medium mb-1">
                Kết thúc
              </Label>
              <Input 
                type="time" 
                value={settings.endTime}
                onChange={(e) => handleEndTimeChange(e.target.value)}
                disabled={!settings.enabled}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
