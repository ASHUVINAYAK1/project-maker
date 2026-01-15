import React, { useState } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { KanbanBoard } from './components/kanban';
import { CreateProjectDialog, CreateFeatureDialog } from './components/project';
import { useSettingsStore } from './stores';
import type { Feature } from './types';

function App() {
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [isCreateFeatureOpen, setIsCreateFeatureOpen] = useState(false);
  const [editingFeature, setEditingFeature] = useState<Feature | null>(null);
  const [_isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Apply theme on mount
  React.useEffect(() => {
    const theme = useSettingsStore.getState().settings.theme;
    const root = document.documentElement;

    if (theme === 'system') {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.add(isDark ? 'dark' : 'light');
    } else {
      root.classList.add(theme);
    }
  }, []);

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
    // TODO: Open LLM feature generation dialog
    console.log('Generate features clicked');
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
    </div>
  );
}

export default App;
