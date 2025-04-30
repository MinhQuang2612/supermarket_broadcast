import React, { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: number;
  trend?: string;
  trendType?: "up" | "down" | "neutral";
  icon: ReactNode;
  iconBgColor: string;
  iconColor: string;
}

export default function StatsCard({
  title,
  value,
  trend,
  trendType = "neutral",
  icon,
  iconBgColor,
  iconColor,
}: StatsCardProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-neutral-medium text-sm">{title}</p>
            <h3 className="text-2xl font-bold mt-1">{value}</h3>
          </div>
          <div className={cn("w-12 h-12 rounded-full flex items-center justify-center", iconBgColor)}>
            <div className={cn("h-6 w-6", iconColor)}>
              {icon}
            </div>
          </div>
        </div>
        
        {trend && (
          <div className={cn(
            "mt-4 text-xs flex items-center",
            trendType === "up" ? "text-success" : 
            trendType === "down" ? "text-danger" : 
            "text-neutral-medium"
          )}>
            {trendType === "up" ? (
              <TrendingUp className="mr-1 h-3 w-3" />
            ) : trendType === "down" ? (
              <TrendingDown className="mr-1 h-3 w-3" />
            ) : null}
            <span>{trend}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
