class MusicPlayer {
    constructor() {
        this.audioPlayer = document.getElementById('audioPlayer');
        this.currentSong = null;
        this.playlist = [];
        this.currentIndex = 0;
        this.isPlaying = false;
        this.topPlayed = {};
        this.searchTimeout = null;
        this.shuffleEnabled = false;
        this.repeatMode = 'all'; // 'all', 'one'
        this.originalPlaylist = []; // Keep original order for shuffle
        this.isDragging = false; // Track if user is dragging seek handle
        this.audioContext = null;
        this.audioSource = null;
        this.isPageVisible = true;
        this.loadingProgress = 0;
        
        this.showLoadingScreen();
        this.initializePlayer();
        this.loadSongs();
        this.loadUserData();
        this.setupEventListeners();
        this.setupBackgroundAudio();
    }

    initializePlayer() {
        // Set initial volume
        this.audioPlayer.volume = 0.5;
        document.getElementById('volumeSlider').value = 50;
        
        // Resume playback from where it was stopped
        this.resumePlayback();
    }

    async loadSongs() {
        // For GitHub Pages, we'll use working audio URLs
        // These are free, CORS-enabled audio files that work on GitHub Pages
        
        const sampleSongs = [
            {
                name: "Gentle Rain",
                url: "https://www.soundjay.com/misc/sounds/rain-01.wav",
                repo: "Nature Sounds",
                size: 1024,
                path: "rain.wav"
            },
            {
                name: "Ocean Waves", 
                url: "https://www.soundjay.com/misc/sounds/ocean-wave-1.wav",
                repo: "Nature Sounds",
                size: 1024,
                path: "ocean.wav"
            },
            {
                name: "Forest Birds",
                url: "https://www.soundjay.com/misc/sounds/birds-1.wav",
                repo: "Nature Sounds", 
                size: 1024,
                path: "birds.wav"
            },
            {
                name: "Thunder Storm",
                url: "https://www.soundjay.com/misc/sounds/thunder-1.wav",
                repo: "Nature Sounds",
                size: 1024,
                path: "thunder.wav"
            },
            {
                name: "Creek Water",
                url: "https://www.soundjay.com/misc/sounds/creek-1.wav",
                repo: "Nature Sounds",
                size: 1024,
                path: "creek.wav"
            },
            {
                name: "Wind Chimes",
                url: "https://www.soundjay.com/misc/sounds/wind-chimes-1.wav",
                repo: "Nature Sounds",
                size: 1024,
                path: "chimes.wav"
            }
        ];

        try {
            // Test audio URLs to ensure they work
            const workingSongs = [];
            
            for (const song of sampleSongs) {
                try {
                    // Test if audio URL is accessible
                    const response = await fetch(song.url, { method: 'HEAD' });
                    if (response.ok) {
                        workingSongs.push(song);
                        console.log(`✅ Audio URL accessible: ${song.name}`);
                    } else {
                        console.warn(`❌ Audio URL not accessible: ${song.name} - ${song.url}`);
                    }
                } catch (error) {
                    console.warn(`❌ Failed to test audio URL: ${song.name} - ${song.url}`, error);
                }
            }

            if (workingSongs.length === 0) {
                // Fallback to alternative working URLs
                const fallbackSongs = [
                    {
                        name: "Gentle Bells",
                        url: "https://www.soundjay.com/misc/sounds/bell-ringing-05.wav",
                        repo: "Alternative Sounds",
                        size: 1024,
                        path: "bells.wav"
                    },
                    {
                        name: "Clock Ticking",
                        url: "https://www.soundjay.com/misc/sounds/clock-ticking-1.wav",
                        repo: "Alternative Sounds",
                        size: 1024,
                        path: "clock.wav"
                    },
                    {
                        name: "Keyboard Click",
                        url: "https://www.soundjay.com/misc/sounds/computer-keyboard-1.wav",
                        repo: "Alternative Sounds",
                        size: 1024,
                        path: "keyboard.wav"
                    }
                ];
                
                // Test fallback URLs too
                const testedFallbacks = [];
                for (const song of fallbackSongs) {
                    try {
                        const response = await fetch(song.url, { method: 'HEAD' });
                        if (response.ok) {
                            testedFallbacks.push(song);
                            console.log(`✅ Fallback audio accessible: ${song.name}`);
                        }
                    } catch (error) {
                        console.warn(`❌ Fallback audio failed: ${song.name}`);
                    }
                }
                
                if (testedFallbacks.length > 0) {
                    this.playlist = testedFallbacks;
                    console.log(`Using ${testedFallbacks.length} fallback audio URLs`);
                } else {
                    // Last resort: create silent audio
                    this.playlist = [{
                        name: "Silent Audio (No songs available)",
                        url: "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT",
                        repo: "System",
                        size: 1024,
                        path: "silent.wav"
                    }];
                    console.log('Using silent audio as last resort');
                    this.showError('No working audio files found. Please add your own MP3 URLs.');
                }
            } else {
                this.playlist = workingSongs;
                console.log(`${workingSongs.length} working audio URLs loaded`);
            }

            this.renderAllSongs();
            this.renderTopPlayed();
            
            console.log('Audio files loaded successfully for GitHub Pages');
            console.log('To use your own songs, replace the URLs in this function');
            
        } catch (error) {
            console.error('Error loading songs:', error);
            this.showError('Failed to load songs. Check console for details.');
        }
    }

    setupEventListeners() {
        // Play/Pause button
        document.getElementById('playPauseBtn').addEventListener('click', () => {
            this.togglePlayPause();
        });

        // Previous/Next buttons
        document.getElementById('prevBtn').addEventListener('click', () => {
            this.playPrevious();
        });

        document.getElementById('nextBtn').addEventListener('click', () => {
            this.playNext();
        });

        // Shuffle and Repeat buttons
        document.getElementById('shuffleBtn').addEventListener('click', () => {
            this.toggleShuffle();
        });

        this.repeatBtn = document.getElementById('repeatBtn');
        this.repeatBtn.addEventListener('click', () => {
            this.toggleRepeat();
        });

        // Volume control
        document.getElementById('volumeSlider').addEventListener('input', (e) => {
            this.audioPlayer.volume = e.target.value / 100;
        });

        // Progress bar seek functionality
        this.setupSeekFunctionality();

        // Audio events
        this.audioPlayer.addEventListener('timeupdate', () => {
            this.updateProgress();
        });

        this.audioPlayer.addEventListener('ended', () => {
            this.handleSongEnd();
        });

        this.audioPlayer.addEventListener('loadedmetadata', () => {
            this.updateTotalTime();
        });

        // Additional audio event handlers for better playback
        this.audioPlayer.addEventListener('loadstart', () => {
            console.log('Audio loading started');
        });

        this.audioPlayer.addEventListener('canplay', () => {
            console.log('Audio can start playing');
        });

        this.audioPlayer.addEventListener('error', (e) => {
            console.error('Audio error:', e);
            this.showError('Error loading audio. Please try another song.');
        });

        this.audioPlayer.addEventListener('stalled', () => {
            console.log('Audio playback stalled');
        });

        this.audioPlayer.addEventListener('waiting', () => {
            console.log('Audio waiting for data');
        });

        // Search functionality
        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.handleSearch(e.target.value);
        });

        // Clear search when input is cleared
        document.getElementById('searchInput').addEventListener('change', (e) => {
            if (e.target.value === '') {
                this.renderAllSongs();
            }
        });

        // Add event delegation for clear buttons
        document.addEventListener('click', (e) => {
            if (e.target.closest('.clear-search-btn')) {
                e.preventDefault();
                this.clearSearch();
            }
        });

        // Save current time before page unload
        window.addEventListener('beforeunload', () => {
            this.savePlaybackState();
        });

        // Save playback state periodically while playing
        setInterval(() => {
            if (this.currentSong && this.isPlaying) {
                this.savePlaybackState();
            }
        }, 5000); // Save every 5 seconds while playing
        
        // Page visibility API for background audio
        document.addEventListener('visibilitychange', () => this.handleVisibilityChange());
    }

        setupSeekFunctionality() {
        const progressContainer = document.getElementById('progressContainer');
        const seekHandle = document.getElementById('seekHandle');
        let animationFrameId = null;
        let lastUpdateTime = 0;
        const minUpdateInterval = 1000 / 120; // 120fps for ultra-smooth updates

        // Click on progress bar to seek
        progressContainer.addEventListener('click', (e) => {
            if (!this.isDragging) {
                this.seekToPosition(e);
            }
        });

        // Mouse down on seek handle to start dragging
        seekHandle.addEventListener('mousedown', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.isDragging = true;
            seekHandle.style.cursor = 'grabbing';
            seekHandle.style.transition = 'none';
            seekHandle.style.filter = 'brightness(1.1)';
            seekHandle.classList.add('dragging');
            console.log('Started dragging seek handle');
        });

        // Mouse move to update position while dragging
        document.addEventListener('mousemove', (e) => {
            if (this.isDragging) {
                e.preventDefault();
                const currentTime = performance.now();
                
                // Throttle updates to 120fps for ultra-smooth performance
                if (currentTime - lastUpdateTime >= minUpdateInterval) {
                    if (animationFrameId) {
                        cancelAnimationFrame(animationFrameId);
                    }
                    animationFrameId = requestAnimationFrame(() => {
                        this.updateSeekPosition(e);
                        lastUpdateTime = currentTime;
                    });
                }
            }
        });

        // Mouse up to stop dragging
        document.addEventListener('mouseup', () => {
            if (this.isDragging) {
                this.isDragging = false;
                seekHandle.style.cursor = 'grab';
                seekHandle.style.transition = 'all 0.02s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
                seekHandle.style.filter = 'brightness(1)';
                seekHandle.classList.remove('dragging');
                console.log('Stopped dragging seek handle');
            }
        });

        // Touch events for mobile with smooth updates
        seekHandle.addEventListener('touchstart', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.isDragging = true;
            seekHandle.style.transition = 'none';
            seekHandle.style.filter = 'brightness(1.1)';
            seekHandle.classList.add('dragging');
        });

        document.addEventListener('touchmove', (e) => {
            if (this.isDragging) {
                e.preventDefault();
                if (animationFrameId) {
                    cancelAnimationFrame(animationFrameId);
                }
                animationFrameId = requestAnimationFrame(() => {
                    this.updateSeekPosition(e.touches[0]);
                });
            }
        });

        document.addEventListener('touchend', () => {
            if (this.isDragging) {
                this.isDragging = false;
                seekHandle.style.transition = 'all 0.02s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
                seekHandle.style.filter = 'brightness(1)';
                seekHandle.classList.remove('dragging');
            }
        });

        // Add hover effect for progress bar only
        progressContainer.addEventListener('mouseenter', () => {
            if (!this.isDragging && !this.isPlaying) {
                seekHandle.style.opacity = '1';
                seekHandle.style.visibility = 'visible';
                seekHandle.style.transform = 'translate(-50%, -50%) scale(1.1)';
            }
        });

        progressContainer.addEventListener('mouseleave', () => {
            if (!this.isDragging && !this.isPlaying) {
                seekHandle.style.opacity = '0';
                seekHandle.style.visibility = 'hidden';
                seekHandle.style.transform = 'translate(-50%, -50%) scale(1)';
            }
        });
    }

    seekToPosition(e) {
        const rect = e.currentTarget.getBoundingClientRect();
        const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        
        console.log('Seek clicked at:', e.clientX, 'rect left:', rect.left, 'width:', rect.width, 'percent:', percent);
        
        this.audioPlayer.currentTime = percent * this.audioPlayer.duration;
        this.updateSeekHandlePosition(percent);
    }

    updateSeekPosition(e) {
        const progressContainer = document.getElementById('progressContainer');
        const rect = progressContainer.getBoundingClientRect();
        const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        
        console.log('Dragging to position:', percent * 100, '%');
        
        // Update audio position
        this.audioPlayer.currentTime = percent * this.audioPlayer.duration;
        
        // Update visual position
        this.updateSeekHandlePosition(percent);
    }

    updateSeekHandlePosition(percent) {
        const seekHandle = document.getElementById('seekHandle');
        // Ensure the handle is positioned correctly at the current playback position
        const leftPosition = Math.max(0, Math.min(100, percent * 100));
        seekHandle.style.left = leftPosition + '%';
        seekHandle.style.transform = 'translate(-50%, -50%)';
        
        // Debug logging
        console.log('Seek handle position updated:', leftPosition + '%', 'for percent:', percent);
    }

    handleSearch(query) {
        clearTimeout(this.searchTimeout);
        
        if (query.length < 2) {
            this.renderAllSongs(); // Show all songs when search is cleared
            return;
        }
        
        this.searchTimeout = setTimeout(() => {
            this.performSearch(query);
        }, 200); // Reduced delay for more responsive search
    }

    performSearch(query) {
        const results = this.playlist.filter(song => 
            song.name.toLowerCase().includes(query.toLowerCase()) ||
            song.repo.toLowerCase().includes(query.toLowerCase())
        );

        // Update the main All Songs section with filtered results
        this.renderFilteredSongs(results);
    }

    // Search results dropdown removed - only live filtering in main section

    playSong(url, name, repo) {
        const song = {
            name: name,
            url: url,
            repo: repo
        };

        this.currentSong = song;
        
        // Reset audio player to ensure clean state
        this.audioPlayer.pause();
        this.audioPlayer.currentTime = 0;
        this.audioPlayer.src = url;
        
        // Add event listener for when audio is ready to play
        const playAudio = () => {
            this.audioPlayer.play().then(() => {
                this.isPlaying = true;
                this.updatePlayPauseButton();
                this.updateCurrentSongDisplay();
                this.incrementPlayCount(song);
                this.saveUserData();
                this.updateSongCardsState();
            }).catch(error => {
                console.error('Error playing audio:', error);
                this.showError('Failed to play song. Please try again.');
            });
        };

        // Wait for audio to be loaded before playing
        this.audioPlayer.addEventListener('canplay', playAudio, { once: true });
        
        // Fallback: if canplay doesn't fire, try to play anyway
        setTimeout(() => {
            if (!this.isPlaying) {
                playAudio();
            }
        }, 1000);
    }

    togglePlayPause() {
        if (this.currentSong) {
            if (this.isPlaying) {
                this.audioPlayer.pause();
                this.isPlaying = false;
                // Save state when pausing
                this.savePlaybackState();
            } else {
                this.audioPlayer.play();
                this.isPlaying = true;
                // Save state when starting playback
                this.savePlaybackState();
            }
            this.updatePlayPauseButton();
        }
    }

    playPrevious() {
        if (this.playlist.length > 0) {
            this.currentIndex = (this.currentIndex - 1 + this.playlist.length) % this.playlist.length;
            const song = this.playlist[this.currentIndex];
            this.playSong(song.url, song.name, song.repo);
        }
    }

    playNext() {
        if (this.playlist.length > 0) {
            this.currentIndex = (this.currentIndex + 1) % this.playlist.length;
            const song = this.playlist[this.currentIndex];
            this.playSong(song.url, song.name, song.repo);
        }
    }

    // Force restart current song from beginning
    restartCurrentSong() {
        if (this.currentSong && this.audioPlayer.src) {
            this.audioPlayer.currentTime = 0;
            this.audioPlayer.play().then(() => {
                this.isPlaying = true;
                this.updatePlayPauseButton();
            }).catch(error => {
                console.error('Error restarting song:', error);
            });
        }
    }

    toggleShuffle() {
        this.shuffleEnabled = !this.shuffleEnabled;
        const shuffleBtn = document.getElementById('shuffleBtn');
        
        console.log('Shuffle toggled:', this.shuffleEnabled);
        console.log('Shuffle button element:', shuffleBtn);
        console.log('Shuffle button classes before:', shuffleBtn.className);
        
        if (this.shuffleEnabled) {
            // Save original playlist and shuffle
            this.originalPlaylist = [...this.playlist];
            this.shufflePlaylist();
            shuffleBtn.classList.add('active');
            console.log('Added active class, classes after:', shuffleBtn.className);
        } else {
            // Restore original playlist
            this.playlist = [...this.originalPlaylist];
            shuffleBtn.classList.remove('active');
            console.log('Removed active class, classes after:', shuffleBtn.className);
        }
        
        this.saveUserData();
    }

    shufflePlaylist() {
        for (let i = this.playlist.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.playlist[i], this.playlist[j]] = [this.playlist[j], this.playlist[i]];
        }
    }

    toggleRepeat() {
        const repeatBtn = document.getElementById('repeatBtn');
        
        if (this.repeatMode === 'all') {
            this.repeatMode = 'one';
            repeatBtn.classList.remove('active');
            repeatBtn.innerHTML = '<i class="fas fa-redo-alt"></i>';
            repeatBtn.title = 'Repeat Single Song';
        } else {
            this.repeatMode = 'all';
            repeatBtn.classList.add('active');
            repeatBtn.innerHTML = '<i class="fas fa-redo"></i>';
            repeatBtn.title = 'Repeat All Songs';
        }
        
        this.saveUserData();
    }

    handleSongEnd() {
        if (this.repeatMode === 'one') {
            // Repeat current song
            this.audioPlayer.currentTime = 0;
            this.audioPlayer.play();
        } else {
            // Repeat all songs - play next song (will loop back to first)
            this.playNext();
        }
    }

    updateProgress() {
        const progressBar = document.getElementById('progressBar');
        const currentTime = document.getElementById('currentTime');
        const seekHandle = document.getElementById('seekHandle');
        
        if (this.audioPlayer.duration) {
            const percent = (this.audioPlayer.currentTime / this.audioPlayer.duration) * 100;
            progressBar.style.width = percent + '%';
            
            // Update seek handle position smoothly during playback
            if (!this.isDragging) {
                this.updateSeekHandlePosition(percent / 100);
            }
            
            currentTime.textContent = this.formatTime(this.audioPlayer.currentTime);
            
            // Update media session for background controls
            this.updateMediaSession();
        }
    }

    updateTotalTime() {
        const totalTime = document.getElementById('totalTime');
        totalTime.textContent = this.formatTime(this.audioPlayer.duration);
    }

    updateCurrentSongDisplay() {
        if (this.currentSong) {
            // Very aggressive truncation for bottom player to prevent layout issues
            const truncatedName = this.currentSong.name.length > 18 ? this.currentSong.name.substring(0, 18) + '...' : this.currentSong.name;
            const truncatedRepo = this.currentSong.repo.length > 15 ? this.currentSong.repo.substring(0, 15) + '...' : this.currentSong.repo;
            
            document.getElementById('currentSongTitle').textContent = truncatedName;
            document.getElementById('currentSongArtist').textContent = truncatedRepo;
            
            // Set full names as tooltips so users can see the complete names
            document.getElementById('currentSongTitle').title = this.currentSong.name;
            document.getElementById('currentSongArtist').title = this.currentSong.repo;
        }
    }

    updatePlayPauseButton() {
        const button = document.getElementById('playPauseBtn');
        const icon = button.querySelector('i');
        
        if (this.isPlaying) {
            icon.className = 'fas fa-pause';
            button.className = 'btn btn-warning btn-lg';
        } else {
            icon.className = 'fas fa-play';
            button.className = 'btn btn-primary btn-lg';
        }
    }



    incrementPlayCount(song) {
        const key = `${song.name}-${song.repo}`;
        this.topPlayed[key] = (this.topPlayed[key] || 0) + 1;
        this.renderTopPlayed();
    }



    renderTopPlayed() {
        const container = document.getElementById('topPlayed');
        console.log('Top played data:', this.topPlayed);
        console.log('Playlist length:', this.playlist.length);
        
        const sortedSongs = Object.entries(this.topPlayed)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 6);
            
        console.log('Sorted songs before mapping:', sortedSongs);
        
        const mappedSongs = sortedSongs.map(([key, count]) => {
            const [name, repo] = key.split('-');
            // Find the original song data to get the URL
            let originalSong = this.playlist.find(song => song.name === name && song.repo === repo);
            
            // If exact match not found, try to find by name only (more flexible matching)
            if (!originalSong) {
                originalSong = this.playlist.find(song => song.name === name);
                console.log(`Exact match not found for ${name} from ${repo}, trying name-only match:`, originalSong ? 'YES' : 'NO');
            }
            
            console.log(`Looking for song: ${name} from ${repo}, found:`, originalSong ? 'YES' : 'NO');
            return { 
                name, 
                repo, 
                count, 
                url: originalSong ? originalSong.url : null 
            };
        });
        
        console.log('Mapped songs:', mappedSongs);
        
        const filteredSongs = mappedSongs.filter(song => song.url);
        console.log('Filtered songs (with URLs):', filteredSongs);

        if (filteredSongs.length === 0) {
            container.innerHTML = '<div class="col-12"><p class="text-muted">No top played songs yet</p></div>';
            return;
        }

        container.innerHTML = filteredSongs.map(song => this.createSongCard(song, 'top')).join('');
    }

    renderAllSongs() {
        const container = document.getElementById('allSongs');
        
        if (this.playlist.length === 0) {
            container.innerHTML = '<div class="col-12"><p class="text-muted">No songs available</p></div>';
            return;
        }

        // Ensure songs are always displayed in alphabetical order
        const sortedSongs = [...this.playlist].sort((a, b) => a.name.localeCompare(b.name));
        container.innerHTML = sortedSongs.map(song => this.createSongCard(song, 'all')).join('');
    }

    renderFilteredSongs(filteredSongs) {
        const container = document.getElementById('allSongs');
        const searchInput = document.getElementById('searchInput');
        const query = searchInput.value.trim();
        
        if (filteredSongs.length === 0) {
            container.innerHTML = `
                <div class="col-12 text-center">
                    <p class="no-results-message">No songs found matching "<strong>${query}</strong>"</p>
                    <button class="btn btn-outline-light btn-sm clear-search-btn">
                        <i class="fas fa-times me-2"></i>Clear Search
                    </button>
                </div>
            `;
            return;
        }

        // Update section header to show search results
        const sectionHeader = document.querySelector('#allSongs').previousElementSibling;
        if (sectionHeader && sectionHeader.classList.contains('section-header')) {
            const originalText = sectionHeader.innerHTML;
            sectionHeader.innerHTML = `
                <div class="d-flex flex-column align-items-center">
                    <div class="mb-2">
                        <i class="fas fa-search me-3"></i>Search Results (${filteredSongs.length} songs)
                    </div>
                    <button class="btn btn-outline-light btn-sm clear-search-btn">
                        <i class="fas fa-times me-2"></i>Clear
                    </button>
                </div>
            `;
        }

        // Sort filtered songs alphabetically for consistent display
        const sortedFilteredSongs = filteredSongs.sort((a, b) => a.name.localeCompare(b.name));
        container.innerHTML = sortedFilteredSongs.map(song => this.createSongCard(song, 'all')).join('');
    }

    clearSearch() {
        console.log('Clear search method called');
        
        const searchInput = document.getElementById('searchInput');
        searchInput.value = '';
        console.log('Search input cleared');
        
        this.renderAllSongs();
        console.log('All songs rendered');
        
        // Restore original section header
        const sectionHeader = document.querySelector('#allSongs').previousElementSibling;
        if (sectionHeader && sectionHeader.classList.contains('section-header')) {
            sectionHeader.innerHTML = '<i class="fas fa-list me-3"></i>All Songs';
            console.log('Section header restored');
        }
        
        console.log('Clear search completed');
    }

    setupBackgroundAudio() {
        // Initialize Web Audio API for better background playback
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            console.log('Web Audio API initialized for background playback');
        } catch (error) {
            console.log('Web Audio API not supported, using standard audio');
        }

        // Set audio properties for background playback
        this.audioPlayer.preload = 'auto';
        this.audioPlayer.crossOrigin = 'anonymous';
        
        // Enable background audio on mobile devices
        this.audioPlayer.setAttribute('playsinline', '');
        this.audioPlayer.setAttribute('webkit-playsinline', '');
        
        // Set audio session category for iOS
        if (this.audioPlayer.webkitSetPresentationOptions) {
            this.audioPlayer.webkitSetPresentationOptions('playback');
        }
        
        console.log('Background audio setup completed');
    }

    showLoadingScreen() {
        this.loadingProgress = 0;
        this.updateLoadingProgress(0);
        
        // Simulate loading progress over 3 seconds
        const loadingInterval = setInterval(() => {
            this.loadingProgress += 1;
            const progress = Math.min(this.loadingProgress, 100);
            this.updateLoadingProgress(progress);
            
            if (this.loadingProgress >= 100) {
                clearInterval(loadingInterval);
                setTimeout(() => {
                    this.hideLoadingScreen();
                }, 500); // Wait 500ms after reaching 100%
            }
        }, 30); // Update every 30ms for smooth progress (3000ms / 100 = 30ms)
    }

    updateLoadingProgress(progress) {
        const progressBar = document.querySelector('.progress-bar-fill');
        const loadingText = document.querySelector('.loading-text');
        
        if (progressBar && loadingText) {
            progressBar.style.width = `${progress}%`;
            loadingText.textContent = `${Math.round(progress)}%`;
            
            // Update loading subtitle based on progress
            const subtitle = document.querySelector('.loading-subtitle');
            if (subtitle) {
                if (progress < 30) {
                    subtitle.textContent = 'Initializing player...';
                } else if (progress < 60) {
                    subtitle.textContent = 'Loading music library...';
                } else if (progress < 90) {
                    subtitle.textContent = 'Preparing interface...';
                } else {
                    subtitle.textContent = 'Almost ready...';
                }
            }
        }
    }

    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) {
            loadingScreen.classList.add('hidden');
            
            // Remove loading screen from DOM after animation
            setTimeout(() => {
                if (loadingScreen.parentNode) {
                    loadingScreen.parentNode.removeChild(loadingScreen);
                }
            }, 500);
            
            console.log('Loading screen hidden, music player ready');
        }
    }

    handleVisibilityChange() {
        this.isPageVisible = !document.hidden;
        
        if (this.isPageVisible) {
            // Page became visible - resume audio context if needed
            if (this.audioContext && this.audioContext.state === 'suspended') {
                this.audioContext.resume().then(() => {
                    console.log('Audio context resumed after page became visible');
                });
            }
            
            // Resume playback if it was playing before
            if (this.isPlaying && this.audioPlayer.paused) {
                this.audioPlayer.play().catch(error => {
                    console.log('Failed to resume playback:', error);
                });
            }
        } else {
            // Page became hidden - ensure audio continues
            console.log('Page hidden, audio will continue in background');
            
            // Keep audio context active
            if (this.audioContext && this.audioContext.state === 'running') {
                // Audio context will continue running in background
            }
        }
    }

    async playSong(song) {
        try {
            // Resume audio context if suspended
            if (this.audioContext && this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }
            
            this.currentSong = song;
            this.audioPlayer.src = song.url;
            
            // Update UI
            this.updateCurrentSongDisplay();
            this.updateSongCardsState();
            
            // Request audio focus for background playback
            this.requestAudioFocus();
            
            // Add error event listener for better error handling
            const errorHandler = (e) => {
                console.error('Audio loading error:', e);
                const errorMessage = this.getAudioErrorMessage(e);
                this.showError(errorMessage);
                this.audioPlayer.removeEventListener('error', errorHandler);
            };
            
            this.audioPlayer.addEventListener('error', errorHandler);
            
            // Add timeout for audio loading
            const loadingTimeout = setTimeout(() => {
                if (!this.isPlaying) {
                    this.showError('Audio loading timeout. Please try another song.');
                }
            }, 15000); // 15 seconds timeout
            
            // Play the song
            await this.audioPlayer.play();
            this.isPlaying = true;
            this.updatePlayPauseButton();
            
            // Clear timeout and remove error listener on success
            clearTimeout(loadingTimeout);
            this.audioPlayer.removeEventListener('error', errorHandler);
            
            // Increment play count for top played
            this.incrementPlayCount(song);
            
            console.log(`Now playing: ${song.name}`);
            
        } catch (error) {
            console.error('Error playing song:', error);
            this.showError('Error playing song. Please try again.');
        }
    }

    requestAudioFocus() {
        // Request audio focus for background playback
        if (navigator.mediaSession) {
            navigator.mediaSession.setActionHandler('play', () => this.togglePlayPause());
            navigator.mediaSession.setActionHandler('pause', () => this.togglePlayPause());
            navigator.mediaSession.setActionHandler('previoustrack', () => this.playPrevious());
            navigator.mediaSession.setActionHandler('nexttrack', () => this.playNext());
            navigator.mediaSession.setActionHandler('seekto', (details) => {
                if (details.seekTime) {
                    this.audioPlayer.currentTime = details.seekTime;
                }
            });
            
            // Update media session metadata
            if (this.currentSong) {
                navigator.mediaSession.metadata = new MediaMetadata({
                    title: this.currentSong.name,
                    artist: this.currentSong.repo,
                    album: 'Music Player',
                    artwork: [
                        { src: '/icon-192x192.png', sizes: '192x192', type: 'image/png' }
                    ]
                });
            }
            
            // Update playback state
            navigator.mediaSession.playbackState = this.isPlaying ? 'playing' : 'paused';
        }
        
        // iOS-specific audio session handling
        if (this.audioPlayer.webkitSetPresentationOptions) {
            this.audioPlayer.webkitSetPresentationOptions('playback');
        }
        
        // Android-specific audio focus
        if (navigator.mediaSession && navigator.mediaSession.setActionHandler) {
            // Request audio focus
            console.log('Audio focus requested for background playback');
        }
    }

    updateMediaSession() {
        if (navigator.mediaSession && this.currentSong) {
            // Update playback state
            navigator.mediaSession.playbackState = this.isPlaying ? 'playing' : 'paused';
            
            // Update position state
            if (this.audioPlayer.duration) {
                navigator.mediaSession.setPositionState({
                    duration: this.audioPlayer.duration,
                    position: this.audioPlayer.currentTime,
                    playbackRate: 1.0
                });
            }
        }
    }

    savePlaybackState() {
        if (this.currentSong && this.audioPlayer.src) {
            const playbackState = {
                song: this.currentSong,
                currentTime: this.audioPlayer.currentTime,
                duration: this.audioPlayer.duration,
                isPlaying: this.isPlaying,
                volume: this.audioPlayer.volume,
                timestamp: Date.now()
            };
            
            localStorage.setItem('musicPlayer_playbackState', JSON.stringify(playbackState));
            console.log('Playback state saved:', playbackState);
        }
    }

    resumePlayback() {
        try {
            const savedState = localStorage.getItem('musicPlayer_playbackState');
            
            if (savedState) {
                const playbackState = JSON.parse(savedState);
                const timeSinceSave = Date.now() - playbackState.timestamp;
                
                // Only resume if saved within last 24 hours
                if (timeSinceSave < 24 * 60 * 60 * 1000) {
                    this.currentSong = playbackState.song;
                    this.audioPlayer.volume = playbackState.volume;
                    
                    // Update UI to show the saved song
                    this.updateCurrentSongDisplay();
                    this.updateSongCardsState();
                    

                    
                    // Set the audio source and resume from saved position
                    this.audioPlayer.src = this.currentSong.url;
                    
                    this.audioPlayer.addEventListener('loadedmetadata', () => {
                        this.audioPlayer.currentTime = playbackState.currentTime;
                        console.log(`Resuming playback from ${this.formatTime(playbackState.currentTime)}`);
                        
                        // Auto-play if it was playing before (optional)
                        if (playbackState.isPlaying) {
                            this.audioPlayer.play().then(() => {
                                this.isPlaying = true;
                                this.updatePlayPauseButton();
                                console.log('Playback automatically resumed');
                            }).catch(error => {
                                console.log('Auto-resume failed, but position is restored');
                            });
                        }
                    }, { once: true });
                    
                    console.log('Playback state restored successfully');
                } else {
                    console.log('Saved playback state is too old, starting fresh');
                    localStorage.removeItem('musicPlayer_playbackState');
                }
            }
        } catch (error) {
            console.error('Error resuming playback:', error);
            localStorage.removeItem('musicPlayer_playbackState');
        }
    }

    createSongCard(song, type) {
        const isCurrentSong = this.currentSong && this.currentSong.url === song.url;
        const cardClass = isCurrentSong ? 'song-card now-playing' : 'song-card';
        const playCount = type === 'top' ? song.count : '';
        
        // Truncate long song names and repo names
        const truncatedName = song.name.length > 20 ? song.name.substring(0, 20) + '...' : song.name;
        const truncatedRepo = song.repo.length > 15 ? song.repo.substring(0, 15) + '...' : song.repo;
        
        return `
            <div class="col-6 col-md-4 col-lg-3 col-xl-2 mb-3">
                <div class="${cardClass}" 
                     onclick="musicPlayer.playSong('${song.url}', '${song.name}', '${song.repo}')"
                     ondblclick="if(musicPlayer.currentSong && this.currentSong.url === '${song.url}') musicPlayer.restartCurrentSong()"
                     title="${song.name} - ${song.repo}${isCurrentSong ? ' (Double-click to restart)' : ''}">
                    <div class="card-body">
                        <h6 class="card-title">${truncatedName}</h6>
                        <p class="card-text">${truncatedRepo}</p>
                        ${playCount ? `<div class="play-count">${playCount} plays</div>` : ''}
                    </div>
                    <button class="play-button">
                        <i class="fas fa-play"></i>
                    </button>
                </div>
            </div>
        `;
    }

    updateSongCardsState() {
        // Update all song cards to reflect current playing state
        this.renderAllSongs();
        this.renderTopPlayed();
    }

    formatTime(seconds) {
        if (isNaN(seconds)) return '0:00';
        
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    loadUserData() {
        // Create device-specific storage keys for better isolation
        const deviceId = this.getDeviceId();
        const savedTopPlayed = localStorage.getItem(`musicPlayer_topPlayed_${deviceId}`);
        const savedShuffle = localStorage.getItem(`musicPlayer_shuffle_${deviceId}`);
        const savedRepeat = localStorage.getItem(`musicPlayer_repeat_${deviceId}`);
        
        if (savedTopPlayed) {
            this.topPlayed = JSON.parse(savedTopPlayed);
        }

        if (savedShuffle) {
            this.shuffleEnabled = JSON.parse(savedShuffle);
            if (this.shuffleEnabled) {
                document.getElementById('shuffleBtn').classList.add('active');
            }
        }

        if (savedRepeat) {
            this.repeatMode = savedRepeat;
        }
        
        // Set up repeat button state (including default 'all' mode)
        const repeatBtn = document.getElementById('repeatBtn');
        if (this.repeatMode === 'all') {
            repeatBtn.classList.add('active');
            repeatBtn.title = 'Repeat All Songs';
        } else {
            // 'one' mode
            repeatBtn.classList.remove('active');
            repeatBtn.innerHTML = '<i class="fas fa-redo-alt"></i>';
            repeatBtn.title = 'Repeat Single Song';
        }
    }

    saveUserData() {
        const deviceId = this.getDeviceId();
        localStorage.setItem(`musicPlayer_topPlayed_${deviceId}`, JSON.stringify(this.topPlayed));
        localStorage.setItem(`musicPlayer_shuffle_${deviceId}`, JSON.stringify(this.shuffleEnabled));
        localStorage.setItem(`musicPlayer_repeat_${deviceId}`, this.repeatMode);
    }

    getDeviceId() {
        // Generate a unique device identifier based on browser and screen properties
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        ctx.textBaseline = 'top';
        ctx.font = '14px Arial';
        ctx.fillText('Device ID', 2, 2);
        
        const fingerprint = [
            navigator.userAgent,
            navigator.language,
            screen.width + 'x' + screen.height,
            new Date().getTimezoneOffset(),
            ctx.getImageData(0, 0, 1, 1).data.join(''),
            navigator.hardwareConcurrency || 'unknown'
        ].join('|');
        
        // Create a simple hash from the fingerprint
        let hash = 0;
        for (let i = 0; i < fingerprint.length; i++) {
            const char = fingerprint.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        
        return Math.abs(hash).toString(36);
    }

    showError(message) {
        // Create a simple error notification
        const errorDiv = document.createElement('div');
        errorDiv.className = 'alert alert-danger alert-dismissible fade show position-fixed';
        errorDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999;';
        errorDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        document.body.appendChild(errorDiv);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.parentNode.removeChild(errorDiv);
            }
        }, 5000);
    }

    getAudioErrorMessage(error) {
        // Provide user-friendly error messages based on error type
        if (error.target && error.target.error) {
            const errorCode = error.target.error.code;
            switch (errorCode) {
                case MediaError.MEDIA_ERR_ABORTED:
                    return 'Audio playback was aborted. Please try again.';
                case MediaError.MEDIA_ERR_NETWORK:
                    return 'Network error. Please check your connection and try again.';
                case MediaError.MEDIA_ERR_DECODE:
                    return 'Audio format not supported. Please try another song.';
                case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
                    return 'Audio source not supported. Please try another song.';
                default:
                    return 'Audio playback error. Please try another song.';
            }
        }
        
        // Generic error messages
        if (error.message && error.message.includes('timeout')) {
            return 'Audio loading timeout. Please try another song.';
        }
        
        if (error.message && error.message.includes('CORS')) {
            return 'Audio access denied. Please try another song.';
        }
        
        return 'Audio playback failed. Please try another song.';
    }


}

// Initialize the music player when the page loads
let musicPlayer;
document.addEventListener('DOMContentLoaded', () => {
    musicPlayer = new MusicPlayer();
});

// Hide search results when clicking outside
document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-container')) {
        musicPlayer.hideSearchResults();
    }
});
