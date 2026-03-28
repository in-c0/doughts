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
} from "reactflow";
import "reactflow/dist/style.css";

import {
  readDir,
  readTextFile,
  writeTextFile,
} from "@tauri-apps/plugin-fs";

import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { Command } from "@tauri-apps/plugin-shell";

/* ---------- Custom Node (ONE handle) ---------- */
const SingleHandleNode = ({ data }: any) => {
  return (
    <div
      style={{
        padding: 10,
        border: "1px solid #888",
        borderRadius: 6,
        background: "#1e1e1e",
        color: "#fff",
        position: "relative",
      }}
    >
      {data.label}

      <Handle
        type="source"
        position={Position.Right}
        style={{
          background: "#aaa",
          width: 8,
          height: 8,
        }}
      />
    </div>
  );
};

export default function App() {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [root, setRoot] = useState<string | null>(null);

  // 🔥 optional mode system
  const [mode, setMode] = useState<"pan" | "select" | "connect">("select");

  const nodeTypes = {
    single: SingleHandleNode,
  };

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
    console.log("CONNECT:", params);

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
    <div style={{ width: "100vw", height: "100vh" }}>
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

        <div style={{ marginTop: 8 }}>{root || "No folder selected"}</div>

        {/* Mode controls */}
        <div style={{ marginTop: 10 }}>
          <button onClick={() => setMode("pan")}>Pan</button>
          <button onClick={() => setMode("select")}>Select</button>
          <button onClick={() => setMode("connect")}>Connect</button>
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

        /* 🔥 interaction modes */
        nodesDraggable={mode === "select"}
        elementsSelectable={mode === "select"}
        nodesConnectable={mode === "connect"}

        panOnDrag={mode === "pan"}
        panOnScroll={true}

        /* 🔥 CRITICAL FIX */
        connectionMode={ConnectionMode.Loose}

        fitView
        defaultEdgeOptions={{ type: "smoothstep" }}
        connectionRadius={30}
      >
        <MiniMap />
        <Controls />
        <Background />
      </ReactFlow>
    </div>
  );
}