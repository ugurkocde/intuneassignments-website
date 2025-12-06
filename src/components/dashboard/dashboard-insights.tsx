"use client";

import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import type { PolicyData } from "~/types/graph";
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";
import { Users, Monitor, CheckCircle2, BarChart as BarChartIcon } from "lucide-react";
import { useMemo } from "react";

interface DashboardInsightsProps {
  policies: PolicyData[];
}

export function DashboardInsights({ policies }: DashboardInsightsProps) {
  
  // 1. Health Score
  const healthMetrics = useMemo(() => {
    const total = policies.length;
    if (total === 0) return { score: 0, assigned: 0 };
    const assigned = policies.filter(p => p.assignmentStatus !== "None").length;
    return {
      score: Math.round((assigned / total) * 100),
      assigned
    };
  }, [policies]);

  // 2. Top Groups
  const topGroups = useMemo(() => {
    const groupCounts: Record<string, number> = {};
    policies.forEach(p => {
      p.assignedTo.forEach(group => {
        if (!group.startsWith("[Excluded]")) {
            groupCounts[group] = (groupCounts[group] || 0) + 1;
        }
      });
    });

    return Object.entries(groupCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, value]) => ({ name, value }));
  }, [policies]);

  // 3. Platform Distribution
  const platformData = useMemo(() => {
    const counts: Record<string, number> = { Windows: 0, iOS: 0, Android: 0, macOS: 0, Other: 0 };
    
    policies.forEach(p => {
      if (p.platform) {
          // Normalize platform string
          const plat = p.platform.toLowerCase();
          if (plat.includes("windows")) counts.Windows = (counts.Windows ?? 0) + 1;
          else if (plat.includes("ios") || plat.includes("ipad")) counts.iOS = (counts.iOS ?? 0) + 1;
          else if (plat.includes("android")) counts.Android = (counts.Android ?? 0) + 1;
          else if (plat.includes("mac")) counts.macOS = (counts.macOS ?? 0) + 1;
          else counts.Other = (counts.Other ?? 0) + 1;
      } else {
          counts.Other = (counts.Other ?? 0) + 1;
      }
    });

    return Object.entries(counts)
      .filter(([, value]) => value > 0)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [policies]);

  // 4. Policy Types
  const typeData = useMemo(() => {
    const typeCounts = policies.reduce((acc, curr) => {
        acc[curr.type] = (acc[curr.type] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    return Object.entries(typeCounts)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);
  }, [policies]);

  const COLORS = ["#6366f1", "#8b5cf6", "#ec4899", "#14b8a6", "#f59e0b"];

  return (
    <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-7">
      
      {/* Assignment Health */}
      <Card className="col-span-3 lg:col-span-2 glass-card dark:glass-card-dark">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            Assignment Health
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[180px] relative">
             <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
                <span className="text-4xl font-bold text-foreground">{healthMetrics.score}%</span>
                <span className="text-xs text-muted-foreground mt-1">Assigned</span>
             </div>
             <ResponsiveContainer width="100%" height="100%">
               <PieChart>
                 <Pie
                   data={[
                     { name: "Assigned", value: healthMetrics.assigned },
                     { name: "Unassigned", value: policies.length - healthMetrics.assigned }
                   ]}
                   cx="50%"
                   cy="50%"
                   innerRadius={60}
                   outerRadius={80}
                   startAngle={90}
                   endAngle={-270}
                   dataKey="value"
                   stroke="none"
                 >
                   <Cell fill="var(--primary)" />
                   <Cell fill="var(--muted)" opacity={0.3} />
                 </Pie>
               </PieChart>
             </ResponsiveContainer>
          </div>
          <div className="text-center text-xs text-muted-foreground mt-2">
            {policies.length - healthMetrics.assigned} policies have no assignments
          </div>
        </CardContent>
      </Card>

      {/* Platform Distribution */}
      <Card className="col-span-3 lg:col-span-2 glass-card dark:glass-card-dark">
         <CardHeader className="pb-2">
           <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
             <Monitor className="h-4 w-4 text-primary" />
             Platform Focus
           </CardTitle>
         </CardHeader>
         <CardContent>
           <div className="h-[200px] w-full">
             <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                   <Pie
                      data={platformData}
                      cx="50%"
                      cy="50%"
                      innerRadius={0}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                      stroke="none"
                   >
                      {platformData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                   </Pie>
                   <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'var(--card)', 
                        borderColor: 'var(--border)', 
                        borderRadius: '8px',
                        color: 'var(--foreground)' 
                      }} 
                      itemStyle={{ color: 'var(--foreground)' }}
                   />
                </PieChart>
             </ResponsiveContainer>
           </div>
           <div className="flex justify-center gap-3 flex-wrap">
              {platformData.slice(0, 3).map((entry, index) => (
                  <div key={entry.name} className="flex items-center gap-1 text-xs text-muted-foreground">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                      {entry.name}
                  </div>
              ))}
           </div>
         </CardContent>
      </Card>

      {/* Top Groups */}
      <Card className="col-span-3 lg:col-span-3 glass-card dark:glass-card-dark">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            Top Assigned Groups
          </CardTitle>
        </CardHeader>
        <CardContent>
           <div className="space-y-4">
              {topGroups.length === 0 ? (
                  <div className="flex items-center justify-center h-[150px] text-muted-foreground text-sm">
                    No group assignments found
                  </div>
              ) : (
                topGroups.map((group, index) => (
                  <div key={group.name} className="flex items-center justify-between group">
                      <div className="flex items-center gap-3 overflow-hidden">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                              {index + 1}
                          </div>
                          <div className="grid gap-0.5">
                              <span className="text-sm font-medium truncate max-w-[180px] sm:max-w-[250px]" title={group.name}>
                                {group.name}
                              </span>
                          </div>
                      </div>
                      <div className="text-sm font-bold text-muted-foreground bg-muted/50 px-2 py-1 rounded-md">
                          {group.value}
                      </div>
                  </div>
                ))
              )}
           </div>
        </CardContent>
      </Card>

      {/* Policy Types - Full Width */}
      <Card className="col-span-3 lg:col-span-7 glass-card dark:glass-card-dark">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <BarChartIcon className="h-4 w-4 text-primary" />
            Policy Distribution by Type
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={typeData} layout="vertical" margin={{ left: 0, right: 30, top: 0, bottom: 0 }}>
                <XAxis type="number" hide />
                <YAxis
                  dataKey="name"
                  type="category"
                  width={200}
                  tick={{ fontSize: 12, fill: 'currentColor', opacity: 0.7 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Bar
                  dataKey="value"
                  fill="var(--primary)"
                  radius={[0, 4, 4, 0]}
                  barSize={24}
                  background={{ fill: 'var(--muted)' }}
                >
                  <Tooltip
                    cursor={{ fill: 'transparent' }}
                    contentStyle={{ 
                      backgroundColor: 'var(--card)',
                      borderRadius: '8px', 
                      border: '1px solid var(--border)', 
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    }}
                    itemStyle={{ color: 'var(--foreground)' }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
