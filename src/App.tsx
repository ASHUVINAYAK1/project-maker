import { useState, useEffect } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { KanbanBoard } from './components/kanban';
import { CreateProjectDialog, CreateFeatureDialog } from './components/project';
import { GenerateFeaturesDialog } from './components/llm';
import { SettingsDialog } from './components/settings';
import { useSettingsStore, useProjectStore, useFeatureStore } from './stores';
import type { Feature } from './types';

function App() {
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [isCreateFeatureOpen, setIsCreateFeatureOpen] = useState(false);
  const [isGenerateFeaturesOpen, setIsGenerateFeaturesOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [editingFeature, setEditingFeature] = useState<Feature | null>(null);

  const initSettings = useSettingsStore((state) => state.init);
  const initProjects = useProjectStore((state) => state.init);
  const initFeatures = useFeatureStore((state) => state.init);
  const activeProjectId = useProjectStore((state) => state.activeProjectId);

  // Initialize data on mount
  useEffect(() => {
    const initData = async () => {
      await initSettings();
      await initProjects();
    };
    initData();
  }, [initSettings, initProjects]);

  // Load features when active project changes
  useEffect(() => {
    if (activeProjectId) {
      initFeatures(activeProjectId);
    }
  }, [activeProjectId, initFeatures]);

  const handleEditFeature = (feature: Feature) => {
    setEditingFeature(feature);
    setIsCreateFeatureOpen(true);
  };

  const handleCloseFeatureDialog = () => {
    setIsCreateFeatureOpen(false);
    setEditingFeature(null);
  };

  const handleOpenCreateFeature = () => {
    setEditingFeature(null);
    setIsCreateFeatureOpen(true);
  };

  const handleGenerateFeatures = () => {
    setIsGenerateFeaturesOpen(true);
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden">
      {/* Background gradient */}
      <div className="fixed inset-0 gradient-mesh opacity-50 pointer-events-none" />

      {/* Sidebar */}
      <Sidebar
        onCreateProject={() => setIsCreateProjectOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        <Header onGenerateFeatures={handleGenerateFeatures} />

        <KanbanBoard
          onAddFeature={handleOpenCreateFeature}
          onEditFeature={handleEditFeature}
        />
      </main>

      {/* Dialogs */}
      <CreateProjectDialog
        open={isCreateProjectOpen}
        onClose={() => setIsCreateProjectOpen(false)}
      />

      <CreateFeatureDialog
        open={isCreateFeatureOpen}
        onClose={handleCloseFeatureDialog}
        editFeature={editingFeature}
      />

      <GenerateFeaturesDialog
        open={isGenerateFeaturesOpen}
        onClose={() => setIsGenerateFeaturesOpen(false)}
      />

      <SettingsDialog
        open={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
}

export default App;
