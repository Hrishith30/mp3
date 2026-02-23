import React, { useState, useEffect } from 'react';
import { usePlayer } from '../../context/PlayerContext';
import { PlayCircleIcon, HeartIcon, ArrowsRightLeftIcon } from '@heroicons/react/24/solid';
import { HeartIcon as HeartIconOutline } from '@heroicons/react/24/outline';

const LibraryView = () => {
    const {
        playTrack, removeFromFavorites, favorites,
        playAlbum, isShuffle, toggleShuffle,
        favoriteAlbums, favoriteArtists, favoritePlaylists,
        toggleAlbumFavorites, toggleArtistFavorite,
        setActiveView
    } = usePlayer();

    const [activeTab, setActiveTab] = useState('songs');

    const tabs = [
        { id: 'songs', label: 'Songs', count: favorites.length },
        { id: 'albums', label: 'Albums', count: favoriteAlbums.length },
        { id: 'playlists', label: 'Playlists', count: favoritePlaylists.length },
        { id: 'artists', label: 'Artists', count: favoriteArtists.length },
    ];

    const renderEmptyState = (label) => (
        <div className="p-12 text-center text-gray-500 bg-white/5 rounded-3xl mx-auto max-w-lg border border-white/5 backdrop-blur-sm mt-12">
            <HeartIcon className="w-16 h-16 mx-auto mb-4 text-gray-600" />
            <h3 className="text-lg font-bold text-gray-300">Your {label} is Empty</h3>
            <p className="text-sm mt-2">Like {label.toLowerCase()} to save them here.</p>
        </div>
    );

    return (
        <div className="p-6 lg:p-12 pb-32 w-full max-w-7xl mx-auto animate-fade-in">
            <h2 className="text-3xl font-bold text-white mb-8 flex items-center">
                <span className="w-1.5 h-8 bg-blue-400 rounded-full mr-4"></span>
                Your Library
            </h2>

            {/* Category Tabs */}
            <div className="flex gap-2 mb-8 overflow-x-auto pb-2 scrollbar-hide">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all border whitespace-nowrap flex items-center gap-2 ${activeTab === tab.id
                                ? 'bg-blue-500 border-blue-500 text-white shadow-lg shadow-blue-500/20'
                                : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:text-white'
                            }`}
                    >
                        {tab.label}
                        {tab.count > 0 && (
                            <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-white/10 text-gray-500'
                                }`}>
                                {tab.count}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {activeTab === 'songs' && (
                <>
                    {favorites.length > 0 ? (
                        <>
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
                                        if (isShuffle) toggleShuffle();
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
                                        if (!isShuffle) toggleShuffle();
                                    }}
                                    className="flex flex-1 sm:flex-none justify-center items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-full font-bold transition-all border border-white/10 backdrop-blur-md"
                                >
                                    <ArrowsRightLeftIcon className="w-5 h-5 shrink-0" />
                                    <span className="truncate">Shuffle</span>
                                </button>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-4">
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
                                                className="absolute top-2 right-2 p-2 bg-black/50 rounded-full text-white opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity hover:scale-110 hover:bg-black/70 z-10"
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
                        </>
                    ) : renderEmptyState('Songs')}
                </>
            )}

            {(activeTab === 'albums' || activeTab === 'playlists') && (
                <>
                    {((activeTab === 'albums' ? favoriteAlbums : favoritePlaylists).length > 0) ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                            {(activeTab === 'albums' ? favoriteAlbums : favoritePlaylists).map((item) => (
                                <div key={item.id} className="group relative bg-white/5 p-3 rounded-2xl hover:bg-white/10 transition-all duration-300 hover:-translate-y-1 cursor-pointer" onClick={() => setActiveView('album', item.id, activeTab === 'playlists' ? 'playlist' : 'album')}>
                                    <div className="aspect-square rounded-xl overflow-hidden mb-3 relative shadow-lg">
                                        <img src={item.thumb} alt={item.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                                            <PlayCircleIcon className="w-12 h-12 text-white drop-shadow-lg" />
                                        </div>
                                        <button
                                            className="absolute top-2 right-2 p-2 bg-black/50 rounded-full text-white opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity hover:scale-110 hover:bg-black/70 z-10"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                toggleAlbumFavorites(item.id, activeTab === 'playlists' ? 'playlist' : 'album');
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
                    ) : renderEmptyState(activeTab === 'albums' ? 'Albums' : 'Playlists')}
                </>
            )}

            {activeTab === 'artists' && (
                <>
                    {favoriteArtists.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                            {favoriteArtists.map((item) => (
                                <div key={item.id} className="group relative bg-white/5 p-3 rounded-2xl hover:bg-white/10 transition-all duration-300 hover:-translate-y-1 cursor-pointer" onClick={() => setActiveView('artist', item.id)}>
                                    <div className="aspect-square rounded-full overflow-hidden mb-3 relative shadow-lg border-2 border-white/5">
                                        <img src={item.thumb} alt={item.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                                            <PlayCircleIcon className="w-12 h-12 text-white drop-shadow-lg" />
                                        </div>
                                        <button
                                            className="absolute top-2 right-2 p-2 bg-black/50 rounded-full text-white opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity hover:scale-110 hover:bg-black/70 z-10"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                toggleArtistFavorite(item.id);
                                            }}
                                        >
                                            <HeartIcon className="w-5 h-5 text-blue-400" />
                                        </button>
                                    </div>
                                    <h4 className="text-white font-bold text-center truncate text-sm">{item.title}</h4>
                                    <p className="text-gray-500 text-[10px] text-center uppercase tracking-wider font-black mt-1">Artist</p>
                                </div>
                            ))}
                        </div>
                    ) : renderEmptyState('Artists')}
                </>
            )}
        </div>
    );
};

export default LibraryView;
