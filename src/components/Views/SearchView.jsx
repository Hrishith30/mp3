import React, { useState, useEffect } from 'react';
import { usePlayer } from '../../context/PlayerContext';
import { MagnifyingGlassIcon, PlayCircleIcon, HeartIcon as HeartIconOutline } from '@heroicons/react/24/outline';
import { PlayCircleIcon as PlayCircleIconSolid, HeartIcon } from '@heroicons/react/24/solid';

const API_BASE_URL = 'https://musicbackend-pkfi.vercel.app';

const SearchView = ({ setActiveView }) => {
    const { playTrack, addToFavorites, removeFromFavorites, isFavorite } = usePlayer();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [debouncedQuery, setDebouncedQuery] = useState('');

    // Debounce
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedQuery(query);
        }, 500);
        return () => clearTimeout(timer);
    }, [query]);

    // Fetch
    useEffect(() => {
        if (debouncedQuery.trim()) {
            performSearch(debouncedQuery);
        } else {
            setResults([]);
        }
    }, [debouncedQuery]);

    const performSearch = async (searchTerm) => {
        setLoading(true);
        try {
            // Defaulting to songs filter for now to ensure we get playable tracks
            const response = await fetch(`${API_BASE_URL}/search?query=${encodeURIComponent(searchTerm)}&filter=songs`);
            const data = await response.json();
            setResults(data);
        } catch (error) {
            console.error("Search failed", error);
        } finally {
            setLoading(false);
        }
    };

    const handlePlay = (item) => {
        const thumb = item.thumbnails ? item.thumbnails[item.thumbnails.length - 1].url : '';
        const artist = item.artists ? item.artists.map(a => a.name).join(', ') : (item.artist || 'Unknown');

        playTrack({
            videoId: item.videoId,
            title: item.title,
            artist: artist,
            thumb: thumb || item.thumb
        });
    };

    return (
        <div className="p-8 md:p-12 pb-32 w-full max-w-7xl mx-auto animate-fade-in">
            <div className="sticky top-0 z-30 bg-black/80 backdrop-blur-xl py-3 md:py-4 -mt-4 mb-6 md:mb-8">
                <div className="relative max-w-2xl mx-auto group px-1 md:px-0">
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search songs, artists, albums..."
                        className="w-full bg-white/10 border border-white/10 text-white placeholder-gray-400 rounded-full py-3.5 md:py-4 pl-12 md:pl-14 pr-6 focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition-all text-base md:text-lg shadow-xl group-focus-within:bg-gradient-to-r group-focus-within:from-white/15 group-focus-within:to-white/10 font-medium"
                        autoFocus
                    />
                    <MagnifyingGlassIcon className="absolute left-4.5 md:left-5 top-1/2 -translate-y-1/2 w-5 h-5 md:w-6 md:h-6 text-gray-500 group-focus-within:text-blue-400 transition-colors" />
                </div>
            </div>

            {loading && (
                <div className="text-center py-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
                    <p className="text-gray-400 mt-4">Searching...</p>
                </div>
            )}

            {!loading && results.length === 0 && query.trim() !== '' && (
                <div className="text-center py-20 text-gray-500">
                    <p>No results found for "{query}"</p>
                </div>
            )}

            {!loading && results.length === 0 && query.trim() === '' && (
                <div className="text-center text-gray-500 mt-20">
                    <MagnifyingGlassIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p>Search for your favorite music</p>
                </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {results.map((item) => {
                    const thumb = item.thumbnails ? item.thumbnails[item.thumbnails.length - 1].url : '';
                    const artist = item.artists ? item.artists.map(a => a.name).join(', ') : (item.artist || 'Unknown');

                    return (
                        <div key={item.videoId} className="group relative bg-white/5 p-3 rounded-2xl hover:bg-white/10 transition-all duration-300 hover:-translate-y-1 cursor-pointer" onClick={() => handlePlay(item)}>
                            <div className="aspect-square rounded-xl overflow-hidden mb-3 relative shadow-lg">
                                <img src={thumb} alt={item.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                                    <PlayCircleIconSolid className="w-12 h-12 text-white drop-shadow-lg" />
                                </div>
                                <button
                                    className="absolute top-2 right-2 p-2 bg-black/50 rounded-full text-white opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity hover:scale-110 hover:bg-black/70 z-10"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (isFavorite(item.videoId)) {
                                            removeFromFavorites(item.videoId);
                                        } else {
                                            addToFavorites({
                                                videoId: item.videoId,
                                                title: item.title,
                                                artist: artist,
                                                thumb: thumb
                                            });
                                        }
                                    }}
                                >
                                    {isFavorite(item.videoId) ? (
                                        <HeartIcon className="w-5 h-5 text-blue-400" />
                                    ) : (
                                        <HeartIconOutline className="w-5 h-5" />
                                    )}
                                </button>
                            </div>
                            <h4 className="text-white font-medium truncate text-sm">{item.title}</h4>
                            <p className="text-gray-400 text-xs truncate">{artist}</p>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default SearchView;
