import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent } from "@/components/ui/card";
import StatsCard from "@/components/stats-card";
import ActivityLog from "@/components/activity-log";
import { Building2, Music, Radio, Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface Stats {
  totalSupermarkets: number;
  totalAudioFiles: number;
  totalBroadcasts: number;
  totalUsers: number;
  recentActivities: Array<{
    id: number;
    userId: number;
    action: string;
    details: string;
    timestamp: string;
    user?: {
      fullName: string;
      username: string;
    };
  }>;
}

export default function Dashboard() {
  const { data: stats, isLoading } = useQuery<Stats>({
    queryKey: ['/api/stats'],
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Stats Cards */}
          {isLoading ? (
            <>
              <Card>
                <CardContent className="p-6">
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            </>
          ) : (
            <>
              <StatsCard 
                title="Tổng siêu thị"
                value={stats?.totalSupermarkets || 0}
                trend="+3% từ tháng trước"
                trendType="up"
                icon={<Building2 className="h-full w-full text-primary" />}
                iconBgColor="bg-primary-light bg-opacity-20"
                iconColor="text-primary"
              />
              
              <StatsCard 
                title="File audio"
                value={stats?.totalAudioFiles || 0}
                trend="+12% từ tháng trước"
                trendType="up"
                icon={<Music className="h-full w-full text-accent" />}
                iconBgColor="bg-accent-light bg-opacity-20"
                iconColor="text-accent"
              />
              
              <StatsCard 
                title="Chương trình phát"
                value={stats?.totalBroadcasts || 0}
                trend="-2% từ tháng trước"
                trendType="down"
                icon={<Radio className="h-full w-full text-success" />}
                iconBgColor="bg-success-light bg-opacity-20"
                iconColor="text-success"
              />
              
              <StatsCard 
                title="Người dùng"
                value={stats?.totalUsers || 0}
                trend="+2 người dùng mới"
                trendType="up"
                icon={<Users className="h-full w-full text-neutral-dark" />}
                iconBgColor="bg-neutral-light bg-opacity-50"
                iconColor="text-neutral-dark"
              />
            </>
          )}
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Activity */}
          <div className="col-span-2">
            <Card>
              <CardContent className="p-0">
                <div className="border-b border-neutral-light px-6 py-4 flex items-center justify-between">
                  <h3 className="font-semibold">Hoạt động gần đây</h3>
                </div>
                <div className="p-6">
                  {isLoading ? (
                    <div className="space-y-4">
                      <Skeleton className="h-16 w-full" />
                      <Skeleton className="h-16 w-full" />
                      <Skeleton className="h-16 w-full" />
                      <Skeleton className="h-16 w-full" />
                    </div>
                  ) : (
                    <ActivityLog activities={stats?.recentActivities || []} />
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* System Status */}
          <div>
            <Card>
              <CardContent className="p-0">
                <div className="border-b border-neutral-light px-6 py-4">
                  <h3 className="font-semibold">Trạng thái hệ thống</h3>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm text-neutral-dark">Bộ nhớ máy chủ</span>
                      <span className="text-sm font-medium text-neutral-dark">78%</span>
                    </div>
                    <div className="w-full bg-neutral-light rounded-full h-2">
                      <div className="bg-primary h-2 rounded-full" style={{ width: '78%' }}></div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm text-neutral-dark">CPU</span>
                      <span className="text-sm font-medium text-neutral-dark">42%</span>
                    </div>
                    <div className="w-full bg-neutral-light rounded-full h-2">
                      <div className="bg-success h-2 rounded-full" style={{ width: '42%' }}></div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm text-neutral-dark">Băng thông</span>
                      <span className="text-sm font-medium text-neutral-dark">91%</span>
                    </div>
                    <div className="w-full bg-neutral-light rounded-full h-2">
                      <div className="bg-accent h-2 rounded-full" style={{ width: '91%' }}></div>
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t border-neutral-light">
                    <h4 className="text-sm font-medium mb-3">Thông tin máy chủ</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-neutral-medium">Tình trạng</span>
                        <span className="text-success font-medium">Hoạt động</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-medium">Thời gian hoạt động</span>
                        <span className="text-neutral-dark">32 ngày</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-medium">Phiên bản</span>
                        <span className="text-neutral-dark">1.2.5</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
