import { ReactNode } from "react";
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { User, Music, Radio, UserPlus } from "lucide-react";

interface Activity {
  id: number;
  userId: number;
  action: string;
  details: string;
  timestamp: string;
  user?: {
    fullName: string;
    username: string;
  };
}

interface ActivityItemProps {
  icon: ReactNode;
  iconBgColor: string;
  iconColor: string;
  username: string;
  details: string;
  timestamp: string;
}

function ActivityItem({ icon, iconBgColor, iconColor, username, details, timestamp }: ActivityItemProps) {
  return (
    <div className="flex items-start space-x-4">
      <div className={`w-10 h-10 rounded-full ${iconBgColor} flex-shrink-0 flex items-center justify-center`}>
        <div className={iconColor}>{icon}</div>
      </div>
      <div className="flex-1">
        <p className="text-sm text-neutral-darkest">
          <span className="font-medium">{username}</span> {details}
        </p>
        <p className="text-xs text-neutral-medium mt-1">{timestamp}</p>
      </div>
    </div>
  );
}

interface ActivityLogProps {
  activities: Activity[];
}

export default function ActivityLog({ activities }: ActivityLogProps) {
  if (!activities || activities.length === 0) {
    return (
      <div className="text-center py-8 text-neutral-medium">
        Chưa có hoạt động nào
      </div>
    );
  }

  // Function to get icon and background color based on action type
  const getActivityVisuals = (action: string) => {
    switch (action) {
      case 'create_user':
      case 'update_user':
      case 'change_password':
      case 'activate_user':
      case 'deactivate_user':
        return {
          icon: <User size={18} />,
          bgColor: "bg-primary-light bg-opacity-20",
          color: "text-primary"
        };
      case 'create_supermarket':
      case 'update_supermarket':
      case 'delete_supermarket':
      case 'update_supermarket_status':
        return {
          icon: <User size={18} />,
          bgColor: "bg-primary-light bg-opacity-20",
          color: "text-primary"
        };
      case 'upload_audio':
      case 'delete_audio':
        return {
          icon: <Music size={18} />,
          bgColor: "bg-accent-light bg-opacity-20",
          color: "text-accent"
        };
      case 'create_broadcast_program':
      case 'update_broadcast_program':
      case 'delete_broadcast_program':
        return {
          icon: <Radio size={18} />,
          bgColor: "bg-success-light bg-opacity-20",
          color: "text-success"
        };
      case 'login':
      case 'logout':
      default:
        return {
          icon: <UserPlus size={18} />,
          bgColor: "bg-neutral-light bg-opacity-50",
          color: "text-neutral-dark"
        };
    }
  };

  return (
    <div className="space-y-4">
      {activities.map((activity) => {
        const { icon, bgColor, color } = getActivityVisuals(activity.action);
        const timeAgo = formatDistanceToNow(new Date(activity.timestamp), { 
          addSuffix: true,
          locale: vi
        });
        
        return (
          <ActivityItem
            key={activity.id}
            icon={icon}
            iconBgColor={bgColor}
            iconColor={color}
            username={activity.user?.fullName || `User #${activity.userId}`}
            details={activity.details}
            timestamp={timeAgo}
          />
        );
      })}
    </div>
  );
}
