import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';

const PlayerContext = createContext();

export const usePlayer = () => useContext(PlayerContext);

export const PlayerProvider = ({ children }) => {
    // --- Persistence: Load Initial State ---
    const [currentTrack, setCurrentTrack] = useState(() => {
        try { return JSON.parse(localStorage.getItem('musicPlayer_currentTrack')) || null; } catch { return null; }
    });
    const [isPlaying, setIsPlaying] = useState(false);
    const [queue, setQueue] = useState(() => {
        try { return JSON.parse(localStorage.getItem('musicPlayer_queue')) || []; } catch { return []; }
    });
    const [currentIndex, setCurrentIndex] = useState(() => {
        try { return parseInt(localStorage.getItem('musicPlayer_currentIndex') || '-1', 10); } catch { return -1; }
    });
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(() => {
        try { return parseFloat(localStorage.getItem('musicPlayer_currentTime') || '0'); } catch { return 0; }
    });
    const [volume, setVolume] = useState(() => {
        try { return parseFloat(localStorage.getItem('musicPlayer_volume') || '1.0'); } catch { return 1.0; }
    });
    const [isShuffle, setIsShuffle] = useState(() => {
        try { return JSON.parse(localStorage.getItem('musicPlayer_isShuffle')) || false; } catch { return false; }
    });
    const [repeatMode, setRepeatMode] = useState(() => {
        try { return parseInt(localStorage.getItem('musicPlayer_repeatMode') || '0', 10); } catch { return 0; }
    }); // 0: off, 1: all, 2: one

    const playerRef = useRef(null);
    const audioContextRef = useRef(null);
    const silenceOscillatorRef = useRef(null);
    const wakeLockRef = useRef(null);
    const isPlayerReady = useRef(false);
    const userIntentPaused = useRef(false);
    const silentAudioRef = useRef(null);

    // ✅ Interval ref that continuously re-asserts our media session handlers
    // This is the KEY fix — YouTube re-registers its handlers asynchronously,
    // so we fight back on a tight loop to always stay in control.
    const mediaSessionGuardRef = useRef(null);

    const stateRef = useRef({
        queue: [],
        currentIndex: -1,
        isShuffle: false,
        repeatMode: 0
    });

    // --- Stable Media Session Handler Refs ---
    const mediaSessionActions = useRef({
        play: null, pause: null, prev: null, next: null, stop: null
    });

    const playHandler = useCallback(() => mediaSessionActions.current.play?.(), []);
    const pauseHandler = useCallback(() => mediaSessionActions.current.pause?.(), []);
    const prevHandler = useCallback(() => mediaSessionActions.current.prev?.(), []);
    const nextHandler = useCallback(() => mediaSessionActions.current.next?.(), []);
    const stopHandler = useCallback(() => mediaSessionActions.current.stop?.(), []);

    useEffect(() => {
        stateRef.current = { queue, currentIndex, isShuffle, repeatMode };
    }, [queue, currentIndex, isShuffle, repeatMode]);

    // --- Persistence ---
    useEffect(() => { localStorage.setItem('musicPlayer_currentTrack', JSON.stringify(currentTrack)); }, [currentTrack]);
    useEffect(() => { localStorage.setItem('musicPlayer_queue', JSON.stringify(queue)); }, [queue]);
    useEffect(() => { localStorage.setItem('musicPlayer_currentIndex', currentIndex.toString()); }, [currentIndex]);
    useEffect(() => { localStorage.setItem('musicPlayer_volume', volume.toString()); }, [volume]);
    useEffect(() => { localStorage.setItem('musicPlayer_isShuffle', JSON.stringify(isShuffle)); }, [isShuffle]);
    useEffect(() => { localStorage.setItem('musicPlayer_repeatMode', repeatMode.toString()); }, [repeatMode]);

    useEffect(() => {
        const handleUnload = () => {
            if (playerRef.current && isPlayerReady.current) {
                localStorage.setItem('musicPlayer_currentTime', playerRef.current.getCurrentTime().toString());
            }
        };
        window.addEventListener('beforeunload', handleUnload);
        return () => window.removeEventListener('beforeunload', handleUnload);
    }, []);

    useEffect(() => {
        if (!isPlaying && playerRef.current && isPlayerReady.current) {
            localStorage.setItem('musicPlayer_currentTime', playerRef.current.getCurrentTime().toString());
        }
    }, [isPlaying]);

    // --- Screen Wake Lock ---
    const requestWakeLock = async () => {
        if ('wakeLock' in navigator) {
            try {
                wakeLockRef.current = await navigator.wakeLock.request('screen');
            } catch (err) {
                console.warn(`Wake Lock Error: ${err.name}, ${err.message}`);
            }
        }
    };

    const releaseWakeLock = async () => {
        if (wakeLockRef.current) {
            try {
                await wakeLockRef.current.release();
                wakeLockRef.current = null;
            } catch (err) {
                console.error("Release Wake Lock Error:", err);
            }
        }
    };

    // ✅ The core function that enforces our media session handlers.
    // MUST set all seek handlers to null FIRST before setting play/pause/prev/next.
    // Order matters — iOS evaluates the presence of seek handlers to decide button layout.
    const enforceMediaSession = useCallback(() => {
        if (!('mediaSession' in navigator)) return;
        try {
            // ✅ STEP 1: Kill all seek handlers FIRST
            // If seekbackward/seekforward/seekto are registered (even by YouTube),
            // iOS shows 10s skip buttons. Nulling them here overrides YouTube's handlers.
            navigator.mediaSession.setActionHandler('seekbackward', null);
            navigator.mediaSession.setActionHandler('seekforward', null);
            navigator.mediaSession.setActionHandler('seekto', null);

            // ✅ STEP 2: Register our playback controls
            navigator.mediaSession.setActionHandler('play', playHandler);
            navigator.mediaSession.setActionHandler('pause', pauseHandler);
            navigator.mediaSession.setActionHandler('previoustrack', prevHandler);
            navigator.mediaSession.setActionHandler('nexttrack', nextHandler);
            navigator.mediaSession.setActionHandler('stop', stopHandler);
        } catch (e) {
            // Silently ignore — browser may not support all actions
        }
    }, [playHandler, pauseHandler, prevHandler, nextHandler, stopHandler]);

    // ✅ Start the media session guard interval
    // Runs every 500ms while playing to continuously override YouTube's handlers
    const startMediaSessionGuard = useCallback(() => {
        if (mediaSessionGuardRef.current) return; // Already running
        console.log("MediaSession guard started");
        mediaSessionGuardRef.current = setInterval(() => {
            enforceMediaSession();
        }, 500);
    }, [enforceMediaSession]);

    // ✅ Stop the guard when not needed (paused/stopped)
    const stopMediaSessionGuard = useCallback(() => {
        if (mediaSessionGuardRef.current) {
            clearInterval(mediaSessionGuardRef.current);
            mediaSessionGuardRef.current = null;
            console.log("MediaSession guard stopped");
        }
    }, []);

    // Start/stop guard based on play state
    useEffect(() => {
        if (isPlaying) {
            startMediaSessionGuard();
            requestWakeLock();
            if (silentAudioRef.current) {
                silentAudioRef.current.play().catch(() => { });
            }
        } else {
            stopMediaSessionGuard();
            releaseWakeLock();
            if (silentAudioRef.current) {
                silentAudioRef.current.pause();
            }
        }
        return () => { }; // Guard cleanup handled in its own effect
    }, [isPlaying, startMediaSessionGuard, stopMediaSessionGuard]);

    // Cleanup guard on unmount
    useEffect(() => {
        return () => stopMediaSessionGuard();
    }, [stopMediaSessionGuard]);

    // Re-request wake lock on visibility change
    useEffect(() => {
        const handleVisibility = () => {
            if (document.visibilityState === 'visible' && isPlaying) {
                requestWakeLock();
                if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
                    audioContextRef.current.resume();
                }
                if (silentAudioRef.current) {
                    silentAudioRef.current.play().catch(() => { });
                }
                // Immediately enforce on return to foreground
                enforceMediaSession();
            }
            if (document.visibilityState === 'hidden' && isPlaying && !userIntentPaused.current) {
                if (silentAudioRef.current) silentAudioRef.current.play().catch(() => { });
                setTimeout(() => {
                    if (playerRef.current && isPlayerReady.current && !userIntentPaused.current) {
                        playerRef.current.playVideo();
                    }
                }, 500);
            }
        };
        document.addEventListener('visibilitychange', handleVisibility);
        return () => document.removeEventListener('visibilitychange', handleVisibility);
    }, [isPlaying, enforceMediaSession]);

    // --- Silent Audio + AudioContext Init (on first user gesture) ---
    useEffect(() => {
        const initAudioSession = () => {
            // Silent looping <audio> — gives our app ownership of the iOS media session
            if (!silentAudioRef.current) {
                const silentMp3 = "data:audio/mpeg;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4LjI5LjEwMAAAAAAAAAAAAAAA//OEAAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAAEAAABIADAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV6urq6urq6urq6urq6urq6urq6urq6urq6v////////////////////////////////8AAAAATGF2YzU4LjU0AAAAAAAAAAAAAAAAJAAAAAAAAAAAASDs90hvAAAAAAAAAAAAAAAAAAAA//MUZAAAAAGkAAAAAAAAA0gAAAAATEFN//MUZAMAAAGkAAAAAAAAA0gAAAAARTMu//MUZAYAAAGkAAAAAAAAA0gAAAAAOTku//MUZAkAAAGkAAAAAAAAA0gAAAAA100AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
                const audio = new Audio(silentMp3);
                audio.loop = true;
                audio.volume = 0.001; // NOT zero — iOS ignores muted audio for session ownership
                silentAudioRef.current = audio;
            }

            // AudioContext keeps the audio session alive in background
            if (!audioContextRef.current) {
                const AudioContext = window.AudioContext || window.webkitAudioContext;
                if (AudioContext) {
                    const ac = new AudioContext();
                    audioContextRef.current = ac;
                    const o = ac.createOscillator();
                    const g = ac.createGain();
                    o.type = 'sine';
                    o.frequency.value = 60;
                    g.gain.value = 0.0001;
                    o.connect(g);
                    g.connect(ac.destination);
                    o.start();
                    silenceOscillatorRef.current = o;
                    if (ac.state === 'suspended') ac.resume();
                }
            }

            window.removeEventListener('click', initAudioSession);
            window.removeEventListener('touchstart', initAudioSession);
            console.log("Audio session initialized");
        };

        window.addEventListener('click', initAudioSession);
        window.addEventListener('touchstart', initAudioSession);
        return () => {
            window.removeEventListener('click', initAudioSession);
            window.removeEventListener('touchstart', initAudioSession);
        };
    }, []);

    // --- Progress Loop ---
    useEffect(() => {
        const interval = setInterval(() => {
            if (playerRef.current && isPlayerReady.current && isPlaying) {
                const current = playerRef.current.getCurrentTime();
                const total = playerRef.current.getDuration();
                setCurrentTime(current);
                setDuration(total);
                updateMediaSessionPosition('playing', current, total);
            }
        }, 500);
        return () => clearInterval(interval);
    }, [isPlaying]);

    // --- Media Session Metadata ---
    const updateMediaSession = (track) => {
        if (!track || !('mediaSession' in navigator)) return;
        try {
            navigator.mediaSession.metadata = new MediaMetadata({
                title: track.title,
                artist: track.artist || 'Muze Artist',
                album: 'Muze Library',
                artwork: [
                    { src: track.thumb || './music.png', sizes: '96x96', type: 'image/png' },
                    { src: track.thumb || './music.png', sizes: '128x128', type: 'image/png' },
                    { src: track.thumb || './music.png', sizes: '192x192', type: 'image/png' },
                    { src: track.thumb || './music.png', sizes: '256x256', type: 'image/png' },
                    { src: track.thumb || './music.png', sizes: '384x384', type: 'image/png' },
                    { src: track.thumb || './music.png', sizes: '512x512', type: 'image/png' }
                ]
            });
            navigator.mediaSession.playbackState = 'playing';
        } catch (error) {
            console.error("Media Session Metadata Error:", error);
        }
    };

    const updateMediaSessionPosition = (state, manualTime = null, manualDuration = null) => {
        if (!('mediaSession' in navigator)) return;
        try {
            navigator.mediaSession.playbackState = state;
            const pos = manualTime !== null ? manualTime : currentTime;
            const dur = manualDuration !== null ? manualDuration : duration;
            if ('setPositionState' in navigator.mediaSession && dur > 0 && isFinite(pos) && isFinite(dur)) {
                navigator.mediaSession.setPositionState({
                    duration: Math.max(dur, 0.01),
                    playbackRate: 1.0,
                    position: Math.min(Math.max(pos, 0), dur)
                });
            }
        } catch (e) { }
    };

    const resumeAudioContext = () => {
        if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
            audioContextRef.current.resume();
        }
        if (silentAudioRef.current && silentAudioRef.current.paused) {
            silentAudioRef.current.play().catch(() => { });
        }
    };

    // --- History & Favorites ---
    const [history, setHistory] = useState(() => {
        try { return JSON.parse(localStorage.getItem('musicHistory')) || []; } catch { return []; }
    });
    const [favorites, setFavorites] = useState(() => {
        try { return JSON.parse(localStorage.getItem('musicFavorites')) || []; } catch { return []; }
    });
    const [favoriteAlbums, setFavoriteAlbums] = useState(() => {
        try { return JSON.parse(localStorage.getItem('musicFavoriteAlbums')) || []; } catch { return []; }
    });

    useEffect(() => { localStorage.setItem('musicFavorites', JSON.stringify(favorites)); }, [favorites]);
    useEffect(() => { localStorage.setItem('musicFavoriteAlbums', JSON.stringify(favoriteAlbums)); }, [favoriteAlbums]);
    useEffect(() => { localStorage.setItem('musicHistory', JSON.stringify(history)); }, [history]);

    const addToHistory = (track) => {
        setHistory(prev => {
            const filtered = prev.filter(item => item.id !== track.videoId);
            return [{ id: track.videoId, title: track.title, artist: track.artist, thumb: track.thumb }, ...filtered].slice(0, 20);
        });
    };

    const addToFavorites = (track) => {
        if (!favorites.some(item => item.id === track.videoId)) {
            setFavorites(prev => [{ id: track.videoId, title: track.title, artist: track.artist, thumb: track.thumb }, ...prev]);
            return true;
        }
        return false;
    };

    const removeFromFavorites = (videoId) => {
        setFavorites(prev => prev.filter(item => item.id !== videoId));
    };

    const isFavorite = (videoId) => favorites.some(item => item.id === videoId);

    const isAlbumFavorite = (albumId) => favoriteAlbums.some(id => String(id) === String(albumId));

    const toggleAlbumFavorites = async (albumId) => {
        const idStr = String(albumId);
        const isLiked = favoriteAlbums.some(id => String(id) === idStr);
        if (isLiked) {
            setFavoriteAlbums(prev => prev.filter(id => String(id) !== idStr));
            try {
                const response = await fetch(`https://musicbackend-pkfi.vercel.app/album/${idStr}`);
                const data = await response.json();
                if (data && data.tracks) {
                    const trackIdsToRemove = data.tracks.map(t => t.videoId || t.id);
                    setFavorites(prev => prev.filter(item => !trackIdsToRemove.includes(item.id)));
                }
            } catch (e) { console.error("Failed to remove album tracks", e); }
        } else {
            setFavoriteAlbums(prev => [idStr, ...prev]);
            try {
                const response = await fetch(`https://musicbackend-pkfi.vercel.app/album/${idStr}`);
                const data = await response.json();
                if (data && data.tracks) {
                    const albumArt = data.thumbnails ? data.thumbnails[data.thumbnails.length - 1].url : '';
                    const albumArtist = data.artists ? data.artists.map(a => a.name).join(', ') : (data.artist || 'Unknown');
                    let newTracks = [];
                    data.tracks.forEach(track => {
                        const trackId = track.videoId || track.id;
                        if (!trackId) return;
                        if (!favorites.some(item => String(item.id) === String(trackId))) {
                            newTracks.push({
                                id: trackId,
                                title: track.title,
                                artist: track.artists ? track.artists.map(a => a.name).join(', ') : albumArtist,
                                thumb: track.thumbnails ? track.thumbnails[track.thumbnails.length - 1].url : albumArt
                            });
                        }
                    });
                    if (newTracks.length > 0) {
                        setFavorites(prev => {
                            const uniqueNew = newTracks.filter(n => !prev.some(p => String(p.id) === String(n.id)));
                            return [...uniqueNew, ...prev];
                        });
                    }
                }
            } catch (error) { console.error("Failed to add album to favorites", error); }
        }
    };

    // --- Controls ---
    const playTrack = (track, resetQueue = true) => {
        setCurrentTime(0);
        setDuration(100);
        setCurrentTrack(track);
        if (resetQueue) {
            setQueue([track]);
            setCurrentIndex(0);
        }
        userIntentPaused.current = false;
        addToHistory(track);
        updateMediaSession(track);

        // ✅ Immediately enforce + ensure silent audio is running
        enforceMediaSession();
        if (silentAudioRef.current) {
            silentAudioRef.current.play().catch(() => { });
        }

        if (playerRef.current && isPlayerReady.current) {
            playerRef.current.loadVideoById(track.videoId);
            playerRef.current.playVideo();
        }
    };

    const playAlbum = (tracks, startIndex = 0) => {
        if (!tracks || tracks.length === 0) return;
        setQueue(tracks);
        setCurrentIndex(startIndex);
        playTrack(tracks[startIndex], false);
    };

    const toggleShuffle = () => setIsShuffle(prev => !prev);
    const toggleRepeat = () => setRepeatMode(prev => (prev + 1) % 3);

    const togglePlay = useCallback(() => {
        if (!playerRef.current) return;
        if (isPlaying) {
            userIntentPaused.current = true;
            playerRef.current.pauseVideo();
            updateMediaSessionPosition('paused');
        } else {
            resumeAudioContext();
            userIntentPaused.current = false;
            playerRef.current.playVideo();
            updateMediaSessionPosition('playing');
        }
    }, [isPlaying]);

    const playNext = useCallback(async (auto = false) => {
        const { queue, currentIndex, isShuffle, repeatMode } = stateRef.current;
        if (queue.length === 0) return;

        let nextIndex;
        if (isShuffle) {
            let attempts = 0;
            do {
                nextIndex = Math.floor(Math.random() * queue.length);
                attempts++;
            } while (nextIndex === currentIndex && queue.length > 1 && attempts < 5);
        } else {
            nextIndex = currentIndex + 1;
            if (nextIndex >= queue.length) {
                if (repeatMode === 1) {
                    nextIndex = 0;
                } else if (repeatMode === 0) {
                    const current = queue[currentIndex];
                    if (current) {
                        try {
                            const userLang = localStorage.getItem('userLanguage') || '';
                            const eras = ['2000s Hits', '2010s Hits', '2020s Hits', 'Latest Hits', 'Cinema Hits'];
                            const randomEra = eras[Math.floor(Math.random() * eras.length)];
                            const searchQuery = `${userLang} ${current.artist} ${randomEra}`.trim();
                            const response = await fetch(`https://musicbackend-pkfi.vercel.app/search?query=${encodeURIComponent(searchQuery)}&filter=songs`);
                            const data = await response.json();
                            if (data && data.length > 0) {
                                const newTracks = data.map(item => ({
                                    videoId: item.videoId || item.id,
                                    title: item.title,
                                    artist: item.artists ? item.artists.map(a => a.name).join(', ') : (item.artist || 'Unknown'),
                                    thumb: item.thumbnails ? item.thumbnails[item.thumbnails.length - 1].url : ''
                                })).filter(t => !queue.some(q => q.videoId === t.videoId));
                                if (newTracks.length > 0) {
                                    const tracksToAdd = newTracks.slice(0, 5);
                                    setQueue([...queue, ...tracksToAdd]);
                                    setCurrentIndex(queue.length);
                                    playTrack(tracksToAdd[0], false);
                                    return;
                                }
                            }
                        } catch (e) { console.error("Autoplay failed", e); }
                    }
                    return;
                } else return;
            }
        }
        setCurrentIndex(nextIndex);
        playTrack(queue[nextIndex], false);
    }, []);

    const playPrev = useCallback(() => {
        const { queue, currentIndex } = stateRef.current;
        if (queue.length === 0) return;
        if (currentTime > 3) {
            playerRef.current?.seekTo(0);
            return;
        }
        let prevIndex = currentIndex - 1;
        if (prevIndex < 0) prevIndex = queue.length - 1;
        setCurrentIndex(prevIndex);
        playTrack(queue[prevIndex], false);
    }, [currentTime]);

    const addToQueue = (track) => {
        const newQueue = [...queue, track];
        setQueue(newQueue);
        if (queue.length === 0) {
            setCurrentIndex(0);
            playTrack(track);
        }
    };

    const handleTrackEnd = () => {
        const { repeatMode } = stateRef.current;
        if (repeatMode === 2) {
            playerRef.current.seekTo(0);
            playerRef.current.playVideo();
        } else {
            playNext(true);
        }
    };

    // --- YouTube Player Handlers ---
    const onPlayerReady = () => {
        isPlayerReady.current = true;
        console.log("YouTube Player Ready");
        if (playerRef.current) {
            playerRef.current.setVolume(volume * 100);
            if (currentTime > 0) playerRef.current.seekTo(currentTime);
        }
    };

    const onPlayerStateChange = (event) => {
        if (!playerRef.current) return;
        const state = event.data;
        const YT = window.YT;

        if (state === YT.PlayerState.PLAYING) {
            userIntentPaused.current = false;
            setIsPlaying(true);
            const dur = playerRef.current.getDuration();
            setDuration(dur);
            updateMediaSessionPosition('playing', playerRef.current.getCurrentTime(), dur);

            // ✅ YouTube just fired PLAYING — it likely stole the media session.
            // Enforce immediately AND the guard interval will keep enforcing every 500ms.
            enforceMediaSession();
            if (silentAudioRef.current) {
                silentAudioRef.current.play().catch(() => { });
            }
        } else if (state === YT.PlayerState.PAUSED) {
            setIsPlaying(false);
            updateMediaSessionPosition('paused');
            if (!userIntentPaused.current) {
                setTimeout(() => {
                    if (!userIntentPaused.current && playerRef.current) {
                        playerRef.current.playVideo();
                    }
                }, 100);
            }
        } else if (state === YT.PlayerState.ENDED) {
            handleTrackEnd();
        }
    };

    const onPlayerError = (event) => {
        console.error("Player Error:", event.data);
        setTimeout(() => playNext(true), 1000);
    };

    // --- YouTube Player Init ---
    useEffect(() => {
        if (!window.YT) {
            const tag = document.createElement('script');
            tag.src = "https://www.youtube.com/iframe_api";
            const firstScriptTag = document.getElementsByTagName('script')[0];
            firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
        }

        window.onYouTubeIframeAPIReady = () => {
            const initialVideoId = currentTrack?.videoId || '';
            playerRef.current = new window.YT.Player('youtube-player', {
                height: '100%',
                width: '100%',
                videoId: initialVideoId,
                playerVars: {
                    'autoplay': 0,
                    'playsinline': 1,
                    'controls': 0,
                    'disablekb': 1,
                    'fs': 0,
                    'rel': 0,
                    'origin': window.location.origin
                },
                events: {
                    'onReady': onPlayerReady,
                    'onStateChange': onPlayerStateChange,
                    'onError': onPlayerError
                }
            });
        };
    }, []);

    const seekTo = (time) => {
        if (playerRef.current) {
            playerRef.current.seekTo(time, true);
            setCurrentTime(time);
        }
    };

    const adjustVolume = (newVolume) => {
        setVolume(newVolume);
        if (playerRef.current) {
            playerRef.current.setVolume(newVolume * 100);
        }
    };

    // --- Media Session Action Ref Updates ---
    useEffect(() => {
        mediaSessionActions.current = {
            play: () => { resumeAudioContext(); togglePlay(); },
            pause: () => { togglePlay(); },
            prev: () => { resumeAudioContext(); playPrev(); },
            next: () => { resumeAudioContext(); playNext(); },
            stop: () => { togglePlay(); }
        };
    }, [togglePlay, playPrev, playNext]);

    // ✅ Initial MediaSession Setup — runs ONCE on mount
    useEffect(() => {
        enforceMediaSession();
        return () => {
            ['play', 'pause', 'previoustrack', 'nexttrack', 'seekto', 'seekbackward', 'seekforward', 'stop']
                .forEach(action => {
                    try { navigator.mediaSession.setActionHandler(action, null); } catch { }
                });
        };
    }, [enforceMediaSession]);

    const value = {
        currentTrack,
        isPlaying,
        queue,
        currentTime,
        duration,
        volume,
        isShuffle,
        repeatMode,
        togglePlay,
        toggleShuffle,
        toggleRepeat,
        playNext,
        playPrev,
        addToQueue,
        seekTo,
        adjustVolume,
        playTrack,
        playAlbum,
        addToFavorites,
        removeFromFavorites,
        isFavorite,
        isAlbumFavorite,
        toggleAlbumFavorites,
        favorites,
        favoriteAlbums,
        history
    };

    return (
        <PlayerContext.Provider value={value}>
            {children}
        </PlayerContext.Provider>
    );
};