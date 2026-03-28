import React, { useCallback, useEffect, useState } from "react";
import ReactFlow, {
  addEdge,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
} from "reactflow";
import "reactflow/dist/style.css";

import {
  readDir,
  readTextFile,
  writeTextFile,
} from "@tauri-apps/plugin-fs";

import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { open as openPath } from "@tauri-apps/plugin-shell";

export default function App() {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [root, setRoot] = useState<string | null>(null);

  // 🔹 Pick folder
  const pickFolder = async () => {
    const selected = await openDialog({
      directory: true,
      multiple: false,
    });

    if (selected && typeof selected === "string") {
      console.log("Picked:", selected);
      setRoot(selected);
    }
  };

  // 🔹 Load folders → nodes
  useEffect(() => {
    if (!root) return;

    const loadFolders = async () => {
      try {
        const entries = await readDir(root, { recursive: false });

        const folders = entries
          .filter((e) => e.isDirectory)
          .map((folder, i) => ({
            id: folder.name!,
            data: { label: folder.name },
            position: { x: i * 250, y: 100 },
          }));

        setNodes(folders);
      } catch (err) {
        console.error("ERROR:", err);
      }
    };

    loadFolders();
  }, [root]);

  // 🔹 Load edges
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

  // 🔹 Save edges
  const onConnect = useCallback((params: any) => {
    setEdges((eds) => {
      const updated = addEdge(params, eds);
      writeTextFile("edges.json", JSON.stringify(updated));
      return updated;
    });
  }, []);

  // 🔥 Open folder on node click
  const onNodeClick = useCallback(
    (_: any, node: any) => {
        if (!root) return;

        const fullPath = `${root}/${node.id}`.replace(/\\/g, "/");

        console.log("Opening:", fullPath);

        openPath(`file://${fullPath}`);
    },
    [root]
  );

  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      {/* UI overlay */}
      <div
        style={{
          position: "absolute",
          top: 10,
          left: 10,
          zIndex: 10,
          background: "white",
          padding: 10,
          borderRadius: 8,
        }}
      >
        <button onClick={pickFolder}>Select Folder</button>
        <div style={{ marginTop: 8, fontSize: 12 }}>
          {root || "No folder selected"}
        </div>
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        fitView
      >
        <MiniMap />
        <Controls />
        <Background />
      </ReactFlow>
    </div>
  );
}