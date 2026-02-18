import React from 'react';
import { HomeIcon, MagnifyingGlassIcon, HeartIcon } from '@heroicons/react/24/outline';
import { HomeIcon as HomeIconSolid, MagnifyingGlassIcon as MagnifyingGlassIconSolid, HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid';

const MobileNav = ({ activeView, setActiveView }) => {
    const navItems = [
        { id: 'home', label: 'Home', icon: HomeIcon, activeIcon: HomeIconSolid },
        { id: 'search', label: 'Search', icon: MagnifyingGlassIcon, activeIcon: MagnifyingGlassIconSolid },
        { id: 'library', label: 'Library', icon: HeartIcon, activeIcon: HeartIconSolid },
    ];

    return (
        <nav className="md:hidden fixed bottom-1 left-4 right-4 z-[60] pb-safe">
            <div className="flex justify-around items-center h-16 bg-black/80 backdrop-blur-2xl rounded-2xl border border-white/10 shadow-[0_-10px_40px_rgba(0,0,0,0.8)]">
                {navItems.map((item) => {
                    const isActive = activeView === item.id;
                    const Icon = isActive ? item.activeIcon : item.icon;

                    return (
                        <button
                            key={item.id}
                            onClick={() => setActiveView(item.id)}
                            className={`flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-all duration-300 ${isActive ? 'text-blue-400 font-bold' : 'text-gray-400'}`}
                        >
                            <Icon className={`w-6 h-6 ${isActive ? 'scale-110 drop-shadow-[0_0_8px_rgba(96,165,250,0.5)]' : ''}`} />
                            <span className="text-[10px] uppercase tracking-wider font-bold">{item.label}</span>
                        </button>
                    );
                })}
            </div>
        </nav>
    );
};

export default MobileNav;
