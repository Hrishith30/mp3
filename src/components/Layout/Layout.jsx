import React from 'react';
import Sidebar from './Sidebar';
import PlayerBar from './PlayerBar';
import MobileNav from './MobileNav';

const Layout = ({ activeView, setActiveView, children }) => {
    return (
        <div className="flex flex-col h-screen w-full bg-black text-gray-200 font-sans overflow-hidden">

            {/* Middle Section: Sidebar + Content */}
            <div className="flex-1 flex overflow-hidden relative">
                {/* Sidebar (Desktop) */}
                <div className="hidden md:block w-fit h-full shrink-0 z-20">
                    <Sidebar activeView={activeView} setActiveView={setActiveView} />
                </div>

                {/* Main Content */}
                <main className="flex-1 flex flex-col min-w-0 relative h-full overflow-y-auto custom-scrollbar bg-black z-0">
                    {/* Mobile Header */}
                    <div className="md:hidden flex items-center justify-between p-4 bg-black/80 backdrop-blur-xl border-b border-white/5 sticky top-0 z-40">
                        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActiveView('home')}>
                            <div className="relative w-8 h-8 flex items-center justify-center">
                                <img src="./music.png" alt="Logo" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                            </div>
                            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-blue-400 to-blue-600 tracking-widest drop-shadow-sm">
                                MUZE
                            </h1>
                        </div>
                    </div>

                    {children}

                    {/* Mobile Navigation Spacer */}
                    <div className="h-40 md:hidden"></div>
                </main>
            </div>

            {/* Player Bar (Desktop & Mobile) */}
            <div className="shrink-0 z-50 w-full bg-black/80 backdrop-blur-xl border-t border-white/5 pb-20 md:pb-0">
                <PlayerBar />
            </div>

            {/* Mobile Navigation (Fixed Bottom Overlay) */}
            <div className="md:hidden">
                <MobileNav activeView={activeView} setActiveView={setActiveView} />
            </div>

            {/* Background Audio Elements (Hidden) */}
            <div id="youtube-player" style={{ position: 'fixed', top: 0, left: 0, width: '1px', height: '1px', opacity: 0.01, pointerEvents: 'none', zIndex: -50 }}></div>
        </div>
    );
};

export default Layout;
