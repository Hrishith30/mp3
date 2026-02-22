import React, { useState, useEffect } from 'react';
import { usePlayer } from '../../context/PlayerContext';
import { PlayCircleIcon, HeartIcon, ArrowsRightLeftIcon } from '@heroicons/react/24/solid';
import { HeartIcon as HeartIconOutline } from '@heroicons/react/24/outline';

const LibraryView = () => {
    const { playTrack, removeFromFavorites, favorites, playAlbum, isShuffle, toggleShuffle } = usePlayer();

    // No local state needed, use context state

    // No local state needed, use context state

    if (favorites.length === 0) {
        return (
            <div className="p-8 md:p-12 pb-32 w-full max-w-7xl mx-auto animate-fade-in">
                <h2 className="text-3xl font-bold text-white mb-8 flex items-center">
                    <span className="w-1.5 h-8 bg-blue-400 rounded-full mr-4"></span>
                    Your Library
                </h2>

                <div className="p-12 text-center text-gray-500 bg-white/5 rounded-3xl mx-auto max-w-lg border border-white/5 backdrop-blur-sm mt-20">
                    <HeartIcon className="w-16 h-16 mx-auto mb-4 text-gray-600" />
                    <h3 className="text-lg font-bold text-gray-300">Your Library is Empty</h3>
                    <p className="text-sm mt-2">Love songs to save them here.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-8 md:p-12 pb-32 w-full max-w-7xl mx-auto animate-fade-in">
            <h2 className="text-3xl font-bold text-white mb-8 flex items-center">
                <span className="w-1.5 h-8 bg-blue-400 rounded-full mr-4"></span>
                Your Library
            </h2>

            <div className="flex flex-wrap items-center gap-3 sm:gap-4 mb-8">
                <button
                    onClick={() => {
                        const playlist = favorites.map(item => ({
                            videoId: item.id,
                            title: item.title,
                            artist: item.artist,
                            thumb: item.thumb
                        }));
                        playAlbum(playlist, 0);
                        if (isShuffle) toggleShuffle(); // Disable shuffle if playing linearly
                    }}
                    className="flex flex-1 sm:flex-none justify-center items-center gap-2 px-6 py-3 bg-blue-500 hover:bg-blue-400 text-white rounded-full font-bold transition-all shadow-lg hover:scale-105"
                >
                    <PlayCircleIcon className="w-6 h-6 shrink-0" />
                    <span className="truncate">Play All</span>
                </button>
                <button
                    onClick={() => {
                        const playlist = favorites.map(item => ({
                            videoId: item.id,
                            title: item.title,
                            artist: item.artist,
                            thumb: item.thumb
                        }));
                        playAlbum(playlist, Math.floor(Math.random() * playlist.length));
                        if (!isShuffle) toggleShuffle(); // Enable shuffle
                    }}
                    className="flex flex-1 sm:flex-none justify-center items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-full font-bold transition-all border border-white/10 backdrop-blur-md"
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 shrink-0">
                        <polyline points="16 3 21 3 21 8"></polyline>
                        <line x1="4" y1="20" x2="21" y2="3"></line>
                        <polyline points="21 16 21 21 16 21"></polyline>
                        <line x1="15" y1="15" x2="21" y2="21"></line>
                        <line x1="4" y1="4" x2="9" y2="9"></line>
                    </svg>
                    <span className="truncate">Shuffle</span>
                </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {favorites.map((item, index) => (
                    <div key={item.id} className="group relative bg-white/5 p-3 rounded-2xl hover:bg-white/10 transition-all duration-300 hover:-translate-y-1 cursor-pointer" onClick={() => {
                        const playlist = favorites.map(i => ({
                            videoId: i.id,
                            title: i.title,
                            artist: i.artist,
                            thumb: i.thumb
                        }));
                        playAlbum(playlist, index);
                    }}>
                        <div className="aspect-square rounded-xl overflow-hidden mb-3 relative shadow-lg">
                            <img src={item.thumb} alt={item.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                                <PlayCircleIcon className="w-12 h-12 text-white drop-shadow-lg" />
                            </div>
                            <button
                                className="absolute top-2 right-2 p-2 bg-black/50 rounded-full text-white opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity hover:scale-110 hover:bg-black/70 z-10"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    removeFromFavorites(item.id);
                                }}
                            >
                                <HeartIcon className="w-5 h-5 text-blue-400" />
                            </button>
                        </div>
                        <h4 className="text-white font-medium truncate text-sm">{item.title}</h4>
                        <p className="text-gray-400 text-xs truncate">{item.artist}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default LibraryView;
