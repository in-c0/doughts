import React, { useCallback, useEffect, useState } from "react";
import ReactFlow, {
  addEdge,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
  ConnectionMode,
  useStore,
  MarkerType, // 👈 Added for the arrowheads
} from "reactflow";
import "reactflow/dist/style.css";

import {
  readDir,
  readTextFile,
  writeTextFile,
} from "@tauri-apps/plugin-fs";

import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { Command } from "@tauri-apps/plugin-shell";

/* ---------- Node (hidden handle) ---------- */
const SingleHandleNode = ({ data }: any) => {
  // Grab connection state to toggle pointer events
  const nodesConnectable = useStore((state) => state.nodesConnectable);

  return (
    <div
      style={{
        position: "relative",
        padding: 10,
        border: "1px solid #888",
        borderRadius: 6,
        background: "#1e1e1e",
        color: "#fff",
        textAlign: "center",
        overflow: "hidden", // 👈 Keeps the handle from overflowing the rounded corners
      }}
    >
      {/* visible content */}
      <div>{data.label}</div>

      {/* FULL-NODE COVERAGE HANDLE */}
      <Handle
        type="source"
        position={Position.Top}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          transform: "none",
          border: "none",
          borderRadius: 0,
          opacity: 0,
          minWidth: "auto",
          minHeight: "auto",
          // Let clicks pass through to the node if we aren't connecting
          pointerEvents: nodesConnectable ? "all" : "none",
        }}
      />
    </div>
  );
};

/* ---------- Node Types ---------- */
// 👈 Moved outside the component to prevent unnecessary re-renders
const nodeTypes = {
  single: SingleHandleNode,
};

export default function App() {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [root, setRoot] = useState<string | null>(null);

  const [mode, setMode] = useState<"pan" | "select" | "connect">("select");

  /* ---------- Folder picker ---------- */
  const pickFolder = async () => {
    const selected = await openDialog({
      directory: true,
      multiple: false,
    });

    if (selected && typeof selected === "string") {
      setRoot(selected);
    }
  };

  /* ---------- Load folders ---------- */
  useEffect(() => {
    if (!root) return;

    const loadFolders = async () => {
      try {
        const entries = await readDir(root, { recursive: false });

        const folders = entries
          .filter((e) => e.isDirectory)
          .map((folder, i) => ({
            id: folder.name!,
            type: "single",
            data: { label: folder.name },
            position: { x: i * 250, y: 100 },
          }));

        setNodes(folders);
      } catch (err) {
        console.error(err);
      }
    };

    loadFolders();
  }, [root]);

  /* ---------- Load edges ---------- */
  useEffect(() => {
    const loadEdges = async () => {
      try {
        const data = await readTextFile("edges.json");
        setEdges(JSON.parse(data));
      } catch {
        setEdges([]);
      }
    };

    loadEdges();
  }, []);

  /* ---------- Save edges ---------- */
  const onConnect = useCallback((params: any) => {
    setEdges((eds) => {
      const updated = addEdge(params, eds);
      writeTextFile("edges.json", JSON.stringify(updated));
      return updated;
    });
  }, []);

  /* ---------- Open folder ---------- */
  const onNodeClick = useCallback(
    async (_: any, node: any) => {
      if (!root) return;

      const fullPath = `${root}/${node.id}`.replace(/\//g, "\\");

      try {
        await Command.create("explorer", [fullPath]).execute();
      } catch (err) {
        console.error(err);
      }
    },
    [root]
  );

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        cursor:
          mode === "pan"
            ? "grab"
            : mode === "connect"
            ? "crosshair"
            : "default",
      }}
    >
      {/* ---------- UI ---------- */}
      <div
        style={{
          position: "absolute",
          top: 10,
          left: 10,
          zIndex: 10,
          background: "#1e1e1e",
          color: "#fff",
          padding: 10,
          borderRadius: 8,
        }}
      >
        <button onClick={pickFolder}>Select Folder</button>

        <div style={{ marginTop: 8 }}>
          {root || "No folder selected"}
        </div>

        {/* mode buttons */}
        <div style={{ marginTop: 10 }}>
          {["pan", "select", "connect"].map((m) => (
            <button
              key={m}
              onClick={() => setMode(m as any)}
              style={{
                marginRight: 5,
                padding: "4px 8px",
                background: mode === m ? "#4cafef" : "#444",
                color: "#fff",
                border: "none",
                borderRadius: 4,
                cursor: "pointer",
              }}
            >
              {m.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* ---------- Graph ---------- */}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}

        nodesDraggable={mode === "select"}
        elementsSelectable={mode === "select"}
        nodesConnectable={mode === "connect"}

        panOnDrag={mode === "pan"}
        panOnScroll={true}

        connectionMode={ConnectionMode.Loose}
        connectionRadius={30}

        // 👈 Added arrowheads to the default edge options
        defaultEdgeOptions={{ 
          type: "smoothstep",
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 20,
            height: 20,
            color: '#b1b1b7',
          },
        }}
        fitView
      >
        <MiniMap />
        <Controls />
        <Background />
      </ReactFlow>
    </div>
  );
}