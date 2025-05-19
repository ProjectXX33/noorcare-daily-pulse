
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cva, type VariantProps } from "class-variance-authority";

const dashboardCardVariants = cva(
  "transition-all duration-200 hover:shadow-md",
  {
    variants: {
      variant: {
        default: "bg-card",
        primary: "bg-primary text-primary-foreground",
        success: "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-900/30",
        warning: "bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-900/30",
        info: "bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-900/30",
      }
    },
    defaultVariants: {
      variant: "default"
    }
  }
);

interface DashboardCardProps extends VariantProps<typeof dashboardCardVariants> {
  title: string;
  value: string | number;
  description?: string;
  icon?: React.ReactNode;
  className?: string;
}

const DashboardCard = ({ 
  title, 
  value, 
  description, 
  icon,
  variant,
  className
}: DashboardCardProps) => {
  return (
    <Card className={dashboardCardVariants({ variant, className })}>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon && <div className="opacity-70">{icon}</div>}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">
            {description}
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default DashboardCard;
