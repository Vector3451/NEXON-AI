import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import DashboardView from './views/DashboardView';
import ScenarioBrowserView from './views/ScenarioBrowserView';
import SettingsView from './views/SettingsView';

import { AppProvider } from './context/AppContext';

function App() {
  return (
    <AppProvider>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<DashboardView />} />
            <Route path="/scenarios" element={<ScenarioBrowserView />} />
            <Route path="/settings" element={<SettingsView />} />
            <Route path="*" element={<div className="text-center py-20 font-mono text-error">404: VECTOR_NOT_FOUND</div>} />
          </Routes>
        </Layout>
      </Router>
    </AppProvider>
  );
}

export default App;
