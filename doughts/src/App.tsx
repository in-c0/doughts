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
  MarkerType,
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
        overflow: "hidden",
      }}
    >
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
          pointerEvents: nodesConnectable ? "all" : "none",
        }}
      />
    </div>
  );
};

/* ---------- Node Types ---------- */
const nodeTypes = {
  single: SingleHandleNode,
};

export default function App() {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [root, setRoot] = useState<string | null>(null);

  const [mode, setMode] = useState<"pan" | "select" | "connect">("select");

  // 👈 Markdown Panel State
  const [activeNote, setActiveNote] = useState<string>("");
  const [activeNode, setActiveNode] = useState<string | null>(null);

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
            data: {
              label: folder.name,
              path: `${root}/${folder.name}/note.md`, // 👈 Important: direct file path
              folderPath: `${root}/${folder.name}`,   // 👈 Important: base folder path
            },
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

  /* ---------- Open Note (Left Click) ---------- */
  const onNodeClick = useCallback(async (_: any, node: any) => {
    try {
      const content = await readTextFile(node.data.path);
      setActiveNote(content);
      setActiveNode(node.id);
    } catch (err) {
      console.error("Failed to read markdown:", err);
      setActiveNote("(no note.md found)");
      setActiveNode(node.id); // 👈 Ensures the UI still updates to show the selected node
    }
  }, []);

  /* ---------- Open Folder (Right Click) ---------- */
  const onNodeContextMenu = useCallback(async (e: any, node: any) => {
    e.preventDefault();
    const fullPath = node.data.folderPath.replace(/\//g, "\\");
    
    try {
      await Command.create("explorer", [fullPath]).execute();
    } catch (err) {
      console.error(err);
    }
  }, []);

  return (
    // 👈 Split UI Container
    <div style={{ display: "flex", width: "100vw", height: "100vh" }}>
      
      {/* 👈 LEFT: Graph Area */}
      <div
        style={{
          flex: 1,
          position: "relative",
          cursor:
            mode === "pan"
              ? "grab"
              : mode === "connect"
              ? "crosshair"
              : "default",
        }}
      >
        {/* UI Overlay */}
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

          {/* Mode buttons */}
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

        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          
          onNodeClick={onNodeClick}             // 👈 Left Click
          onNodeContextMenu={onNodeContextMenu} // 👈 Right Click

          nodesDraggable={mode === "select"}
          elementsSelectable={mode === "select"}
          nodesConnectable={mode === "connect"}

          panOnDrag={mode === "pan"}
          panOnScroll={true}

          connectionMode={ConnectionMode.Loose}
          connectionRadius={30}

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

      {/* 👈 RIGHT: Markdown Viewer Panel */}
      <div
        style={{
          width: "400px",
          background: "#111",
          color: "#fff",
          padding: 16,
          overflow: "auto",
          borderLeft: "1px solid #333",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <h3 style={{ margin: "0 0 16px 0", borderBottom: "1px solid #333", paddingBottom: "8px" }}>
          {activeNode ? `📝 ${activeNode}` : "No node selected"}
        </h3>
        <pre style={{ whiteSpace: "pre-wrap", margin: 0, fontFamily: "inherit" }}>
          {activeNote || "Click a node to read its markdown content."}
        </pre>
      </div>

    </div>
  );
}