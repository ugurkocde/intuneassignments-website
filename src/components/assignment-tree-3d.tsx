"use client";

import { useRef, useMemo, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Text, Float, Line, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import type { UserAssignmentData, UserAssignmentPolicy } from "~/types/user";
import type { GestureState } from "~/hooks/useHandGestures";

// Node types for the visualization
type NodeType = "user" | "group" | "category" | "policy";

interface Node3D {
  id: string;
  type: NodeType;
  label: string;
  position: [number, number, number];
  color: string;
  glowColor: string;
  size: number;
  children: string[];
  parentId?: string;
  metadata?: {
    email?: string;
    policyCount?: number;
    assignmentIntent?: string;
    inheritedVia?: string;
  };
}

interface Connection {
  from: string;
  to: string;
  color: string;
}

// Glowing sphere node
function GlowNode({
  node,
  isHovered,
  onHover,
  onUnhover
}: {
  node: Node3D;
  isHovered: boolean;
  onHover: () => void;
  onUnhover: () => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      // Gentle floating animation
      meshRef.current.position.y = node.position[1] + Math.sin(state.clock.elapsedTime + node.position[0]) * 0.1;
    }
    if (glowRef.current) {
      // Pulse the glow
      const scale = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.1;
      glowRef.current.scale.setScalar(scale);
    }
  });

  const nodeSize = isHovered ? node.size * 1.2 : node.size;

  return (
    <group position={node.position}>
      <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.3}>
        {/* Glow effect */}
        <mesh ref={glowRef} scale={1.5}>
          <sphereGeometry args={[nodeSize, 32, 32]} />
          <meshBasicMaterial
            color={node.glowColor}
            transparent
            opacity={isHovered ? 0.4 : 0.2}
          />
        </mesh>

        {/* Main sphere */}
        <mesh
          ref={meshRef}
          onPointerOver={onHover}
          onPointerOut={onUnhover}
        >
          <sphereGeometry args={[nodeSize, 32, 32]} />
          <meshStandardMaterial
            color={node.color}
            emissive={node.glowColor}
            emissiveIntensity={isHovered ? 0.5 : 0.2}
            roughness={0.3}
            metalness={0.8}
          />
        </mesh>

        {/* Label */}
        <Text
          position={[0, nodeSize + 0.3, 0]}
          fontSize={0.25}
          color="white"
          anchorX="center"
          anchorY="bottom"
          outlineWidth={0.02}
          outlineColor="black"
        >
          {node.label.length > 20 ? node.label.substring(0, 20) + "..." : node.label}
        </Text>

        {/* Subtitle for hovered nodes */}
        {isHovered && node.metadata?.inheritedVia && (
          <Text
            position={[0, -nodeSize - 0.2, 0]}
            fontSize={0.15}
            color="#aaaaaa"
            anchorX="center"
            anchorY="top"
          >
            via {node.metadata.inheritedVia}
          </Text>
        )}
      </Float>
    </group>
  );
}

// Connection line between nodes
function ConnectionLine({ start, end, color }: { start: [number, number, number]; end: [number, number, number]; color: string }) {
  const points = useMemo(() => {
    // Create a curved line
    const midPoint: [number, number, number] = [
      (start[0] + end[0]) / 2,
      (start[1] + end[1]) / 2 + 0.5,
      (start[2] + end[2]) / 2
    ];
    return [start, midPoint, end];
  }, [start, end]);

  return (
    <Line
      points={points}
      color={color}
      lineWidth={1}
      transparent
      opacity={0.6}
    />
  );
}

// Camera controller that responds to hand gestures
// Pinch to activate: move left/right to rotate, up/down to zoom
function GestureController({ gestureState }: { gestureState: GestureState }) {
  const { camera } = useThree();
  const targetZoom = useRef(15);
  const targetRotation = useRef({ x: 0, y: 0 });

  useFrame(() => {
    if (gestureState.isTracking) {
      // Apply zoom (only non-zero in zoom mode)
      if (gestureState.zoom !== 0) {
        targetZoom.current = Math.max(5, Math.min(30, targetZoom.current - gestureState.zoom * 5));
      }

      // Apply rotation (only non-zero in rotate mode)
      targetRotation.current.x += gestureState.rotationX * 0.08;
      targetRotation.current.y += gestureState.rotationY * 0.08;

      // Clamp vertical rotation to avoid flipping
      targetRotation.current.y = Math.max(-1.2, Math.min(1.2, targetRotation.current.y));
    }

    // Smoothly interpolate camera position
    const radius = targetZoom.current;
    const targetX = Math.sin(targetRotation.current.x) * radius;
    const targetY = Math.sin(targetRotation.current.y) * radius * 0.7 + 2;
    const targetZ = Math.cos(targetRotation.current.x) * radius;

    camera.position.x += (targetX - camera.position.x) * 0.08;
    camera.position.y += (targetY - camera.position.y) * 0.08;
    camera.position.z += (targetZ - camera.position.z) * 0.08;
    camera.lookAt(0, 0, 0);
  });

  return null;
}

// Main 3D scene
function Scene({
  data,
  gestureState,
  gestureEnabled
}: {
  data: UserAssignmentData;
  gestureState: GestureState;
  gestureEnabled: boolean;
}) {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  // Build nodes and connections from data
  const { nodes, connections } = useMemo(() => {
    const nodes: Node3D[] = [];
    const connections: Connection[] = [];

    // User node at center
    nodes.push({
      id: "user",
      type: "user",
      label: data.user.displayName,
      position: [0, 0, 0],
      color: "#8b5cf6",
      glowColor: "#a78bfa",
      size: 0.8,
      children: [],
      metadata: { email: data.user.mail ?? data.user.userPrincipalName }
    });

    // Position groups in a circle around user
    const groupCount = data.assignments.length;
    const groupRadius = 5;

    data.assignments.forEach((groupData, groupIndex) => {
      const angle = (groupIndex / groupCount) * Math.PI * 2;
      const groupX = Math.cos(angle) * groupRadius;
      const groupZ = Math.sin(angle) * groupRadius;
      const isAllUsers = groupData.group.id === "all-users";

      const groupId = `group-${groupData.group.id}`;

      nodes.push({
        id: groupId,
        type: "group",
        label: groupData.group.displayName,
        position: [groupX, 0, groupZ],
        color: isAllUsers ? "#22c55e" : "#3b82f6",
        glowColor: isAllUsers ? "#4ade80" : "#60a5fa",
        size: 0.5,
        children: [],
        parentId: "user",
        metadata: { policyCount: groupData.policies.length }
      });

      connections.push({
        from: "user",
        to: groupId,
        color: isAllUsers ? "#22c55e" : "#3b82f6"
      });

      // Categorize policies
      const categories = new Map<string, UserAssignmentPolicy[]>();
      groupData.policies.forEach(policy => {
        let category: string = policy.type;
        if (policy.type.startsWith("Endpoint Security")) category = "Endpoint Security";
        if (policy.type.startsWith("Cloud PC")) category = "Cloud PC";

        if (!categories.has(category)) categories.set(category, []);
        categories.get(category)!.push(policy);
      });

      // Position categories around their group
      const catRadius = 2.5;
      let catIndex = 0;
      const catCount = categories.size;

      categories.forEach((policies, categoryName) => {
        const catAngle = angle + ((catIndex / catCount) - 0.5) * Math.PI * 0.5;
        const catX = groupX + Math.cos(catAngle) * catRadius;
        const catZ = groupZ + Math.sin(catAngle) * catRadius;
        const catY = 0.5;

        const catId = `${groupId}-cat-${categoryName.replace(/\s+/g, "-")}`;

        nodes.push({
          id: catId,
          type: "category",
          label: categoryName,
          position: [catX, catY, catZ],
          color: "#f59e0b",
          glowColor: "#fbbf24",
          size: 0.35,
          children: [],
          parentId: groupId,
          metadata: { policyCount: policies.length }
        });

        connections.push({
          from: groupId,
          to: catId,
          color: "#f59e0b"
        });

        // Position policies around their category
        const policyRadius = 1.5;
        policies.forEach((policy, policyIndex) => {
          const policyAngle = catAngle + ((policyIndex / policies.length) - 0.5) * Math.PI * 0.4;
          const policyX = catX + Math.cos(policyAngle) * policyRadius;
          const policyZ = catZ + Math.sin(policyAngle) * policyRadius;
          const policyY = 1;

          const policyColor = policy.assignmentIntent === "excluded" ? "#ef4444" :
            policy.assignmentIntent === "available" ? "#3b82f6" : "#22c55e";
          const policyGlow = policy.assignmentIntent === "excluded" ? "#f87171" :
            policy.assignmentIntent === "available" ? "#60a5fa" : "#4ade80";

          const policyId = `${catId}-policy-${policy.id}`;

          nodes.push({
            id: policyId,
            type: "policy",
            label: policy.name,
            position: [policyX, policyY, policyZ],
            color: policyColor,
            glowColor: policyGlow,
            size: 0.2,
            children: [],
            parentId: catId,
            metadata: {
              assignmentIntent: policy.assignmentIntent,
              inheritedVia: policy.inheritedVia
            }
          });

          connections.push({
            from: catId,
            to: policyId,
            color: policyColor
          });
        });

        catIndex++;
      });
    });

    return { nodes, connections };
  }, [data]);

  // Create position lookup for connections
  const positionMap = useMemo(() => {
    const map = new Map<string, [number, number, number]>();
    nodes.forEach(node => map.set(node.id, node.position));
    return map;
  }, [nodes]);

  return (
    <>
      {/* Ambient light */}
      <ambientLight intensity={0.3} />

      {/* Point lights for dramatic effect */}
      <pointLight position={[10, 10, 10]} intensity={1} color="#ffffff" />
      <pointLight position={[-10, -10, -10]} intensity={0.5} color="#8b5cf6" />
      <pointLight position={[0, 10, 0]} intensity={0.5} color="#3b82f6" />

      {/* Stars background */}
      <mesh>
        <sphereGeometry args={[50, 32, 32]} />
        <meshBasicMaterial color="#0a0a0f" side={THREE.BackSide} />
      </mesh>

      {/* Connections */}
      {connections.map((conn, i) => {
        const from = positionMap.get(conn.from);
        const to = positionMap.get(conn.to);
        if (!from || !to) return null;
        return <ConnectionLine key={i} start={from} end={to} color={conn.color} />;
      })}

      {/* Nodes */}
      {nodes.map(node => (
        <GlowNode
          key={node.id}
          node={node}
          isHovered={hoveredNode === node.id}
          onHover={() => setHoveredNode(node.id)}
          onUnhover={() => setHoveredNode(null)}
        />
      ))}

      {/* Camera controls */}
      {gestureEnabled ? (
        <GestureController gestureState={gestureState} />
      ) : (
        <OrbitControls
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          minDistance={5}
          maxDistance={30}
        />
      )}
    </>
  );
}

interface AssignmentTree3DProps {
  data: UserAssignmentData;
  gestureState: GestureState;
  gestureEnabled: boolean;
  className?: string;
}

export function AssignmentTree3D({
  data,
  gestureState,
  gestureEnabled,
  className
}: AssignmentTree3DProps) {
  return (
    <div className={className} style={{ width: "100%", height: "100%" }}>
      <Canvas
        camera={{ position: [0, 5, 15], fov: 60 }}
        gl={{ antialias: true }}
      >
        <Scene
          data={data}
          gestureState={gestureState}
          gestureEnabled={gestureEnabled}
        />
      </Canvas>
    </div>
  );
}
