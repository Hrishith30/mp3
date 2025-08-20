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
        this.currentSearchQuery = ''; // Track current search query
        this.isSearchActive = false; // Track if search is currently active
        
        this.initializePlayer();
        this.loadSongs();
        this.loadUserData();
        this.setupEventListeners();
        
        // Check device type and log for debugging
        this.checkDeviceType();
        
        // Start monitoring for desktop devices to ensure mute button stays hidden
        this.startDesktopMuteButtonMonitoring();
    }

    initializePlayer() {
        // Set initial volume and mute state
        this.audioPlayer.volume = 0.5;
        this.isMuted = false;
        this.lastVolume = 0.5;
        
        // Handle mobile audio context issues
        this.initializeMobileAudio();
        
        // Resume playback from where it was stopped
        this.resumePlayback();
    }

    initializeMobileAudio() {
        console.log('🔧 Initializing mobile audio compatibility...');
        
        // Handle audio context suspension on mobile devices
        if (this.audioPlayer.context && this.audioPlayer.context.state === 'suspended') {
            console.log('🔧 Audio context is suspended, attempting to resume...');
            this.audioPlayer.context.resume();
        }
        
        // Add event listeners for mobile audio context management
        this.audioPlayer.addEventListener('play', () => {
            console.log('🔧 Audio play event - checking context state...');
            if (this.audioPlayer.context && this.audioPlayer.context.state === 'suspended') {
                console.log('🔧 Resuming suspended audio context...');
                this.audioPlayer.context.resume();
            }
        });
        
        // Handle volume changes for mobile devices
        this.audioPlayer.addEventListener('volumechange', () => {
            console.log('🔧 Volume changed to:', this.audioPlayer.volume);
            if (this.audioPlayer.volume === 0 && !this.isMuted) {
                console.log('🔧 Volume is 0 but not muted - this might indicate a mobile issue');
            }
        });
        
        // Add touch event handling for mobile devices
        document.addEventListener('touchstart', () => {
            console.log('🔧 Touch event detected - ensuring audio context is active...');
            if (this.audioPlayer.context && this.audioPlayer.context.state === 'suspended') {
                this.audioPlayer.context.resume();
            }
        }, { once: true });
        
        // Handle page visibility changes (common on mobile)
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && this.audioPlayer.context && this.audioPlayer.context.state === 'suspended') {
                console.log('🔧 Page became visible - resuming audio context...');
                this.audioPlayer.context.resume();
            }
        });
        
        console.log('🔧 Mobile audio compatibility initialized');
    }

    async loadSongs() {
        const repositories = [
            'https://api.github.com/repos/Hrishith30/player/contents/',
            'https://api.github.com/repos/Hrishith30/player1/contents/',
            'https://api.github.com/repos/Hrishith30/player2/contents/'
        ];

        try {
            const allSongs = [];
            
            for (const repo of repositories) {
                try {
                    const response = await fetch(repo);
                    if (response.ok) {
                        const contents = await response.json();
                        const songs = contents
                            .filter(item => item.type === 'file' && item.name.toLowerCase().endsWith('.mp3'))
                            .map(item => {
                                // Clean up song names by removing common website suffixes
                                let cleanName = item.name.replace('.mp3', '');
                                
                                // Remove common website suffixes that make names too long
                                const websiteSuffixes = [
                                    ' - SenSongsMp3.Co',
                                    ' - SenSongsMp3',
                                    ' - SenSongs',
                                    ' - Mp3.Co',
                                    ' - Mp3',
                                    ' - SongsMp3',
                                    ' - Songs',
                                    ' - Co',
                                    ' - Download',
                                    ' - Free',
                                    ' - 320kbps',
                                    ' - 128kbps',
                                    ' - High Quality'
                                ];
                                
                                websiteSuffixes.forEach(suffix => {
                                    if (cleanName.includes(suffix)) {
                                        cleanName = cleanName.replace(suffix, '');
                                    }
                                });
                                
                                        // Clean up repo names too
        let cleanRepo = repo.split('/')[5];
        if (cleanRepo && cleanRepo.length > 20) {
            cleanRepo = cleanRepo.substring(0, 20);
        }
        
        console.log(`🔧 Processing repo: ${repo} → cleanRepo: ${cleanRepo}`);
                                
                                return {
                                    name: cleanName,
                                    url: item.download_url,
                                    repo: cleanRepo,
                                    size: item.size,
                                    path: item.path
                                };
                            });
                        allSongs.push(...songs);
                    }
                } catch (error) {
                    console.warn(`Failed to fetch from ${repo}:`, error);
                }
            }

            // Sort songs alphabetically by name
            this.playlist = allSongs.sort((a, b) => a.name.localeCompare(b.name));
            console.log(`🎵 Loaded ${this.playlist.length} songs from GitHub repositories`);
            console.log(`🎵 First few songs:`, this.playlist.slice(0, 3));
            this.renderAllSongs();
            this.renderTopPlayed();
            
        } catch (error) {
            console.error('Error loading songs:', error);
            this.showError('Failed to load songs. Please try again later.');
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

        // Volume control (desktop)
        const volumeSlider = document.getElementById('volumeSlider');
        if (volumeSlider) {
            volumeSlider.addEventListener('input', (e) => {
                this.audioPlayer.volume = e.target.value / 100;
                this.lastVolume = this.audioPlayer.volume;
            });
        }

        // Mute button control (mobile)
        const muteBtn = document.getElementById('muteBtn');
        if (muteBtn) {
            // Check if this is a desktop device
            const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
            const isDesktop = window.innerWidth > 1200 && !isTouchDevice;
            
            if (isDesktop) {
                console.log('💻 Desktop device detected - skipping mute button setup');
                // Hide mute button on desktop
                this.hideMuteButtonOnDesktop();
            } else {
                console.log('🔇 Mute button found, adding event listeners for mobile device');
                
                // Add multiple event listeners for better mobile compatibility
                muteBtn.addEventListener('click', (e) => {
                    console.log('🔇 Mute button clicked!');
                    e.preventDefault();
                    e.stopPropagation();
                    this.toggleMute();
                });
                
                // Add touch events for better mobile support
                muteBtn.addEventListener('touchstart', (e) => {
                    console.log('🔇 Mute button touchstart!');
                    e.preventDefault();
                    e.stopPropagation();
                    // Add visual feedback
                    muteBtn.style.transform = 'scale(0.95)';
                });
                
                muteBtn.addEventListener('touchend', (e) => {
                    console.log('🔇 Mute button touchend!');
                    e.preventDefault();
                    e.stopPropagation();
                    // Remove visual feedback and trigger mute
                    muteBtn.style.transform = 'scale(1)';
                    this.toggleMute();
                });
                
                // Add mousedown/mouseup for desktop compatibility
                muteBtn.addEventListener('mousedown', (e) => {
                    console.log('🔇 Mute button mousedown!');
                    muteBtn.style.transform = 'scale(0.95)';
                });
                
                muteBtn.addEventListener('mouseup', (e) => {
                    console.log('🔇 Mute button mouseup!');
                    muteBtn.style.transform = 'scale(1)';
                });
                
                // Ensure the button is properly styled and visible
                muteBtn.style.display = 'flex';
                muteBtn.style.visibility = 'visible';
                muteBtn.style.opacity = '1';
                muteBtn.style.pointerEvents = 'auto';
                
                console.log('🔇 Mute button event listeners added successfully');
                console.log('🔇 Mute button display style:', window.getComputedStyle(muteBtn).display);
                console.log('🔇 Mute button visibility:', window.getComputedStyle(muteBtn).visibility);
                console.log('🔇 Mute button opacity:', window.getComputedStyle(muteBtn).opacity);
            }
        } else {
            console.log('⚠️ Mute button not found in DOM');
        }

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
        
        // Handle window resize for orientation changes on tablets
        window.addEventListener('resize', () => {
            console.log('🔄 Window resized, checking device type...');
            this.checkDeviceType();
        });
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
            // Reset search state when query is cleared
            this.currentSearchQuery = '';
            this.isSearchActive = false;
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

        // Set search state flags
        this.currentSearchQuery = query;
        this.isSearchActive = true;

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

        console.log(`🎵 playSong called with:`, { url, name, repo });
        console.log(`🎵 Created song object:`, song);
        console.log(`🎵 Current playlist length:`, this.playlist.length);

        this.currentSong = song;
        
        // Increment play count immediately when song is selected
        this.incrementPlayCount(song);
        this.saveUserData();
        
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
            repeatBtn.classList.add('active');
            repeatBtn.innerHTML = '<i class="fas fa-redo-alt"></i>';
            repeatBtn.title = 'Repeat Single Song';
        } else {
            this.repeatMode = 'all';
            repeatBtn.classList.remove('active');
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
            
            document.getElementById('currentSongTitle').textContent = truncatedName;
            document.getElementById('currentSongArtist').textContent = ''; // Empty - no text needed
            
            // Set full names as tooltips so users can see the complete names
            document.getElementById('currentSongTitle').title = this.currentSong.name;
            document.getElementById('currentSongArtist').title = '';
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
        const previousCount = this.topPlayed[key] || 0;
        this.topPlayed[key] = previousCount + 1;
        
        console.log(`🎵 Play count incremented for: ${song.name} (${song.repo})`);
        console.log(`📊 Previous count: ${previousCount} → New count: ${this.topPlayed[key]}`);
        console.log(`🔑 Key used: ${key}`);
        
        this.renderTopPlayed();
    }



    renderTopPlayed() {
        const container = document.getElementById('topPlayed');
        console.log('🎵 renderTopPlayed called');
        console.log('📊 Top played data:', this.topPlayed);
        console.log('📁 Playlist length:', this.playlist.length);
        console.log('📁 First 5 playlist items:', this.playlist.slice(0, 5));
        
        const sortedSongs = Object.entries(this.topPlayed)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 6);
            
        console.log('Sorted songs before mapping:', sortedSongs);
        
        const mappedSongs = sortedSongs.map(([key, count]) => {
            const [name, repo] = key.split('-');
            console.log(`🔍 Processing key: ${key} with name: ${name}, repo: ${repo}`);
            
            // Find the original song data to get the URL
            let originalSong = this.playlist.find(song => song.name === name && song.repo === repo);
            
            // If exact match not found, try to find by name only (more flexible matching)
            if (!originalSong) {
                console.log(`❌ Exact match not found for ${name} from ${repo}`);
                originalSong = this.playlist.find(song => song.name === name);
                console.log(`🔄 Trying name-only match for ${name}:`, originalSong ? 'YES' : 'NO');
                
                if (originalSong) {
                    console.log(`✅ Found by name only:`, originalSong);
                }
            } else {
                console.log(`✅ Exact match found:`, originalSong);
            }
            
            // If still no match, try fuzzy matching by name similarity
            if (!originalSong) {
                console.log(`🔍 Trying fuzzy match for: ${name}`);
                originalSong = this.playlist.find(song => 
                    song.name.toLowerCase().includes(name.toLowerCase()) || 
                    name.toLowerCase().includes(song.name.toLowerCase())
                );
                console.log(`🔍 Fuzzy match result:`, originalSong);
            }
            
            // If still no match, try matching by URL similarity (last resort)
            if (!originalSong) {
                console.log(`🔍 Trying URL-based matching for: ${name}`);
                // Look for songs with similar names and any repo
                const similarSongs = this.playlist.filter(song => 
                    song.name.toLowerCase().includes(name.toLowerCase()) || 
                    name.toLowerCase().includes(song.name.toLowerCase())
                );
                
                if (similarSongs.length > 0) {
                    // Use the first similar song found
                    originalSong = similarSongs[0];
                    console.log(`🔍 URL-based match found:`, originalSong);
                }
            }
            
            const result = { 
                name, 
                repo, 
                count, 
                url: originalSong ? originalSong.url : null 
            };
            
            console.log(`📋 Final result for ${key}:`, result);
            return result;
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
        
        // Reset search state flags
        this.currentSearchQuery = '';
        this.isSearchActive = false;
        
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
        
        const cardHTML = `
            <div class="col-6 col-md-4 col-lg-3 col-xl-2 mb-3">
                <div class="${cardClass}" 
                     onclick="musicPlayer.playSong('${song.url}', '${song.name}', '${song.repo}')"
                     ondblclick="if(musicPlayer.currentSong && musicPlayer.currentSong.url === '${song.url}') musicPlayer.restartCurrentSong()"
                     title="${song.name}${isCurrentSong ? ' (Double-click to restart)' : ''}">
                    <div class="card-body">
                        <h6 class="card-title">${truncatedName}</h6>
                        ${playCount ? `<div class="play-count">${playCount} plays</div>` : ''}
                    </div>
                    <button class="play-button">
                        <i class="fas fa-play"></i>
                    </button>
                </div>
            </div>
        `;
        
        console.log(`🎵 Creating card for: ${song.name}`);
        console.log(`🎵 Card HTML:`, cardHTML);
        
        return cardHTML;
    }

    updateSongCardsState() {
        // Update song cards to reflect current playing state while maintaining search state
        if (this.isSearchActive && this.currentSearchQuery) {
            // If search is active, re-apply the search filter
            this.performSearch(this.currentSearchQuery);
        } else {
            // Otherwise show all songs
            this.renderAllSongs();
        }
        this.renderTopPlayed();
    }
    
    // Force refresh all song cards to remove any old repository text
    forceRefreshAllCards() {
        console.log('🔄 Force refreshing all song cards...');
        this.renderAllSongs();
        this.renderTopPlayed();
    }

    formatTime(seconds) {
        if (isNaN(seconds)) return '0:00';
        
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    toggleMute() {
        console.log('🔇 toggleMute called, current state:', this.isMuted);
        console.log('🔇 Current audio volume:', this.audioPlayer.volume);
        console.log('🔇 Audio muted property:', this.audioPlayer.muted);
        
        try {
            if (this.isMuted) {
                // Unmute: restore previous volume
                console.log('🔊 Unmuting, restoring volume to:', this.lastVolume);
                
                // Set both volume and muted properties for better compatibility
                this.audioPlayer.volume = this.lastVolume;
                this.audioPlayer.muted = false;
                this.isMuted = false;
                
                // Update mute button
                const muteBtn = document.getElementById('muteBtn');
                if (muteBtn) {
                    muteBtn.classList.remove('muted');
                    muteBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
                    muteBtn.title = 'Mute';
                    console.log('🔊 Mute button updated to unmuted state');
                } else {
                    console.log('⚠️ Mute button not found when trying to update');
                }
                
                // Update volume slider if it exists (desktop)
                const volumeSlider = document.getElementById('volumeSlider');
                if (volumeSlider) {
                    volumeSlider.value = this.lastVolume * 100;
                }
                
                // Force audio context resume on mobile devices
                if (this.audioPlayer.context && this.audioPlayer.context.state === 'suspended') {
                    this.audioPlayer.context.resume();
                }
                
            } else {
                // Mute: save current volume and set to 0
                console.log('🔇 Muting, saving current volume:', this.audioPlayer.volume);
                this.lastVolume = this.audioPlayer.volume;
                
                // Set both volume and muted properties for better compatibility
                this.audioPlayer.volume = 0;
                this.audioPlayer.muted = true;
                this.isMuted = true;
                
                // Update mute button
                const muteBtn = document.getElementById('muteBtn');
                if (muteBtn) {
                    muteBtn.classList.add('muted');
                    muteBtn.innerHTML = '<i class="fas fa-volume-mute"></i>';
                    muteBtn.title = 'Unmute';
                    console.log('🔇 Mute button updated to muted state');
                } else {
                    console.log('⚠️ Mute button not found when trying to update');
                }
                
                // Update volume slider if it exists (desktop)
                const volumeSlider = document.getElementById('volumeSlider');
                if (volumeSlider) {
                    volumeSlider.value = 0;
                }
            }
            
            // Verify the mute state
            console.log('🔇 Final mute state:', this.isMuted);
            console.log('🔇 Final audio volume:', this.audioPlayer.volume);
            console.log('🔇 Final audio muted property:', this.audioPlayer.muted);
            
            // Force a small delay to ensure the change takes effect
            setTimeout(() => {
                console.log('🔇 Delayed verification - Volume:', this.audioPlayer.volume, 'Muted:', this.audioPlayer.muted);
            }, 100);
            
        } catch (error) {
            console.error('❌ Error in toggleMute:', error);
            
            // Fallback: try to mute/unmute using just the muted property
            try {
                if (this.isMuted) {
                    this.audioPlayer.muted = false;
                    this.isMuted = false;
                    console.log('🔊 Fallback unmute successful');
                } else {
                    this.audioPlayer.muted = true;
                    this.isMuted = true;
                    console.log('🔇 Fallback mute successful');
                }
                
                // Update UI
                const muteBtn = document.getElementById('muteBtn');
                if (muteBtn) {
                    if (this.isMuted) {
                        muteBtn.classList.add('muted');
                        muteBtn.innerHTML = '<i class="fas fa-volume-mute"></i>';
                    } else {
                        muteBtn.classList.remove('muted');
                        muteBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
                    }
                }
            } catch (fallbackError) {
                console.error('❌ Fallback mute/unmute also failed:', fallbackError);
            }
        }
    }

    checkDeviceType() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        const userAgent = navigator.userAgent;
        
        // Detect if device supports touch
        const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        const isDesktop = width > 1200 && !isTouchDevice;
        
        console.log('📱 Device check:');
        console.log('   Screen dimensions:', width + 'x' + height);
        console.log('   User agent:', userAgent);
        console.log('   Is touch device:', isTouchDevice);
        console.log('   Is desktop/laptop:', isDesktop);
        console.log('   Is mobile/tablet:', width <= 1200 || isTouchDevice);
        
        // Check if mute button and volume slider exist
        const muteBtn = document.getElementById('muteBtn');
        const volumeSlider = document.getElementById('volumeSlider');
        
        console.log('   Mute button exists:', !!muteBtn);
        console.log('   Volume slider exists:', !!volumeSlider);
        
        if (muteBtn) {
            console.log('   Mute button classes:', muteBtn.className);
            console.log('   Mute button display:', window.getComputedStyle(muteBtn).display);
            console.log('   Mute button visibility:', window.getComputedStyle(muteBtn).visibility);
            console.log('   Mute button opacity:', window.getComputedStyle(muteBtn).opacity);
            console.log('   Mute button pointer-events:', window.getComputedStyle(muteBtn).pointerEvents);
        }
        
        if (volumeSlider) {
            console.log('   Volume slider display:', window.getComputedStyle(volumeSlider.parentElement).display);
        }
        
        // Force mute button visibility on mobile devices only
        if ((width <= 1200 || isTouchDevice) && muteBtn && !isDesktop) {
            this.forceMuteButtonVisibility();
        }
        
        // Hide mute button completely on desktop devices
        if (isDesktop && muteBtn) {
            this.hideMuteButtonOnDesktop();
        }
        
        // Ensure volume slider is visible on desktop
        if (isDesktop && volumeSlider) {
            this.showVolumeSliderOnDesktop();
        }
    }

    forceMuteButtonVisibility() {
        const muteBtn = document.getElementById('muteBtn');
        if (muteBtn) {
            // Check if this is a desktop device
            const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
            const isDesktop = window.innerWidth > 1200 && !isTouchDevice;
            
            if (isDesktop) {
                console.log('💻 Desktop device detected - not forcing mute button visibility');
                return;
            }
            
            console.log('🔧 Forcing mute button visibility for mobile device');
            
            // Force the button to be visible
            muteBtn.style.display = 'flex !important';
            muteBtn.style.visibility = 'visible !important';
            muteBtn.style.opacity = '1 !important';
            muteBtn.style.pointerEvents = 'auto !important';
            muteBtn.style.zIndex = '1000';
            
            // Remove any conflicting classes
            muteBtn.classList.remove('d-none', 'invisible', 'opacity-0');
            
            // Add mobile-specific styling
            muteBtn.style.width = '40px';
            muteBtn.style.height = '40px';
            muteBtn.style.fontSize = '1.1rem';
            muteBtn.style.background = 'rgba(0, 123, 255, 0.2)';
            muteBtn.style.border = '2px solid rgba(0, 123, 255, 0.5)';
            muteBtn.style.color = '#007bff';
            muteBtn.style.borderRadius = '50%';
            muteBtn.style.alignItems = 'center';
            muteBtn.style.justifyContent = 'center';
            muteBtn.style.cursor = 'pointer';
            
            console.log('🔧 Mute button forced visibility applied');
            console.log('🔧 Final mute button styles:', {
                display: muteBtn.style.display,
                visibility: muteBtn.style.visibility,
                opacity: muteBtn.style.opacity,
                pointerEvents: muteBtn.style.pointerEvents
            });
        }
    }

    hideMuteButtonOnDesktop() {
        const muteBtn = document.getElementById('muteBtn');
        if (muteBtn) {
            console.log('💻 Hiding mute button on desktop device');
            
            // Completely hide the mute button
            muteBtn.style.display = 'none';
            muteBtn.style.visibility = 'hidden';
            muteBtn.style.opacity = '0';
            muteBtn.style.pointerEvents = 'none';
            muteBtn.style.width = '0';
            muteBtn.style.height = '0';
            muteBtn.style.margin = '0';
            muteBtn.style.padding = '0';
            muteBtn.style.border = 'none';
            muteBtn.style.background = 'none';
            muteBtn.style.position = 'absolute';
            muteBtn.style.left = '-9999px';
            muteBtn.style.top = '-9999px';
            muteBtn.style.zIndex = '-1';
            
            // Remove any event listeners
            muteBtn.replaceWith(muteBtn.cloneNode(true));
            
            console.log('💻 Mute button completely hidden on desktop');
        }
    }

    // Continuous monitoring to ensure mute button stays hidden on desktop
    startDesktopMuteButtonMonitoring() {
        const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        const isDesktop = window.innerWidth > 1200 && !isTouchDevice;
        
        if (isDesktop) {
            console.log('💻 Starting desktop mute button monitoring');
            
            // Check every 2 seconds to ensure mute button stays hidden
            setInterval(() => {
                const muteBtn = document.getElementById('muteBtn');
                if (muteBtn && (muteBtn.style.display !== 'none' || muteBtn.style.visibility !== 'hidden')) {
                    console.log('💻 Mute button reappeared, hiding again...');
                    this.hideMuteButtonOnDesktop();
                }
            }, 2000);
            
            // Also check on window resize
            window.addEventListener('resize', () => {
                if (window.innerWidth > 1200 && !isTouchDevice) {
                    const muteBtn = document.getElementById('muteBtn');
                    if (muteBtn) {
                        this.hideMuteButtonOnDesktop();
                    }
                }
            });
        }
    }

    showVolumeSliderOnDesktop() {
        const volumeSlider = document.getElementById('volumeSlider');
        const volumeContainer = volumeSlider ? volumeSlider.parentElement : null;
        
        if (volumeSlider && volumeContainer) {
            console.log('💻 Showing volume slider on desktop device');
            
            // Ensure volume slider is visible
            volumeContainer.style.display = 'flex';
            volumeContainer.style.visibility = 'visible';
            volumeContainer.style.opacity = '1';
            volumeContainer.style.pointerEvents = 'auto';
            volumeContainer.style.width = 'auto';
            volumeContainer.style.minWidth = '150px';
            
            // Style the volume slider for desktop
            volumeSlider.style.display = 'block';
            volumeSlider.style.visibility = 'visible';
            volumeSlider.style.opacity = '1';
            volumeSlider.style.pointerEvents = 'auto';
            volumeSlider.style.width = '100px';
            volumeSlider.style.height = '4px';
            
            console.log('💻 Volume slider shown on desktop');
        }
    }

    loadUserData() {
        // Create device-specific storage keys for better isolation
        const deviceId = this.getDeviceId();
        const savedTopPlayed = localStorage.getItem(`musicPlayer_topPlayed_${deviceId}`);
        const savedShuffle = localStorage.getItem(`musicPlayer_shuffle_${deviceId}`);
        const savedRepeat = localStorage.getItem(`musicPlayer_repeat_${deviceId}`);
        
        console.log(`🔍 Loading user data for device: ${deviceId}`);
        console.log(`📊 Saved top played data:`, savedTopPlayed);
        
        if (savedTopPlayed) {
            this.topPlayed = JSON.parse(savedTopPlayed);
            console.log(`✅ Top played data loaded:`, this.topPlayed);
        } else {
            console.log(`⚠️ No saved top played data found`);
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
            repeatBtn.classList.remove('active');
            repeatBtn.title = 'Repeat All Songs';
        } else {
            // 'one' mode
            repeatBtn.classList.add('active');
            repeatBtn.innerHTML = '<i class="fas fa-redo-alt"></i>';
            repeatBtn.title = 'Repeat Single Song';
        }
    }

    saveUserData() {
        const deviceId = this.getDeviceId();
        localStorage.setItem(`musicPlayer_topPlayed_${deviceId}`, JSON.stringify(this.topPlayed));
        localStorage.setItem(`musicPlayer_shuffle_${deviceId}`, JSON.stringify(this.shuffleEnabled));
        localStorage.setItem(`musicPlayer_repeat_${deviceId}`, this.repeatMode);
        
        console.log(`💾 User data saved for device: ${deviceId}`);
        console.log(`📊 Top played songs saved:`, this.topPlayed);
        console.log(`🔀 Shuffle state saved:`, this.shuffleEnabled);
        console.log(`🔁 Repeat mode saved:`, this.repeatMode);
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

    // Debug method to manually test top played functionality
    debugTopPlayed() {
        console.log('🔍 === DEBUG TOP PLAYED ===');
        console.log('📊 Current topPlayed object:', this.topPlayed);
        console.log('📁 Current playlist:', this.playlist);
        console.log('🔑 Top played keys:', Object.keys(this.topPlayed));
        
        // Test matching for each top played entry
        Object.entries(this.topPlayed).forEach(([key, count]) => {
            const [name, repo] = key.split('-');
            console.log(`\n🔍 Testing key: ${key}`);
            console.log(`   Name: ${name}`);
            console.log(`   Repo: ${repo}`);
            console.log(`   Count: ${count}`);
            
            // Try exact match
            let match = this.playlist.find(song => song.name === name && song.repo === repo);
            console.log(`   Exact match:`, match ? 'YES' : 'NO');
            
            // Try name only match
            if (!match) {
                match = this.playlist.find(song => song.name === name);
                console.log(`   Name-only match:`, match ? 'YES' : 'NO');
            }
            
            // Try fuzzy match
            if (!match) {
                match = this.playlist.find(song => 
                    song.name.toLowerCase().includes(name.toLowerCase()) || 
                    name.toLowerCase().includes(song.name.toLowerCase())
                );
                console.log(`   Fuzzy match:`, match ? 'YES' : 'NO');
            }
            
            if (match) {
                console.log(`   ✅ Matched song:`, match);
            } else {
                console.log(`   ❌ No match found`);
            }
        });
        
        console.log('🔍 === END DEBUG ===');
    }

    testMute() {
        console.log('🔇 Testing toggleMute...');
        this.toggleMute();
        console.log('🔇 Final mute state:', this.isMuted);
        console.log('🔇 Final audio volume:', this.audioPlayer.volume);
        console.log('🔇 Final audio muted property:', this.audioPlayer.muted);
    }


}

// Initialize the music player when the page loads
let musicPlayer;
document.addEventListener('DOMContentLoaded', () => {
    // Show loading screen for exactly 3 seconds
    const loadingScreen = document.getElementById('loadingScreen');
    const mainContent = document.getElementById('mainContent');
    const loadingText = document.getElementById('loadingText');
    
    // Loading messages that change every second
    const loadingMessages = [
        'Initializing player...',
        'Loading music library...',
        'Almost ready...'
    ];
    
    // Update loading message every second
    loadingMessages.forEach((message, index) => {
        setTimeout(() => {
            loadingText.textContent = message;
        }, index * 1000); // Change every 1000ms (1 second)
    });
    
    // Start the loading animation
    setTimeout(() => {
        // Hide loading screen with fade out effect
        loadingScreen.style.transition = 'opacity 0.5s ease-out';
        loadingScreen.style.opacity = '0';
        
        // Show main content
        mainContent.style.display = 'block';
        mainContent.style.opacity = '0';
        mainContent.style.transition = 'opacity 0.5s ease-in';
        
        // Fade in main content
        setTimeout(() => {
            mainContent.style.opacity = '1';
        }, 50);
        
        // Remove loading screen from DOM after fade out
        setTimeout(() => {
            if (loadingScreen.parentNode) {
                loadingScreen.parentNode.removeChild(loadingScreen);
            }
        }, 500);
        
        // Initialize music player after loading screen
        musicPlayer = new MusicPlayer();
        
        // Make debug method available globally for testing
        window.debugTopPlayed = () => musicPlayer.debugTopPlayed();
        window.forceRefreshCards = () => musicPlayer.forceRefreshAllCards();
        window.testMute = () => {
            const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
            const isDesktop = window.innerWidth > 1200 && !isTouchDevice;
            
            if (isDesktop) {
                console.log('💻 Desktop device detected - mute functionality not available');
                console.log('💻 Use volume slider for volume control on desktop');
                return;
            }
            musicPlayer.testMute();
        };
        window.forceMuteButton = () => {
            const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
            const isDesktop = window.innerWidth > 1200 && !isTouchDevice;
            
            if (isDesktop) {
                console.log('💻 Desktop device detected - mute button not available');
                console.log('💻 Use volume slider for volume control on desktop');
                return;
            }
            musicPlayer.forceMuteButtonVisibility();
        };
        
    }, 3000); // Exactly 3 seconds
});

// Hide search results when clicking outside
document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-container')) {
        musicPlayer.hideSearchResults();
    }
});
