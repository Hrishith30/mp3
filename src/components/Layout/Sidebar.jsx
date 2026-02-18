import React from 'react';
import { HomeIcon, MagnifyingGlassIcon, HeartIcon } from '@heroicons/react/24/outline';
import { HomeIcon as HomeIconSolid, MagnifyingGlassIcon as MagnifyingGlassIconSolid, HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid';

const Sidebar = ({ activeView, setActiveView }) => {
    const navItems = [
        { id: 'home', label: 'Home', icon: HomeIcon, activeIcon: HomeIconSolid },
        { id: 'search', label: 'Search', icon: MagnifyingGlassIcon, activeIcon: MagnifyingGlassIconSolid },
        { id: 'library', label: 'Your Library', icon: HeartIcon, activeIcon: HeartIconSolid },
    ];

    return (
        <aside className="w-64 bg-white/5 backdrop-blur-[20px] border-r border-white/5 shadow-2xl hidden md:flex flex-col p-6 z-10 shrink-0 h-full overflow-y-auto custom-scrollbar">
            <div className="flex items-center gap-3 mb-10 px-2 group cursor-pointer" onClick={() => setActiveView('home')}>
                <div className="relative w-10 h-10 flex items-center justify-center rounded-xl overflow-hidden shadow-lg shadow-blue-500/20">
                    <img src="./music.png" alt="Logo" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                </div>
                <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-blue-400 to-blue-600 tracking-widest drop-shadow-sm">
                    MUZE
                </h1>
            </div>

            <nav className="flex-1 space-y-2">
                {navItems.map((item) => {
                    const isActive = activeView === item.id;
                    const Icon = isActive ? item.activeIcon : item.icon;

                    return (
                        <button
                            key={item.id}
                            onClick={() => setActiveView(item.id)}
                            className={`w-full flex items-center gap-4 px-4 py-3 rounded-2xl transition-all duration-300 group ${isActive
                                ? 'bg-white/10 text-blue-400 font-bold shadow-[0_0_20px_rgba(59,130,246,0.3)]'
                                : 'text-gray-400 hover:bg-white/5 hover:text-white'
                                }`}
                        >
                            <Icon className={`w-6 h-6 transition-transform group-hover:scale-110 ${isActive ? 'scale-110' : ''}`} />
                            <span className="text-base">{item.label}</span>
                        </button>
                    );
                })}
            </nav>
        </aside>
    );
};

export default Sidebar;
