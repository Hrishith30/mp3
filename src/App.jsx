import { useState } from 'react'
import Layout from './components/Layout/Layout'
import { PlayerProvider } from './context/PlayerContext'
import HomeView from './components/Views/HomeView'
import SearchView from './components/Views/SearchView'
import LibraryView from './components/Views/LibraryView'
import AlbumView from './components/Views/AlbumView'
import { LANGUAGES } from './constants/languages'

function App() {
  const [activeView, setActiveView] = useState('home');
  const [selectedAlbumId, setSelectedAlbumId] = useState(null);
  const [showLangModal, setShowLangModal] = useState(!localStorage.getItem('userLanguage'));

  const handleViewChange = (view, albumId = null) => {
    setActiveView(view);
    if (albumId) setSelectedAlbumId(albumId);
  };

  const handleLangSelect = (lang) => {
    localStorage.setItem('userLanguage', lang);
    setShowLangModal(false);
    // Reload if needed or let components react
    if (activeView === 'home') {
      // Just force a remount or state update if necessary, 
      // but HomeView will mount after modal closes anyway if it was the first time.
      window.location.reload(); // Simplest way to ensure all contexts/states refresh for new lang
    }
  };

  const renderView = () => {
    switch (activeView) {
      case 'home': return <HomeView setActiveView={handleViewChange} />;
      case 'search': return <SearchView setActiveView={handleViewChange} />;
      case 'library': return <LibraryView />;
      case 'album': return <AlbumView albumId={selectedAlbumId} setActiveView={handleViewChange} />;
      default: return <HomeView setActiveView={handleViewChange} />;
    }
  };

  if (showLangModal) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black">
        <div className="w-full max-w-xl p-6 md:p-8 animate-in fade-in duration-500">
          <div className="text-center mb-8 md:mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-2 italic tracking-tight">Select Language</h2>
            <p className="text-gray-500 text-sm md:text-base">Choose your preference to explore music</p>
          </div>

          <div className="grid grid-cols-2 xs:grid-cols-2 sm:grid-cols-3 gap-2 md:gap-3 mb-10 overflow-y-auto no-scrollbar max-h-[60vh] pr-1">
            {LANGUAGES.map(lang => (
              <button
                key={lang}
                onClick={() => handleLangSelect(lang)}
                className="py-3.5 md:py-4 px-2 rounded-xl border border-white/10 text-gray-300 hover:bg-white hover:text-black hover:border-white active:scale-95 transition-all font-bold text-base md:text-lg shadow-lg active:bg-blue-500 active:border-blue-500"
              >
                {lang}
              </button>
            ))}
          </div>

          <div className="text-center">
            <span className="text-gray-600 text-[10px] md:text-xs uppercase tracking-[0.2em] font-black">
              Personalized Music Experience
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <PlayerProvider>
      <Layout activeView={activeView} setActiveView={handleViewChange}>
        {renderView()}
      </Layout>
    </PlayerProvider>
  );
}

export default App;
