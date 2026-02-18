import React, { useState, useEffect } from 'react';
import { usePlayer } from '../../context/PlayerContext';
import { PlayCircleIcon, ChevronDownIcon, HeartIcon } from '@heroicons/react/24/solid';
import { HeartIcon as HeartIconOutline } from '@heroicons/react/24/outline';
import { getOptimizedImage } from '../../utils/imageUtils';

const API_BASE_URL = 'https://musicbackend-pkfi.vercel.app';

import { LANGUAGES } from '../../constants/languages';

const HomeView = ({ setActiveView }) => {
    const { playTrack, addToFavorites, removeFromFavorites, isFavorite, toggleAlbumFavorites, isAlbumFavorite, history } = usePlayer();
    const [selectedLang, setSelectedLang] = useState(localStorage.getItem('userLanguage') || 'Telugu');
    const [isLangOpen, setIsLangOpen] = useState(false);
    const [langSongs, setLangSongs] = useState([]);
    const [langAlbums, setLangAlbums] = useState([]);
    const [eraContent, setEraContent] = useState({
        '2000s': [],
        '2010s': [],
        '2020s': [],
        'Latest': []
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchLanguageContent(selectedLang);
    }, []);

    const fetchLanguageContent = async (lang) => {
        setLoading(true);
        setSelectedLang(lang);
        localStorage.setItem('userLanguage', lang);

        try {
            // Fetch Songs
            const songPatterns = [
                `${lang} Top Cinema Hits`, `${lang} Trending Pop Songs`, `${lang} New Movie Tracks`,
                `${lang} 2000s Hits`, `${lang} 2010s Hits`, `${lang} 2020s Hits`, `${lang} Latest Songs`, `${lang} New Releases`
            ];
            const songQuery = songPatterns[Math.floor(Math.random() * songPatterns.length)];
            const songRes = await fetch(`${API_BASE_URL}/search?query=${encodeURIComponent(songQuery)}&filter=songs`);
            const songData = await songRes.json();
            setLangSongs(songData);

            // Fetch Albums
            const albumPatterns = [
                `${lang} Latest Movie Albums`, `${lang} Best Cinema Hits`, `${lang} Top Soundtracks`,
                `${lang} 2000s Movie Albums`, `${lang} 2010s Movie Albums`, `${lang} 2020s Movie Albums`
            ];
            const albumQuery = albumPatterns[Math.floor(Math.random() * albumPatterns.length)];
            const albumRes = await fetch(`${API_BASE_URL}/search?query=${encodeURIComponent(albumQuery)}&filter=albums`);
            const albumData = await albumRes.json();
            setLangAlbums(albumData);

            // Fetch Eras
            const eras = ['2000s', '2010s', '2020s', 'Latest'];
            const eraPromises = eras.map(async (era) => {
                const query = `${lang} ${era} Movie Hits`;
                const res = await fetch(`${API_BASE_URL}/search?query=${encodeURIComponent(query)}&filter=songs`);
                const data = await res.json();
                return { era, data: data.slice(0, 10) };
            });

            const eraResults = await Promise.all(eraPromises);
            const newEraContent = {};
            eraResults.forEach(res => {
                newEraContent[res.era] = res.data;
            });
            setEraContent(newEraContent);

        } catch (e) {
            console.error("Failed to load language content", e);
        } finally {
            setLoading(false);
        }
    };

    const handlePlay = (item) => {
        // If it's from history, it already has 'thumb'. Otherwise, optimize 'thumbnails'.
        const thumb = item.thumb || getOptimizedImage(item.thumbnails, 'high');
        const artist = item.artists ? item.artists.map(a => a.name).join(', ') : (item.artist || 'Unknown');

        playTrack({
            videoId: item.videoId || item.id,
            title: item.title,
            artist: artist,
            thumb: thumb
        });
    };

    return (
        <div className="p-8 md:p-12 pb-32 w-full max-w-7xl mx-auto animate-fade-in">
            <header className="mb-12 flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                        Welcome Back
                    </h2>
                    <p className="text-gray-400 mt-2">Pick up where you left off</p>
                </div>

                {/* Language Selector */}
                <div className="relative z-20">
                    <button
                        onClick={() => setIsLangOpen(!isLangOpen)}
                        className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/10 rounded-full px-6 py-2.5 text-white transition-all hover:scale-105 active:scale-95"
                    >
                        <span className="text-sm font-medium tracking-wide">{selectedLang}</span>
                        <ChevronDownIcon className={`w-4 h-4 transition-transform duration-300 ${isLangOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isLangOpen && (
                        <>
                            <div className="fixed inset-0 z-10 cursor-default" onClick={() => setIsLangOpen(false)} />
                            <div className="absolute right-0 mt-2 w-48 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl z-20 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                <div className="max-h-64 overflow-y-auto no-scrollbar py-1">
                                    {LANGUAGES.map(lang => (
                                        <button
                                            key={lang}
                                            onClick={() => {
                                                fetchLanguageContent(lang);
                                                setIsLangOpen(false);
                                            }}
                                            className={`w-full text-left px-5 py-3 text-sm hover:bg-white/10 transition-colors flex items-center justify-between ${selectedLang === lang ? 'text-blue-400 font-bold bg-white/5' : 'text-gray-300'}`}
                                        >
                                            {lang}
                                            {selectedLang === lang && <div className="w-1.5 h-1.5 rounded-full bg-blue-400 shadow-blue-500/50" />}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </header>

            {/* Recently Played */}
            {history && history.length > 0 && (
                <section className="mb-12">
                    <h3 className="text-xl font-bold text-white mb-6 flex items-center">
                        <span className="w-1 h-6 bg-blue-400 rounded-full mr-3"></span>
                        Recently Played
                    </h3>
                    <div className="flex md:grid md:grid-cols-4 lg:grid-cols-5 gap-4 overflow-x-auto md:overflow-visible scrollbar-hide pb-4 -mx-4 px-4 md:mx-0 md:px-0 snap-x">
                        {history.slice(0, 10).map((item) => (
                            <div key={item.id} className="min-w-[160px] md:min-w-0 group relative bg-white/5 p-3 rounded-2xl hover:bg-white/10 transition-all duration-300 hover:-translate-y-1 cursor-pointer snap-start" onClick={() => handlePlay({ ...item, videoId: item.id })}>
                                <div className="aspect-square rounded-xl overflow-hidden mb-3 relative shadow-lg">
                                    <img src={item.thumb} alt={item.title} className="w-full h-full object-cover" loading="lazy" referrerPolicy="no-referrer" />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                                        <PlayCircleIcon className="w-10 h-10 text-white drop-shadow-lg" />
                                    </div>
                                    <button
                                        className="absolute top-2 right-2 p-2 bg-black/50 rounded-full text-white opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity hover:scale-110 hover:bg-black/70 z-10"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (isFavorite(item.id)) {
                                                removeFromFavorites(item.id);
                                            } else {
                                                addToFavorites({
                                                    videoId: item.id,
                                                    title: item.title,
                                                    artist: item.artist,
                                                    thumb: item.thumb
                                                });
                                            }
                                        }}
                                    >
                                        {isFavorite(item.id) ? (
                                            <HeartIcon className="w-5 h-5 text-blue-400" />
                                        ) : (
                                            <HeartIconOutline className="w-5 h-5" />
                                        )}
                                    </button>
                                </div>
                                <h4 className="text-white font-medium truncate text-sm">{item.title}</h4>
                                <p className="text-gray-400 text-xs truncate">{item.artist}</p>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Trending Songs */}
            <section className="mb-12">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-white flex items-center">
                        <span className="w-1 h-6 bg-blue-400 rounded-full mr-3"></span>
                        Top {selectedLang} Picks
                    </h3>
                </div>
                <div className="flex md:grid md:grid-cols-4 lg:grid-cols-5 gap-4 overflow-x-auto md:overflow-visible scrollbar-hide pb-4 -mx-4 px-4 md:mx-0 md:px-0 snap-x">
                    {loading ? (
                        Array(5).fill(0).map((_, i) => (
                            <div key={i} className="min-w-[160px] md:min-w-0 aspect-square bg-white/5 rounded-2xl animate-pulse"></div>
                        ))
                    ) : (
                        langSongs.slice(0, 10).map((item) => {
                            const thumb = getOptimizedImage(item.thumbnails, 'medium');
                            const artist = item.artists ? item.artists.map(a => a.name).join(', ') : (item.artist || 'Unknown');
                            return (
                                <div key={item.videoId} className="min-w-[160px] md:min-w-0 group relative bg-white/5 p-3 rounded-2xl hover:bg-white/10 transition-all duration-300 hover:-translate-y-1 cursor-pointer snap-start" onClick={() => handlePlay(item)}>
                                    <div className="aspect-square rounded-xl overflow-hidden mb-3 relative shadow-lg">
                                        <img src={thumb} alt={item.title} className="w-full h-full object-cover" loading="lazy" referrerPolicy="no-referrer" />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                                            <PlayCircleIcon className="w-10 h-10 text-white drop-shadow-lg" />
                                        </div>
                                        <button
                                            className="absolute top-2 right-2 p-2 bg-black/50 rounded-full text-white opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity hover:scale-110 hover:bg-black/70 z-10"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                const id = item.videoId || item.id;
                                                if (isFavorite(id)) {
                                                    removeFromFavorites(id);
                                                } else {
                                                    addToFavorites({
                                                        videoId: id,
                                                        title: item.title,
                                                        artist: artist,
                                                        thumb: thumb
                                                    });
                                                }
                                            }}
                                        >
                                            {isFavorite(item.videoId || item.id) ? (
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
                        })
                    )}
                </div>
            </section>

            {/* Era Sections */}
            {Object.entries(eraContent).map(([era, songs]) => (
                songs.length > 0 && (
                    <section key={era} className="mb-12">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold text-white flex items-center">
                                <span className="w-1 h-6 bg-blue-400 rounded-full mr-3"></span>
                                {selectedLang} {era} Hits
                            </h3>
                        </div>
                        <div className="flex md:grid md:grid-cols-4 lg:grid-cols-5 gap-4 overflow-x-auto md:overflow-visible scrollbar-hide pb-4 -mx-4 px-4 md:mx-0 md:px-0 snap-x">
                            {songs.map((item) => {
                                const thumb = getOptimizedImage(item.thumbnails, 'medium');
                                const artist = item.artists ? item.artists.map(a => a.name).join(', ') : (item.artist || 'Unknown');
                                return (
                                    <div key={item.videoId} className="min-w-[160px] md:min-w-0 group relative bg-white/5 p-3 rounded-2xl hover:bg-white/10 transition-all duration-300 hover:-translate-y-1 cursor-pointer snap-start" onClick={() => handlePlay(item)}>
                                        <div className="aspect-square rounded-xl overflow-hidden mb-3 relative shadow-lg">
                                            <img src={thumb} alt={item.title} className="w-full h-full object-cover" loading="lazy" referrerPolicy="no-referrer" />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                                                <PlayCircleIcon className="w-10 h-10 text-white drop-shadow-lg" />
                                            </div>
                                            <button
                                                className="absolute top-2 right-2 p-2 bg-black/50 rounded-full text-white opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity hover:scale-110 hover:bg-black/70 z-10"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    const id = item.videoId || item.id;
                                                    if (isFavorite(id)) {
                                                        removeFromFavorites(id);
                                                    } else {
                                                        addToFavorites({
                                                            videoId: id,
                                                            title: item.title,
                                                            artist: artist,
                                                            thumb: thumb
                                                        });
                                                    }
                                                }}
                                            >
                                                {isFavorite(item.videoId || item.id) ? (
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
                    </section>
                )
            ))}

            {/* Popular Albums */}
            <section className="mb-12">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-white flex items-center">
                        <span className="w-1 h-6 bg-blue-400 rounded-full mr-3"></span>
                        Popular Albums
                    </h3>
                </div>
                <div className="flex md:grid md:grid-cols-4 lg:grid-cols-5 gap-4 overflow-x-auto md:overflow-visible scrollbar-hide pb-4 -mx-4 px-4 md:mx-0 md:px-0 snap-x">
                    {loading ? (
                        Array(5).fill(0).map((_, i) => (
                            <div key={i} className="min-w-[160px] md:min-w-0 aspect-square bg-white/5 rounded-2xl animate-pulse"></div>
                        ))
                    ) : (
                        langAlbums.slice(0, 10).map((item) => {
                            const thumb = getOptimizedImage(item.thumbnails, 'medium');
                            const artist = item.artists ? item.artists.map(a => a.name).join(', ') : (item.artist || 'Unknown');
                            return (
                                <div key={item.browseId} className="min-w-[160px] md:min-w-0 group relative bg-white/5 p-3 rounded-2xl hover:bg-white/10 transition-all duration-300 hover:-translate-y-1 cursor-pointer snap-start" onClick={() => setActiveView('album', item.browseId)}>
                                    <div className="aspect-square rounded-xl overflow-hidden mb-3 relative shadow-lg">
                                        <img src={thumb} alt={item.title} className="w-full h-full object-cover" loading="lazy" referrerPolicy="no-referrer" />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                                            <PlayCircleIcon className="w-10 h-10 text-white drop-shadow-lg" />
                                        </div>
                                        <button
                                            className="absolute top-2 right-2 p-2 bg-black/50 rounded-full text-white opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity hover:scale-110 hover:bg-black/70 z-10"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                toggleAlbumFavorites(item.browseId);
                                            }}
                                            title={isAlbumFavorite(item.browseId) ? "Remove from Favorites" : "Add to Favorites"}
                                        >
                                            {isAlbumFavorite(item.browseId) ? (
                                                <HeartIcon className="w-5 h-5 text-blue-400" />
                                            ) : (
                                                <HeartIconOutline className="w-5 h-5 hover:text-blue-400" />
                                            )}
                                        </button>
                                    </div>
                                    <h4 className="text-white font-medium truncate text-sm">{item.title}</h4>
                                    <p className="text-gray-400 text-xs truncate">{item.year || artist}</p>
                                </div>
                            );
                        })
                    )}
                </div>
            </section>
        </div>
    );
};

export default HomeView;
