import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { AlertCircle, Users, Smartphone, ShieldCheck } from "lucide-react";

interface DashboardStatsProps {
  totalPolicies: number;
  unassignedCount: number;
  allUsersCount: number;
  allDevicesCount: number;
}

export function DashboardStats({
  totalPolicies,
  unassignedCount,
  allUsersCount,
  allDevicesCount,
}: DashboardStatsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card className="glass-card dark:glass-card-dark border-l-4 border-l-primary transition-all hover:-translate-y-1 hover:shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Total Policies</CardTitle>
          <ShieldCheck className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalPolicies}</div>
          <p className="text-xs text-muted-foreground mt-1">Across all categories</p>
        </CardContent>
      </Card>
      <Card className="glass-card dark:glass-card-dark border-l-4 border-l-red-500 transition-all hover:-translate-y-1 hover:shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Unassigned</CardTitle>
          <AlertCircle className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600 dark:text-red-400">{unassignedCount}</div>
          <p className="text-xs text-muted-foreground mt-1">Policies with no assignments</p>
        </CardContent>
      </Card>
      <Card className="glass-card dark:glass-card-dark border-l-4 border-l-green-500 transition-all hover:-translate-y-1 hover:shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">All Users</CardTitle>
          <Users className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">{allUsersCount}</div>
          <p className="text-xs text-muted-foreground mt-1">Assigned to All Users</p>
        </CardContent>
      </Card>
      <Card className="glass-card dark:glass-card-dark border-l-4 border-l-blue-500 transition-all hover:-translate-y-1 hover:shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">All Devices</CardTitle>
          <Smartphone className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{allDevicesCount}</div>
          <p className="text-xs text-muted-foreground mt-1">Assigned to All Devices</p>
        </CardContent>
      </Card>
    </div>
  );
}
