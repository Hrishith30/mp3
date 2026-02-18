import React, { useState, useEffect, useRef } from 'react';
import { usePlayer } from '../../context/PlayerContext';
import {
    PlayCircleIcon, PauseCircleIcon,
    BackwardIcon, ForwardIcon,
    HeartIcon
} from '@heroicons/react/24/solid';
import { SpeakerWaveIcon, SpeakerXMarkIcon, HeartIcon as HeartIconOutline } from '@heroicons/react/24/outline';

const PlayerBar = () => {
    // Placeholder state for UI development
    const {
        currentTrack, isPlaying,
        currentTime, duration,
        volume, isShuffle, repeatMode,
        togglePlay, playNext, playPrev,
        toggleShuffle, toggleRepeat,
        seekTo, adjustVolume,
        addToFavorites, removeFromFavorites, isFavorite
    } = usePlayer();

    const [isDraggingProgress, setIsDraggingProgress] = useState(false);
    const [dragProgress, setDragProgress] = useState(0);
    const [isDraggingVolume, setIsDraggingVolume] = useState(false);
    const [dragVolume, setDragVolume] = useState(volume);

    const progressRef = useRef(null);
    const volumeRef = useRef(null);

    // Sync drag volume if external volume changes (and not dragging)
    useEffect(() => {
        if (!isDraggingVolume) setDragVolume(volume);
    }, [volume, isDraggingVolume]);

    const formatTime = (seconds) => {
        if (!seconds || isNaN(seconds)) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const calculatePercent = (e, ref) => {
        if (!ref.current) return 0;
        const rect = ref.current.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        return Math.min(Math.max(0, clientX - rect.left), rect.width) / rect.width;
    };

    const handleSeekStart = (e) => {
        setIsDraggingProgress(true);
        const percent = calculatePercent(e, progressRef);
        setDragProgress(percent * duration);
    };

    const handleVolumeStart = (e) => {
        setIsDraggingVolume(true);
        const percent = calculatePercent(e, volumeRef);
        setDragVolume(percent);
        adjustVolume(percent);
    };

    useEffect(() => {
        const handleMove = (e) => {
            if (isDraggingProgress && progressRef.current) {
                const percent = calculatePercent(e, progressRef);
                setDragProgress(percent * duration);
            }
            if (isDraggingVolume && volumeRef.current) {
                const percent = calculatePercent(e, volumeRef);
                setDragVolume(percent);
                adjustVolume(percent);
            }
        };

        const handleUp = (e) => {
            if (isDraggingProgress) {
                setIsDraggingProgress(false);
                if (progressRef.current) {
                    const percent = calculatePercent(e, progressRef);
                    seekTo(percent * duration);
                }
            }
            if (isDraggingVolume) {
                setIsDraggingVolume(false);
            }
        };

        if (isDraggingProgress || isDraggingVolume) {
            window.addEventListener('mousemove', handleMove);
            window.addEventListener('mouseup', handleUp);
            window.addEventListener('touchmove', handleMove);
            window.addEventListener('touchend', handleUp);
        }

        return () => {
            window.removeEventListener('mousemove', handleMove);
            window.removeEventListener('mouseup', handleUp);
            window.removeEventListener('touchmove', handleMove);
            window.removeEventListener('touchend', handleUp);
        };
    }, [isDraggingProgress, isDraggingVolume, duration, seekTo, adjustVolume]);

    const displayTime = isDraggingProgress ? dragProgress : currentTime;
    const progressPercent = duration ? (displayTime / duration) * 100 : 0;
    const volumePercent = (isDraggingVolume ? dragVolume : volume) * 100;

    return (
        <div className="w-full h-full flex flex-col pt-0 pb-1 md:py-4 px-4 md:px-6">
            <div className="flex flex-col md:flex-row md:flex-wrap items-center justify-between gap-3 md:gap-0 h-auto py-1 md:py-0 relative">

                {/* 1. Progress Bar - Top on Desktop (Order 1), Middle on Mobile (Order 2) */}
                <div className="w-full flex items-center gap-2 md:mb-5 order-2 md:order-1 mt-1 md:mt-0 px-1 md:px-0">
                    <span className="w-9 md:w-12 text-right text-[10px] text-gray-400 font-bold">{formatTime(displayTime)}</span>
                    <div
                        ref={progressRef}
                        className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden cursor-pointer group relative touch-none shadow-inner"
                        onMouseDown={handleSeekStart}
                        onTouchStart={handleSeekStart}
                    >
                        <div
                            className="h-full bg-blue-500 rounded-full relative pointer-events-none transition-[width] duration-100 ease-linear shadow-[0_0_12px_rgba(59,130,246,0.6)]"
                            style={{ width: `${progressPercent}%` }}
                        >
                            <div className={`absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white rounded-full shadow-xl ${isDraggingProgress ? 'opacity-100 scale-110' : 'opacity-0 group-hover:opacity-100'} transition-all`} />
                        </div>
                    </div>
                    <span className="w-9 md:w-12 text-left text-[10px] text-gray-400 font-bold">{formatTime(duration)}</span>
                </div>

                {/* 2. Track Info - Top on Mobile (Order 1), Left on Desktop (Order 2) */}
                <div className="flex items-center gap-4 w-full md:w-[30%] min-w-0 px-1 md:px-0 order-1 md:order-2">
                    <div className="relative w-12 h-12 md:w-14 md:h-14 rounded-xl overflow-hidden shadow-lg shrink-0 group">
                        <img
                            src={currentTrack?.thumb || "https://placehold.co/150x150/333/333"}
                            alt="Art"
                            className={`w-full h-full object-cover ${!currentTrack ? 'opacity-50' : ''}`}
                            referrerPolicy="no-referrer"
                        />
                    </div>
                    <div className="min-w-0 flex-1">
                        <h3 className="text-white font-bold truncate text-base md:text-base leading-tight">
                            {currentTrack?.title || "Ready to Play"}
                        </h3>
                        <p className="text-gray-400 text-xs md:text-sm truncate font-medium">
                            {currentTrack?.artist || "Select a song"}
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        {currentTrack && (
                            <button
                                onClick={() => isFavorite(currentTrack.videoId) ? removeFromFavorites(currentTrack.videoId) : addToFavorites(currentTrack)}
                                className="text-gray-400 hover:text-blue-400 p-2 transition-colors"
                            >
                                {isFavorite(currentTrack.videoId) ? <HeartIcon className="w-5 h-5 text-blue-400" /> : <HeartIconOutline className="w-5 h-5" />}
                            </button>
                        )}
                    </div>
                </div>

                {/* 3. Main Controls - Bottom on Mobile (Order 3), Center on Desktop (Order 3) */}
                <div className="flex items-center gap-6 md:gap-8 justify-center w-full md:w-[40%] order-3 md:order-3">
                    {/* Shuffle */}
                    <button onClick={toggleShuffle} className={`${isShuffle ? 'text-blue-400' : 'text-gray-600 md:text-gray-500 hover:text-white'} transition-colors`}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 md:w-5 md:h-5">
                            <polyline points="16 3 21 3 21 8"></polyline>
                            <line x1="4" y1="20" x2="21" y2="3"></line>
                            <polyline points="21 16 21 21 16 21"></polyline>
                            <line x1="15" y1="15" x2="21" y2="21"></line>
                            <line x1="4" y1="4" x2="9" y2="9"></line>
                        </svg>
                    </button>

                    <button onClick={playPrev} className="text-gray-400 hover:text-white transition-colors">
                        <BackwardIcon className="w-7 h-7" />
                    </button>

                    <button
                        onClick={togglePlay}
                        className="text-white hover:scale-110 active:scale-90 transition-all shadow-[0_0_20px_rgba(59,130,246,0.3)] bg-blue-500/10 md:bg-transparent rounded-full"
                    >
                        {isPlaying ? (
                            <PauseCircleIcon className="w-12 h-12 md:w-16 md:h-16 text-blue-400" />
                        ) : (
                            <PlayCircleIcon className="w-12 h-12 md:w-16 md:h-16" />
                        )}
                    </button>

                    <button onClick={() => playNext()} className="text-gray-400 hover:text-white transition-colors">
                        <ForwardIcon className="w-7 h-7" />
                    </button>

                    {/* Repeat */}
                    <button onClick={toggleRepeat} className={`${repeatMode > 0 ? 'text-blue-400' : 'text-gray-600 md:text-gray-500 hover:text-white'} transition-colors relative`}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 md:w-5 md:h-5">
                            <polyline points="17 1 21 5 17 9"></polyline>
                            <path d="M3 11V9a4 4 0 0 1 4-4h14"></path>
                            <polyline points="7 23 3 19 7 15"></polyline>
                            <path d="M21 13v2a4 4 0 0 1-4 4H3"></path>
                        </svg>
                        {repeatMode === 2 && (
                            <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[9px] md:text-[8px] font-black pb-0.5">1</span>
                        )}
                    </button>
                </div>

                {/* 4. Extras (Desktop Only) - Right on Desktop (Order 4) */}
                <div className="hidden md:flex items-center justify-end gap-6 md:w-[30%] md:order-4">
                    <div className="flex items-center gap-3">
                        <button className="text-gray-500 hover:text-white transition-colors" onClick={() => adjustVolume(volume === 0 ? 1 : 0)}>
                            {volume === 0 ? <SpeakerXMarkIcon className="w-5 h-5" /> : <SpeakerWaveIcon className="w-5 h-5" />}
                        </button>
                        <div ref={volumeRef} className="w-24 h-1.5 bg-white/10 rounded-full overflow-hidden cursor-pointer shadow-inner" onMouseDown={handleVolumeStart} onTouchStart={handleVolumeStart}>
                            <div className="h-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.4)]" style={{ width: `${volumePercent}%` }} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PlayerBar;
