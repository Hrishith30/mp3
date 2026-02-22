import React, { useState, useEffect } from 'react';
import { usePlayer } from '../../context/PlayerContext';
import {
    PlayCircleIcon, ArrowLeftIcon, MusicalNoteIcon,
    UserIcon, RectangleStackIcon, HeartIcon
} from '@heroicons/react/24/solid';
import { HeartIcon as HeartIconOutline } from '@heroicons/react/24/outline';
import { getOptimizedImage } from '../../utils/imageUtils';

const API_BASE_URL = 'https://musicbackend-pkfi.vercel.app';

const ArtistView = ({ artistId, setActiveView }) => {
    const {
        playTrack, playAlbum, addToFavorites, removeFromFavorites,
        isFavorite, isArtistFavorite, toggleArtistFavorite
    } = usePlayer();
    const [artistData, setArtistData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (artistId) {
            fetchArtistDetails(artistId);
        }
    }, [artistId]);

    const fetchArtistDetails = async (id) => {
        setLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/artist/${id}`);
            const data = await response.json();
            setArtistData(data);
        } catch (error) {
            console.error("Failed to load artist", error);
        } finally {
            setLoading(false);
        }
    };

    const handlePlayTopSongs = () => {
        if (artistData && artistData.songs && artistData.songs.length > 0) {
            const tracks = artistData.songs.map(t => ({
                videoId: t.videoId || t.id,
                title: t.title,
                artist: artistData.name,
                thumb: t.thumbnails ? getOptimizedImage(t.thumbnails, 'high') : getOptimizedImage(artistData.thumbnails || [], 'high')
            }));
            playAlbum(tracks, 0);
        }
    };

    const handlePlayTrack = (track, index) => {
        const tracks = artistData.songs.map(t => ({
            videoId: t.videoId || t.id,
            title: t.title,
            artist: artistData.name,
            thumb: t.thumbnails ? getOptimizedImage(t.thumbnails, 'high') : getOptimizedImage(artistData.thumbnails || [], 'high')
        }));
        playAlbum(tracks, index);
    };

    if (loading) {
        return <div className="p-12 text-center text-white">Loading Artist...</div>;
    }

    if (!artistData) {
        return <div className="p-12 text-center text-white">Artist not found.</div>;
    }

    return (
        <div className="p-8 md:p-12 pb-32 w-full max-w-7xl mx-auto animate-fade-in">
            <button
                onClick={() => setActiveView('search')}
                className="flex items-center gap-2 text-gray-400 hover:text-white mb-8 transition-colors group"
            >
                <ArrowLeftIcon className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                Back to Search
            </button>

            {/* Artist Header */}
            <div className="flex flex-col md:flex-row gap-8 items-center md:items-end mb-12">
                <div className="w-48 h-48 md:w-64 md:h-64 shadow-2xl rounded-full overflow-hidden shrink-0 border-4 border-white/5">
                    <img
                        src={getOptimizedImage(artistData.thumbnails || [], 'max')}
                        alt={artistData.name}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                    />
                </div>
                <div className="flex-1 text-center md:text-left">
                    <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                        <UserIcon className="w-4 h-4 text-blue-400" />
                        <h5 className="text-blue-400 font-bold tracking-widest uppercase text-[10px] md:text-xs">Verified Artist</h5>
                    </div>
                    <div className="flex flex-col md:flex-row items-center md:items-end gap-6 mb-6">
                        <h1 className="text-4xl md:text-7xl font-black text-white leading-tight tracking-tight">{artistData.name}</h1>
                        <button
                            onClick={() => toggleArtistFavorite(artistId)}
                            className="mb-2 p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white"
                            title={isArtistFavorite(artistId) ? "Unfollow Artist" : "Follow Artist"}
                        >
                            {isArtistFavorite(artistId) ? (
                                <HeartIcon className="w-8 h-8 text-blue-400" />
                            ) : (
                                <HeartIconOutline className="w-8 h-8 hover:text-blue-400" />
                            )}
                        </button>
                    </div>

                    <button
                        onClick={handlePlayTopSongs}
                        className="bg-blue-500 text-black px-10 py-4 rounded-full font-bold text-xl hover:scale-105 hover:bg-blue-400 transition-all shadow-xl shadow-blue-500/20 flex items-center gap-3 mx-auto md:mx-0"
                    >
                        <PlayCircleIcon className="w-7 h-7" />
                        Play Top Songs
                    </button>
                </div>
            </div>

            {/* Top Songs */}
            {artistData.songs && artistData.songs.length > 0 && (
                <div className="mb-12">
                    <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                        <MusicalNoteIcon className="w-6 h-6 text-blue-400" />
                        Top Songs
                    </h2>
                    <div className="bg-black/20 rounded-3xl p-2 md:p-4 backdrop-blur-sm border border-white/5 space-y-1">
                        {artistData.songs.slice(0, 5).map((track, index) => (
                            <div
                                key={track.videoId || index}
                                onClick={() => handlePlayTrack(track, index)}
                                className="flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-white/10 transition-colors cursor-pointer group"
                            >
                                <span className="w-6 text-center text-gray-500 font-bold group-hover:text-blue-400 transition-colors">
                                    {index + 1}
                                </span>
                                <img
                                    src={getOptimizedImage(track.thumbnails || [], 'low')}
                                    className="w-12 h-12 rounded-lg object-cover"
                                    referrerPolicy="no-referrer"
                                />
                                <div className="flex-1 min-w-0">
                                    <div className="text-white font-bold truncate">{track.title}</div>
                                    <div className="text-gray-500 text-xs truncate">{(track.views || 'Popular')} views</div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            const id = track.videoId || track.id;
                                            if (isFavorite(id)) {
                                                removeFromFavorites(id);
                                            } else {
                                                addToFavorites({
                                                    videoId: id,
                                                    title: track.title,
                                                    artist: artistData.name,
                                                    thumb: track.thumbnails ? getOptimizedImage(track.thumbnails, 'high') : getOptimizedImage(artistData.thumbnails || [], 'high')
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
                                    <PlayCircleIcon className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Albums */}
            {artistData.albums && artistData.albums.length > 0 && (
                <div>
                    <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                        <RectangleStackIcon className="w-6 h-6 text-blue-400" />
                        Albums
                    </h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                        {artistData.albums.map((album) => (
                            <div
                                key={album.browseId}
                                onClick={() => setActiveView('album', album.browseId, 'album')}
                                className="group cursor-pointer"
                            >
                                <div className="aspect-square rounded-2xl overflow-hidden mb-4 shadow-lg group-hover:scale-105 transition-transform duration-300 relative">
                                    <img
                                        src={getOptimizedImage(album.thumbnails || [], 'medium')}
                                        className="w-full h-full object-cover"
                                        referrerPolicy="no-referrer"
                                    />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <PlayCircleIcon className="w-12 h-12 text-white" />
                                    </div>
                                </div>
                                <h4 className="text-white font-bold truncate text-sm mb-1">{album.title}</h4>
                                <p className="text-gray-500 text-xs">{album.year || 'Album'}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ArtistView;
