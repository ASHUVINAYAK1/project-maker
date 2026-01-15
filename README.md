# 🚀 Project Maker

> AI-powered desktop application that transforms project descriptions into executable features through a visual Kanban workflow.

![Tauri](https://img.shields.io/badge/Tauri-2.0-blue?logo=tauri)
![React](https://img.shields.io/badge/React-18-61dafb?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178c6?logo=typescript)
![License](https://img.shields.io/badge/License-MIT-green)

## ✨ Features

- **🎯 Visual Kanban Board** - Manage features through 5 status columns (Backlog → Todo → In Progress → In Review → Done)
- **🤖 AI Feature Generation** - Describe your project, let AI generate detailed features with acceptance criteria
- **⚡ Automation Pipeline** - Moving features to "Todo" triggers automatic implementation via AI CLI tools
- **🔧 Multi-CLI Support** - Works with Claude CLI, Gemini CLI, Aider, or ForgeCode
- **📦 GitHub Integration** - Auto-create branches, commits, and pull requests
- **💾 Local Storage** - All data persisted locally with SQLite
- **🎨 Modern UI** - Beautiful dark theme with glassmorphism effects

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

### Required

1. **Node.js 20+** and **pnpm**
   ```bash
   # Install pnpm if you haven't
   npm install -g pnpm
   ```

2. **Visual Studio Build Tools** (Windows only)
   
   Rust on Windows requires the MSVC linker. Install Build Tools:
   ```powershell
   winget install Microsoft.VisualStudio.2022.BuildTools --override "--wait --passive --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"
   ```
   After installation, **restart your terminal**.

3. **Rust** (for Tauri)
   ```bash
   # Windows (PowerShell)
   winget install Rustlang.Rustup
   
   # macOS/Linux
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   ```
   
   After installation, restart your terminal or run:
   ```bash
   # Add cargo to PATH (Windows PowerShell)
   $env:Path = "$env:USERPROFILE\.cargo\bin;$env:Path"
   
   # Verify installation
   cargo --version
   rustc --version
   ```

### Optional (for AI features)

4. **Ollama** - Local LLM for feature generation
   ```bash
   # Download from https://ollama.ai
   # Then pull a coding model:
   ollama pull qwen2.5-coder:7b
   ```

5. **AI CLI Tool** (one of the following):
   ```bash
   # Claude CLI (recommended)
   npm install -g @anthropic-ai/claude-cli
   
   # OR Gemini CLI
   npm install -g @google/gemini-cli
   
   # OR Aider
   pip install aider-chat
   ```

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/project-maker.git
   cd project-maker
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Run in development mode**
   
   **Web preview (for quick testing):**
   ```bash
   pnpm dev
   # Opens at http://localhost:1420
   ```
   
   **Desktop app (full experience):**
   ```bash
   pnpm tauri dev
   # Opens native desktop window
   ```

## 📦 Building for Production

```bash
# Build the desktop application
pnpm tauri build

# Output locations:
# Windows: src-tauri/target/release/bundle/msi/
# macOS:   src-tauri/target/release/bundle/dmg/
# Linux:   src-tauri/target/release/bundle/appimage/
```

## 🏗️ Project Structure

```
project-maker/
├── src/                      # React frontend
│   ├── components/
│   │   ├── layout/          # Sidebar, Header
│   │   ├── kanban/          # KanbanBoard, FeatureCard
│   │   ├── project/         # CreateProjectDialog
│   │   └── ui/              # Button, Input, Dialog, etc.
│   ├── stores/              # Zustand state management
│   ├── types/               # TypeScript interfaces
│   └── lib/                 # Utilities
├── src-tauri/               # Rust backend
│   ├── src/                 # Tauri commands
│   └── tauri.conf.json      # Tauri configuration
└── docs/                    # Documentation
```

## 🗺️ Roadmap

### Phase 1: Core Desktop App ✅
- [x] Tauri + React + Vite setup
- [x] Kanban board with drag-and-drop
- [x] Project and feature CRUD
- [x] Zustand state management
- [x] Modern UI with Tailwind CSS

### Phase 2: LLM Integration 🚧
- [ ] Ollama API client
- [ ] Feature generation from project description
- [ ] Feature preview and editing
- [ ] Model selection in settings

### Phase 3: CLI Automation 📋
- [ ] Shell execution via Tauri
- [ ] CLI executor for Claude/Gemini
- [ ] Build and test runners
- [ ] Terminal output display (xterm.js)

### Phase 4: GitHub Integration 📋
- [ ] Git operations (branch, commit, push)
- [ ] PR creation via GitHub CLI/API
- [ ] Secure token storage

### Phase 5: Polish 📋
- [ ] SQLite database migration
- [ ] E2E tests with Playwright
- [ ] Cross-platform installers

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Tauri](https://tauri.app/) - Desktop framework
- [React](https://react.dev/) - UI library
- [dnd-kit](https://dndkit.com/) - Drag and drop
- [Zustand](https://zustand-demo.pmnd.rs/) - State management
- [shadcn/ui](https://ui.shadcn.com/) - UI components inspiration
- [Ollama](https://ollama.ai/) - Local LLM runtime

---

<p align="center">
  Made with ❤️ for developers who love AI-powered workflows
</p>
