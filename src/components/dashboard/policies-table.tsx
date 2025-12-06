"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import type { PolicyData } from "~/types/graph";
import { cn } from "~/lib/utils";
import { PolicyDetailsModal } from "./policy-details-modal";

const ITEMS_PER_PAGE = 15;

interface PoliciesTableProps {
  policies: PolicyData[];
  getAccessToken?: () => Promise<string>;
}

const STATUS_COLORS: Record<string, string> = {
  "Assigned": "#22c55e",
  "None": "#ef4444",
};

const ASSIGNMENT_COLORS: Record<string, string> = {
  "All Users": "#8b5cf6",
  "All Devices": "#3b82f6",
};

interface ColumnWidths {
  name: number;
  type: number;
  status: number;
  assignedTo: number;
  created: number;
  modified: number;
}

const DEFAULT_WIDTHS: ColumnWidths = {
  name: 350,
  type: 180,
  status: 100,
  assignedTo: 200,
  created: 140,
  modified: 140,
};

// Format date for display
function formatDate(dateString?: string): string {
  if (!dateString) return "-";
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "-";
  }
}

const MIN_WIDTH = 100;

function ResizeHandle({
  onResizeStart,
  onResize
}: {
  onResizeStart: () => number;
  onResize: (newWidth: number) => void;
}) {
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = onResizeStart();

    const handleMouseMove = (e: MouseEvent) => {
      const delta = e.clientX - startX;
      const newWidth = Math.max(MIN_WIDTH, startWidth + delta);
      onResize(newWidth);
    };

    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, [onResizeStart, onResize]);

  return (
    <div
      onMouseDown={handleMouseDown}
      className="absolute right-0 top-0 h-full w-2 cursor-col-resize hover:bg-primary/30 active:bg-primary/50 transition-colors group-hover/th:bg-primary/10"
    />
  );
}

export function PoliciesTable({ policies, getAccessToken }: PoliciesTableProps) {
  const [columnWidths, setColumnWidths] = useState<ColumnWidths>(DEFAULT_WIDTHS);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedPolicy, setSelectedPolicy] = useState<PolicyData | null>(null);

  // Reset to page 1 when policies change (e.g., when filtering)
  useEffect(() => {
    setCurrentPage(1);
  }, [policies.length]);

  const createResizeHandlers = useCallback((column: keyof ColumnWidths) => ({
    onResizeStart: () => columnWidths[column],
    onResize: (newWidth: number) => {
      setColumnWidths(prev => ({ ...prev, [column]: newWidth }));
    },
  }), [columnWidths]);

  // Pagination calculations
  const totalPages = Math.ceil(policies.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedPolicies = useMemo(() =>
    policies.slice(startIndex, endIndex),
    [policies, startIndex, endIndex]
  );

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages + 2) {
      // Show all pages if there are few enough
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      if (currentPage > 3) {
        pages.push("...");
      }

      // Show pages around current page
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) {
        pages.push("...");
      }

      // Always show last page
      if (totalPages > 1) {
        pages.push(totalPages);
      }
    }

    return pages;
  };

  return (
    <div className={cn("rounded-xl overflow-hidden overflow-x-auto", "glass-card dark:glass-card-dark")}>
      <Table style={{ tableLayout: "fixed", minWidth: Object.values(columnWidths).reduce((a, b) => a + b, 0) }}>
        <TableHeader>
          <TableRow className="hover:bg-transparent border-b-primary/10">
            <TableHead className="font-semibold text-primary relative group/th" style={{ width: columnWidths.name }}>
              Name
              <ResizeHandle {...createResizeHandlers("name")} />
            </TableHead>
            <TableHead className="font-semibold text-primary relative group/th" style={{ width: columnWidths.type }}>
              Type
              <ResizeHandle {...createResizeHandlers("type")} />
            </TableHead>
            <TableHead className="font-semibold text-primary relative group/th" style={{ width: columnWidths.status }}>
              Status
              <ResizeHandle {...createResizeHandlers("status")} />
            </TableHead>
            <TableHead className="font-semibold text-primary relative group/th" style={{ width: columnWidths.assignedTo }}>
              Assigned To
              <ResizeHandle {...createResizeHandlers("assignedTo")} />
            </TableHead>
            <TableHead className="font-semibold text-primary relative group/th" style={{ width: columnWidths.created }}>
              Created
              <ResizeHandle {...createResizeHandlers("created")} />
            </TableHead>
            <TableHead className="font-semibold text-primary" style={{ width: columnWidths.modified }}>
              Modified
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedPolicies.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center h-32 text-muted-foreground">
                <div className="flex flex-col items-center justify-center gap-2">
                  <div className="h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center text-xl font-bold opacity-50">?</div>
                  <p>No policies found matching your criteria.</p>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            paginatedPolicies.map((policy) => (
                <TableRow
                  key={policy.id}
                  className="group hover:bg-primary/5 transition-colors border-b-primary/5 cursor-pointer"
                  onClick={() => setSelectedPolicy(policy)}
                >
                  <TableCell className="font-medium overflow-hidden">
                    <div className="flex flex-col min-w-0">
                      <span className="truncate group-hover:text-primary transition-colors">
                        {policy.name}
                      </span>
                      <span className="text-[10px] font-mono text-muted-foreground truncate opacity-0 group-hover:opacity-100 transition-opacity select-all">
                        {policy.id}
                      </span>
                    </div>
                  </TableCell>
                <TableCell className="text-muted-foreground text-xs overflow-hidden">
                  <span className="truncate block">{policy.type}</span>
                </TableCell>
                <TableCell className="overflow-hidden">
                  {(() => {
                    const isAssigned = policy.assignmentStatus !== "None";
                    const status = isAssigned ? "Assigned" : "None";
                    const color = STATUS_COLORS[status];
                    return (
                      <Badge
                        variant="outline"
                        style={{
                          backgroundColor: color + "15",
                          color: color,
                          borderColor: color + "40",
                        }}
                        className="whitespace-nowrap"
                      >
                        {status}
                      </Badge>
                    );
                  })()}
                </TableCell>
                <TableCell className="overflow-hidden">
                  <div className="flex items-center gap-2 text-sm min-w-0 flex-wrap">
                    {policy.assignmentStatus === "All Users" && (
                      <Badge
                        variant="outline"
                        style={{
                          backgroundColor: ASSIGNMENT_COLORS["All Users"] + "15",
                          color: ASSIGNMENT_COLORS["All Users"],
                          borderColor: ASSIGNMENT_COLORS["All Users"] + "40",
                        }}
                        className="whitespace-nowrap flex-shrink-0"
                      >
                        All Users
                      </Badge>
                    )}
                    {policy.assignmentStatus === "All Devices" && (
                      <Badge
                        variant="outline"
                        style={{
                          backgroundColor: ASSIGNMENT_COLORS["All Devices"] + "15",
                          color: ASSIGNMENT_COLORS["All Devices"],
                          borderColor: ASSIGNMENT_COLORS["All Devices"] + "40",
                        }}
                        className="whitespace-nowrap flex-shrink-0"
                      >
                        All Devices
                      </Badge>
                    )}
                    {policy.assignedTo.length > 0 && (
                      <span className="text-muted-foreground truncate" title={policy.assignedTo.join(", ")}>
                        {policy.assignedTo.join(", ")}
                      </span>
                    )}
                    {policy.assignmentStatus === "None" && (
                      <span className="text-muted-foreground/50 italic">-</span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground text-xs overflow-hidden">
                  <span className="truncate block" title={policy.createdDateTime}>
                    {formatDate(policy.createdDateTime)}
                  </span>
                </TableCell>
                <TableCell className="text-muted-foreground text-xs overflow-hidden">
                  <span className="truncate block" title={policy.lastModifiedDateTime}>
                    {formatDate(policy.lastModifiedDateTime)}
                  </span>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex flex-col items-center gap-3 px-4 py-3 border-t border-primary/10 sm:flex-row sm:justify-between">
          <div className="text-sm text-muted-foreground order-2 sm:order-1">
            Showing {startIndex + 1}-{Math.min(endIndex, policies.length)} of {policies.length}
          </div>
          <div className="flex items-center gap-1 order-1 sm:order-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            {getPageNumbers().map((page, idx) => (
              typeof page === "number" ? (
                <Button
                  key={idx}
                  variant={currentPage === page ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentPage(page)}
                  className="h-8 w-8 p-0 hidden sm:inline-flex"
                >
                  {page}
                </Button>
              ) : (
                <span key={idx} className="px-2 text-muted-foreground hidden sm:inline">
                  {page}
                </span>
              )
            ))}

            <span className="px-3 text-sm text-muted-foreground sm:hidden">
              {currentPage} / {totalPages}
            </span>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Policy Details Modal */}
      <PolicyDetailsModal
        policy={selectedPolicy}
        onClose={() => setSelectedPolicy(null)}
        getAccessToken={getAccessToken}
      />
    </div>
  );
}
