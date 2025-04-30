import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { 
  BroadcastProgram, 
  GroupFrequencySettings, 
  BroadcastProgramSettings 
} from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/layout/dashboard-layout";
import BroadcastCalendar from "@/components/broadcast-calendar";
import FrequencySettings from "@/components/frequency-settings";
import ConfirmDialog from "@/components/confirm-dialog";
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { InfoIcon, Save, Circle, Star, BellRing, AlertTriangle } from "lucide-react";
import { format } from "date-fns";

// Default frequency settings
const defaultFrequencySettings: GroupFrequencySettings = {
  enabled: false,
  frequencyMinutes: 60,
  maxPlays: 10,
  startTime: "08:00",
  endTime: "20:00",
};

// Default broadcast program settings
const defaultProgramSettings: BroadcastProgramSettings = {
  greetings: { ...defaultFrequencySettings, enabled: true },
  promotions: { ...defaultFrequencySettings, enabled: true, frequencyMinutes: 30, maxPlays: 20, startTime: "10:00", endTime: "21:00" },
  tips: { ...defaultFrequencySettings },
  announcements: { ...defaultFrequencySettings },
};

// Form schema
const formSchema = z.object({
  name: z.string().min(1, "Tên chương trình không được để trống"),
  date: z.string(),
  settings: z.any(),
});

type FormValues = z.infer<typeof formSchema>;

export default function BroadcastManagement() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [programSettings, setProgramSettings] = useState<BroadcastProgramSettings>(defaultProgramSettings);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState<BroadcastProgram | null>(null);

  // Fetch broadcast programs
  const { data: broadcastPrograms = [], isLoading } = useQuery<BroadcastProgram[]>({
    queryKey: ['/api/broadcast-programs'],
  });

  // Form for saving broadcast program
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: `Chương trình ngày ${format(selectedDate, "dd/MM/yyyy")}`,
      date: format(selectedDate, "yyyy-MM-dd"),
      settings: programSettings,
    },
  });

  // Create broadcast program mutation
  const createProgramMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/broadcast-programs", {
        ...data,
        date: new Date(data.date),
        createdBy: user?.id,
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/broadcast-programs'] });
      setShowSaveDialog(false);
      toast({
        title: "Lưu thành công",
        description: "Chương trình phát đã được lưu",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Lưu thất bại",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update broadcast program mutation
  const updateProgramMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await apiRequest("PUT", `/api/broadcast-programs/${id}`, {
        ...data,
        date: new Date(data.date),
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/broadcast-programs'] });
      setShowSaveDialog(false);
      toast({
        title: "Cập nhật thành công",
        description: "Chương trình phát đã được cập nhật",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Cập nhật thất bại",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete broadcast program mutation
  const deleteProgramMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/broadcast-programs/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/broadcast-programs'] });
      setShowDeleteDialog(false);
      toast({
        title: "Xóa thành công",
        description: "Chương trình phát đã được xóa",
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

  // Handle date selection in calendar
  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    
    // Check if there's a program for this date
    const program = broadcastPrograms.find(p => {
      const programDate = new Date(p.date);
      return (
        programDate.getDate() === date.getDate() &&
        programDate.getMonth() === date.getMonth() &&
        programDate.getFullYear() === date.getFullYear()
      );
    });
    
    if (program) {
      setSelectedProgram(program);
      setProgramSettings(program.settings as BroadcastProgramSettings);
      form.reset({
        name: program.name,
        date: format(date, "yyyy-MM-dd"),
        settings: program.settings,
      });
    } else {
      setSelectedProgram(null);
      setProgramSettings(defaultProgramSettings);
      form.reset({
        name: `Chương trình ngày ${format(date, "dd/MM/yyyy")}`,
        date: format(date, "yyyy-MM-dd"),
        settings: defaultProgramSettings,
      });
    }
  };

  // Handle frequency settings change
  const handleFrequencyChange = (group: keyof BroadcastProgramSettings, settings: GroupFrequencySettings) => {
    setProgramSettings(prev => ({
      ...prev,
      [group]: settings,
    }));
  };

  // Open save dialog
  const handleSave = () => {
    form.setValue("settings", programSettings);
    setShowSaveDialog(true);
  };

  // Handle form submission
  const onSubmit = (values: FormValues) => {
    if (selectedProgram) {
      // Update existing program
      updateProgramMutation.mutate({ 
        id: selectedProgram.id, 
        data: {
          ...values,
          settings: programSettings,
        }
      });
    } else {
      // Create new program
      createProgramMutation.mutate({
        ...values,
        settings: programSettings,
      });
    }
  };

  // Open delete dialog
  const handleDelete = () => {
    if (selectedProgram) {
      setShowDeleteDialog(true);
    }
  };

  // Confirm delete
  const confirmDelete = () => {
    if (selectedProgram) {
      deleteProgramMutation.mutate(selectedProgram.id);
      setSelectedProgram(null);
      setProgramSettings(defaultProgramSettings);
      form.reset({
        name: `Chương trình ngày ${format(selectedDate, "dd/MM/yyyy")}`,
        date: format(selectedDate, "yyyy-MM-dd"),
        settings: defaultProgramSettings,
      });
    }
  };

  // Get dates with programs for calendar
  const datesWithPrograms = broadcastPrograms.map(program => new Date(program.date));

  return (
    <DashboardLayout>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Lịch phát sóng</CardTitle>
            </CardHeader>
            <CardContent>
              <BroadcastCalendar
                selectedDate={selectedDate}
                onSelectDate={handleDateSelect}
                broadcastDates={datesWithPrograms}
              />
            </CardContent>
          </Card>
        </div>
        
        {/* Broadcast Program Setup */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>
                Thiết lập chương trình phát - {format(selectedDate, "dd/MM/yyyy")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-6">
                <Alert variant="info" className="bg-primary-light/10 border-l-4 border-primary text-neutral-dark rounded-md">
                  <AlertDescription>
                    Thiết lập tần suất và khung giờ phát cho từng nhóm file audio. Hệ thống sẽ tự động tạo danh sách phát dựa trên thiết lập này.
                  </AlertDescription>
                </Alert>
              </div>
              
              <div className="space-y-6">
                {/* Greetings Group */}
                <FrequencySettings
                  title="Nhóm Lời chào"
                  icon={<Circle className="w-3 h-3 rounded-full text-primary" />}
                  settings={programSettings.greetings || defaultFrequencySettings}
                  onChange={(settings) => handleFrequencyChange("greetings", settings)}
                  defaultExpanded={true}
                />
                
                {/* Promotions Group */}
                <FrequencySettings
                  title="Nhóm Khuyến mãi"
                  icon={<Star className="w-3 h-3 rounded-full text-accent" />}
                  settings={programSettings.promotions || defaultFrequencySettings}
                  onChange={(settings) => handleFrequencyChange("promotions", settings)}
                  defaultExpanded={true}
                />
                
                {/* Tips Group */}
                <FrequencySettings
                  title="Nhóm Mẹo vặt"
                  icon={<Circle className="w-3 h-3 rounded-full text-success" />}
                  settings={programSettings.tips || defaultFrequencySettings}
                  onChange={(settings) => handleFrequencyChange("tips", settings)}
                  defaultExpanded={false}
                />
                
                {/* Announcements Group */}
                <FrequencySettings
                  title="Nhóm Thông báo"
                  icon={<BellRing className="w-3 h-3 rounded-full text-neutral-dark" />}
                  settings={programSettings.announcements || defaultFrequencySettings}
                  onChange={(settings) => handleFrequencyChange("announcements", settings)}
                  defaultExpanded={false}
                />
              </div>
              
              {/* Validate settings */}
              {Object.values(programSettings).every(group => !group.enabled) && (
                <Alert variant="destructive" className="mt-6">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Cảnh báo: Không có nhóm nào được bật. Vui lòng kích hoạt ít nhất một nhóm.
                  </AlertDescription>
                </Alert>
              )}
              
              <div className="mt-6 flex justify-end space-x-3">
                {selectedProgram && (
                  <Button
                    variant="outline"
                    className="border-danger text-danger hover:bg-danger/10"
                    onClick={handleDelete}
                  >
                    Xóa chương trình
                  </Button>
                )}
                <Button onClick={handleSave}>
                  <Save className="mr-2 h-4 w-4" />
                  Lưu thiết lập
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Save Confirmation Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedProgram ? "Cập nhật chương trình phát" : "Lưu chương trình phát"}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tên chương trình</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ngày phát</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowSaveDialog(false)}
                >
                  Hủy
                </Button>
                <Button 
                  type="submit"
                  disabled={createProgramMutation.isPending || updateProgramMutation.isPending}
                >
                  {selectedProgram ? "Cập nhật" : "Lưu"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Xóa chương trình phát"
        description={`Bạn có chắc chắn muốn xóa chương trình "${selectedProgram?.name}"? Hành động này không thể hoàn tác.`}
        onConfirm={confirmDelete}
        confirmText="Xóa"
        isLoading={deleteProgramMutation.isPending}
        variant="destructive"
      />
    </DashboardLayout>
  );
}
