import React, { useState, useEffect } from 'react';
import { usePlayer } from '../../context/PlayerContext';
import { PlayCircleIcon, HeartIcon } from '@heroicons/react/24/solid';
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

            <div className="flex items-center gap-4 mb-8">
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
                    className="flex items-center gap-2 px-6 py-3 bg-blue-500 hover:bg-blue-400 text-white rounded-full font-bold transition-all shadow-lg hover:scale-105"
                >
                    <PlayCircleIcon className="w-6 h-6" />
                    Play All
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
                    className="flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-full font-bold transition-all border border-white/10 backdrop-blur-md"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 00-3.7-3.7 3.7 3.7 0 00-1.74 3.7c.074 1.293.138 2.6.138 3.962 0 1.362-.064 2.67-.138 3.962a4.006 4.006 0 003.7 3.7 3.7 3.7 0 001.74-3.7c-.092-1.209-.138-2.43-.138-3.662zM9 4.5l6.75 6.75M9 19.5l6.75-6.75M4.5 4.5h.008v.008H4.5V4.5zm0 6h.008v.008H4.5V10.5zm0 6h.008v.008H4.5V16.5z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                    </svg>
                    Shuffle
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
