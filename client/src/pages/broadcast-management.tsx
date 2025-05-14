import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/layout/dashboard-layout";
import DataTable from "@/components/data-table";
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
import { Edit, Trash2, Search } from "lucide-react";

const formSchema = z.object({
  name: z.string().min(1, { message: "Tên chương trình không được để trống" }),
  dates: z.array(z.string()).min(1, { message: "Phải có ít nhất 1 ngày phát sóng" }),
});

type BroadcastFormValues = z.infer<typeof formSchema>;

export default function BroadcastManagement() {
  const { toast } = useToast();
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState<any | null>(null);
  const [pendingFormValues, setPendingFormValues] = useState<BroadcastFormValues | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Fetch broadcast programs with pagination
  const { data, isLoading } = useQuery({
    queryKey: ['/api/broadcast-programs', page, pageSize, sortKey, sortDirection, searchTerm],
    queryFn: async ({ queryKey }) => {
      const [endpoint, pageNum, pageSizeNum, sort, direction, search] = queryKey;
      let url = `${endpoint}?page=${pageNum}&pageSize=${pageSizeNum}`;
      if (sort && direction) url += `&sortKey=${sort}&sortDirection=${direction}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch broadcast programs');
      return res.json();
    },
  });

  // Lấy danh sách chương trình phát, hỗ trợ cả trường hợp backend trả về array hoặc object
  const programs = Array.isArray(data) ? data : (data?.programs || []);

  useEffect(() => {
    if (data?.pagination) {
      setTotalItems(data.pagination.total);
      setTotalPages(data.pagination.totalPages);
    }
  }, [data]);

  const form = useForm<BroadcastFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      dates: [],
    },
  });

  // Sort handler
  const handleSortChange = (key: string, direction: 'asc' | 'desc' | null) => {
    let newDirection: 'asc' | 'desc';
    if (sortKey === key) {
      newDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      newDirection = 'asc';
    }
    setSortKey(key);
    setSortDirection(newDirection);
  };

  useEffect(() => {
    setPage(1);
  }, [searchTerm]);

  // Edit mutation
  const updateProgramMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: BroadcastFormValues }) => {
      const res = await apiRequest("PUT", `/api/broadcast-programs/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/broadcast-programs'] });
      setShowEditDialog(false);
      toast({ title: "Thành công", description: "Chương trình đã được cập nhật" });
    },
    onError: (error: Error) => {
      toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    },
  });

  // Delete mutation
  const deleteProgramMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/broadcast-programs/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/broadcast-programs'] });
      setShowDeleteDialog(false);
      toast({ title: "Thành công", description: "Đã xoá chương trình phát" });
    },
    onError: (error: Error) => {
      toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    },
  });

  // Open edit dialog
  const handleEdit = (program: any) => {
    setSelectedProgram(program);
    form.reset({
      name: program.name,
      dates: program.dates || [],
    });
    setShowEditDialog(true);
  };

  // Open delete dialog
  const handleDelete = (program: any) => {
    setSelectedProgram(program);
    setShowDeleteDialog(true);
  };

  // Confirm edit
  const handleConfirmedEdit = (values: BroadcastFormValues) => {
    if (!selectedProgram) return;
    setPendingFormValues(values);
    updateProgramMutation.mutate({ id: selectedProgram.id, data: values });
  };

  // Confirm delete
  const confirmDelete = () => {
    if (selectedProgram) {
      deleteProgramMutation.mutate(selectedProgram.id);
    }
  };

  return (
    <DashboardLayout>
      <Card>
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-2 sm:space-y-0">
          <CardTitle>Quản lý chương trình phát</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Search Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 space-y-3 sm:space-y-0">
            <div className="relative w-full sm:w-auto">
              <Input
                type="text"
                placeholder="Tìm kiếm chương trình phát..."
                className="pl-9 w-full sm:w-64"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-medium" />
            </div>
          </div>

          {/* Programs Table */}
          <DataTable
            columns={[
              {
                header: "Tên chương trình",
                accessorKey: "name",
                sortable: true,
                cell: ({ row }) => (
                  <div className="text-sm font-medium text-neutral-darkest">
                    {row.getValue("name")}
                  </div>
                ),
              },
              {
                header: "Ngày phát sóng",
                accessorKey: "dates",
                cell: ({ row }) => {
                  const dates = row.getValue("dates") as string[];
                  if (!dates) return "—";
                  return (
                    <div className="text-sm text-neutral-dark max-w-xs" title={dates.join(", ") || ""}>
                      {dates.map(dateStr => {
                        const d = new Date(dateStr);
                        return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString();
                      }).join(", ")}
                    </div>
                  );
                },
              },
              {
                header: "Tác vụ",
                id: "actions",
                cell: ({ row }) => {
                  const program = row.original;
                  return (
                    <div className="flex space-x-2">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(program)}>
                        <Edit className="h-4 w-4 text-primary" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(program)}>
                        <Trash2 className="h-4 w-4 text-danger" />
                      </Button>
                    </div>
                  );
                },
              },
            ]}
            data={programs}
            isLoading={isLoading}
            serverSideSorting={{
              sortKey,
              sortDirection,
              onSortChange: handleSortChange
            }}
            serverSidePagination={{
              totalItems,
              currentPage: page,
              onPageChange: (newPage) => setPage(newPage)
            }}
            pageSize={pageSize}
          />
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-[650px]">
          <DialogHeader>
            <DialogTitle>Chỉnh sửa chương trình phát</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleConfirmedEdit)}>
              <div className="mb-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tên chương trình</FormLabel>
                      <FormControl>
                        <Input placeholder="Nhập tên chương trình" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="space-y-2 mb-4">
                <h3 className="text-sm font-medium">Thông tin chương trình</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="dates"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ngày phát sóng (cách nhau bởi dấu phẩy)</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="VD: 2025-05-13,2025-05-14"
                            value={field.value.join(",")}
                            onChange={e => field.onChange(e.target.value.split(",").map(s => s.trim()).filter(Boolean))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setShowEditDialog(false)}>
                  Hủy
                </Button>
                <Button type="submit" disabled={updateProgramMutation.isPending}>
                  Cập nhật
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
        description={`Bạn có chắc chắn muốn xóa chương trình phát "${selectedProgram?.name}"? Hành động này không thể hoàn tác.`}
        onConfirm={confirmDelete}
        confirmText="Xóa"
        isLoading={deleteProgramMutation.isPending}
        variant="destructive"
      />
    </DashboardLayout>
  );
}