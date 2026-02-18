import React, { createContext, useContext, useState, useEffect, useRef } from 'react';

const PlayerContext = createContext();

export const usePlayer = () => useContext(PlayerContext);

export const PlayerProvider = ({ children }) => {
    // --- Persistence: Load Initial State ---
    const [currentTrack, setCurrentTrack] = useState(() => {
        try { return JSON.parse(localStorage.getItem('musicPlayer_currentTrack')) || null; } catch { return null; }
    });
    const [isPlaying, setIsPlaying] = useState(false); // Always start paused
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
    const [originalQueue, setOriginalQueue] = useState([]);

    const playerRef = useRef(null);
    const audioContextRef = useRef(null);
    const silenceOscillatorRef = useRef(null);
    const wakeLockRef = useRef(null);
    const isPlayerReady = useRef(false);
    const userIntentPaused = useRef(false);

    // Ref to hold latest state for callbacks (fixing stale closures)
    const stateRef = useRef({
        queue: [],
        currentIndex: -1,
        isShuffle: false,
        repeatMode: 0
    });

    useEffect(() => {
        stateRef.current = { queue, currentIndex, isShuffle, repeatMode };
    }, [queue, currentIndex, isShuffle, repeatMode]);

    // --- Persistence: Save State Changes ---
    useEffect(() => {
        localStorage.setItem('musicPlayer_currentTrack', JSON.stringify(currentTrack));
    }, [currentTrack]);

    useEffect(() => {
        localStorage.setItem('musicPlayer_queue', JSON.stringify(queue));
    }, [queue]);

    useEffect(() => {
        localStorage.setItem('musicPlayer_currentIndex', currentIndex.toString());
    }, [currentIndex]);

    useEffect(() => {
        localStorage.setItem('musicPlayer_volume', volume.toString());
    }, [volume]);

    useEffect(() => {
        localStorage.setItem('musicPlayer_isShuffle', JSON.stringify(isShuffle));
    }, [isShuffle]);

    useEffect(() => {
        localStorage.setItem('musicPlayer_repeatMode', repeatMode.toString());
    }, [repeatMode]);

    // Save current time on unload or periodically
    useEffect(() => {
        const handleUnload = () => {
            if (playerRef.current && isPlayerReady.current) {
                localStorage.setItem('musicPlayer_currentTime', playerRef.current.getCurrentTime().toString());
            }
        };
        window.addEventListener('beforeunload', handleUnload);
        return () => window.removeEventListener('beforeunload', handleUnload);
    }, []);

    // Also save time when paused
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
                console.log("Wake Lock active");
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
                console.log("Wake Lock released");
            } catch (err) {
                console.error("Release Wake Lock Error:", err);
            }
        }
    };

    useEffect(() => {
        if (isPlaying) {
            requestWakeLock();
            if (silentAudioRef.current) silentAudioRef.current.play().catch(() => { });
        } else {
            releaseWakeLock();
            if (silentAudioRef.current) silentAudioRef.current.pause();
        }
    }, [isPlaying]);

    // Re-request wake lock when page becomes visible again
    useEffect(() => {
        const handleVisibility = () => {
            if (document.visibilityState === 'visible' && isPlaying) {
                requestWakeLock();
                if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
                    audioContextRef.current.resume();
                }
            }
            // Proactive Resume: If system paused us while hidden
            if (document.visibilityState === 'hidden' && isPlaying && !userIntentPaused.current) {
                // Play silent audio to keep session alive (CRITICAL for iOS/Android)
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
    }, [isPlaying]);

    // --- Audio Hacks (Oscillator & Silent Track) ---
    useEffect(() => {
        const initAudioContext = () => {
            if (audioContextRef.current && silentAudioRef.current) return;
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return;

            // 1. Silent Loopable Audio (Mobile Audio Session Hack)
            if (!silentAudioRef.current) {
                const audio = new Audio("data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=");
                audio.loop = true;
                silentAudioRef.current = audio;
            }

            const ac = new AudioContext();
            audioContextRef.current = ac;

            const o = ac.createOscillator();
            const g = ac.createGain();
            o.type = 'sine';
            o.frequency.value = 60;
            g.gain.value = 0.001;
            o.connect(g);
            g.connect(ac.destination);
            o.start();
            silenceOscillatorRef.current = o;

            if (ac.state === 'suspended') ac.resume();
            console.log("Audio Resilience Hacks Started");
        };

        const handleInteractions = () => {
            initAudioContext();
            window.removeEventListener('click', handleInteractions);
            window.removeEventListener('touchstart', handleInteractions);
        };

        window.addEventListener('click', handleInteractions);
        window.addEventListener('touchstart', handleInteractions);

        return () => {
            window.removeEventListener('click', handleInteractions);
            window.removeEventListener('touchstart', handleInteractions);
        };
    }, []);

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
                    'autoplay': 0, // Never autoplay on refresh
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

    const onPlayerReady = (event) => {
        isPlayerReady.current = true;
        console.log("YouTube Player Ready");
        if (playerRef.current) {
            playerRef.current.setVolume(volume * 100);
            if (currentTime > 0) {
                playerRef.current.seekTo(currentTime);
            }
        }
    };

    const onPlayerStateChange = (event) => {
        if (!playerRef.current) return;
        const state = event.data;
        const YT = window.YT;

        if (state === YT.PlayerState.PLAYING) {
            userIntentPaused.current = false;
            setIsPlaying(true);
            updateMediaSessionState('playing');
        } else if (state === YT.PlayerState.PAUSED) {
            setIsPlaying(false);
            updateMediaSessionState('paused');
            // Auto-resume if not intentional
            if (!userIntentPaused.current) {
                setTimeout(() => {
                    if (!userIntentPaused.current && playerRef.current) playerRef.current.playVideo();
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

    // --- Progress Loop ---
    useEffect(() => {
        const interval = setInterval(() => {
            if (playerRef.current && isPlayerReady.current && isPlaying) {
                setCurrentTime(playerRef.current.getCurrentTime());
                setDuration(playerRef.current.getDuration());
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [isPlaying]);

    // --- Media Session API ---
    const updateMediaSession = (track) => {
        if ('mediaSession' in navigator) {
            try {
                navigator.mediaSession.metadata = new MediaMetadata({
                    title: track.title,
                    artist: track.artist || 'Unknown Artist',
                    artwork: [
                        { src: track.thumb || 'https://placehold.co/512x512/333/333', sizes: '512x512', type: 'image/png' }
                    ]
                });

                navigator.mediaSession.setActionHandler('play', () => {
                    resumeAudioContext();
                    togglePlay();
                });
                navigator.mediaSession.setActionHandler('pause', () => {
                    togglePlay();
                });
                navigator.mediaSession.setActionHandler('previoustrack', () => {
                    resumeAudioContext();
                    playPrev();
                });
                navigator.mediaSession.setActionHandler('nexttrack', () => {
                    resumeAudioContext();
                    playNext();
                });
            } catch (error) {
                console.error("Media Session API Error:", error);
            }
        }
    };

    const updateMediaSessionState = (state) => {
        if ('mediaSession' in navigator) {
            navigator.mediaSession.playbackState = state;
        }
    }

    const resumeAudioContext = () => {
        if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
            audioContextRef.current.resume();
        }
    }

    // --- History & Favorites ---
    const [history, setHistory] = useState(() => {
        try {
            const saved = localStorage.getItem('musicHistory');
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            console.error("Failed to parse history", e);
            return [];
        }
    });

    const [favorites, setFavorites] = useState(() => {
        try {
            const saved = localStorage.getItem('musicFavorites');
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            console.error("Failed to parse favorites", e);
            return [];
        }
    });

    const [favoriteAlbums, setFavoriteAlbums] = useState(() => {
        try {
            const saved = localStorage.getItem('musicFavoriteAlbums');
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            console.error("Failed to parse favorite albums", e);
            return [];
        }
    });

    useEffect(() => {
        localStorage.setItem('musicFavorites', JSON.stringify(favorites));
    }, [favorites]);

    useEffect(() => {
        localStorage.setItem('musicFavoriteAlbums', JSON.stringify(favoriteAlbums));
    }, [favoriteAlbums]);

    useEffect(() => {
        localStorage.setItem('musicHistory', JSON.stringify(history));
    }, [history]);

    const addToHistory = (track) => {
        setHistory(prev => {
            const filtered = prev.filter(item => item.id !== track.videoId);
            const newHistory = [{
                id: track.videoId,
                title: track.title,
                artist: track.artist,
                thumb: track.thumb
            }, ...filtered];
            return newHistory.slice(0, 20);
        });
    };

    const addToFavorites = (track) => {
        if (!favorites.some(item => item.id === track.videoId)) {
            setFavorites(prev => [{
                id: track.videoId,
                title: track.title,
                artist: track.artist,
                thumb: track.thumb
            }, ...prev]);
            return true;
        }
        return false;
    };

    const removeFromFavorites = (videoId) => {
        setFavorites(prev => prev.filter(item => item.id !== videoId));
    };

    const isFavorite = (videoId) => {
        return favorites.some(item => item.id === videoId);
    };

    const isAlbumFavorite = (albumId) => {
        // Safe string comparison
        return favoriteAlbums.some(id => String(id) === String(albumId));
    };

    const toggleAlbumFavorites = async (albumId) => {
        const idStr = String(albumId);
        const isLiked = favoriteAlbums.some(id => String(id) === idStr);

        console.log(`Toggling album ${idStr}. Currently liked: ${isLiked}`);

        if (isLiked) {
            // REMOVE
            setFavoriteAlbums(prev => prev.filter(id => String(id) !== idStr));

            try {
                const response = await fetch(`https://musicbackend-pkfi.vercel.app/album/${idStr}`);
                const data = await response.json();
                if (data && data.tracks) {
                    const trackIdsToRemove = data.tracks.map(t => t.videoId || t.id);
                    setFavorites(prev => prev.filter(item => !trackIdsToRemove.includes(item.id)));
                }
            } catch (e) {
                console.error("Failed to remove album tracks", e);
            }

        } else {
            // ADD
            setFavoriteAlbums(prev => [idStr, ...prev]);

            try {
                console.log(`Fetching album data for: ${idStr}`);
                const response = await fetch(`https://musicbackend-pkfi.vercel.app/album/${idStr}`);
                const data = await response.json();

                console.log("Album API Response:", data);

                if (data && data.tracks) {
                    console.log(`Found ${data.tracks.length} tracks.`);
                    const albumArt = data.thumbnails ? data.thumbnails[data.thumbnails.length - 1].url : '';
                    const albumArtist = data.artists ? data.artists.map(a => a.name).join(', ') : (data.artist || 'Unknown');

                    let newTracks = [];
                    data.tracks.forEach(track => {
                        const trackId = track.videoId || track.id;
                        if (!trackId) {
                            console.warn("Track missing ID:", track);
                            return;
                        }

                        // Strict check to avoid duplicates
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
                        console.log(`Adding ${newTracks.length} new tracks to favorites.`);
                        setFavorites(prev => {
                            const uniqueNew = newTracks.filter(n => !prev.some(p => String(p.id) === String(n.id)));
                            return [...uniqueNew, ...prev];
                        });
                    } else {
                        console.log("No new tracks to add (all duplicates or empty).");
                    }
                } else {
                    console.warn("Invalid album data structure:", data);
                }
            } catch (error) {
                console.error("Failed to add album to favorites", error);
            }
        }
    };

    // --- Controls ---
    const playTrack = (track, resetQueue = true) => {
        setCurrentTrack(track);
        if (resetQueue) {
            setQueue([track]);
            setCurrentIndex(0);
        }
        updateMediaSession(track);
        userIntentPaused.current = false;

        // Add to history
        addToHistory(track);

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

    const toggleShuffle = () => setIsShuffle(!isShuffle);

    const toggleRepeat = () => {
        setRepeatMode(prev => (prev + 1) % 3);
    };

    const togglePlay = () => {
        if (!playerRef.current) return;
        if (isPlaying) {
            userIntentPaused.current = true;
            playerRef.current.pauseVideo();
        } else {
            userIntentPaused.current = false;
            playerRef.current.playVideo();
        }
    };

    const playNext = async (auto = false) => {
        const { queue, currentIndex, isShuffle, repeatMode } = stateRef.current;
        if (queue.length === 0) return;

        let nextIndex;
        if (isShuffle) {
            // Simple random for now, avoid current if possible
            let attempts = 0;
            do {
                nextIndex = Math.floor(Math.random() * queue.length);
                attempts++;
            } while (nextIndex === currentIndex && queue.length > 1 && attempts < 5);
        } else {
            nextIndex = currentIndex + 1;

            // --- Autoplay Logic ---
            if (nextIndex >= queue.length) {
                if (repeatMode === 1) {
                    nextIndex = 0; // Loop All
                } else if (repeatMode === 0) {
                    // Try to fetch similar songs
                    const current = queue[currentIndex];
                    if (current) {
                        try {
                            const userLang = localStorage.getItem('userLanguage') || '';
                            const eras = ['2000s Hits', '2010s Hits', '2020s Hits', 'Latest Hits', 'Cinema Hits'];
                            const randomEra = eras[Math.floor(Math.random() * eras.length)];
                            // Prioritize language first, then artist, then era
                            const searchQuery = `${userLang} ${current.artist} ${randomEra}`.trim();

                            console.log("Queue ended. Autoplaying smarter recommendations for:", searchQuery);
                            const response = await fetch(`https://musicbackend-pkfi.vercel.app/search?query=${encodeURIComponent(searchQuery)}&filter=songs`);
                            const data = await response.json();

                            if (data && data.length > 0) {
                                // Filter out duplicates (already in queue)
                                const newTracks = data.map(item => {
                                    const thumb = item.thumbnails ? item.thumbnails[item.thumbnails.length - 1].url : '';
                                    const artist = item.artists ? item.artists.map(a => a.name).join(', ') : (item.artist || 'Unknown');
                                    return {
                                        videoId: item.videoId || item.id,
                                        title: item.title,
                                        artist: artist,
                                        thumb: thumb
                                    };
                                }).filter(t => !queue.some(q => q.videoId === t.videoId));

                                if (newTracks.length > 0) {
                                    const tracksToAdd = newTracks.slice(0, 5); // Add up to 5 similar songs
                                    const newQueue = [...queue, ...tracksToAdd];
                                    setQueue(newQueue);

                                    // Play the first new track
                                    setCurrentIndex(queue.length);
                                    playTrack(tracksToAdd[0], false);
                                    console.log(`Autoplay: Added ${tracksToAdd.length} tracks using query: ${searchQuery}`);
                                    return;
                                }
                            }
                        } catch (e) {
                            console.error("Autoplay failed", e);
                        }
                    }
                    // If autoplay failed or no new tracks, stop.
                    return;
                }
                else return; // Stop
            }
        }

        setCurrentIndex(nextIndex);
        playTrack(queue[nextIndex], false);
    };

    const playPrev = () => {
        const { queue, currentIndex } = stateRef.current;
        if (queue.length === 0) return;

        if (currentTime > 3) {
            playerRef.current.seekTo(0);
            return;
        }

        let prevIndex = currentIndex - 1;
        if (prevIndex < 0) prevIndex = queue.length - 1;

        setCurrentIndex(prevIndex);
        playTrack(queue[prevIndex], false);
    };

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

    const seekTo = (time) => {
        if (playerRef.current) {
            playerRef.current.seekTo(time, true);
            setCurrentTime(time);
        }
    }

    const adjustVolume = (newVolume) => {
        setVolume(newVolume);
        if (playerRef.current) {
            playerRef.current.setVolume(newVolume * 100);
        }
    };

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
        // New exports
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
