import React, { useCallback, useEffect } from "react";
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

const ROOT = "D:/Projects/doughts/doughts/sample_templates/default";

export default function App() {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // 🔹 Load folders → nodes
  useEffect(() => {
    const loadFolders = async () => {
        try {
        const entries = await readDir(ROOT, { recursive: false });

        console.log("ENTRIES:", entries); // 👈 ADD THIS

        const folders = entries
            .filter((e) => e.isDirectory)
            .map((folder, i) => ({
            id: folder.name!,
            data: { label: folder.name },
            position: { x: i * 250, y: 100 },
            }));

        console.log("FOLDERS:", folders); // 👈 ADD THIS

        setNodes(folders);
        } catch (err) {
        console.error("ERROR:", err);
        }
    };

    loadFolders();
    }, []);

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

  // 🔹 Save edges when connecting
  const onConnect = useCallback((params: any) => {
    setEdges((eds) => {
      const updated = addEdge(params, eds);
      writeTextFile("edges.json", JSON.stringify(updated));
      return updated;
    });
  }, []);

  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
      >
        <MiniMap />
        <Controls />
        <Background />
      </ReactFlow>
    </div>
  );
}