


# Doughts

Doughts is a notetaking app, or more precisely, a knowledge graph / "thought organizer" in the form of a filesystem represented as a directed graph.

Imagine Obsidian (files + folders + markdown) that treats objects in hierarchy (folders or clusters) as nodes that shows directed relationships (A → B → C) in a graph. That's what Doughts does within your local filesystem.
Heptabase comes close to this concept, but it's not open-sourced and it's not free, so I'm making this.

Start with `npm install` and `npm run tauri dev`

# Import dependency

Doughts uses Tauri/Rust backend + React (Typescript) frontend.
Whenever you install an npm package:
```
npm install @tauri-apps/plugin-XYZ
```
Remember to ALSO run:
```
cd src-tauri
cargo add tauri-plugin-XYZ
```