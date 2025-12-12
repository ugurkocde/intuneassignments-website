"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { Badge } from "~/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table";
import { Card, CardContent } from "~/components/ui/card";
import { cn } from "~/lib/utils";
import type { CompareSubject } from "~/types/compare";
import type { PolicyData } from "~/types/graph";
import { Button } from "~/components/ui/button";
import { GitCompareArrows, CheckCircle2 } from "lucide-react";

export type ComparePresence = {
  present: boolean;
  excluded?: boolean;
  reasons?: string[];
  filters?: string[];
};

export type CompareRow = {
  id: string;
  name: string;
  type: PolicyData["type"];
  platform?: string;
  perSubject: Record<string, ComparePresence>;
};

const sortByName = (a: CompareRow, b: CompareRow) =>
  a.name.localeCompare(b.name, undefined, { sensitivity: "base" });

export function CompareTable({
  subjects,
  rows,
  title,
  className,
}: {
  subjects: CompareSubject[];
  rows: CompareRow[];
  title: string;
  className?: string;
}) {
  const [commonOpen, setCommonOpen] = useState(false);
  const differencesRef = useRef<HTMLDivElement>(null);
  const commonRef = useRef<HTMLDivElement>(null);

  const { common, different } = useMemo(() => {
    const common: CompareRow[] = [];
    const different: CompareRow[] = [];
    for (const r of rows) {
      const presentCount = subjects.reduce((acc, s) => {
        const key = `${s.type}:${s.id}`;
        return acc + (r.perSubject[key]?.present ? 1 : 0);
      }, 0);
      if (presentCount === subjects.length) common.push(r);
      else different.push(r);
    }
    common.sort(sortByName);
    different.sort(sortByName);
    return { common, different };
  }, [rows, subjects]);

  const scrollToRef = useCallback((ref: React.RefObject<HTMLElement | null>) => {
    const el = ref.current;
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const renderSection = (sectionTitle: string, sectionRows: CompareRow[]) => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground">
          {sectionTitle} ({sectionRows.length})
        </h3>
      </div>

      <div className={cn("rounded-xl overflow-hidden overflow-x-auto", "glass-card dark:glass-card-dark")}>
        <Table style={{ tableLayout: "fixed", minWidth: 900 }}>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-b-primary/10">
              <TableHead className="font-semibold text-primary" style={{ width: 360 }}>
                Name
              </TableHead>
              <TableHead className="font-semibold text-primary" style={{ width: 200 }}>
                Type
              </TableHead>
              {subjects.map((s) => (
                <TableHead
                  key={`${s.type}:${s.id}`}
                  className="font-semibold text-primary"
                  style={{ width: 220 }}
                  title={s.subtitle ?? s.id}
                >
                  <div className="truncate">{s.label}</div>
                  <div className="text-[10px] font-normal text-muted-foreground capitalize">
                    {s.type}
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sectionRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={2 + subjects.length} className="text-center h-20 text-muted-foreground">
                  No items.
                </TableCell>
              </TableRow>
            ) : (
              sectionRows.map((r) => (
                <TableRow key={r.id} className="border-b-primary/5">
                  <TableCell className="font-medium overflow-hidden">
                    <div className="flex flex-col min-w-0">
                      <span className="truncate">{r.name}</span>
                      <span className="text-[10px] font-mono text-muted-foreground truncate select-all">
                        {r.id}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs overflow-hidden">
                    <span className="truncate block">{r.type}</span>
                    {r.platform ? (
                      <span className="truncate block text-[10px] text-muted-foreground/80">
                        {r.platform}
                      </span>
                    ) : null}
                  </TableCell>

                  {subjects.map((s) => {
                    const key = `${s.type}:${s.id}`;
                    const cell = r.perSubject[key];
                    const present = cell?.present;
                    const excluded = cell?.excluded;
                    const reasons = cell?.reasons ?? [];
                    const filters = cell?.filters ?? [];

                    return (
                      <TableCell key={key} className="align-top">
                        {present ? (
                          <div className="flex flex-col gap-1.5">
                            <Badge
                              variant="outline"
                              className={cn(
                                "w-fit",
                                excluded
                                  ? "border-red-500/40 text-red-600 bg-red-500/10"
                                  : "border-emerald-500/40 text-emerald-700 dark:text-emerald-300 bg-emerald-500/10",
                              )}
                            >
                              {excluded ? "Excluded" : "Included"}
                            </Badge>
                            {reasons.length > 0 ? (
                              <div className="text-xs text-muted-foreground">
                                {reasons.slice(0, 2).join(" · ")}
                                {reasons.length > 2 ? " …" : ""}
                              </div>
                            ) : null}
                            {filters.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {filters.slice(0, 2).map((f) => (
                                  <Badge
                                    key={f}
                                    variant="outline"
                                    className="text-[10px] max-w-[180px] truncate"
                                    title={f}
                                  >
                                    {f}
                                  </Badge>
                                ))}
                                {filters.length > 2 ? (
                                  <Badge variant="outline" className="text-[10px]">
                                    +{filters.length - 2}
                                  </Badge>
                                ) : null}
                              </div>
                            ) : null}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground/60 italic">—</span>
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );

  return (
    <Card className={cn("glass-card dark:glass-card-dark", className)}>
      <CardContent className="pt-6 space-y-6">
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="text-sm text-muted-foreground">
            Common items appear in every selected object. Differences show what’s unique/missing per object.
          </p>
        </div>

        {/* Sticky jump control (Differences-first UX) */}
        <div className="sticky top-16 z-10 -mx-6 px-6 py-3 bg-background/80 backdrop-blur-sm border-y border-border/60">
          <div className="inline-flex items-center rounded-lg bg-muted p-1 gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => scrollToRef(differencesRef)}
              className="rounded-md data-[active=true]:bg-background data-[active=true]:shadow-sm"
              data-active="true"
            >
              <GitCompareArrows className="h-4 w-4" />
              <span>Differences</span>
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs font-medium">
                {different.length}
              </Badge>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setCommonOpen(true);
                requestAnimationFrame(() => scrollToRef(commonRef));
              }}
              className={cn(
                "rounded-md",
                commonOpen && "bg-background shadow-sm"
              )}
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>Common</span>
              <Badge
                variant={commonOpen ? "secondary" : "outline"}
                className={cn(
                  "ml-1 h-5 px-1.5 text-xs font-medium",
                  !commonOpen && "text-muted-foreground"
                )}
              >
                {common.length}
              </Badge>
              {!commonOpen && common.length > 0 && (
                <span className="ml-1 text-xs text-muted-foreground">(collapsed)</span>
              )}
            </Button>
          </div>
        </div>

        {/* Differences first */}
        <div ref={differencesRef}>
          {renderSection("Differences", different)}
        </div>

        {/* Common collapsed by default */}
        <div ref={commonRef}>
          {commonOpen ? (
            renderSection("Common", common)
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-muted-foreground">
                  Common ({common.length})
                </h3>
                {common.length > 0 ? (
                  <Button type="button" variant="outline" size="sm" onClick={() => setCommonOpen(true)}>
                    Show common
                  </Button>
                ) : null}
              </div>
              <div className="text-sm text-muted-foreground">
                Common items are collapsed to keep differences front-and-center.
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}


