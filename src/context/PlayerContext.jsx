import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';

const PlayerContext = createContext();

export const usePlayer = () => useContext(PlayerContext);

// ✅ NUCLEAR FIX: Intercept navigator.mediaSession.setActionHandler at the browser level.
// YouTube's iframe calls setActionHandler('seekbackward', fn) and setActionHandler('seekforward', fn)
// which causes iOS to show 10s skip buttons instead of Prev/Next.
// We wrap the native setActionHandler so ANY call to register seekbackward/seekforward/seekto
// is silently blocked and overridden to null — no matter who calls it or when.
const installMediaSessionTrap = () => {
    if (!('mediaSession' in navigator)) return;
    if (navigator.mediaSession._trapped) return; // Only install once

    const originalSetActionHandler = navigator.mediaSession.setActionHandler.bind(navigator.mediaSession);

    navigator.mediaSession.setActionHandler = function (action, handler) {
        // Block YouTube (or anyone) from registering seek handlers
        if (action === 'seekbackward' || action === 'seekforward' || action === 'seekto') {
            // Always force these to null — iOS will then show Prev/Next buttons
            originalSetActionHandler(action, null);
            return;
        }
        // Allow all other actions (play, pause, previoustrack, nexttrack, stop)
        originalSetActionHandler(action, handler);
    };

    navigator.mediaSession._trapped = true;
    console.log("✅ MediaSession trap installed — seek handlers permanently blocked");
};

// Install the trap immediately when this module loads (before any YouTube iframe loads)
installMediaSessionTrap();

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
    const currentTrackRef = useRef(currentTrack);

    useEffect(() => {
        currentTrackRef.current = currentTrack;
    }, [currentTrack]);

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

    // --- Register our own media session handlers (seek actions go through the trap = always null) ---
    const registerMediaSessionHandlers = useCallback(() => {
        if (!('mediaSession' in navigator)) return;
        try {
            // These go through our trap — seek ones will always be forced to null automatically
            navigator.mediaSession.setActionHandler('play', playHandler);
            navigator.mediaSession.setActionHandler('pause', pauseHandler);
            navigator.mediaSession.setActionHandler('previoustrack', prevHandler);
            navigator.mediaSession.setActionHandler('nexttrack', nextHandler);
            navigator.mediaSession.setActionHandler('stop', stopHandler);
            navigator.mediaSession.setActionHandler('seekbackward', null);
            navigator.mediaSession.setActionHandler('seekforward', null);
            navigator.mediaSession.setActionHandler('seekto', null);
        } catch (e) { }
    }, [playHandler, pauseHandler, prevHandler, nextHandler, stopHandler]);

    useEffect(() => {
        if (isPlaying) {
            requestWakeLock();
            if (silentAudioRef.current) silentAudioRef.current.play().catch(() => { });
        } else {
            releaseWakeLock();
            // DO NOT pause silentAudio here - doing so drops Bluetooth/CarPlay connection
        }
    }, [isPlaying]);

    useEffect(() => {
        const handleVisibility = () => {
            if (document.visibilityState === 'visible' && isPlaying) {
                requestWakeLock();
                if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
                    audioContextRef.current.resume();
                }
                if (silentAudioRef.current) silentAudioRef.current.play().catch(() => { });
                registerMediaSessionHandlers();
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
    }, [isPlaying, registerMediaSessionHandlers]);

    // --- Silent Audio + AudioContext Init ---
    useEffect(() => {
        const initAudioSession = () => {
            if (!silentAudioRef.current) {
                const silentMp3 = "data:audio/mpeg;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4LjI5LjEwMAAAAAAAAAAAAAAA//OEAAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAAEAAABIADAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV6urq6urq6urq6urq6urq6urq6urq6urq6v////////////////////////////////8AAAAATGF2YzU4LjU0AAAAAAAAAAAAAAAAJAAAAAAAAAAAASDs90hvAAAAAAAAAAAAAAAAAAAA//MUZAAAAAGkAAAAAAAAA0gAAAAATEFN//MUZAMAAAGkAAAAAAAAA0gAAAAARTMu//MUZAYAAAGkAAAAAAAAA0gAAAAAOTku//MUZAkAAAGkAAAAAAAAA0gAAAAA100AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
                const audio = new Audio(silentMp3);
                audio.loop = true;
                audio.volume = 0.001;
                silentAudioRef.current = audio;
            }

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
        let interval;
        if (isPlaying) {
            // 200ms is fast enough to look smooth without causing React render bottlenecks
            interval = setInterval(() => {
                if (playerRef.current && isPlayerReady.current) {
                    const current = playerRef.current.getCurrentTime();
                    const total = playerRef.current.getDuration();
                    // Optional: only update if changed significantly to save renders
                    setCurrentTime(current);
                    if (total > 0) setDuration(total);
                    updateMediaSessionPosition('playing', current, total);
                }
            }, 200);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
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

    const lastMediaPositionUpdate = useRef(0);

    const updateMediaSessionPosition = (state, manualTime = null, manualDuration = null) => {
        if (!('mediaSession' in navigator)) return;
        try {
            navigator.mediaSession.playbackState = state;
            const pos = manualTime !== null ? manualTime : currentTime;
            const dur = manualDuration !== null ? manualDuration : duration;

            // Limit position updates to once per second to prevent iOS progress bar freezing
            const now = Date.now();
            if ('setPositionState' in navigator.mediaSession && dur > 0 && isFinite(pos) && isFinite(dur)) {
                if (now - lastMediaPositionUpdate.current >= 1000 || state !== 'playing') {
                    navigator.mediaSession.setPositionState({
                        duration: Math.max(dur, 0.01),
                        playbackRate: 1.0,
                        position: Math.min(Math.max(pos, 0), dur)
                    });
                    lastMediaPositionUpdate.current = now;
                }
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
        try {
            const saved = JSON.parse(localStorage.getItem('musicHistory')) || [];
            return saved.filter(item => item && (item.id || item.videoId));
        } catch { return []; }
    });
    const [favorites, setFavorites] = useState(() => {
        try {
            const saved = JSON.parse(localStorage.getItem('musicFavorites')) || [];
            return saved.filter(item => item && (item.id || item.videoId));
        } catch { return []; }
    });
    const [favoriteAlbums, setFavoriteAlbums] = useState(() => {
        try { return JSON.parse(localStorage.getItem('musicFavoriteAlbums')) || []; } catch { return []; }
    });
    const [favoriteArtists, setFavoriteArtists] = useState(() => {
        try { return JSON.parse(localStorage.getItem('musicFavoriteArtists')) || []; } catch { return []; }
    });

    useEffect(() => {
        const validFavorites = favorites.filter(item => item && item.id);
        localStorage.setItem('musicFavorites', JSON.stringify(validFavorites));
    }, [favorites]);
    useEffect(() => { localStorage.setItem('musicFavoriteAlbums', JSON.stringify(favoriteAlbums)); }, [favoriteAlbums]);
    useEffect(() => { localStorage.setItem('musicFavoriteArtists', JSON.stringify(favoriteArtists)); }, [favoriteArtists]);
    useEffect(() => {
        const validHistory = history.filter(item => item && item.id);
        localStorage.setItem('musicHistory', JSON.stringify(validHistory));
    }, [history]);

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
    const isArtistFavorite = (artistId) => favoriteArtists.some(id => String(id) === String(artistId));

    const toggleAlbumFavorites = async (albumId, type = 'album') => {
        const idStr = String(albumId);
        const isLiked = favoriteAlbums.some(id => String(id) === idStr);
        const endpoint = type === 'playlist' ? 'playlist' : 'album';

        if (isLiked) {
            setFavoriteAlbums(prev => prev.filter(id => String(id) !== idStr));
            try {
                const response = await fetch(`https://musicbackend-pkfi.vercel.app/${endpoint}/${idStr}`);
                const data = await response.json();
                if (data && data.tracks) {
                    const trackIdsToRemove = data.tracks.map(t => t.videoId || t.id);
                    setFavorites(prev => prev.filter(item => !trackIdsToRemove.includes(item.id)));
                }
            } catch (e) { console.error(`Failed to remove ${type} tracks`, e); }
        } else {
            setFavoriteAlbums(prev => [idStr, ...prev]);
            try {
                const response = await fetch(`https://musicbackend-pkfi.vercel.app/${endpoint}/${idStr}`);
                const data = await response.json();
                if (data && data.tracks) {
                    const albumArt = data.thumbnails ? data.thumbnails[data.thumbnails.length - 1].url : (data.thumb || '');
                    const albumArtist = data.artists ? data.artists.map(a => a.name).join(', ') : (data.artist || 'Unknown');

                    const newTracks = data.tracks.map(t => ({
                        id: t.videoId || t.id,
                        title: t.title,
                        artist: t.artist || albumArtist,
                        thumb: t.thumbnails ? t.thumbnails[t.thumbnails.length - 1].url : albumArt
                    })).filter(t => t.id && !favorites.some(f => String(f.id) === String(t.id)));

                    if (newTracks.length > 0) {
                        setFavorites(prev => [...newTracks, ...prev]);
                    }
                }
            } catch (error) { console.error(`Failed to add ${type} to favorites`, error); }
        }
    };

    const toggleArtistFavorite = async (artistId) => {
        const idStr = String(artistId);
        const isLiked = isArtistFavorite(idStr);
        if (isLiked) {
            setFavoriteArtists(prev => prev.filter(id => String(id) !== idStr));
            try {
                const response = await fetch(`https://musicbackend-pkfi.vercel.app/artist/${idStr}`);
                const data = await response.json();
                if (data && data.songs && data.songs.results) {
                    const trackIdsToRemove = data.songs.results.map(t => t.videoId || t.id);
                    setFavorites(prev => prev.filter(item => !trackIdsToRemove.includes(item.id)));
                }
            } catch (e) {
                console.error("Failed to remove artist tracks", e);
            }
        } else {
            setFavoriteArtists(prev => [idStr, ...prev]);
            try {
                const response = await fetch(`https://musicbackend-pkfi.vercel.app/artist/${idStr}`);
                const data = await response.json();
                if (data && data.songs && data.songs.results) {
                    const artistName = data.name || 'Unknown Artist';
                    const newTracks = data.songs.results.map(t => ({
                        id: t.videoId || t.id,
                        title: t.title,
                        artist: artistName,
                        thumb: t.thumbnails ? t.thumbnails[t.thumbnails.length - 1].url : (data.thumbnails ? data.thumbnails[data.thumbnails.length - 1].url : '')
                    })).filter(t => t.id && !favorites.some(f => String(f.id) === String(t.id)));

                    if (newTracks.length > 0) {
                        setFavorites(prev => [...newTracks, ...prev]);
                    }
                }
            } catch (error) {
                console.error("Failed to add artist to favorites", error);
            }
        }
    };

    // --- Controls ---
    const playTrack = (track, resetQueue = true) => {
        const videoId = track.videoId || track.id; // Safely get videoId
        if (!videoId) return;

        setCurrentTime(0);
        setDuration(100);
        setCurrentTrack({ ...track, videoId }); // Ensure the current track has videoId explicitly set

        if (resetQueue) {
            setQueue([track]);
            setCurrentIndex(0);
        }

        userIntentPaused.current = false;
        addToHistory(track);
        updateMediaSession(track);
        registerMediaSessionHandlers();

        if (silentAudioRef.current) silentAudioRef.current.play().catch(() => { });

        if (playerRef.current && isPlayerReady.current) {
            playerRef.current.loadVideoById(videoId);
            playerRef.current.playVideo();
        }
    };

    const playAlbum = (tracks, startIndex = 0) => {
        if (!tracks || tracks.length === 0) return;

        // Ensure all tracks in the album/playlist have videoId explicitly set
        const safeTracks = tracks.map(t => ({
            ...t,
            videoId: t.videoId || t.id,
            id: t.id || t.videoId
        }));

        setQueue(safeTracks);
        setCurrentIndex(startIndex);
        // Pass false so playTrack doesn't overwrite the queue we just set
        playTrack(safeTracks[startIndex], false);
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
                            const userLangRaw = localStorage.getItem('userLanguage') || '';
                            const userLang = userLangRaw.split(',')[0].trim();

                            // 2. Strict Language & Industry Mapping
                            const industryMap = {
                                'Telugu': 'Telugu',
                                'Hindi': 'Hindi',
                                'Tamil': 'Tamil',
                                'Malayalam': 'Malayalam',
                                'Kannada': 'Kannada',
                                'Punjabi': 'Punjabi'
                            };
                            const industry = industryMap[userLang] || userLang; // Default to language if no industry map

                            let searchQuery = '';

                            // Start with the strict language requirement
                            let langPrefix = industryMap[userLang] ? `${userLang} ${industry}` : userLang;

                            if (current.context) {
                                if (['2000s', '2010s', '2020s'].includes(current.context)) {
                                    // Build era-specific query: e.g. "Telugu 2000s hit songs [Artist]"
                                    searchQuery = `${langPrefix} ${current.context} hit songs ${current.artist}`.trim();
                                } else if (['Trending', 'Latest'].includes(current.context)) {
                                    // Build trending/top picks query: e.g. "Telugu Top Cinema Hits [Artist]"
                                    searchQuery = `${langPrefix} Top Cinema Hits ${current.artist}`.trim();
                                } else {
                                    // Fallback if context is known but not matched above
                                    searchQuery = `${langPrefix} hit songs ${current.artist}`.trim();
                                }
                            } else {
                                // Default fallback with strict language: e.g. "Telugu hit songs [Artist]"
                                searchQuery = `${langPrefix} hit songs ${current.artist}`.trim();
                            }

                            console.log("Autoplay Logic Initial:", { context: current.context, lang: userLang, searchQuery });

                            const fetchAndAddTracks = async (queryToTry, isFallback = false) => {
                                const response = await fetch(`https://musicbackend-pkfi.vercel.app/search?query=${encodeURIComponent(queryToTry)}&filter=songs`);
                                const data = await response.json();

                                if (data && data.length > 0) {
                                    let newTracks = data.map(item => ({
                                        videoId: item.videoId || item.id,
                                        title: item.title,
                                        artist: item.artists ? item.artists.map(a => a.name).join(', ') : (item.artist || 'Unknown'),
                                        thumb: item.thumbnails ? item.thumbnails[item.thumbnails.length - 1].url : ''
                                    }));

                                    // 2. JS Side Strict Language Filtering (Double Safety)
                                    // Remove tracks that explicitly mention other languages or industries in their title/artist
                                    const otherLangs = Object.keys(industryMap).filter(l => l.toLowerCase() !== userLang.toLowerCase());
                                    const otherIndustries = Object.values(industryMap).filter(i => i.toLowerCase() !== industry.toLowerCase());
                                    const forbiddenKeywords = [...otherLangs, ...otherIndustries].map(k => k.toLowerCase());

                                    newTracks = newTracks.filter(t => {
                                        const textToCheck = `${t.title} ${t.artist}`.toLowerCase();
                                        // If a track says "Hindi Version" or "Bollywood", but user is in Telugu, drop it.
                                        return !forbiddenKeywords.some(keyword => textToCheck.includes(keyword));
                                    });

                                    // 3. Deduplicate against the existing queue
                                    newTracks = newTracks.filter(t => !queue.some(q => q.videoId === t.videoId));

                                    if (newTracks.length > 0) {
                                        const tracksToAdd = newTracks.slice(0, 5).map(t => ({
                                            ...t,
                                            context: current.context || ''
                                        }));
                                        setQueue(prevQueue => [...prevQueue, ...tracksToAdd]);
                                        setCurrentIndex(queue.length);
                                        playTrack(tracksToAdd[0], false);
                                        return true;
                                    }
                                }

                                // If we got here, we found no new tracks (all were duplicates or API returned none)
                                if (!isFallback) {
                                    console.log("Autoplay: Strict query exhausted, trying broader fallback...");
                                    // Broaden the search by removing the specific artist focus, just ask for hits in the language/era
                                    let fallbackQuery = `${langPrefix} hit songs`.trim();
                                    if (current.context) {
                                        if (['2000s', '2010s', '2020s'].includes(current.context)) {
                                            fallbackQuery = `${langPrefix} ${current.context} hit songs`.trim();
                                        } else if (['Trending', 'Latest'].includes(current.context)) {
                                            fallbackQuery = `${langPrefix} Top Cinema Hits`.trim();
                                        }
                                    }
                                    return await fetchAndAddTracks(fallbackQuery, true);
                                }

                                // If even the fallback fails, just restart from index 0 to avoid a total freeze
                                console.warn("Autoplay: Fallback exhausted too. Restarting queue.");
                                setCurrentIndex(0);
                                playTrack(queue[0], false);
                                return false;
                            };

                            await fetchAndAddTracks(searchQuery);

                        } catch (e) {
                            console.error("Autoplay failed", e);
                            // Emergency fallback: just wrap around
                            setCurrentIndex(0);
                            playTrack(queue[0], false);
                        }
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
            // ✅ Re-register immediately after YouTube fires PLAYING
            // The trap handles any future YouTube calls automatically
            registerMediaSessionHandlers();
            if (silentAudioRef.current) silentAudioRef.current.play().catch(() => { });

            // Force steal media session lock back from iframe by reactivating parent's silent audio
            setTimeout(() => {
                if (silentAudioRef.current) {
                    silentAudioRef.current.currentTime = 0;
                    silentAudioRef.current.play().catch(() => { });
                }
                if (currentTrackRef.current) {
                    updateMediaSession(currentTrackRef.current);
                }
                registerMediaSessionHandlers();
                if (playerRef.current) {
                    updateMediaSessionPosition('playing', playerRef.current.getCurrentTime(), playerRef.current.getDuration());
                }
            }, 300);
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
        let lastActionTime = 0;

        mediaSessionActions.current = {
            play: () => { resumeAudioContext(); togglePlay(); },
            pause: () => { togglePlay(); },
            prev: () => {
                const now = Date.now();
                if (now - lastActionTime < 500) return;
                lastActionTime = now;
                resumeAudioContext();
                playPrev();
            },
            next: () => {
                const now = Date.now();
                if (now - lastActionTime < 500) return;
                lastActionTime = now;
                resumeAudioContext();
                playNext();
            },
            stop: () => { togglePlay(); }
        };
    }, [togglePlay, playPrev, playNext]);

    // Initial registration on mount
    useEffect(() => {
        registerMediaSessionHandlers();
        return () => {
            ['play', 'pause', 'previoustrack', 'nexttrack', 'seekto', 'seekbackward', 'seekforward', 'stop']
                .forEach(action => {
                    try { navigator.mediaSession.setActionHandler(action, null); } catch { }
                });
        };
    }, [registerMediaSessionHandlers]);

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
        isArtistFavorite,
        toggleArtistFavorite,
        favorites,
        favoriteAlbums,
        favoriteArtists,
        history
    };

    return (
        <PlayerContext.Provider value={value}>
            {children}
        </PlayerContext.Provider>
    );
};