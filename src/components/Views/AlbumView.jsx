import React, { useState, useEffect } from 'react';
import { usePlayer } from '../../context/PlayerContext';
import {
    PlayCircleIcon, ArrowLeftIcon, ClockIcon,
    CalendarIcon, MusicalNoteIcon, HeartIcon
} from '@heroicons/react/24/solid';
import { HeartIcon as HeartIconOutline } from '@heroicons/react/24/outline';
import { getOptimizedImage } from '../../utils/imageUtils';

const API_BASE_URL = 'https://musicbackend-pkfi.vercel.app';

const AlbumView = ({ albumId, setActiveView }) => {
    const { playTrack, addToQueue, playAlbum, addToFavorites, removeFromFavorites, isFavorite, toggleAlbumFavorites, isAlbumFavorite } = usePlayer();
    const [albumData, setAlbumData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (albumId) {
            fetchAlbumDetails(albumId);
        }
    }, [albumId]);

    const fetchAlbumDetails = async (id) => {
        setLoading(true);
        try {
            // Correct Endpoint based on script.js
            const response = await fetch(`${API_BASE_URL}/album/${id}`);
            const data = await response.json();
            setAlbumData(data);
        } catch (error) {
            console.error("Failed to load album", error);
            // Fallback for demo if API fails
            setAlbumData({
                title: "Loading Error",
                artist: "Unknown",
                year: "2024",
                tracks: []
            });
        } finally {
            setLoading(false);
        }
    };

    const handlePlayAll = () => {
        if (albumData && albumData.tracks && albumData.tracks.length > 0) {
            const albumArt = getOptimizedImage(albumData.thumbnails, 'high');
            const albumArtist = albumData.artists ? albumData.artists.map(a => a.name).join(', ') : (albumData.artist || "Unknown Artist");

            const tracks = albumData.tracks.map(t => {
                const trackArt = t.thumbnails ? getOptimizedImage(t.thumbnails, 'high') : albumArt;
                const trackArtist = t.artists ? t.artists.map(a => a.name).join(', ') : albumArtist;
                return {
                    videoId: t.videoId || t.id,
                    title: t.title,
                    artist: trackArtist,
                    thumb: trackArt
                };
            });
            playAlbum(tracks, 0);
        }
    };

    const handlePlayTrack = (track, index) => {
        const albumArt = getOptimizedImage(albumData.thumbnails, 'high');
        const albumArtist = albumData.artists ? albumData.artists.map(a => a.name).join(', ') : (albumData.artist || "Unknown Artist");

        // If we want to play the whole album starting from this track:
        if (albumData && albumData.tracks) {
            const tracks = albumData.tracks.map(t => {
                const trackArt = t.thumbnails ? getOptimizedImage(t.thumbnails, 'high') : albumArt;
                const trackArtist = t.artists ? t.artists.map(a => a.name).join(', ') : albumArtist;
                return {
                    videoId: t.videoId || t.id,
                    title: t.title,
                    artist: trackArtist,
                    thumb: trackArt
                };
            });
            playAlbum(tracks, index);
        } else {
            // Fallback just single track (shouldn't happen in Album view usually)
            const trackArt = track.thumbnails ? getOptimizedImage(track.thumbnails, 'high') : albumArt;
            const trackArtist = track.artists ? track.artists.map(a => a.name).join(', ') : albumArtist;
            playTrack({
                videoId: track.videoId || track.id,
                title: track.title,
                artist: trackArtist,
                thumb: trackArt
            });
        }
    };

    if (loading) {
        return <div className="p-12 text-center text-white">Loading Album...</div>;
    }

    if (!albumData) {
        return <div className="p-12 text-center text-white">Album not found.</div>;
    }

    return (
        <div className="p-8 md:p-12 pb-32 w-full max-w-7xl mx-auto animate-fade-in">
            <button
                onClick={() => setActiveView('home')}
                className="flex items-center gap-2 text-gray-400 hover:text-white mb-8 transition-colors group"
            >
                <ArrowLeftIcon className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                Back
            </button>

            {/* Album Header */}
            <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-center md:items-end mb-10 md:mb-12">
                <div className="w-48 h-48 md:w-64 md:h-64 shadow-2xl rounded-2xl overflow-hidden shrink-0">
                    <img
                        src={getOptimizedImage(albumData.thumbnails || [], 'max')}
                        alt={albumData.title}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                    />
                </div>
                <div className="flex-1 text-center md:text-left">
                    <h5 className="text-blue-400 font-bold tracking-widest mb-2 uppercase text-[10px] md:text-xs">Album</h5>
                    <h1 className="text-3xl md:text-6xl font-black text-white mb-4 leading-tight tracking-tight">{albumData.title}</h1>

                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-4 gap-y-2 text-gray-400 text-xs md:text-sm mb-6 font-medium">
                        <span className="flex items-center gap-1.5 text-white font-bold">
                            <div className="w-5 h-5 rounded-full bg-gray-600 overflow-hidden shrink-0">
                                <img
                                    src={getOptimizedImage(albumData.thumbnails || [], 'low')}
                                    className="w-full h-full object-cover opacity-50"
                                    referrerPolicy="no-referrer"
                                />
                            </div>
                            {albumData.artists ? albumData.artists.map(a => a.name).join(', ') : (albumData.artist || "Unknown")}
                        </span>
                        <span className="hidden sm:block w-1 h-1 bg-gray-500 rounded-full"></span>
                        <span className="flex items-center gap-1">
                            <CalendarIcon className="w-3.5 h-3.5" /> {albumData.year || "2024"}
                        </span>
                        <span className="hidden sm:block w-1 h-1 bg-gray-500 rounded-full"></span>
                        <span className="flex items-center gap-1">
                            <MusicalNoteIcon className="w-3.5 h-3.5" /> {albumData.tracks?.length || 0} songs
                        </span>
                    </div>

                    <div className="flex items-center gap-4 mx-auto md:mx-0">
                        <button
                            onClick={handlePlayAll}
                            className="bg-blue-500 text-black px-8 py-3.5 rounded-full font-bold text-lg hover:scale-105 hover:bg-blue-400 transition-all shadow-blue-500/30 flex items-center gap-2"
                        >
                            <PlayCircleIcon className="w-6 h-6" />
                            Play Album
                        </button>
                        <button
                            onClick={() => toggleAlbumFavorites(albumId)}
                            className="p-3.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white"
                            title={isAlbumFavorite(albumId) ? "Remove from Favorites" : "Add to Favorites"}
                        >
                            {isAlbumFavorite(albumId) ? (
                                <HeartIcon className="w-6 h-6 text-blue-400" />
                            ) : (
                                <HeartIconOutline className="w-6 h-6 hover:text-blue-400" />
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Tracklist */}
            <div className="bg-black/20 rounded-2xl md:rounded-3xl p-1 md:p-6 backdrop-blur-sm border border-white/5">
                <div className="grid grid-cols-[auto_1fr_auto] gap-3 md:gap-4 px-3 md:px-4 py-3 text-gray-500 border-b border-white/5 text-[10px] md:text-sm uppercase tracking-[0.2em] font-black mb-2">
                    <span className="w-6 md:w-8 text-center">#</span>
                    <span>Title</span>
                    <span className="w-12 md:w-16 text-right"><ClockIcon className="w-4 h-4 md:w-5 md:h-5 ml-auto" /></span>
                </div>

                <div className="space-y-0.5 md:space-y-1">
                    {albumData.tracks?.map((track, index) => (
                        <div
                            key={track.videoId || index}
                            onClick={() => handlePlayTrack(track, index)}
                            className="grid grid-cols-[auto_1fr_auto] gap-3 md:gap-4 items-center px-3 md:px-4 py-3 md:py-3 rounded-xl hover:bg-white/10 transition-colors cursor-pointer group"
                        >
                            <span className="w-6 md:w-8 text-center text-gray-500 group-hover:text-blue-400 font-bold text-xs md:text-sm">
                                <span className="group-hover:hidden">{index + 1}</span>
                                <PlayCircleIcon className="w-5 h-5 hidden group-hover:block mx-auto" />
                            </span>
                            <div className="min-w-0 flex-1">
                                <div className="text-white font-bold truncate text-sm md:text-base">{track.title}</div>
                                <div className="text-gray-500 text-[10px] md:text-xs truncate font-medium">{track.artist || albumData.artist}</div>
                            </div>

                            <div className="flex items-center gap-2 md:gap-4">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        const id = track.videoId || track.id;
                                        if (isFavorite(id)) {
                                            removeFromFavorites(id);
                                        } else {
                                            const albumArt = getOptimizedImage(albumData.thumbnails, 'high');
                                            addToFavorites({
                                                videoId: id,
                                                title: track.title,
                                                artist: track.artist || albumData.artist,
                                                thumb: track.thumbnails ? getOptimizedImage(track.thumbnails, 'high') : albumArt
                                            });
                                        }
                                    }}
                                    className="text-gray-400 hover:text-blue-400 transition-colors p-2"
                                >
                                    {isFavorite(track.videoId || track.id) ? (
                                        <HeartIcon className="w-5 h-5 text-blue-400" />
                                    ) : (
                                        <HeartIconOutline className="w-5 h-5" />
                                    )}
                                </button>

                                <span className="w-10 md:w-16 text-right text-gray-500 text-[10px] md:text-sm font-mono">
                                    {track.duration || "3:45"}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default AlbumView;
