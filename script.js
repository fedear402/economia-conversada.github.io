class GitHubAPI {
    constructor() {
        this.owner = 'fedear402'; // Your GitHub username
        this.repo = 'economia-conversada.github.io'; // Your repo name
        this.branch = 'main';
        this.baseUrl = 'https://api.github.com';
        this.fallbackStorage = true; // Use localStorage as fallback
    }

    async getFileContent(path) {
        try {
            const response = await fetch(`${this.baseUrl}/repos/${this.owner}/${this.repo}/contents/${path}?ref=${this.branch}`, {
                headers: {
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            if (response.ok) {
                const data = await response.json();
                return JSON.parse(atob(data.content));
            }
            console.warn(`File ${path} not found or inaccessible (${response.status})`);
            return {};
        } catch (error) {
            console.warn(`Could not load ${path}:`, error);
            return {};
        }
    }

    async updateFile(path, content, message) {
        try {
            // Convert file path to data type for Issues API
            const type = path.replace('.json', '').replace(/_/g, '-');
            console.log(`Saving data via Issues API: ${type}`);
            
            const response = await fetch('/api/github-proxy', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'save',
                    type: type,
                    data: content
                })
            });

            if (response.ok) {
                const result = await response.json();
                console.log(`Successfully saved ${type}:`, result);
                return true;
            } else {
                const error = await response.json();
                console.error(`Failed to save ${type}:`, response.status, error);
                return false;
            }
        } catch (error) {
            console.error(`Failed to save ${type}:`, error);
            return false;
        }
    }

    async getFileContent(path) {
        try {
            // Convert file path to data type for Issues API  
            const type = path.replace('.json', '').replace(/_/g, '-');
            
            const response = await fetch('/api/github-proxy', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'load',
                    type: type
                })
            });

            if (response.ok) {
                const result = await response.json();
                return result.data || {};
            }
            return {};
        } catch (error) {
            console.warn(`Could not load ${path}:`, error);
            return {};
        }
    }
}

class ChapterViewer {
    constructor() {
        try {
            this.bookStructure = null;
            this.currentChapter = null;
            this.currentSection = null;
            this.audioManifestData = {}; // Cache for audio manifest data
            this.characterData = {}; // Cache for character data
            this.githubApi = new GitHubAPI();
            this.deletedFiles = {};
            this.completedFiles = {};
            this.fileComments = {};
            this.notCompletedFiles = {};
            console.log('ChapterViewer constructor completed, starting init...');
            this.init().catch(error => {
                console.error('Init failed:', error);
                this.showError('Initialization failed: ' + error.message);
            });
        } catch (error) {
            console.error('Constructor failed:', error);
            throw error;
        }
    }

    async init() {
        try {
            console.log('Starting init process...');
            
            await this.loadBookStructure();
            console.log('Book structure loaded:', this.bookStructure);
            
            // Load shared data with timeout - don't overwrite if successful
            try {
                await Promise.race([
                    this.loadSharedData(),
                    new Promise((resolve, reject) => setTimeout(() => {
                        reject(new Error('Shared data loading timed out'));
                    }, 5000))
                ]);
            } catch (error) {
                console.warn('Shared data loading failed or timed out, using empty defaults:', error.message);
                // Only set empty defaults if we don't already have data loaded
                if (!this.deletedFiles) this.deletedFiles = {};
                if (!this.completedFiles) this.completedFiles = {};
                if (!this.fileComments) this.fileComments = {};
                if (!this.notCompletedFiles) this.notCompletedFiles = {};
            }
            console.log('Shared data loaded');
            
            await this.renderNavigation();
            console.log('Navigation rendered');
            
            await this.loadAllAudioManifests();
            console.log('Audio manifests loaded');
            
            await this.loadCharacterData();
            console.log('Character data loaded');
            
            console.log('Initialization complete!');
        } catch (error) {
            console.error('Init process failed:', error);
            this.showError('Failed to load application: ' + error.message);
        }
    }

    showError(message) {
        const content = document.getElementById('chapter-content');
        if (content) {
            content.innerHTML = `
                <div class="error" style="padding: 20px; background: #fee; border: 1px solid #fcc; border-radius: 4px; margin: 20px;">
                    <h2 style="color: #c00;">Error</h2>
                    <p>${message}</p>
                    <button onclick="location.reload()" style="padding: 8px 16px; background: #007cba; color: white; border: none; border-radius: 4px; cursor: pointer;">Reload Page</button>
                </div>
            `;
        }
    }

    async loadBookStructure() {
        console.log('Loading book structure...');
        
        try {
            // Try to load the static book structure first
            console.log('Attempting to load book-structure.json...');
            const response = await fetch(`book-structure.json?v=${Date.now()}`);
            console.log('book-structure.json response status:', response.status);
            
            if (response.ok) {
                this.bookStructure = await response.json();
                console.log('Loaded book structure from static file with', this.bookStructure.chapters.length, 'chapters');
                return;
            } else {
                console.log('book-structure.json returned status:', response.status);
            }
        } catch (error) {
            console.log('Failed to load book-structure.json:', error);
        }

        // More detailed fallback for debugging
        console.log('Using fallback structure - this means book-structure.json is not deployed');
        
        // Provide a working fallback with at least some structure
        this.bookStructure = {
            title: "Economía Conversada",
            chapters: [
                {
                    id: 'C1',
                    title: 'I',
                    textFile: 'book1/C1/chapter.txt',
                    audioFile: null,
                    sections: [
                        { id: 'S1', title: '¿Qué es la Economía?', textFile: 'book1/C1/S1/main.txt', audioFile: null, description: 'En los jardines de la Academia, en Atenas, Sócrates y Glaucón pasean bajo la sombra de los olivos mientras conversan sobre la economía.' }
                    ]
                }
            ]
        };
        
        console.log('Fallback structure loaded with', this.bookStructure.chapters.length, 'chapters');
    }
    async loadTitle(_) {
        return null;
    }

    async loadDescription(filePath) {
        try {
            const response = await fetch(filePath);
            if (response.ok) {
                return (await response.text()).trim();
            }
        } catch (error) {
            console.log(`Could not load description from ${filePath}`);
        }
        return null;
    }

    async findAllAudioFiles(folderPath) {
    const manifestPath = `${folderPath}audio_manifest.json`;
    try {
        const resp = await fetch(manifestPath, { cache: 'no-cache' }); // Disable caching
        if (resp.ok) {
            const list = await resp.json();
            console.log(`Loaded manifest ${manifestPath}: ${list.length} files -`, list);
            
            // Filter out deleted files
            const filteredList = list.filter(fn => {
                const filePath = folderPath + fn;
                const isDeleted = this.isFileDeleted(filePath);
                if (isDeleted) {
                    console.log(`Filtering out deleted file: ${filePath}`);
                }
                return !isDeleted;
            });
            
            console.log(`Filtered out ${list.length - filteredList.length} deleted files, showing ${filteredList.length}`);
            
            return filteredList.map(fn => ({
                path: folderPath + fn,
                name: fn,
                displayName: this.formatAudioName(fn)
            }));
        } else {
            console.warn(`Failed to load manifest ${manifestPath}: HTTP ${resp.status}`);
        }
    } catch (error) {
        console.warn(`Error loading manifest ${manifestPath}:`, error);
    }

    console.log(`No manifest found for ${folderPath}, using fallback`);
    return this.guessAudioFiles(folderPath);   // old brute-force (see option 2)
    }  
    formatAudioName(fileName) {
        // Remove extension
        let name = fileName.replace(/\.(mp3|wav|ogg|m4a)$/i, '');
        
        // Format common patterns
        const formatMap = {
            'chapter_summary_beginning': 'Resumen del capítulo (inicio)',
            'chapter_summary_end': 'Resumen del capítulo (final)',
            'section_title': 'Título de sección',
            'location_description': 'Descripción del lugar',
            'dialogue_Glaucón_Sócrates': 'Diálogo: Glaucón y Sócrates',
            'Teofrasto_solo': 'Teofrasto (monólogo)',
            'description': 'Descripción',
            'dialogue': 'Diálogo',
            'narration': 'Narración',
            'summary': 'Resumen',
            'intro': 'Introducción',
            'outro': 'Conclusión',
            // Spanish patterns with hyphens
            '1-escena': '1. Escena',
            '2-conversacion': '2. Conversación',
            '3-dialogo': '3. Diálogo',
            '4-narracion': '4. Narración',
            '5-resumen': '5. Resumen',
            // English patterns with hyphens
            '1-scene': '1. Scene',
            '2-conversation': '2. Conversation',
            '3-dialogue': '3. Dialogue',
            '4-narration': '4. Narration',
            '5-summary': '5. Summary'
        };
        
        if (formatMap[name]) {
            return formatMap[name];
        }
        
        // Replace underscores with spaces and capitalize
        name = name.replace(/_/g, ' ');
        name = name.replace(/\b\w/g, l => l.toUpperCase());
        
        return name;
    }


    async renderNavigation() {
        const nav = document.getElementById('chapter-nav');
        nav.innerHTML = '';
        
        if (!this.bookStructure || !this.bookStructure.chapters) {
            nav.innerHTML = '<p>No se pudo cargar la estructura del libro</p>';
            return;
        }

        const ul = document.createElement('ul');
        ul.className = 'book-navigation';
        
        // Add To-Do item at the top
        const todoLi = document.createElement('li');
        todoLi.className = 'chapter-item';
        
        const todoLink = document.createElement('a');
        todoLink.href = '#';
        todoLink.textContent = 'To-Do';
        todoLink.className = 'chapter-link';
        todoLink.onclick = (e) => {
            e.preventDefault();
            this.loadTodoView();
        };
        
        todoLi.appendChild(todoLink);
        ul.appendChild(todoLi);
        
        // Add Deleted Files item
        const deletedCount = Object.keys(this.deletedFiles).length;
        if (deletedCount > 0) {
            const deletedLi = document.createElement('li');
            deletedLi.className = 'chapter-item';
            
            const deletedLink = document.createElement('a');
            deletedLink.href = '#';
            deletedLink.textContent = `Archivos Eliminados (${deletedCount})`;
            deletedLink.className = 'chapter-link deleted-files-link';
            deletedLink.onclick = (e) => {
                e.preventDefault();
                this.loadDeletedFilesView();
            };
            
            deletedLi.appendChild(deletedLink);
            ul.appendChild(deletedLi);
        }
        
        // Use titles directly from book-structure.json (fast, no HTTP requests)
        this.bookStructure.chapters.forEach(chapter => {
            const chapterLi = document.createElement('li');
            chapterLi.className = 'chapter-item';
            
            const chapterLink = document.createElement('a');
            chapterLink.href = '#';
            chapterLink.textContent = chapter.title; // Use pre-loaded title
            chapterLink.className = 'chapter-link';
            chapterLink.onclick = (e) => {
                e.preventDefault();
                this.loadChapter(chapter);
                this.toggleChapterSections(chapterLi);
            };
            
            chapterLi.appendChild(chapterLink);
            
            if (chapter.sections && chapter.sections.length > 0) {
                const sectionsUl = document.createElement('ul');
                sectionsUl.className = 'sections-list';
                
                chapter.sections.forEach(section => {
                    const sectionLi = document.createElement('li');
                    sectionLi.className = 'section-item';
                    
                    const sectionLink = document.createElement('a');
                    sectionLink.href = '#';
                    sectionLink.textContent = section.title; // Use pre-loaded title
                    sectionLink.className = 'section-link';
                    sectionLink.onclick = (e) => {
                        e.preventDefault();
                        this.loadSection(chapter, section);
                    };
                    
                    sectionLi.appendChild(sectionLink);
                    sectionsUl.appendChild(sectionLi);
                });
                
                chapterLi.appendChild(sectionsUl);
            }
            
            ul.appendChild(chapterLi);
        });
        
        nav.appendChild(ul);
    }

    toggleChapterSections(chapterElement) {
        const sectionsUl = chapterElement.querySelector('.sections-list');
        if (sectionsUl) {
            const isVisible = sectionsUl.style.display !== 'none';
            sectionsUl.style.display = isVisible ? 'none' : 'block';
            
            const chapterLink = chapterElement.querySelector('.chapter-link');
            chapterLink.classList.toggle('expanded', !isVisible);
        }
    }

    async loadChapter(chapter) {
        try {
            // Update active nav item
            document.querySelectorAll('.sidebar nav a').forEach(a => a.classList.remove('active'));
            event.target.classList.add('active');
            
            // Load chapter text
            const response = await fetch(chapter.textFile);
            if (!response.ok) {
                throw new Error(`Could not load ${chapter.textFile}`);
            }
            
            const text = await response.text();
            
            // Load audio files using your audio manifest approach
            const audioFolderPath = `book1/${chapter.id}/`;
            const audioFiles = await this.findAllAudioFiles(audioFolderPath);
            
            // Use the chapter data directly from book-structure.json (no additional loading)
            const enhancedChapter = {
                ...chapter,
                audioFiles: audioFiles
            };
            
            this.renderContent(enhancedChapter, text, 'chapter');
            this.currentChapter = enhancedChapter;
            this.currentSection = null;
        } catch (error) {
            console.error('Error loading chapter:', error);
            this.renderError(chapter, 'chapter');
        }
    }

    async loadSection(chapter, section) {
        try {
            // Update active nav item
            document.querySelectorAll('.sidebar nav a').forEach(a => a.classList.remove('active'));
            event.target.classList.add('active');
            
            // Load section text
            const response = await fetch(section.textFile);
            if (!response.ok) {
                throw new Error(`Could not load ${section.textFile}`);
            }
            
            const text = await response.text();
            
            // Load audio files using your audio manifest approach
            const audioFolderPath = `book1/${chapter.id}/${section.id}/`;
            const audioFiles = await this.findAllAudioFiles(audioFolderPath);
            
            // Use the section data directly from book-structure.json (includes title and description)
            const enhancedSection = {
                ...section,
                audioFiles: audioFiles
            };
            
            this.renderContent(enhancedSection, text, 'section', chapter);
            this.currentChapter = chapter;
            this.currentSection = enhancedSection;
        } catch (error) {
            console.error('Error loading section:', error);
            this.renderError(section, 'section', chapter);
        }
    }

    renderContent(item, text, type = 'chapter', parentChapter = null) {
        const content = document.getElementById('chapter-content');
        const contentContainer = content.parentElement; // .content element
        
        // Remove todo-view class when loading regular content
        contentContainer.classList.remove('todo-view');
        
        const header = document.createElement('div');
        header.className = `${type}-header`;
        
        // Add hide button in header
        const toggleBtn = document.createElement('button');
        toggleBtn.innerHTML = 'HIDE';
        toggleBtn.title = 'Hide Header';
        toggleBtn.style.cssText = `
            position: absolute;
            top: 10px;
            right: 10px;
            padding: 4px 8px;
            border: 1px solid #ccc;
            background: #f9f9f9;
            border-radius: 3px;
            cursor: pointer;
            font-size: 11px;
            font-weight: bold;
            color: #666;
            z-index: 101;
        `;
        
        let headerVisible = true;
        toggleBtn.onclick = () => {
            if (headerVisible) {
                // Hide everything except title and button - create floating minimal header
                const breadcrumb = header.querySelector('.breadcrumb');
                const description = header.querySelector('.section-description');
                const audioSection = header.querySelector('.audio-section');
                
                if (breadcrumb) breadcrumb.style.display = 'none';
                if (description) description.style.display = 'none';
                if (audioSection) audioSection.style.display = 'none';
                
                // Make header compact
                header.style.padding = '10px 20px';
                toggleBtn.innerHTML = 'SHOW';
                toggleBtn.title = 'Show Header';
            } else {
                // Show all elements again
                const breadcrumb = header.querySelector('.breadcrumb');
                const description = header.querySelector('.section-description');
                const audioSection = header.querySelector('.audio-section');
                
                if (breadcrumb) breadcrumb.style.display = 'block';
                if (description) description.style.display = 'block';
                if (audioSection) audioSection.style.display = 'block';
                
                // Restore original padding
                header.style.padding = '20px';
                toggleBtn.innerHTML = 'HIDE';
                toggleBtn.title = 'Hide Header';
            }
            headerVisible = !headerVisible;
            
            // Recalculate padding to maintain same spacing
            setTimeout(() => this.adjustContentPadding(), 50);
        };
        
        header.appendChild(toggleBtn);
        
        // Add breadcrumb for sections
        if (type === 'section' && parentChapter) {
            const breadcrumb = document.createElement('div');
            breadcrumb.className = 'breadcrumb';
            breadcrumb.innerHTML = `<a href="#" onclick="event.preventDefault(); return false;" class="breadcrumb-link">${parentChapter.title}</a> > ${item.title}`;
            header.appendChild(breadcrumb);
        }
        
        const title = document.createElement('h1');
        title.className = `${type}-title`;
        title.textContent = item.title;
        header.appendChild(title);
        
        // Add description for sections
        if (type === 'section' && item.description) {
            const description = document.createElement('div');
            description.className = 'section-description';
            description.textContent = item.description;
            header.appendChild(description);
        }
        
        // Check if audio files exist and add players
        if (item.audioFiles && item.audioFiles.length > 0) {
            const audioSection = document.createElement('div');
            audioSection.className = 'audio-section';
            
            item.audioFiles.forEach((audioFile, index) => {
                const audioPlayerContainer = document.createElement('div');
                audioPlayerContainer.className = 'audio-player-container';
                
                // Add audio file label with delete and completion controls
                const audioLabelContainer = document.createElement('div');
                audioLabelContainer.style.display = 'flex';
                audioLabelContainer.style.alignItems = 'center';
                audioLabelContainer.style.marginBottom = '8px';
                audioLabelContainer.style.gap = '12px';
                
                // Add delete button (far left)
                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'audio-delete-btn';
                deleteBtn.innerHTML = '×';
                deleteBtn.title = `Eliminar ${audioFile.name}`;
                deleteBtn.style.backgroundColor = '#e74c3c';
                deleteBtn.style.color = 'white';
                deleteBtn.style.border = 'none';
                deleteBtn.style.borderRadius = '50%';
                deleteBtn.style.width = '24px';
                deleteBtn.style.height = '24px';
                deleteBtn.style.fontSize = '16px';
                deleteBtn.style.cursor = 'pointer';
                deleteBtn.style.display = 'flex';
                deleteBtn.style.alignItems = 'center';
                deleteBtn.style.justifyContent = 'center';
                deleteBtn.style.transition = 'all 0.2s ease';
                deleteBtn.style.flexShrink = '0';
                deleteBtn.onmouseover = () => {
                    deleteBtn.style.backgroundColor = '#c0392b';
                    deleteBtn.style.transform = 'scale(1.1)';
                };
                deleteBtn.onmouseout = () => {
                    deleteBtn.style.backgroundColor = '#e74c3c';
                    deleteBtn.style.transform = 'scale(1)';
                };
                deleteBtn.onclick = (e) => {
                    e.preventDefault();
                    this.confirmDeleteAudioFromSection(audioFile, audioPlayerContainer, type, parentChapter);
                };
                
                // Add audio label (center, takes remaining space)
                const audioLabel = document.createElement('div');
                audioLabel.className = 'audio-label';
                audioLabel.textContent = audioFile.displayName;
                audioLabel.style.flex = '1';
                
                // Check if file is completed and set appropriate colors
                const isCompleted = this.isFileCompleted(audioFile.path);
                const isNotCompleted = this.isFileNotCompleted && this.isFileNotCompleted(audioFile.path);
                
                if (isCompleted) {
                    audioLabel.style.color = '#00C851';
                    audioLabel.style.fontWeight = 'bold';
                } else if (isNotCompleted) {
                    audioLabel.style.color = '#CC0000';
                    audioLabel.style.fontWeight = 'bold';
                }
                
                // Add completion controls (far right)
                const completionContainer = document.createElement('div');
                completionContainer.style.display = 'flex';
                completionContainer.style.flexDirection = 'column';
                completionContainer.style.alignItems = 'flex-end';
                completionContainer.style.gap = '2px';
                completionContainer.style.flexShrink = '0';
                
                const okLabel = document.createElement('span');
                okLabel.textContent = 'OK';
                okLabel.style.fontSize = '12px';
                okLabel.style.cursor = 'pointer';
                okLabel.style.padding = '2px 4px';
                okLabel.style.borderRadius = '3px';
                okLabel.style.transition = 'all 0.2s ease';
                
                const notOkLabel = document.createElement('span');
                notOkLabel.textContent = 'NOT OK';
                notOkLabel.style.fontSize = '12px';
                notOkLabel.style.cursor = 'pointer';
                notOkLabel.style.padding = '2px 4px';
                notOkLabel.style.borderRadius = '3px';
                notOkLabel.style.transition = 'all 0.2s ease';
                
                // Set initial styles based on current state
                if (isCompleted) {
                    okLabel.style.backgroundColor = '#00C851';
                    okLabel.style.color = 'white';
                    okLabel.style.fontWeight = 'bold';
                    notOkLabel.style.color = '#666';
                    notOkLabel.style.backgroundColor = 'transparent';
                } else if (isNotCompleted) {
                    notOkLabel.style.backgroundColor = '#CC0000';
                    notOkLabel.style.color = 'white';
                    notOkLabel.style.fontWeight = 'bold';
                    okLabel.style.color = '#666';
                    okLabel.style.backgroundColor = 'transparent';
                } else {
                    okLabel.style.color = '#666';
                    okLabel.style.backgroundColor = 'transparent';
                    notOkLabel.style.color = '#666';
                    notOkLabel.style.backgroundColor = 'transparent';
                }
                
                // Handle OK click
                okLabel.onclick = async () => {
                    await this.markFileAsCompleted(audioFile.path, audioFile.name, true);
                    if (this.markFileAsNotCompleted) {
                        await this.markFileAsNotCompleted(audioFile.path, audioFile.name, false);
                    }
                    
                    // Update visual feedback
                    audioLabel.style.color = '#00C851';
                    audioLabel.style.fontWeight = 'bold';
                    okLabel.style.backgroundColor = '#00C851';
                    okLabel.style.color = 'white';
                    okLabel.style.fontWeight = 'bold';
                    notOkLabel.style.backgroundColor = 'transparent';
                    notOkLabel.style.color = '#666';
                    notOkLabel.style.fontWeight = 'normal';
                    
                    if (document.querySelector('.todo-content-view')) {
                        this.updateTodoCompletionStyles();
                    }
                };
                
                // Handle NOT OK click
                notOkLabel.onclick = () => {
                    this.showCommentModal(audioFile.path, audioFile.name, async (comment) => {
                        await this.markFileAsCompleted(audioFile.path, audioFile.name, false);
                        if (!this.markFileAsNotCompleted) {
                            // Initialize not completed functionality if it doesn't exist
                            this.notCompletedFiles = this.notCompletedFiles || {};
                            this.markFileAsNotCompleted = async (filePath, fileName, isNotCompleted) => {
                                if (isNotCompleted) {
                                    this.notCompletedFiles[filePath] = {
                                        not_completed_at: new Date().toISOString(),
                                        name: fileName
                                    };
                                } else {
                                    delete this.notCompletedFiles[filePath];
                                }
                                try {
                                    await this.saveNotCompletedFiles();
                                } catch (error) {
                                    console.warn('Could not save not completed files:', error);
                                }
                            };
                            this.isFileNotCompleted = (filePath) => {
                                return this.notCompletedFiles && this.notCompletedFiles.hasOwnProperty(filePath);
                            };
                            // Not completed files are loaded in loadSharedData()
                        }
                        await this.markFileAsNotCompleted(audioFile.path, audioFile.name, true);
                        
                        // Add comment if provided
                        if (comment && comment.trim()) {
                            await this.addFileComment(audioFile.path, audioFile.name, comment.trim());
                        }
                        
                        // Update visual feedback
                        audioLabel.style.color = '#CC0000';
                        audioLabel.style.fontWeight = 'bold';
                        notOkLabel.style.backgroundColor = '#CC0000';
                        notOkLabel.style.color = 'white';
                        notOkLabel.style.fontWeight = 'bold';
                        okLabel.style.backgroundColor = 'transparent';
                        okLabel.style.color = '#666';
                        okLabel.style.fontWeight = 'normal';
                        
                        // Update comments display if it exists
                        this.updateCommentsDisplay(audioFile.path, audioPlayerContainer);
                        
                        if (document.querySelector('.todo-content-view')) {
                            this.updateTodoCompletionStyles();
                        }
                    });
                };
                
                completionContainer.appendChild(okLabel);
                completionContainer.appendChild(notOkLabel);
                
                audioLabelContainer.appendChild(deleteBtn);
                audioLabelContainer.appendChild(audioLabel);
                audioLabelContainer.appendChild(completionContainer);
                audioPlayerContainer.appendChild(audioLabelContainer);
                
                // Add comments display if file has comments
                this.addCommentsDisplay(audioFile.path, audioPlayerContainer);
                
                // Create audio player
                const audio = document.createElement('audio');
                audio.controls = true;
                audio.preload = 'metadata';
                audio.src = audioFile.path;
                
                // Add source with correct type
                const source = document.createElement('source');
                source.src = audioFile.path;
                
                if (audioFile.path.toLowerCase().endsWith('.mp3')) {
                    source.type = 'audio/mpeg';
                } else if (audioFile.path.toLowerCase().endsWith('.wav')) {
                    source.type = 'audio/wav';
                } else if (audioFile.path.toLowerCase().endsWith('.ogg')) {
                    source.type = 'audio/ogg';
                } else if (audioFile.path.toLowerCase().endsWith('.m4a')) {
                    source.type = 'audio/mp4';
                }
                
                audio.appendChild(source);
                
                // Better error handling
                audio.onerror = (e) => {
                    console.warn(`Audio file not found or cannot be loaded: ${audioFile.path}`);
                    audioPlayerContainer.innerHTML = `
                        <div class="audio-label">${audioFile.displayName}</div>
                        <p style="color: #666; font-style: italic; margin: 5px 0; font-size: 0.9em;">Audio no disponible</p>
                    `;
                };
                
                audio.onloadstart = () => {
                    console.log(`Loading audio: ${audioFile.path}`);
                };
                
                audio.oncanplay = () => {
                    console.log(`Audio ready to play: ${audioFile.path}`);
                };
                
                audioPlayerContainer.appendChild(audio);
                audioSection.appendChild(audioPlayerContainer);
            });
            
            header.appendChild(audioSection);
        }
        
        const textDiv = document.createElement('div');
        textDiv.className = `${type}-text`;
        
        // Split text into paragraphs and handle line breaks
        const paragraphs = text.split('\n\n').filter(p => p.trim());
        paragraphs.forEach(paragraph => {
            const p = document.createElement('p');
            // Replace single line breaks with <br> tags and preserve paragraph structure
            const lines = paragraph.trim().split('\n');
            lines.forEach((line, index) => {
                if (index > 0) {
                    p.appendChild(document.createElement('br'));
                }
                p.appendChild(document.createTextNode(line));
            });
            textDiv.appendChild(p);
        });
        
        content.innerHTML = '';
        content.appendChild(header);
        content.appendChild(textDiv);
        
        // Dynamically adjust content padding based on header height
        this.adjustContentPadding();
    }
    
    adjustContentPadding() {
        // Wait for next frame to ensure DOM is updated
        requestAnimationFrame(() => {
            const header = document.querySelector('.chapter-header, .section-header');
            const content = document.getElementById('chapter-content');
            
            if (header && content) {
                // Check if we're on mobile (window width <= 768px)
                const isMobile = window.innerWidth <= 768;
                
                if (isMobile) {
                    // On mobile, header is not fixed, so use minimal padding
                    content.style.paddingTop = '40px';
                    console.log('Mobile layout: Using base padding of 40px');
                } else {
                    // On desktop, header is fixed, so calculate dynamic padding
                    const headerHeight = header.offsetHeight;
                    const baseOffset = 20; // Small buffer space
                    const totalPadding = headerHeight + baseOffset;
                    
                    content.style.paddingTop = `${totalPadding}px`;
                    console.log(`Desktop layout: Adjusted content padding to ${totalPadding}px (header: ${headerHeight}px + buffer: ${baseOffset}px)`);
                }
            }
        });
    }

    // To-Do content view functionality
    async loadTodoView() {
        try {
            // Update active nav item
            document.querySelectorAll('.sidebar nav a').forEach(a => a.classList.remove('active'));
            event.target.classList.add('active');
            
            await this.renderTodoContent();
            this.currentChapter = null;
            this.currentSection = null;
        } catch (error) {
            console.error('Error loading To-Do view:', error);
            this.renderTodoError();
        }
    }

    async renderTodoContent() {
        const content = document.getElementById('chapter-content');
        const contentContainer = content.parentElement; // .content element
        
        
        // Add class to make content wider
        contentContainer.classList.add('todo-view');
        
        const todoView = document.createElement('div');
        todoView.className = 'todo-content-view';
        
        const title = document.createElement('h1');
        title.className = 'todo-title-main';
        title.textContent = 'To-Do: Archivos de Audio';
        todoView.appendChild(title);
        
        const description = document.createElement('div');
        description.className = 'todo-description';
        description.innerHTML = `
            <p>Esta tabla muestra todos los archivos de audio y personajes organizados por sección y capítulo. 
            Cada celda contiene los nombres de los archivos de audio (azul, clickeables) y los personajes (amarillo) en esa sección.</p>
            <p><strong>Filas:</strong> Secciones (S1, S2, S3, etc.) | <strong>Columnas:</strong> Capítulos (I, II, III, etc.)</p>
            <button onclick="location.reload(true);" style="margin-top: 10px; padding: 5px 10px; background: #3498db; color: white; border: none; border-radius: 3px; cursor: pointer; margin-right: 10px;">Recargar página</button>
            <button onclick="window.chapterViewer && window.chapterViewer.forceRefreshTodo();" style="margin-top: 10px; padding: 5px 10px; background: #e74c3c; color: white; border: none; border-radius: 3px; cursor: pointer;">Recargar solo tabla</button>
        `;
        todoView.appendChild(description);
        
        const tableContainer = document.createElement('div');
        tableContainer.className = 'todo-table-container';
        
        // Add loading message
        const loadingMsg = document.createElement('div');
        loadingMsg.style.textAlign = 'center';
        loadingMsg.style.padding = '20px';
        loadingMsg.style.color = '#666';
        loadingMsg.textContent = 'Cargando archivos de audio...';
        tableContainer.appendChild(loadingMsg);
        
        todoView.appendChild(tableContainer);
        
        content.innerHTML = '';
        content.appendChild(todoView);
        
        // Reset padding for todo view (no fixed header)
        content.style.paddingTop = '20px';
        
        // Ensure audio manifests are loaded before populating table
        if (Object.keys(this.audioManifestData).length === 0) {
            console.log('Audio manifest data not loaded, loading now...');
            await this.loadAllAudioManifests();
        }
        
        // Create and populate the table
        const table = document.createElement('table');
        table.className = 'audio-todo-table';
        
        // Create table structure
        const thead = document.createElement('thead');
        const tbody = document.createElement('tbody');
        
        const headerRow = document.createElement('tr');
        const sectionHeaderCell = document.createElement('th');
        sectionHeaderCell.className = 'section-header-cell';
        sectionHeaderCell.textContent = 'Sección';
        headerRow.appendChild(sectionHeaderCell);
        
        thead.appendChild(headerRow);
        table.appendChild(thead);
        table.appendChild(tbody);
        
        // Replace loading message with table
        tableContainer.innerHTML = '';
        tableContainer.appendChild(table);
        
        // Populate the table with data
        this.populateTodoTable(table);
    }

    populateTodoTable(table) {
        const thead = table.querySelector('thead tr');
        const tbody = table.querySelector('tbody');
        
        if (!this.bookStructure) {
            tbody.innerHTML = '<tr><td colspan="100%">No se pudo cargar la estructura del libro</td></tr>';
            return;
        }

        console.log('Populating To-Do table with audio manifest data:', this.audioManifestData);
        console.log('Book structure chapters:', this.bookStructure.chapters.length);

        // Add chapter headers
        this.bookStructure.chapters.forEach(chapter => {
            const th = document.createElement('th');
            th.textContent = chapter.title;
            th.title = `Capítulo ${chapter.title}`;
            thead.appendChild(th);
        });

        // Find the maximum number of sections across all chapters
        const maxSections = Math.max(...this.bookStructure.chapters.map(ch => 
            ch.sections ? ch.sections.length : 0
        ));

        // Create rows for each section number
        for (let i = 1; i <= maxSections; i++) {
            const row = document.createElement('tr');
            
            // Section name cell
            const sectionCell = document.createElement('td');
            sectionCell.className = 'section-name-cell';
            sectionCell.textContent = `S${i}`;
            sectionCell.title = `Sección ${i}`;
            row.appendChild(sectionCell);

            // Create cells for each chapter
            this.bookStructure.chapters.forEach(chapter => {
                const cell = document.createElement('td');
                cell.className = 'audio-files-cell';
                
                // Check if this chapter has this section
                const section = chapter.sections && chapter.sections.find(s => s.id === `S${i}`);
                
                if (section) {
                    const audioFiles = this.audioManifestData[`${chapter.id}-S${i}`] || [];
                    const characterKey = `${chapter.id}/S${i}`;
                    const characters = this.characterData[characterKey] || [];
                    
                    console.log(`${chapter.id}-S${i}: Found ${audioFiles.length} audio files and ${characters.length} characters:`, audioFiles, characters);
                    
                    // Add audio files
                    if (audioFiles.length > 0) {
                        audioFiles.forEach(fileName => {
                            const fileSpan = document.createElement('span');
                            fileSpan.className = 'audio-file-item';
                            
                            // Create filename span
                            const fileNameSpan = document.createElement('span');
                            fileNameSpan.className = 'audio-file-name';
                            fileNameSpan.textContent = fileName;
                            fileNameSpan.title = `Haz clic para ir a ${section.title} - ${fileName}`;
                            
                            // Check if file is completed/not completed and apply styling
                            const filePath = `book1/${chapter.id}/${section.id}/${fileName}`;
                            const isCompleted = this.isFileCompleted(filePath);
                            const isNotCompleted = this.isFileNotCompleted && this.isFileNotCompleted(filePath);
                            
                            if (isCompleted) {
                                fileNameSpan.style.color = '#00C851';
                                fileNameSpan.style.fontWeight = 'bold';
                            } else if (isNotCompleted) {
                                fileNameSpan.style.color = '#CC0000';
                                fileNameSpan.style.fontWeight = 'bold';
                            }
                            
                            // Add click handler to navigate to the section
                            fileNameSpan.onclick = (e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                this.navigateToSectionFromTodo(chapter, section);
                            };
                            
                            // Create delete button
                            const deleteBtn = document.createElement('button');
                            deleteBtn.className = 'audio-delete-btn';
                            deleteBtn.innerHTML = '×';
                            deleteBtn.title = `Eliminar ${fileName}`;
                            deleteBtn.onclick = (e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                this.confirmDeleteAudio(chapter, section, fileName, fileSpan);
                            };
                            
                            fileSpan.appendChild(fileNameSpan);
                            fileSpan.appendChild(deleteBtn);
                            cell.appendChild(fileSpan);
                        });
                    }
                    
                    // Add character information
                    if (characters.length > 0) {
                        const charactersDiv = document.createElement('div');
                        charactersDiv.className = 'character-names';
                        
                        const label = document.createElement('span');
                        label.className = 'character-label';
                        label.textContent = 'Personajes:';
                        charactersDiv.appendChild(label);
                        
                        characters.forEach(character => {
                            const characterSpan = document.createElement('span');
                            characterSpan.className = 'character-item';
                            characterSpan.textContent = character;
                            characterSpan.title = `Personaje en ${section.title}`;
                            charactersDiv.appendChild(characterSpan);
                        });
                        
                        cell.appendChild(charactersDiv);
                    }
                    
                    // Handle empty cells
                    if (audioFiles.length === 0 && characters.length === 0) {
                        cell.textContent = '—';
                        cell.className += ' empty';
                        cell.title = 'No hay archivos de audio ni personajes';
                    }
                } else {
                    // Section doesn't exist for this chapter
                    cell.textContent = '—';
                    cell.className += ' empty';
                    cell.title = 'Sección no existe';
                }
                
                row.appendChild(cell);
            });

            tbody.appendChild(row);
        }

        // Add summary info
        const totalAudioFiles = Object.values(this.audioManifestData).reduce((sum, files) => sum + files.length, 0);
        const totalCharacterSections = Object.keys(this.characterData).length;
        const totalCompletedFiles = Object.keys(this.completedFiles).length;
        const statusDiv = document.createElement('div');
        statusDiv.style.textAlign = 'center';
        statusDiv.style.padding = '10px';
        statusDiv.style.color = '#666';
        statusDiv.style.fontSize = '0.9em';
        statusDiv.innerHTML = `Total: ${totalAudioFiles} archivos de audio | ${totalCompletedFiles} completados | ${totalCharacterSections} secciones con personajes | ${maxSections} secciones en ${this.bookStructure.chapters.length} capítulos`;
        
        // Insert after table
        table.parentElement.appendChild(statusDiv);

        console.log(`To-Do table rendered with ${maxSections} section rows and ${this.bookStructure.chapters.length} chapter columns`);
        console.log(`Total audio files loaded: ${totalAudioFiles}`);
        console.log(`Total character sections loaded: ${totalCharacterSections}`);
    }

    updateTodoCompletionStyles() {
        // Update completion styles in the To-Do table
        const audioFileNames = document.querySelectorAll('.audio-file-name');
        audioFileNames.forEach(fileNameSpan => {
            const fileName = fileNameSpan.textContent;
            // Find the file path by looking at parent structure
            const cell = fileNameSpan.closest('td');
            const row = cell.parentElement;
            const sectionCell = row.querySelector('.section-name-cell');
            const sectionNumber = sectionCell.textContent; // e.g., "S1"
            
            // Get chapter from column position
            const cellIndex = Array.from(row.children).indexOf(cell);
            const headerRow = document.querySelector('.audio-todo-table thead tr');
            const chapterHeaders = Array.from(headerRow.children).slice(1); // Skip first column
            const chapterTitle = chapterHeaders[cellIndex - 1]?.textContent;
            
            // Find chapter ID from title
            const chapter = this.bookStructure.chapters.find(ch => ch.title === chapterTitle);
            if (chapter) {
                const filePath = `book1/${chapter.id}/${sectionNumber}/${fileName}`;
                const isCompleted = this.isFileCompleted(filePath);
                const isNotCompleted = this.isFileNotCompleted && this.isFileNotCompleted(filePath);
                
                if (isCompleted) {
                    fileNameSpan.style.color = '#00C851';
                    fileNameSpan.style.fontWeight = 'bold';
                } else if (isNotCompleted) {
                    fileNameSpan.style.color = '#CC0000';
                    fileNameSpan.style.fontWeight = 'bold';
                } else {
                    fileNameSpan.style.color = '';
                    fileNameSpan.style.fontWeight = '';
                }
            }
        });
    }

    async forceRefreshTodo() {
        console.log('Force refreshing To-Do table...');
        
        // Clear cached data
        this.audioManifestData = {};
        this.characterData = {};
        
        // Reload all data
        await this.loadAllAudioManifests();
        await this.loadCharacterData();
        
        // Re-render the To-Do view
        await this.renderTodoContent();
    }

    navigateToSectionFromTodo(chapter, section) {
        console.log(`Navigating from To-Do to ${chapter.id}-${section.id}: ${section.title}`);
        
        // Update active nav item - remove active from To-Do and add to the section
        document.querySelectorAll('.sidebar nav a').forEach(a => a.classList.remove('active'));
        
        // Find and activate the corresponding section link in the sidebar
        const sectionLinks = document.querySelectorAll('.section-link');
        sectionLinks.forEach(link => {
            if (link.textContent.trim() === section.title) {
                link.classList.add('active');
                // Also expand the chapter if it's collapsed
                const chapterItem = link.closest('.chapter-item');
                const sectionsUl = chapterItem.querySelector('.sections-list');
                const chapterLink = chapterItem.querySelector('.chapter-link');
                if (sectionsUl) {
                    sectionsUl.style.display = 'block';
                    chapterLink.classList.add('expanded');
                }
            }
        });
        
        // Load the section content
        this.loadSection(chapter, section);
    }

    async confirmDeleteAudio(chapter, section, fileName, fileElement) {
        const confirmMessage = `¿Estás seguro de que quieres eliminar el archivo de audio "${fileName}"?\n\nEsta acción no se puede deshacer.`;
        
        if (confirm(confirmMessage)) {
            await this.deleteAudioFile(chapter, section, fileName, fileElement);
        }
    }

    async confirmDeleteAudioFromSection(audioFile, containerElement, type, parentChapter) {
        const confirmMessage = `¿Estás seguro de que quieres eliminar el archivo de audio "${audioFile.name}"?\n\nEsta acción no se puede deshacer.`;
        
        if (confirm(confirmMessage)) {
            await this.deleteAudioFileFromSection(audioFile, containerElement, type, parentChapter);
        }
    }

    async saveCompletedFiles() {
        try {
            const success = await this.githubApi.updateFile('completed_files.json', this.completedFiles, 'Update completed files');
            if (!success) {
                console.error('Failed to save completed files to GitHub - data not shared!');
            }
        } catch (error) {
            console.error('Could not save completed files to GitHub:', error);
        }
    }

    async saveFileComments() {
        try {
            const success = await this.githubApi.updateFile('file_comments.json', this.fileComments, 'Update file comments');
            if (!success) {
                console.error('Failed to save file comments to GitHub - data not shared!');
            }
        } catch (error) {
            console.error('Could not save file comments to GitHub:', error);
        }
    }

    async saveNotCompletedFiles() {
        try {
            const success = await this.githubApi.updateFile('not_completed_files.json', this.notCompletedFiles, 'Update not completed files');
            if (!success) {
                console.error('Failed to save not completed files to GitHub - data not shared!');
            }
        } catch (error) {
            console.error('Could not save not completed files to GitHub:', error);
        }
    }

    async addFileComment(filePath, fileName, comment) {
        if (!this.fileComments[filePath]) {
            this.fileComments[filePath] = [];
        }
        this.fileComments[filePath].push({
            comment: comment,
            timestamp: new Date().toISOString(),
            fileName: fileName
        });
        await this.saveFileComments();
    }

    getFileComments(filePath) {
        return this.fileComments[filePath] || [];
    }

    showCommentModal(filePath, fileName, callback) {
        // Create modal overlay
        const modalOverlay = document.createElement('div');
        modalOverlay.style.position = 'fixed';
        modalOverlay.style.top = '0';
        modalOverlay.style.left = '0';
        modalOverlay.style.width = '100%';
        modalOverlay.style.height = '100%';
        modalOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        modalOverlay.style.zIndex = '10000';
        modalOverlay.style.display = 'flex';
        modalOverlay.style.alignItems = 'center';
        modalOverlay.style.justifyContent = 'center';
        
        // Create modal content
        const modal = document.createElement('div');
        modal.style.backgroundColor = 'white';
        modal.style.padding = '30px';
        modal.style.borderRadius = '8px';
        modal.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.3)';
        modal.style.maxWidth = '500px';
        modal.style.width = '90%';
        modal.style.maxHeight = '80vh';
        modal.style.overflow = 'auto';
        
        // Create modal title
        const title = document.createElement('h3');
        title.textContent = `Comentario para: ${fileName}`;
        title.style.marginBottom = '20px';
        title.style.color = '#333';
        
        // Create textarea
        const textarea = document.createElement('textarea');
        textarea.placeholder = 'Escribe tu comentario sobre por qué no está OK...';
        textarea.style.width = '100%';
        textarea.style.height = '120px';
        textarea.style.padding = '10px';
        textarea.style.border = '1px solid #ddd';
        textarea.style.borderRadius = '4px';
        textarea.style.fontSize = '14px';
        textarea.style.fontFamily = 'inherit';
        textarea.style.resize = 'vertical';
        textarea.style.marginBottom = '20px';
        
        // Create buttons container
        const buttonsContainer = document.createElement('div');
        buttonsContainer.style.display = 'flex';
        buttonsContainer.style.gap = '10px';
        buttonsContainer.style.justifyContent = 'flex-end';
        
        // Create submit button
        const submitBtn = document.createElement('button');
        submitBtn.textContent = 'Enviar';
        submitBtn.style.backgroundColor = '#CC0000';
        submitBtn.style.color = 'white';
        submitBtn.style.border = 'none';
        submitBtn.style.padding = '10px 20px';
        submitBtn.style.borderRadius = '4px';
        submitBtn.style.cursor = 'pointer';
        submitBtn.style.fontSize = '14px';
        
        // Create cancel button
        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = 'Cancelar';
        cancelBtn.style.backgroundColor = '#666';
        cancelBtn.style.color = 'white';
        cancelBtn.style.border = 'none';
        cancelBtn.style.padding = '10px 20px';
        cancelBtn.style.borderRadius = '4px';
        cancelBtn.style.cursor = 'pointer';
        cancelBtn.style.fontSize = '14px';
        
        // Add event listeners
        submitBtn.onclick = () => {
            const comment = textarea.value.trim();
            document.body.removeChild(modalOverlay);
            callback(comment);
        };
        
        cancelBtn.onclick = () => {
            document.body.removeChild(modalOverlay);
        };
        
        // Close on overlay click
        modalOverlay.onclick = (e) => {
            if (e.target === modalOverlay) {
                document.body.removeChild(modalOverlay);
            }
        };
        
        // Close on escape key
        const escapeHandler = (e) => {
            if (e.key === 'Escape') {
                document.body.removeChild(modalOverlay);
                document.removeEventListener('keydown', escapeHandler);
            }
        };
        document.addEventListener('keydown', escapeHandler);
        
        // Assemble modal
        buttonsContainer.appendChild(cancelBtn);
        buttonsContainer.appendChild(submitBtn);
        modal.appendChild(title);
        modal.appendChild(textarea);
        modal.appendChild(buttonsContainer);
        modalOverlay.appendChild(modal);
        
        // Add to DOM and focus textarea
        document.body.appendChild(modalOverlay);
        textarea.focus();
    }

    addCommentsDisplay(filePath, containerElement) {
        const comments = this.getFileComments(filePath);
        if (comments.length === 0) return;
        
        // Create comments toggle button
        const commentsToggle = document.createElement('div');
        commentsToggle.style.marginTop = '8px';
        commentsToggle.style.cursor = 'pointer';
        commentsToggle.style.color = '#666';
        commentsToggle.style.fontSize = '12px';
        commentsToggle.style.textDecoration = 'underline';
        commentsToggle.textContent = `Comentarios (${comments.length})`;
        
        // Create comments container (initially hidden)
        const commentsContainer = document.createElement('div');
        commentsContainer.style.display = 'none';
        commentsContainer.style.marginTop = '10px';
        commentsContainer.style.padding = '10px';
        commentsContainer.style.backgroundColor = '#f9f9f9';
        commentsContainer.style.borderRadius = '4px';
        commentsContainer.style.border = '1px solid #eee';
        commentsContainer.className = 'comments-container';
        
        // Populate comments
        this.populateCommentsContainer(commentsContainer, comments);
        
        // Toggle functionality
        let isExpanded = false;
        commentsToggle.onclick = () => {
            isExpanded = !isExpanded;
            commentsContainer.style.display = isExpanded ? 'block' : 'none';
            commentsToggle.textContent = `Comentarios (${comments.length}) ${isExpanded ? '▼' : '▶'}`;
        };
        
        containerElement.appendChild(commentsToggle);
        containerElement.appendChild(commentsContainer);
    }

    populateCommentsContainer(container, comments) {
        container.innerHTML = '';
        
        comments.forEach((commentData, index) => {
            const commentDiv = document.createElement('div');
            commentDiv.style.marginBottom = index < comments.length - 1 ? '10px' : '0';
            commentDiv.style.paddingBottom = index < comments.length - 1 ? '10px' : '0';
            commentDiv.style.borderBottom = index < comments.length - 1 ? '1px solid #ddd' : 'none';
            
            const commentText = document.createElement('div');
            commentText.textContent = commentData.comment;
            commentText.style.fontSize = '13px';
            commentText.style.lineHeight = '1.4';
            commentText.style.marginBottom = '4px';
            
            const commentMeta = document.createElement('div');
            const date = new Date(commentData.timestamp);
            commentMeta.textContent = date.toLocaleString();
            commentMeta.style.fontSize = '11px';
            commentMeta.style.color = '#888';
            
            commentDiv.appendChild(commentText);
            commentDiv.appendChild(commentMeta);
            container.appendChild(commentDiv);
        });
    }

    updateCommentsDisplay(filePath, containerElement) {
        // Remove existing comments display
        const existingToggle = containerElement.querySelector('div:last-child');
        const existingContainer = containerElement.querySelector('.comments-container');
        
        if (existingToggle && existingToggle.textContent.includes('Comentarios')) {
            existingToggle.remove();
        }
        if (existingContainer) {
            existingContainer.remove();
        }
        
        // Add updated comments display
        this.addCommentsDisplay(filePath, containerElement);
    }

    async saveDeletedFiles() {
        try {
            const success = await this.githubApi.updateFile('deleted_files_history.json', this.deletedFiles, 'Update deleted files');
            if (!success) {
                console.error('Failed to save deleted files to GitHub - data not shared!');
            }
        } catch (error) {
            console.error('Could not save deleted files to GitHub:', error);
        }
    }

    async markFileAsDeleted(filePath, fileName) {
        const timestamp = new Date().toISOString();
        
        // Store locally for immediate hiding
        this.deletedFiles[filePath] = {
            deleted_at: timestamp,
            reason: 'user_deleted',
            name: fileName
        };
        await this.saveDeletedFiles();
        
        console.log(`Marked file as deleted: ${fileName} (stored locally)`);
    }

    isFileDeleted(filePath) {
        const isDeleted = this.deletedFiles.hasOwnProperty(filePath);
        if (filePath.includes('C1S7-main_1-compressed.mp3')) {
            console.log(`Checking if deleted: ${filePath} -> ${isDeleted}`, {
                deletedFilesKeys: Object.keys(this.deletedFiles),
                deletedFiles: this.deletedFiles
            });
        }
        return isDeleted;
    }

    async markFileAsCompleted(filePath, fileName, isCompleted) {
        if (isCompleted) {
            this.completedFiles[filePath] = {
                completed_at: new Date().toISOString(),
                name: fileName
            };
        } else {
            delete this.completedFiles[filePath];
        }
        await this.saveCompletedFiles();
        console.log(`Marked file as ${isCompleted ? 'completed' : 'not completed'}: ${fileName}`);
    }

    isFileCompleted(filePath) {
        return this.completedFiles.hasOwnProperty(filePath);
    }

    async deleteAudioFile(chapter, section, fileName, fileElement) {
        try {
            const filePath = `book1/${chapter.id}/${section.id}/${fileName}`;
            
            // Mark file as deleted in localStorage
            this.markFileAsDeleted(filePath, fileName);
            
            // Remove the file element from the UI
            fileElement.remove();
            
            // Update the cached audio manifest data
            const sectionKey = `${chapter.id}-${section.id}`;
            if (this.audioManifestData[sectionKey]) {
                const index = this.audioManifestData[sectionKey].indexOf(fileName);
                if (index > -1) {
                    this.audioManifestData[sectionKey].splice(index, 1);
                }
            }
            
            // Check if this was the last audio file in the cell
            const cell = fileElement.parentElement;
            const remainingAudioFiles = cell.querySelectorAll('.audio-file-item');
            if (remainingAudioFiles.length === 0) {
                // Check if there are character names
                const characterNames = cell.querySelector('.character-names');
                if (!characterNames) {
                    cell.textContent = '—';
                    cell.className += ' empty';
                    cell.title = 'No hay archivos de audio ni personajes';
                }
            }
            
            // Update status summary
            this.updateTodoSummary();
            
        } catch (error) {
            alert(`Error al eliminar el archivo: ${error.message}`);
            console.error('Delete error:', error);
        }
    }

    async deleteAudioFileFromSection(audioFile, containerElement, type, parentChapter) {
        try {
            // Mark file as deleted in localStorage
            this.markFileAsDeleted(audioFile.path, audioFile.name);
            
            // Remove the container element from the UI
            containerElement.remove();
            
            // Reload the current section/chapter to refresh the view
            if (this.currentSection && parentChapter) {
                this.loadSection(parentChapter, this.currentSection);
            } else if (this.currentChapter) {
                this.loadChapter(this.currentChapter);
            }
            
        } catch (error) {
            alert(`Error al eliminar el archivo: ${error.message}`);
            console.error('Delete error:', error);
        }
    }

    updateTodoSummary() {
        // Update the summary at the bottom of the To-Do table if it exists
        const statusDiv = document.querySelector('.todo-content-view .audio-todo-table')?.parentElement?.querySelector('div[style*="text-align: center"]');
        if (statusDiv) {
            const totalAudioFiles = Object.values(this.audioManifestData).reduce((sum, files) => sum + files.length, 0);
            const totalCharacterSections = Object.keys(this.characterData).length;
            const totalCompletedFiles = Object.keys(this.completedFiles).length;
            const maxSections = Math.max(...this.bookStructure.chapters.map(ch => 
                ch.sections ? ch.sections.length : 0
            ));
            statusDiv.innerHTML = `Total: ${totalAudioFiles} archivos de audio | ${totalCompletedFiles} completados | ${totalCharacterSections} secciones con personajes | ${maxSections} secciones en ${this.bookStructure.chapters.length} capítulos`;
        }
    }

    async loadDeletedFilesView() {
        try {
            // Update active nav item
            document.querySelectorAll('.sidebar nav a').forEach(a => a.classList.remove('active'));
            event.target.classList.add('active');
            
            this.renderDeletedFilesContent();
            this.currentChapter = null;
            this.currentSection = null;
        } catch (error) {
            console.error('Error loading deleted files view:', error);
            this.renderDeletedFilesError();
        }
    }

    renderDeletedFilesContent() {
        const content = document.getElementById('chapter-content');
        const contentContainer = content.parentElement;
        
        
        contentContainer.classList.add('todo-view');
        
        const deletedView = document.createElement('div');
        deletedView.className = 'deleted-files-view';
        
        const title = document.createElement('h1');
        title.className = 'deleted-title-main';
        title.textContent = 'Archivos Eliminados';
        deletedView.appendChild(title);
        
        const description = document.createElement('div');
        description.className = 'deleted-description';
        description.innerHTML = `
            <p>Estos archivos han sido marcados como eliminados durante esta sesión. Los archivos seguirán apareciendo hasta el próximo despliegue.</p>
            <p><strong>Total eliminados:</strong> ${Object.keys(this.deletedFiles).length}</p>
            <button onclick="window.chapterViewer && window.chapterViewer.clearAllDeleted();" style="margin-top: 10px; padding: 5px 10px; background: #e74c3c; color: white; border: none; border-radius: 3px; cursor: pointer; margin-right: 10px;">Limpiar Lista</button>
            <button onclick="window.chapterViewer && window.chapterViewer.exportDeletedList();" style="margin-top: 10px; padding: 5px 10px; background: #3498db; color: white; border: none; border-radius: 3px; cursor: pointer;">Exportar Lista</button>
        `;
        deletedView.appendChild(description);
        
        if (Object.keys(this.deletedFiles).length === 0) {
            const emptyMsg = document.createElement('div');
            emptyMsg.style.textAlign = 'center';
            emptyMsg.style.padding = '40px';
            emptyMsg.style.color = '#666';
            emptyMsg.textContent = 'No hay archivos eliminados en esta sesión.';
            deletedView.appendChild(emptyMsg);
        } else {
            const table = document.createElement('table');
            table.className = 'deleted-files-table';
            table.style.width = '100%';
            table.style.borderCollapse = 'collapse';
            table.style.marginTop = '20px';
            
            const thead = document.createElement('thead');
            const headerRow = document.createElement('tr');
            ['Archivo', 'Ruta', 'Eliminado', 'Acciones'].forEach(headerText => {
                const th = document.createElement('th');
                th.textContent = headerText;
                th.style.border = '1px solid #ddd';
                th.style.padding = '8px';
                th.style.backgroundColor = '#f5f5f5';
                headerRow.appendChild(th);
            });
            thead.appendChild(headerRow);
            table.appendChild(thead);
            
            const tbody = document.createElement('tbody');
            Object.entries(this.deletedFiles).forEach(([filePath, info]) => {
                const row = document.createElement('tr');
                
                const nameCell = document.createElement('td');
                nameCell.textContent = info.name || filePath.split('/').pop();
                nameCell.style.border = '1px solid #ddd';
                nameCell.style.padding = '8px';
                
                const pathCell = document.createElement('td');
                pathCell.textContent = filePath;
                pathCell.style.border = '1px solid #ddd';
                pathCell.style.padding = '8px';
                pathCell.style.fontSize = '0.9em';
                pathCell.style.color = '#666';
                
                const dateCell = document.createElement('td');
                const deleteDate = new Date(info.deleted_at);
                dateCell.textContent = deleteDate.toLocaleString();
                dateCell.style.border = '1px solid #ddd';
                dateCell.style.padding = '8px';
                dateCell.style.fontSize = '0.9em';
                
                const actionsCell = document.createElement('td');
                actionsCell.style.border = '1px solid #ddd';
                actionsCell.style.padding = '8px';
                
                const restoreBtn = document.createElement('button');
                restoreBtn.textContent = 'Restaurar';
                restoreBtn.style.background = '#27ae60';
                restoreBtn.style.color = 'white';
                restoreBtn.style.border = 'none';
                restoreBtn.style.padding = '4px 8px';
                restoreBtn.style.borderRadius = '3px';
                restoreBtn.style.cursor = 'pointer';
                restoreBtn.style.fontSize = '0.8em';
                restoreBtn.onclick = async () => await this.restoreDeletedFile(filePath, row);
                
                actionsCell.appendChild(restoreBtn);
                
                row.appendChild(nameCell);
                row.appendChild(pathCell);
                row.appendChild(dateCell);
                row.appendChild(actionsCell);
                
                tbody.appendChild(row);
            });
            table.appendChild(tbody);
            
            deletedView.appendChild(table);
        }
        
        content.innerHTML = '';
        content.appendChild(deletedView);
        
        // Reset padding for deleted files view (no fixed header)
        content.style.paddingTop = '20px';
    }

    async restoreDeletedFile(filePath, rowElement) {
        delete this.deletedFiles[filePath];
        await this.saveDeletedFiles();
        rowElement.remove();
        
        // Update navigation to reflect change
        this.renderNavigation();
        
        console.log(`Restored file: ${filePath}`);
        
        // If no more deleted files, reload the view
        if (Object.keys(this.deletedFiles).length === 0) {
            this.renderDeletedFilesContent();
        }
    }

    async clearAllDeleted() {
        if (confirm('¿Estás seguro de que quieres limpiar toda la lista de archivos eliminados? Esto restaurará todos los archivos.')) {
            this.deletedFiles = {};
            await this.saveDeletedFiles();
            this.renderNavigation();
            this.renderDeletedFilesContent();
            console.log('Cleared all deleted files');
        }
    }

    exportDeletedList() {
        const deletedList = Object.entries(this.deletedFiles).map(([path, info]) => ({
            path,
            name: info.name,
            deleted_at: info.deleted_at,
            reason: info.reason
        }));
        
        const dataStr = JSON.stringify(deletedList, null, 2);
        const dataBlob = new Blob([dataStr], {type: 'application/json'});
        const url = URL.createObjectURL(dataBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `deleted_files_${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        
        URL.revokeObjectURL(url);
        console.log('Exported deleted files list');
    }

    renderDeletedFilesError() {
        const content = document.getElementById('chapter-content');
        content.innerHTML = `
            <div class="deleted-files-view">
                <h1 class="deleted-title-main">Error</h1>
                <div class="deleted-description">
                    <p><strong>Error:</strong> No se pudo cargar la vista de archivos eliminados.</p>
                </div>
            </div>
        `;
    }

    renderTodoError() {
        const content = document.getElementById('chapter-content');
        content.innerHTML = `
            <div class="todo-content-view">
                <h1 class="todo-title-main">To-Do: Error</h1>
                <div class="todo-description">
                    <p><strong>Error:</strong> No se pudo cargar la vista To-Do.</p>
                    <p>Por favor, asegúrate de que la estructura del libro esté cargada correctamente.</p>
                </div>
            </div>
        `;
    }

    async loadAllAudioManifests() {
        console.log('Loading all audio manifests...');
        
        if (!this.bookStructure || !this.bookStructure.chapters) {
            console.warn('Book structure not available for loading audio manifests');
            return;
        }

        // Load audio manifests for all chapters and sections
        for (const chapter of this.bookStructure.chapters) {
            // Load chapter-level audio manifest
            const chapterPath = `book1/${chapter.id}/`;
            try {
                const chapterAudioFiles = await this.findAllAudioFiles(chapterPath);
                this.audioManifestData[`${chapter.id}`] = chapterAudioFiles.map(af => af.name);
            } catch (error) {
                console.warn(`Could not load audio manifest for chapter ${chapter.id}:`, error);
                this.audioManifestData[`${chapter.id}`] = [];
            }

            // Load section-level audio manifests
            if (chapter.sections) {
                for (const section of chapter.sections) {
                    const sectionPath = `book1/${chapter.id}/${section.id}/`;
                    try {
                        const sectionAudioFiles = await this.findAllAudioFiles(sectionPath);
                        this.audioManifestData[`${chapter.id}-${section.id}`] = sectionAudioFiles.map(af => af.name);
                    } catch (error) {
                        console.warn(`Could not load audio manifest for section ${chapter.id}-${section.id}:`, error);
                        this.audioManifestData[`${chapter.id}-${section.id}`] = [];
                    }
                }
            }
        }

        console.log('Audio manifest data loaded:', this.audioManifestData);
    }

    async loadCharacterData() {
        console.log('Loading character data...');
        
        try {
            const response = await fetch('section_characters.json', { cache: 'no-cache' });
            if (response.ok) {
                this.characterData = await response.json();
                console.log('Character data loaded:', Object.keys(this.characterData).length, 'sections');
            } else {
                console.warn('Failed to load character data:', response.status);
                this.characterData = {};
            }
        } catch (error) {
            console.warn('Error loading character data:', error);
            this.characterData = {};
        }
    }

    async loadSharedData() {
        console.log('Loading shared data from GitHub Issues...');
        try {
            const [deleted, completed, comments, notCompleted] = await Promise.all([
                this.githubApi.getFileContent('deleted_files_history.json').catch(e => {
                    console.warn('Failed to load deleted files:', e);
                    return {};
                }),
                this.githubApi.getFileContent('completed_files.json').catch(e => {
                    console.warn('Failed to load completed files:', e);
                    return {};
                }),
                this.githubApi.getFileContent('file_comments.json').catch(e => {
                    console.warn('Failed to load file comments:', e);
                    return {};
                }),
                this.githubApi.getFileContent('not_completed_files.json').catch(e => {
                    console.warn('Failed to load not completed files:', e);
                    return {};
                })
            ]);

            this.deletedFiles = deleted || {};
            this.completedFiles = completed || {};
            this.fileComments = comments || {};
            this.notCompletedFiles = notCompleted || {};

            console.log('Shared data loaded from GitHub Issues:', {
                deletedCount: Object.keys(this.deletedFiles).length,
                completedCount: Object.keys(this.completedFiles).length,
                commentsCount: Object.keys(this.fileComments).length,
                notCompletedCount: Object.keys(this.notCompletedFiles).length
            });
        } catch (error) {
            console.warn('Error loading shared data from GitHub:', error);
            this.deletedFiles = {};
            this.completedFiles = {};
            this.fileComments = {};
            this.notCompletedFiles = {};
        }
    }

    renderError(item, type = 'chapter', parentChapter = null) {
        const content = document.getElementById('chapter-content');
        const contentContainer = content.parentElement; // .content element
        
        // Remove todo-view class when loading error content
        contentContainer.classList.remove('todo-view');
        
        const itemType = type === 'section' ? 'sección' : 'capítulo';
        const breadcrumbHtml = type === 'section' && parentChapter ? 
            `<div class="breadcrumb">${parentChapter.title} > ${item.title}</div>` : '';
            
        content.innerHTML = `
            <div class="${type}-header">
                ${breadcrumbHtml}
                <h1 class="${type}-title">${item.title}</h1>
            </div>
            <div class="${type}-text">
                <p><strong>Error:</strong> No se pudo cargar el archivo de texto para esta ${itemType}.</p>
                <p>Por favor, asegúrate de que el archivo <code>${item.textFile}</code> existe en el directorio correcto.</p>
            </div>
        `;
    }
}

// Initialize the chapter viewer when the page loads
document.addEventListener('DOMContentLoaded', async () => {
    try {
        console.log('Initializing ChapterViewer...');
        window.chapterViewer = new ChapterViewer();
    } catch (error) {
        console.error('Failed to initialize ChapterViewer:', error);
        // Fallback: show error message to user
        const content = document.getElementById('chapter-content');
        if (content) {
            content.innerHTML = `
                <div class="error">
                    <h2>Error loading application</h2>
                    <p>There was an error initializing the application. Please refresh the page.</p>
                    <p>Error: ${error.message}</p>
                </div>
            `;
        }
    }
});