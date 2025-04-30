import { useState } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isToday } from "date-fns";
import { vi } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface BroadcastCalendarProps {
  onSelectDate: (date: Date) => void;
  selectedDate: Date;
  broadcastDates?: Date[];
  scheduledDates?: Date[];
}

export default function BroadcastCalendar({ 
  onSelectDate, 
  selectedDate, 
  broadcastDates = [], 
  scheduledDates = [] 
}: BroadcastCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  // Go to previous month
  const handlePreviousMonth = () => {
    setCurrentMonth(prevMonth => subMonths(prevMonth, 1));
  };
  
  // Go to next month
  const handleNextMonth = () => {
    setCurrentMonth(prevMonth => addMonths(prevMonth, 1));
  };
  
  // Get days of current month view
  const getDaysInMonth = () => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  };
  
  // Get weekday names
  const weekDays = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
  
  // Get days
  const days = getDaysInMonth();
  
  // Check if day has broadcasts
  const hasBroadcast = (day: Date) => {
    return broadcastDates.some(date => isSameDay(date, day));
  };
  
  // Check if day is scheduled
  const isScheduled = (day: Date) => {
    return scheduledDates.some(date => isSameDay(date, day));
  };

  return (
    <div className="w-full">
      <div className="text-center mb-6">
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" size="icon" onClick={handlePreviousMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h4 className="text-lg font-medium">
            {format(currentMonth, "MMMM yyyy", { locale: vi })}
          </h4>
          <Button variant="ghost" size="icon" onClick={handleNextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="grid grid-cols-7 gap-2 mb-2">
          {weekDays.map((day) => (
            <div key={day} className="text-sm font-medium text-neutral-medium">
              {day}
            </div>
          ))}
        </div>
        
        <div className="grid grid-cols-7 gap-2">
          {/* Fill in days from previous month to start from correct weekday */}
          {Array.from({ length: days[0].getDay() }, (_, i) => (
            <div key={`prev-${i}`} className="h-10"></div>
          ))}
          
          {/* Current month days */}
          {days.map((day) => {
            const isSelected = isSameDay(day, selectedDate);
            const hasBroadcastProgram = hasBroadcast(day);
            const hasSchedule = isScheduled(day);
            const dayIsToday = isToday(day);
            
            return (
              <div
                key={day.toISOString()}
                className={cn(
                  "h-10 flex items-center justify-center rounded-md cursor-pointer relative",
                  isSelected 
                    ? "bg-primary text-white" 
                    : dayIsToday
                    ? "bg-neutral-light/50"
                    : "hover:bg-neutral-lightest",
                  !isSameMonth(day, currentMonth) && "text-neutral-medium"
                )}
                onClick={() => onSelectDate(day)}
              >
                <span>{format(day, "d")}</span>
                
                {(hasBroadcastProgram || hasSchedule) && !isSelected && (
                  <span 
                    className={cn(
                      "absolute bottom-1 w-1.5 h-1.5 rounded-full", 
                      hasBroadcastProgram 
                        ? "bg-success"
                        : hasSchedule 
                        ? "bg-accent"
                        : ""
                    )}
                  ></span>
                )}
              </div>
            );
          })}
        </div>
      </div>
      
      <div className="pt-4 border-t border-neutral-light">
        <h4 className="text-sm font-medium mb-3">Chú thích</h4>
        <div className="space-y-2">
          <div className="flex items-center">
            <span className="w-3 h-3 rounded-full bg-primary mr-2"></span>
            <span className="text-sm text-neutral-dark">Ngày được chọn</span>
          </div>
          <div className="flex items-center">
            <span className="w-3 h-3 rounded-full bg-success mr-2"></span>
            <span className="text-sm text-neutral-dark">Có chương trình phát</span>
          </div>
          <div className="flex items-center">
            <span className="w-3 h-3 rounded-full bg-accent mr-2"></span>
            <span className="text-sm text-neutral-dark">Đã lên lịch</span>
          </div>
        </div>
      </div>
    </div>
  );
}
