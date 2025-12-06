"use client";

import { useMemo, useEffect, useState, useRef, useCallback } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  MiniMap,
  Panel,
  useNodesState,
  useEdgesState,
  useReactFlow,
  useViewport,
  SelectionMode,
  type Node,
  type Edge,
  Handle,
  Position
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  User, Users, Shield, Settings, Monitor, Smartphone, FileText, Cloud,
  Maximize, Minimize, Hand, RotateCcw, Plus, Minus,
  Crosshair, Search, X, ChevronDown, Copy, ZoomIn, SquareMousePointer, KeyRound
} from "lucide-react";
import { cn } from "~/lib/utils";
import type { UserAssignmentData, UserAssignmentPolicy } from "~/types/user";
import { PolicyDetailsPanel } from "~/components/policy-details-panel";

// Context for collapse state
import { createContext, useContext } from "react";
const CollapseContext = createContext<{
  collapsedGroups: Set<string>;
  toggleCollapse: (id: string) => void;
  // eslint-disable-next-line @typescript-eslint/no-empty-function
}>({ collapsedGroups: new Set(), toggleCollapse: () => {} });

// Context for policy selection
const PolicySelectionContext = createContext<{
  selectPolicy: (policy: UserAssignmentPolicy) => void;
  // eslint-disable-next-line @typescript-eslint/no-empty-function
}>({ selectPolicy: () => {} });

// Layout constants
const LEVEL_HEIGHT = 180;
const NODE_WIDTH = 220;
const NODE_SPACING = 30;

// Custom node component for User
function UserNode({ data }: { data: { label: string; email?: string } }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-4 bg-gradient-to-br from-primary/10 to-primary/5 border-2 border-primary rounded-2xl shadow-lg min-w-[180px]">
      <Handle type="source" position={Position.Bottom} className="!bg-primary !w-3 !h-3 !border-2 !border-background" />
      <div className="flex items-center justify-center h-14 w-14 rounded-full bg-primary/20">
        <User className="h-7 w-7 text-primary" />
      </div>
      <div className="text-center">
        <div className="font-semibold text-foreground text-base">{data.label}</div>
        {data.email && (
          <div className="text-xs text-muted-foreground mt-0.5 max-w-[150px] truncate">
            {data.email}
          </div>
        )}
      </div>
    </div>
  );
}

// Custom node component for Device
function DeviceNode({ data }: { data: { label: string; subtitle?: string } }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-4 bg-gradient-to-br from-cyan-500/10 to-cyan-500/5 border-2 border-cyan-500 rounded-2xl shadow-lg min-w-[180px]">
      <Handle type="source" position={Position.Bottom} className="!bg-cyan-500 !w-3 !h-3 !border-2 !border-background" />
      <div className="flex items-center justify-center h-14 w-14 rounded-full bg-cyan-500/20">
        <Monitor className="h-7 w-7 text-cyan-600" />
      </div>
      <div className="text-center">
        <div className="font-semibold text-foreground text-base">{data.label}</div>
        {data.subtitle && (
          <div className="text-xs text-muted-foreground mt-0.5 max-w-[150px] truncate">
            {data.subtitle}
          </div>
        )}
      </div>
    </div>
  );
}

// Custom node component for Groups
function GroupNode({ data, id }: { data: { label: string; policyCount?: number; isAllUsers?: boolean }; id: string }) {
  const { collapsedGroups, toggleCollapse } = useContext(CollapseContext);
  const isCollapsed = collapsedGroups.has(id);

  return (
    <div
      className={cn(
        "flex flex-col items-center gap-2 px-5 py-3 rounded-xl shadow-md min-w-[140px] transition-all duration-200 hover:scale-105 cursor-pointer",
        data.isAllUsers
          ? "bg-gradient-to-br from-green-500/10 to-green-500/5 border-2 border-green-500"
          : "bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-2 border-blue-500"
      )}
      onClick={(e) => {
        e.stopPropagation();
        toggleCollapse(id);
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        className={cn("!w-3 !h-3 !border-2 !border-background", data.isAllUsers ? "!bg-green-500" : "!bg-blue-500")}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className={cn("!w-3 !h-3 !border-2 !border-background", data.isAllUsers ? "!bg-green-500" : "!bg-blue-500")}
      />
      <div className={cn(
        "flex items-center justify-center h-10 w-10 rounded-full",
        data.isAllUsers ? "bg-green-500/20" : "bg-blue-500/20"
      )}>
        <Users className={cn("h-5 w-5", data.isAllUsers ? "text-green-600" : "text-blue-600")} />
      </div>
      <div className="text-center">
        <div className="font-medium text-foreground text-sm">{data.label}</div>
        {data.policyCount !== undefined && (
          <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1 justify-center">
            <ChevronDown className={cn("h-3 w-3 transition-transform", isCollapsed && "-rotate-90")} />
            {data.policyCount} {data.policyCount === 1 ? "policy" : "policies"}
          </div>
        )}
      </div>
    </div>
  );
}

// Icon mapping for policy categories
const categoryIcons: Record<string, React.ReactNode> = {
  "Device Configuration": <Monitor className="h-4 w-4" />,
  "Compliance Policy": <Shield className="h-4 w-4" />,
  "Application": <Smartphone className="h-4 w-4" />,
  "Script": <FileText className="h-4 w-4" />,
  "Settings Catalog": <Settings className="h-4 w-4" />,
  "Cloud PC": <Cloud className="h-4 w-4" />,
  "Endpoint Security": <Shield className="h-4 w-4" />,
  "Endpoint Privilege Management": <KeyRound className="h-4 w-4" />,
};

// Get icon for a policy type
function getCategoryIcon(type: string): React.ReactNode {
  for (const [key, icon] of Object.entries(categoryIcons)) {
    if (type.includes(key) || type.startsWith(key)) {
      return icon;
    }
  }
  return <Settings className="h-4 w-4" />;
}

// Custom node component for Policy Categories
function CategoryNode({ data }: { data: { label: string; policyCount?: number } }) {
  return (
    <div className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-br from-amber-500/10 to-amber-500/5 border border-amber-500/50 rounded-lg shadow-sm min-w-[120px] transition-all duration-200 hover:scale-105">
      <Handle type="target" position={Position.Top} className="!bg-amber-500 !w-2.5 !h-2.5 !border-2 !border-background" />
      <Handle type="source" position={Position.Bottom} className="!bg-amber-500 !w-2.5 !h-2.5 !border-2 !border-background" />
      <div className="flex items-center justify-center h-8 w-8 rounded-md bg-amber-500/20">
        {getCategoryIcon(data.label)}
      </div>
      <div>
        <div className="font-medium text-foreground text-sm">{data.label}</div>
        {data.policyCount !== undefined && (
          <div className="text-xs text-muted-foreground">
            {data.policyCount}
          </div>
        )}
      </div>
    </div>
  );
}

// Policy node data interface
interface PolicyNodeData {
  label: string;
  policyType?: string;
  assignmentIntent?: string;
  inheritedVia?: string;
  // Full policy data for details panel
  policyId: string;
  description?: string;
  lastModifiedDateTime?: string;
  odataType?: string;
  platform?: string;
  groupId?: string;
  templateId?: string;
  templateDisplayName?: string;
  technologies?: string;
  platforms?: string;
}

// Custom node component for Policies
function PolicyNode({ data }: { data: PolicyNodeData }) {
  const { selectPolicy } = useContext(PolicySelectionContext);

  const intentColors = {
    required: "border-green-500 bg-green-500/5",
    available: "border-blue-500 bg-blue-500/5",
    excluded: "border-red-500 bg-red-500/5"
  };

  const intentHandleColors = {
    required: "!bg-green-500",
    available: "!bg-blue-500",
    excluded: "!bg-red-500"
  };

  const intent = data.assignmentIntent ?? "required";

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Build full policy object from node data
    selectPolicy({
      id: data.policyId,
      name: data.label,
      type: (data.policyType ?? "Unknown") as UserAssignmentPolicy["type"],
      assignmentIntent: (intent as "required" | "available" | "excluded"),
      inheritedVia: data.inheritedVia ?? "Unknown",
      groupId: data.groupId,
      description: data.description,
      lastModifiedDateTime: data.lastModifiedDateTime,
      odataType: data.odataType,
      platform: data.platform,
      templateId: data.templateId,
      templateDisplayName: data.templateDisplayName,
      technologies: data.technologies,
      platforms: data.platforms,
    });
  };

  return (
    <div
      className={cn(
        "px-4 py-3 rounded-lg shadow-sm border min-w-[180px] max-w-[220px] transition-all duration-200 hover:scale-105 cursor-pointer",
        intentColors[intent as keyof typeof intentColors] ?? intentColors.required
      )}
      onClick={handleClick}
    >
      <Handle
        type="target"
        position={Position.Top}
        className={cn("!w-2 !h-2 !border-2 !border-background", intentHandleColors[intent as keyof typeof intentHandleColors])}
      />
      <div className="font-medium text-foreground text-sm truncate" title={data.label}>
        {data.label}
      </div>
      {data.inheritedVia && (
        <div className="text-xs text-muted-foreground mt-1.5 truncate" title={`Via: ${data.inheritedVia}`}>
          via {data.inheritedVia}
        </div>
      )}
    </div>
  );
}

// Define custom node types
const nodeTypes = {
  user: UserNode,
  device: DeviceNode,
  group: GroupNode,
  category: CategoryNode,
  policy: PolicyNode,
};

interface AssignmentTreeProps {
  data: UserAssignmentData;
  className?: string;
  rootType?: "user" | "device";
  getAccessToken?: () => Promise<string>;
}

// Helper to categorize policies
function categorizePolicies(policies: UserAssignmentPolicy[]): Map<string, UserAssignmentPolicy[]> {
  const categories = new Map<string, UserAssignmentPolicy[]>();

  policies.forEach(policy => {
    let category: string = policy.type;
    // Group endpoint security types (except EPM which gets its own category)
    if (policy.type.startsWith("Endpoint Security") && policy.type !== "Endpoint Security - EPM") {
      category = "Endpoint Security";
    }
    // EPM gets its own category
    if (policy.type === "Endpoint Security - EPM") {
      category = "Endpoint Privilege Management";
    }
    // Group Cloud PC types
    if (policy.type.startsWith("Cloud PC")) {
      category = "Cloud PC";
    }

    if (!categories.has(category)) {
      categories.set(category, []);
    }
    categories.get(category)!.push(policy);
  });

  return categories;
}

// Calculate width needed for a subtree
interface SubtreeInfo {
  width: number;
  categories: Array<{
    name: string;
    policies: UserAssignmentPolicy[];
    width: number;
  }>;
}

function calculateGroupWidth(policies: UserAssignmentPolicy[]): SubtreeInfo {
  const categories = categorizePolicies(policies);
  const categoryInfos: SubtreeInfo["categories"] = [];

  categories.forEach((categoryPolicies, categoryName) => {
    const width = Math.max(NODE_WIDTH, categoryPolicies.length * (NODE_WIDTH + NODE_SPACING) - NODE_SPACING);
    categoryInfos.push({
      name: categoryName,
      policies: categoryPolicies,
      width
    });
  });

  const totalWidth = categoryInfos.reduce((sum, cat) => sum + cat.width + NODE_SPACING, 0) - NODE_SPACING;

  return {
    width: Math.max(NODE_WIDTH, totalWidth),
    categories: categoryInfos
  };
}

function AssignmentTreeInner({ data, className, rootType = "user", getAccessToken }: AssignmentTreeProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [isLayoutReady, setIsLayoutReady] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [previousMode, setPreviousMode] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; nodeId: string; nodeLabel: string } | null>(null);
  const [selectedPolicy, setSelectedPolicy] = useState<UserAssignmentPolicy | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const initialNodesRef = useRef<Node[]>([]);
  const initialEdgesRef = useRef<Edge[]>([]);
  const { fitView, zoomTo, getZoom } = useReactFlow();
  const viewport = useViewport();

  // Callback for policy selection
  const selectPolicy = useCallback((policy: UserAssignmentPolicy) => {
    setSelectedPolicy(policy);
  }, []);

  // Toggle collapse for groups
  const toggleCollapse = useCallback((groupId: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  }, []);

  // Zoom controls
  const zoomIn = useCallback(() => {
    const currentZoom = getZoom();
    void zoomTo(Math.min(currentZoom * 1.25, 2), { duration: 200 });
  }, [getZoom, zoomTo]);

  const zoomOut = useCallback(() => {
    const currentZoom = getZoom();
    void zoomTo(Math.max(currentZoom * 0.8, 0.1), { duration: 200 });
  }, [getZoom, zoomTo]);

  const fitAll = useCallback(() => {
    void fitView({ padding: 0.3, duration: 300 });
  }, [fitView]);

  const fitSelection = useCallback(() => {
    const selectedNodes = nodes.filter(n => n.selected);
    if (selectedNodes.length > 0) {
      void fitView({ nodes: selectedNodes, padding: 0.5, duration: 300 });
    }
  }, [fitView, nodes]);

  const selectedCount = useMemo(() => nodes.filter(n => n.selected).length, [nodes]);

  // Search matching nodes
  const matchingNodeIds = useMemo(() => {
    if (!searchQuery.trim()) return new Set<string>();
    const query = searchQuery.toLowerCase();
    return new Set(
      nodes
        .filter(n => {
          const label = (n.data as { label?: string })?.label;
          return label?.toLowerCase().includes(query);
        })
        .map(n => n.id)
    );
  }, [nodes, searchQuery]);

  // Handle fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isNowFullscreen = !!document.fullscreenElement;
      setIsFullscreen(isNowFullscreen);
      if (isNowFullscreen) {
        setTimeout(() => { void fitView({ padding: 0.2, duration: 300 }); }, 100);
      }
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, [fitView]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if focus is on an input
      if (e.target instanceof HTMLInputElement) return;

      // Space: temporarily switch to pan mode
      if (e.key === " " && !e.repeat) {
        e.preventDefault();
        setPreviousMode(selectionMode);
        setSelectionMode(false);
      }
      // +/= for zoom in
      if (e.key === "=" || e.key === "+") {
        e.preventDefault();
        zoomIn();
      }
      // - for zoom out
      if (e.key === "-") {
        e.preventDefault();
        zoomOut();
      }
      // Cmd/Ctrl + 0: Fit all
      if (e.key === "0" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        fitAll();
      }
      // Cmd/Ctrl + 1: 100% zoom
      if (e.key === "1" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        void zoomTo(1, { duration: 200 });
      }
      // Cmd/Ctrl + 2: Fit selection
      if (e.key === "2" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        fitSelection();
      }
      // Escape: Deselect all or close search
      if (e.key === "Escape") {
        if (showSearch) {
          setShowSearch(false);
          setSearchQuery("");
        } else {
          setNodes(nodes.map(n => ({ ...n, selected: false })));
        }
      }
      // Cmd/Ctrl + A: Select all
      if (e.key === "a" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setNodes(nodes.map(n => ({ ...n, selected: true })));
      }
      // Cmd/Ctrl + F: Open search
      if (e.key === "f" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setShowSearch(true);
        setTimeout(() => searchInputRef.current?.focus(), 100);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === " ") {
        setSelectionMode(previousMode);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [selectionMode, previousMode, showSearch, nodes, zoomIn, zoomOut, fitAll, fitSelection, zoomTo, setNodes]);

  // Close context menu on click outside
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    if (contextMenu) {
      window.addEventListener("click", handleClick);
      return () => window.removeEventListener("click", handleClick);
    }
  }, [contextMenu]);

  const toggleFullscreen = useCallback(() => {
    if (!isFullscreen) {
      void containerRef.current?.requestFullscreen();
    } else {
      void document.exitFullscreen();
    }
  }, [isFullscreen]);

  const handleReset = useCallback(() => {
    if (initialNodesRef.current.length > 0) {
      setNodes(initialNodesRef.current.map(node => ({ ...node })));
      setEdges(initialEdgesRef.current.map(edge => ({ ...edge })));
      setCollapsedGroups(new Set());
      setTimeout(() => { void fitView({ padding: 0.3, duration: 300 }); }, 50);
    }
  }, [fitView, setNodes, setEdges]);

  // Double-click to zoom to node
  const handleNodeDoubleClick = useCallback((_event: React.MouseEvent, node: Node) => {
    void fitView({ nodes: [node], padding: 1.5, duration: 500 });
  }, [fitView]);

  // Right-click context menu
  const handleNodeContextMenu = useCallback((event: React.MouseEvent, node: Node) => {
    event.preventDefault();
    const label = (node.data as { label?: string })?.label ?? "";
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      nodeId: node.id,
      nodeLabel: label
    });
  }, []);

  // Context menu actions
  const copyNodeName = useCallback(() => {
    if (contextMenu) {
      void navigator.clipboard.writeText(contextMenu.nodeLabel);
      setContextMenu(null);
    }
  }, [contextMenu]);

  const zoomToNode = useCallback(() => {
    if (contextMenu) {
      const node = nodes.find(n => n.id === contextMenu.nodeId);
      if (node) {
        void fitView({ nodes: [node], padding: 1.5, duration: 500 });
      }
      setContextMenu(null);
    }
  }, [contextMenu, nodes, fitView]);

  const selectChildren = useCallback(() => {
    if (contextMenu) {
      const parentId = contextMenu.nodeId;
      // Find all edges where source is this node or any descendant
      const childIds = new Set<string>();
      const findChildren = (id: string) => {
        edges.forEach(edge => {
          if (edge.source === id) {
            childIds.add(edge.target);
            findChildren(edge.target);
          }
        });
      };
      findChildren(parentId);
      childIds.add(parentId);

      setNodes(nodes.map(n => ({ ...n, selected: childIds.has(n.id) })));
      setContextMenu(null);
    }
  }, [contextMenu, nodes, edges, setNodes]);

  // Build hierarchical tree layout with proper centering
  useEffect(() => {
    if (!data) return;

    const newNodes: Node[] = [];
    const newEdges: Edge[] = [];

    // Node width constants for centering
    const USER_NODE_WIDTH = 180;
    const GROUP_NODE_WIDTH = 140;
    const CATEGORY_NODE_WIDTH = 160;
    const POLICY_NODE_WIDTH = 200;

    // Calculate widths for all groups first
    const groupInfos = data.assignments.map(groupData => ({
      groupData,
      subtree: calculateGroupWidth(groupData.policies)
    }));

    // Total width needed for all groups
    const totalGroupsWidth = groupInfos.reduce((sum, g) => sum + g.subtree.width, 0)
      + (groupInfos.length - 1) * NODE_SPACING * 2;

    // User node at top center
    const userCenterX = totalGroupsWidth / 2;
    const userY = 0;

    newNodes.push({
      id: "root",
      type: rootType,
      position: { x: userCenterX - USER_NODE_WIDTH / 2, y: userY },
      data: rootType === "device"
        ? {
            label: data.user.displayName,
            subtitle: data.user.mail ?? data.user.userPrincipalName
          }
        : {
            label: data.user.displayName,
            email: data.user.mail ?? data.user.userPrincipalName
          },
      style: { border: 'none', background: 'transparent' },
    });

    // Position groups - centered under user as a whole
    let currentGroupX = 0;

    groupInfos.forEach(({ groupData, subtree }) => {
      const groupId = `group-${groupData.group.id}`;
      const isAllUsers = groupData.group.id === "all-users";

      // Group center is in the middle of its subtree width
      const groupCenterX = currentGroupX + subtree.width / 2;
      const groupX = groupCenterX - GROUP_NODE_WIDTH / 2;
      const groupY = LEVEL_HEIGHT;

      newNodes.push({
        id: groupId,
        type: "group",
        position: { x: groupX, y: groupY },
        data: {
          label: groupData.group.displayName,
          policyCount: groupData.policies.length,
          isAllUsers
        },
        style: { border: 'none', background: 'transparent' },
      });

      // Edge from root to group
      newEdges.push({
        id: `edge-root-${groupId}`,
        source: "root",
        target: groupId,
        type: "smoothstep",
        animated: true,
        style: { stroke: isAllUsers ? "#22c55e" : "#3b82f6", strokeWidth: 2 },
      });

      // Calculate total width of categories for this group
      const totalCategoriesWidth = subtree.categories.reduce((sum, cat) => sum + cat.width, 0)
        + (subtree.categories.length - 1) * NODE_SPACING;

      // Start position for categories (centered under group)
      let categoryStartX = groupCenterX - totalCategoriesWidth / 2;

      subtree.categories.forEach((categoryInfo) => {
        const categoryId = `${groupId}-cat-${categoryInfo.name.replace(/\s+/g, "-")}`;

        // Category center is in the middle of its width
        const catCenterX = categoryStartX + categoryInfo.width / 2;
        const catX = catCenterX - CATEGORY_NODE_WIDTH / 2;
        const catY = LEVEL_HEIGHT * 2;

        newNodes.push({
          id: categoryId,
          type: "category",
          position: { x: catX, y: catY },
          data: {
            label: categoryInfo.name,
            policyCount: categoryInfo.policies.length
          },
          style: { border: 'none', background: 'transparent' },
        });

        // Edge from group to category
        newEdges.push({
          id: `edge-${groupId}-${categoryId}`,
          source: groupId,
          target: categoryId,
          type: "smoothstep",
          style: { stroke: "#f59e0b", strokeWidth: 1.5 },
        });

        // Position policies - centered under category
        const policyCount = categoryInfo.policies.length;
        const policiesWidth = policyCount * POLICY_NODE_WIDTH + (policyCount - 1) * NODE_SPACING;
        const policyStartX = catCenterX - policiesWidth / 2;

        categoryInfo.policies.forEach((policy, policyIndex) => {
          const policyId = `${categoryId}-policy-${policy.id}`;
          const policyX = policyStartX + policyIndex * (POLICY_NODE_WIDTH + NODE_SPACING);
          const policyY = LEVEL_HEIGHT * 3;

          newNodes.push({
            id: policyId,
            type: "policy",
            position: { x: policyX, y: policyY },
            data: {
              label: policy.name,
              policyType: policy.type,
              assignmentIntent: policy.assignmentIntent,
              inheritedVia: policy.inheritedVia,
              // Full policy data for details panel
              policyId: policy.id,
              description: policy.description,
              lastModifiedDateTime: policy.lastModifiedDateTime,
              odataType: policy.odataType,
              platform: policy.platform,
              groupId: policy.groupId,
              templateId: policy.templateId,
              templateDisplayName: policy.templateDisplayName,
              technologies: policy.technologies,
              platforms: policy.platforms,
            },
            style: { border: 'none', background: 'transparent' },
          });

          // Edge from category to policy
          newEdges.push({
            id: `edge-${categoryId}-${policyId}`,
            source: categoryId,
            target: policyId,
            type: "smoothstep",
            style: {
              stroke: policy.assignmentIntent === "excluded" ? "#ef4444" :
                policy.assignmentIntent === "available" ? "#3b82f6" : "#22c55e",
              strokeWidth: 1.5
            },
          });
        });

        categoryStartX += categoryInfo.width + NODE_SPACING;
      });

      currentGroupX += subtree.width + NODE_SPACING * 2;
    });

    initialNodesRef.current = newNodes.map(node => ({ ...node }));
    initialEdgesRef.current = newEdges.map(edge => ({ ...edge }));
    setNodes(newNodes);
    setEdges(newEdges);
    setIsLayoutReady(true);
  }, [data, setNodes, setEdges, rootType]);

  // Filter nodes and edges based on collapsed groups
  const visibleNodes = useMemo(() => {
    if (collapsedGroups.size === 0) return nodes;

    return nodes.filter(node => {
      // Always show root node (user or device)
      if (node.type === "user" || node.type === "device") return true;
      // Always show group nodes
      if (node.type === "group") return true;

      // Check if this node's parent group is collapsed
      // Categories have id like "group-xxx-cat-yyy"
      // Policies have id like "group-xxx-cat-yyy-policy-zzz"
      const nodeId = node.id;
      const collapsedArray = Array.from(collapsedGroups);
      for (let i = 0; i < collapsedArray.length; i++) {
        if (nodeId.startsWith(collapsedArray[i] + "-")) {
          return false;
        }
      }
      return true;
    });
  }, [nodes, collapsedGroups]);

  const visibleEdges = useMemo(() => {
    if (collapsedGroups.size === 0) return edges;

    const visibleNodeIds = new Set(visibleNodes.map(n => n.id));
    return edges.filter(edge =>
      visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target)
    );
  }, [edges, collapsedGroups, visibleNodes]);

  // Apply search highlighting to nodes
  const highlightedNodes = useMemo(() => {
    if (matchingNodeIds.size === 0) return visibleNodes;

    return visibleNodes.map(node => ({
      ...node,
      className: matchingNodeIds.has(node.id) ? "search-highlight" : ""
    }));
  }, [visibleNodes, matchingNodeIds]);

  const defaultViewport = useMemo(() => ({ x: 50, y: 50, zoom: 0.5 }), []);

  if (!isLayoutReady) {
    return (
      <div className={cn("flex items-center justify-center", className)}>
        <div className="text-muted-foreground">Building visualization...</div>
      </div>
    );
  }

  return (
    <CollapseContext.Provider value={{ collapsedGroups, toggleCollapse }}>
      <PolicySelectionContext.Provider value={{ selectPolicy }}>
        <div
          ref={containerRef}
          className={cn(
            "w-full h-full [&_.react-flow__node]:!border-none [&_.react-flow__node]:!outline-none [&_.react-flow__node.selected]:!border-none [&_.react-flow__node.selected]:!outline-none [&_.react-flow__node]:!shadow-none",
            isFullscreen && "bg-background",
            className
          )}
        >
        <ReactFlow
          nodes={highlightedNodes}
          edges={visibleEdges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          defaultViewport={defaultViewport}
          fitView
          fitViewOptions={{ padding: 0.3, minZoom: 0.2, maxZoom: 1.5 }}
          minZoom={0.1}
          maxZoom={2}
          proOptions={{ hideAttribution: true }}
          selectionOnDrag={selectionMode}
          selectionMode={SelectionMode.Partial}
          panOnDrag={selectionMode ? [1, 2] : true}
          selectNodesOnDrag={false}
          onNodeDoubleClick={handleNodeDoubleClick}
          onNodeContextMenu={handleNodeContextMenu}
        >
          <Background color="#e5e7eb" gap={20} />
          <MiniMap
            nodeColor={(node) => {
              switch (node.type) {
                case "user": return "#8b5cf6";
                case "device": return "#06b6d4";
                case "group": return "#3b82f6";
                case "category": return "#f59e0b";
                case "policy": return "#22c55e";
                default: return "#9ca3af";
              }
            }}
            maskColor="rgba(0,0,0,0.1)"
            className="bg-white/80 dark:bg-gray-900/80 rounded-lg"
          />

          {/* Toolbar */}
          <Panel position="top-right" className="flex gap-2">
            {/* Zoom Controls */}
            <div className="flex items-center bg-background border border-border rounded-lg shadow-sm overflow-hidden">
              <button
                onClick={zoomOut}
                className="p-2 hover:bg-muted transition-colors"
                title="Zoom out (-)"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="text-xs font-mono w-12 text-center border-x border-border py-2">
                {Math.round(viewport.zoom * 100)}%
              </span>
              <button
                onClick={zoomIn}
                className="p-2 hover:bg-muted transition-colors"
                title="Zoom in (+)"
              >
                <Plus className="h-4 w-4" />
              </button>
              <div className="w-px h-6 bg-border" />
              <button
                onClick={fitAll}
                className="p-2 hover:bg-muted transition-colors"
                title="Fit all (Cmd+0)"
              >
                <Maximize className="h-4 w-4" />
              </button>
              <button
                onClick={fitSelection}
                className={cn(
                  "p-2 transition-colors",
                  selectedCount > 0 ? "hover:bg-muted" : "opacity-40 cursor-not-allowed"
                )}
                title="Fit selection (Cmd+2)"
                disabled={selectedCount === 0}
              >
                <Crosshair className="h-4 w-4" />
              </button>
            </div>

            {/* Mode Toggle */}
            <div className="flex border border-border rounded-lg overflow-hidden shadow-sm">
              <button
                onClick={() => setSelectionMode(false)}
                className={cn(
                  "p-2 transition-all",
                  !selectionMode
                    ? "bg-primary text-primary-foreground"
                    : "bg-background hover:bg-muted"
                )}
                title="Pan mode (hold Space)"
              >
                <Hand className="h-4 w-4" />
              </button>
              <button
                onClick={() => setSelectionMode(true)}
                className={cn(
                  "p-2 transition-all border-l border-border",
                  selectionMode
                    ? "bg-primary text-primary-foreground"
                    : "bg-background hover:bg-muted"
                )}
                title="Selection mode"
              >
                <SquareMousePointer className="h-4 w-4" />
              </button>
            </div>

            {/* Actions */}
            <button
              onClick={() => {
                setShowSearch(!showSearch);
                if (!showSearch) {
                  setTimeout(() => searchInputRef.current?.focus(), 100);
                }
              }}
              className={cn(
                "p-2 rounded-lg border border-border shadow-sm transition-all",
                showSearch ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted"
              )}
              title="Search (Cmd+F)"
            >
              <Search className="h-4 w-4" />
            </button>
            <button
              onClick={handleReset}
              className="p-2 rounded-lg border border-border bg-background hover:bg-muted shadow-sm transition-all"
              title="Reset layout"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-lg border border-border bg-background hover:bg-muted shadow-sm transition-all"
              title={isFullscreen ? "Exit Fullscreen (Esc)" : "Enter Fullscreen"}
            >
              {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
            </button>
          </Panel>

          {/* Search Panel */}
          {showSearch && (
            <Panel position="top-center" className="mt-2">
              <div className="flex items-center gap-2 bg-background border border-border rounded-lg shadow-lg px-3 py-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search nodes..."
                  className="bg-transparent outline-none text-sm w-48 placeholder:text-muted-foreground"
                />
                {searchQuery && (
                  <span className="text-xs text-muted-foreground">
                    {matchingNodeIds.size} found
                  </span>
                )}
                <button
                  onClick={() => {
                    setShowSearch(false);
                    setSearchQuery("");
                  }}
                  className="p-1 hover:bg-muted rounded"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            </Panel>
          )}

          {/* Selection Info Panel */}
          {selectedCount > 0 && (
            <Panel position="bottom-right" className="mb-2 mr-2">
              <div className="bg-background/95 backdrop-blur-sm border border-border rounded-lg px-3 py-2 shadow-lg flex items-center gap-3">
                <span className="text-sm font-medium">
                  {selectedCount} selected
                </span>
                <button
                  onClick={fitSelection}
                  className="p-1.5 hover:bg-muted rounded transition-colors"
                  title="Fit to selection"
                >
                  <Crosshair className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setNodes(nodes.map(n => ({ ...n, selected: false })))}
                  className="p-1.5 hover:bg-muted rounded transition-colors"
                  title="Deselect all (Esc)"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </Panel>
          )}
        </ReactFlow>

        {/* Context Menu */}
        {contextMenu && (
          <div
            className="fixed bg-background border border-border rounded-lg shadow-xl py-1 z-50 min-w-[160px]"
            style={{ left: contextMenu.x, top: contextMenu.y }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={copyNodeName}
              className="w-full px-3 py-2 text-sm text-left hover:bg-muted flex items-center gap-2"
            >
              <Copy className="h-4 w-4" />
              Copy name
            </button>
            <button
              onClick={zoomToNode}
              className="w-full px-3 py-2 text-sm text-left hover:bg-muted flex items-center gap-2"
            >
              <ZoomIn className="h-4 w-4" />
              Zoom to
            </button>
            <button
              onClick={selectChildren}
              className="w-full px-3 py-2 text-sm text-left hover:bg-muted flex items-center gap-2"
            >
              <SquareMousePointer className="h-4 w-4" />
              Select children
            </button>
          </div>
        )}

        {/* Policy Details Panel */}
        <PolicyDetailsPanel
          policy={selectedPolicy}
          onClose={() => setSelectedPolicy(null)}
          getAccessToken={getAccessToken}
        />
        </div>
      </PolicySelectionContext.Provider>
    </CollapseContext.Provider>
  );
}

export function AssignmentTree({ data, className, rootType, getAccessToken }: AssignmentTreeProps) {
  return (
    <ReactFlowProvider>
      <AssignmentTreeInner data={data} className={className} rootType={rootType} getAccessToken={getAccessToken} />
    </ReactFlowProvider>
  );
}
