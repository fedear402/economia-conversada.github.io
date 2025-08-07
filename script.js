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
            this.confirmedFiles = {};
            this.todoV2Status = {}; // Independent tracking for Todo V2
            this.propertyAssignments = {}; // Audio file to property assignments
            this.textManifestData = {}; // Cache for text manifest data
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
                if (!this.confirmedFiles) this.confirmedFiles = {};
                if (!this.todoV2Status) this.todoV2Status = {};
                if (!this.propertyAssignments) this.propertyAssignments = {};
            }
            console.log('Shared data loaded');
            
            await this.renderNavigation();
            console.log('Navigation rendered');
            
            await this.loadAllAudioManifests();
            console.log('Audio manifests loaded');
            
            await this.loadAllTextManifests();
            console.log('Text manifests loaded');
            
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
        
        // Add Indice item
        const indiceV2Li = document.createElement('li');
        indiceV2Li.className = 'chapter-item';
        
        const indiceV2Link = document.createElement('a');
        indiceV2Link.href = '#';
        indiceV2Link.textContent = 'Indice';
        indiceV2Link.className = 'chapter-link';
        indiceV2Link.onclick = (e) => {
            e.preventDefault();
            this.loadTodoV2View();
        };
        
        indiceV2Li.appendChild(indiceV2Link);
        ul.appendChild(indiceV2Li);
        
        // Add ULTIMOS CAMBIOS item
        const cambiosLi = document.createElement('li');
        cambiosLi.className = 'chapter-item';
        
        const cambiosLink = document.createElement('a');
        cambiosLink.href = '#';
        cambiosLink.textContent = 'ULTIMOS CAMBIOS';
        cambiosLink.className = 'chapter-link';
        cambiosLink.onclick = (e) => {
            e.preventDefault();
            this.loadUltimosCambiosView();
        };
        
        cambiosLi.appendChild(cambiosLink);
        ul.appendChild(cambiosLi);
        
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
        let actualChapterNumber = 1; // Track actual chapter numbers separately
        this.bookStructure.chapters.forEach((chapter, chapterIndex) => {
            const chapterLi = document.createElement('li');
            chapterLi.className = 'chapter-item';
            
            const chapterLink = document.createElement('a');
            chapterLink.href = '#';
            
            // Only number actual chapters (skip Intro and other special sections)
            if (chapter.id.startsWith('C') && /^C\d+$/.test(chapter.id)) {
                chapterLink.textContent = `${actualChapterNumber}. ${chapter.title}`;
                actualChapterNumber++;
            } else {
                chapterLink.textContent = chapter.title; // No number for Intro, etc.
            }
            
            chapterLink.className = 'chapter-link';
            chapterLink.setAttribute('data-chapter-id', chapter.id);
            chapterLink.onclick = (e) => {
                e.preventDefault();
                this.loadChapter(chapter);
                this.toggleChapterSections(chapterLi);
            };
            
            chapterLi.appendChild(chapterLink);
            
            if (chapter.sections && chapter.sections.length > 0) {
                const sectionsUl = document.createElement('ul');
                sectionsUl.className = 'sections-list';
                
                chapter.sections.forEach((section, sectionIndex) => {
                    const sectionLi = document.createElement('li');
                    sectionLi.className = 'section-item';
                    
                    const sectionLink = document.createElement('a');
                    sectionLink.href = '#';
                    
                    // Only number sections for actual chapters (skip sections in Intro, etc.)
                    if (chapter.id.startsWith('C') && /^C\d+$/.test(chapter.id)) {
                        sectionLink.textContent = `${actualChapterNumber - 1}.${sectionIndex + 1}. ${section.title}`;
                    } else {
                        sectionLink.textContent = section.title; // No number for sections in Intro, etc.
                    }
                    
                    sectionLink.className = 'section-link';
                    sectionLink.setAttribute('data-chapter-id', chapter.id);
                    sectionLink.setAttribute('data-section-id', section.id);
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
            
            // Find and activate the corresponding chapter link
            const chapterLinks = document.querySelectorAll('.chapter-link');
            chapterLinks.forEach(link => {
                if (link.getAttribute('data-chapter-id') === chapter.id) {
                    link.classList.add('active');
                }
            });
            
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
            
            // Find and activate the corresponding section link
            const sectionLinks = document.querySelectorAll('.section-link');
            sectionLinks.forEach(link => {
                if (link.getAttribute('data-chapter-id') === chapter.id && 
                    link.getAttribute('data-section-id') === section.id) {
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

        // Add properties display for sections and chapters
        if (type === 'section' || type === 'chapter') {
            // Clear any existing properties display first to prevent stale data
            const existingProperties = header.querySelector('.properties-display');
            if (existingProperties) {
                existingProperties.remove();
            }
            
            const propertiesDisplay = this.createPropertiesDisplay(type, parentChapter, item);
            if (propertiesDisplay) {
                header.appendChild(propertiesDisplay);
            } else {
                // If properties display is null (likely due to missing text manifest data),
                // create a placeholder and try to populate it after a short delay
                this.schedulePropertiesDisplayUpdate(header, type, parentChapter, item);
            }
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
                
                // Add assign button (far left)
                const assignBtn = document.createElement('button');
                assignBtn.className = 'audio-assign-btn';
                assignBtn.innerHTML = '↕';
                assignBtn.title = `Asignar ${audioFile.name} a propiedad`;
                assignBtn.style.backgroundColor = '#3498db';
                assignBtn.style.color = 'white';
                assignBtn.style.border = 'none';
                assignBtn.style.borderRadius = '50%';
                assignBtn.style.width = '24px';
                assignBtn.style.height = '24px';
                assignBtn.style.fontSize = '14px';
                assignBtn.style.cursor = 'pointer';
                assignBtn.style.display = 'flex';
                assignBtn.style.alignItems = 'center';
                assignBtn.style.justifyContent = 'center';
                assignBtn.style.transition = 'all 0.2s ease';
                assignBtn.style.flexShrink = '0';
                assignBtn.style.marginRight = '4px';
                assignBtn.onmouseover = () => {
                    assignBtn.style.backgroundColor = '#2980b9';
                    assignBtn.style.transform = 'scale(1.1)';
                };
                assignBtn.onmouseout = () => {
                    assignBtn.style.backgroundColor = '#3498db';
                    assignBtn.style.transform = 'scale(1)';
                };
                assignBtn.onclick = (e) => {
                    e.preventDefault();
                    this.showPropertyAssignmentModal(audioFile, type, parentChapter);
                };

                // Add delete button 
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
                const isConfirmed = this.isFileConfirmed(audioFile.path);
                
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
                
                const confirmarLabel = document.createElement('span');
                confirmarLabel.textContent = 'CONFIRMAR';
                confirmarLabel.style.fontSize = '12px';
                confirmarLabel.style.cursor = 'pointer';
                confirmarLabel.style.padding = '2px 4px';
                confirmarLabel.style.borderRadius = '3px';
                confirmarLabel.style.transition = 'all 0.2s ease';
                
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
                
                // Set initial styles for confirmar button
                if (isConfirmed) {
                    confirmarLabel.style.backgroundColor = '#333333';
                    confirmarLabel.style.color = 'white';
                    confirmarLabel.style.fontWeight = 'bold';
                } else {
                    confirmarLabel.style.backgroundColor = 'transparent';
                    confirmarLabel.style.color = '#666';
                    confirmarLabel.style.fontWeight = 'normal';
                }
                
                // Handle OK click
                okLabel.onclick = async () => {
                    const isCurrentlyCompleted = this.isFileCompleted(audioFile.path);
                    
                    if (isCurrentlyCompleted) {
                        // Deselect - mark as not completed
                        await this.markFileAsCompleted(audioFile.path, audioFile.name, false);
                        
                        // Reset visual feedback to default state
                        audioLabel.style.color = '';
                        audioLabel.style.fontWeight = '';
                        okLabel.style.backgroundColor = 'transparent';
                        okLabel.style.color = '#666';
                        okLabel.style.fontWeight = 'normal';
                    } else {
                        // Select - mark as completed
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
                    }
                    
                    // Synchronize with Indice view
                    this.synchronizeWithIndice();
                };
                
                // Handle NOT OK click
                notOkLabel.onclick = () => {
                    const isCurrentlyNotCompleted = this.isFileNotCompleted && this.isFileNotCompleted(audioFile.path);
                    
                    if (isCurrentlyNotCompleted) {
                        // Deselect - remove from not completed
                        if (this.markFileAsNotCompleted) {
                            this.markFileAsNotCompleted(audioFile.path, audioFile.name, false);
                        }
                        
                        // Reset visual feedback to default state
                        audioLabel.style.color = '';
                        audioLabel.style.fontWeight = '';
                        notOkLabel.style.backgroundColor = 'transparent';
                        notOkLabel.style.color = '#666';
                        notOkLabel.style.fontWeight = 'normal';
                        
                        // Synchronize with Indice view
                        this.synchronizeWithIndice();
                    } else {
                        // Select - show comment modal and mark as not completed
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
                            
                            // Synchronize with Indice view
                            this.synchronizeWithIndice();
                        });
                    }
                };
                
                // Handle CONFIRMAR click
                confirmarLabel.onclick = async () => {
                    const isCurrentlyConfirmed = this.isFileConfirmed(audioFile.path);
                    
                    if (isCurrentlyConfirmed) {
                        // Deselect - mark as not confirmed
                        await this.markFileAsConfirmed(audioFile.path, audioFile.name, false);
                        
                        // Reset to default transparent state like other buttons
                        confirmarLabel.style.backgroundColor = 'transparent';
                        confirmarLabel.style.color = '#666';
                        confirmarLabel.style.fontWeight = 'normal';
                    } else {
                        // Select - mark as confirmed
                        await this.markFileAsConfirmed(audioFile.path, audioFile.name, true);
                        
                        // Set to dark gray
                        confirmarLabel.style.backgroundColor = '#333333';
                        confirmarLabel.style.color = 'white';
                        confirmarLabel.style.fontWeight = 'bold';
                    }
                    
                    // Synchronize with Indice view
                    this.synchronizeWithIndice();
                };
                
                completionContainer.appendChild(okLabel);
                completionContainer.appendChild(notOkLabel);
                completionContainer.appendChild(confirmarLabel);
                
                audioLabelContainer.appendChild(assignBtn);
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
        
        // First render text normally to let browser handle wrapping
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
        
        // Add the text to DOM first so we can measure it
        content.innerHTML = '';
        content.appendChild(header);
        content.appendChild(textDiv);
        
        // Wait for layout, then add markers
        setTimeout(() => {
            this.addVisualLineMarkers(textDiv, text);
        }, 100);
        
        // Dynamically adjust content padding based on header height
        this.adjustContentPadding();
    }

    addVisualLineMarkers(textDiv, originalText) {
        const markerInterval = 80;
        let globalCharacterCount = 0;
        
        // Calculate positions where \n lines start AND after every period
        const textFileLineStarts = [];
        const periodPositions = [];
        
        // Find ALL sentence starts in the text
        const sentenceStarts = [];
        
        // Split text into sentences using multiple sentence endings
        const sentences = originalText.split(/[.!?]+/);
        let currentPos = 0;
        
        sentences.forEach((sentence, index) => {
            if (index === 0) {
                // First sentence starts at position 0
                sentenceStarts.push(0);
            } else {
                // Find the start of this sentence after the previous sentence + punctuation
                currentPos += sentences[index - 1].length;
                
                // Skip over punctuation and spaces to find the actual sentence start
                while (currentPos < originalText.length && 
                       /[.!?\s\n]/.test(originalText[currentPos])) {
                    currentPos++;
                }
                
                if (currentPos < originalText.length) {
                    sentenceStarts.push(currentPos);
                }
            }
        });
        
        // Also find \n line starts
        for (let i = 0; i < originalText.length; i++) {
            if (originalText[i] === '\n' && i > 0) {
                textFileLineStarts.push(i + 1); // Position after the \n
            }
        }
        
        console.log('Sentence starts found:', sentenceStarts.slice(0, 15)); // Debug first 15
        console.log('Line start positions:', textFileLineStarts.slice(0, 10)); // Debug first 10
        
        globalCharacterCount = 0;
        
        // Process each paragraph
        const paragraphs = textDiv.querySelectorAll('p');
        
        paragraphs.forEach((paragraph, paragraphIndex) => {
            if (paragraphIndex > 0) {
                globalCharacterCount += 2; // Account for paragraph breaks
            }
            
            // Clear existing content and rebuild with markers
            const paragraphText = paragraph.textContent;
            paragraph.innerHTML = '';
            
            // Split paragraph text into visual lines by measuring
            const visualLines = this.splitIntoVisualLines(paragraphText, paragraph);
            
            visualLines.forEach((lineText, lineIndex) => {
                // Create line container
                const lineContainer = document.createElement('div');
                lineContainer.className = 'text-line-with-markers';
                
                // Create markers for this visual line
                const markersDiv = document.createElement('div');
                markersDiv.className = 'line-markers';
                
                const lineStartChar = globalCharacterCount;
                const lineEndChar = globalCharacterCount + lineText.length;
                
                // Collect all marker positions for this line
                const markerPositions = new Set();
                
                // Add regular interval markers
                for (let markerPos = Math.ceil(lineStartChar / markerInterval) * markerInterval; 
                     markerPos < lineEndChar; 
                     markerPos += markerInterval) {
                    
                    if (markerPos > lineStartChar) {
                        markerPositions.add(markerPos);
                    }
                }
                
                // Add \n line start markers
                textFileLineStarts.forEach(lineStartPos => {
                    if (lineStartPos > lineStartChar && lineStartPos < lineEndChar) {
                        markerPositions.add(lineStartPos);
                    }
                });
                
                // Add sentence start markers
                sentenceStarts.forEach(sentencePos => {
                    if (sentencePos >= lineStartChar && sentencePos <= lineEndChar) {
                        markerPositions.add(sentencePos);
                        console.log(`Adding sentence marker at position ${sentencePos} for line ${lineStartChar}-${lineEndChar}`);
                    }
                });
                
                // Create markers for all positions
                const sortedMarkers = Array.from(markerPositions).sort((a, b) => a - b);
                console.log(`Creating ${sortedMarkers.length} markers for line "${lineText.substring(0, 30)}...": ${sortedMarkers.join(', ')}`);
                
                sortedMarkers.forEach(markerPos => {
                    const charPositionInLine = markerPos - lineStartChar;
                    const marker = document.createElement('span');
                    marker.className = 'character-marker';
                    marker.textContent = markerPos.toString();
                    
                    // Create a temporary span to measure exact character position
                    const tempSpan = document.createElement('span');
                    tempSpan.style.visibility = 'hidden';
                    tempSpan.style.position = 'absolute';
                    tempSpan.style.font = getComputedStyle(paragraph).font;
                    tempSpan.textContent = lineText.substring(0, charPositionInLine);
                    document.body.appendChild(tempSpan);
                    
                    // Position marker exactly above the character
                    const exactPosition = tempSpan.offsetWidth;
                    marker.style.left = `${exactPosition}px`;
                    
                    document.body.removeChild(tempSpan);
                    markersDiv.appendChild(marker);
                });
                
                // Add text content
                const lineTextSpan = document.createElement('span');
                lineTextSpan.textContent = lineText;
                
                lineContainer.appendChild(markersDiv);
                lineContainer.appendChild(lineTextSpan);
                paragraph.appendChild(lineContainer);
                
                globalCharacterCount += lineText.length;
                
                // Account for space between words when lines wrap
                if (lineIndex < visualLines.length - 1) {
                    globalCharacterCount += 1;
                }
            });
        });
    }
    
    getTextNodes(element) {
        const textNodes = [];
        const walker = document.createTreeWalker(
            element,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );
        
        let node;
        while (node = walker.nextNode()) {
            if (node.textContent.trim()) {
                textNodes.push(node);
            }
        }
        return textNodes;
    }
    
    splitIntoVisualLines(text, containerElement) {
        // Create temporary span to measure text
        const tempSpan = document.createElement('span');
        tempSpan.style.visibility = 'hidden';
        tempSpan.style.position = 'absolute';
        tempSpan.style.whiteSpace = 'nowrap';
        tempSpan.style.font = getComputedStyle(containerElement).font;
        document.body.appendChild(tempSpan);
        
        const containerWidth = containerElement.offsetWidth - 60; // Account for padding
        const words = text.split(' ');
        const lines = [];
        let currentLine = '';
        
        words.forEach((word, index) => {
            const testLine = currentLine + (currentLine ? ' ' : '') + word;
            tempSpan.textContent = testLine;
            
            if (tempSpan.offsetWidth > containerWidth && currentLine) {
                // Line is too long, start new line
                lines.push(currentLine);
                currentLine = word;
            } else {
                currentLine = testLine;
            }
        });
        
        if (currentLine) {
            lines.push(currentLine);
        }
        
        document.body.removeChild(tempSpan);
        return lines;
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
            if (link.getAttribute('data-chapter-id') === chapter.id && 
                link.getAttribute('data-section-id') === section.id) {
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

    async saveConfirmedFiles() {
        try {
            const success = await this.githubApi.updateFile('confirmed_files.json', this.confirmedFiles, 'Update confirmed files');
            if (!success) {
                console.error('Failed to save confirmed files to GitHub - data not shared!');
            }
        } catch (error) {
            console.error('Could not save confirmed files to GitHub:', error);
        }
    }

    async addFileComment(filePath, fileName, comment) {
        if (!this.fileComments[filePath]) {
            this.fileComments[filePath] = [];
        }
        const commentData = {
            comment: comment,
            timestamp: new Date().toISOString(),
            fileName: fileName
        };
        this.fileComments[filePath].push(commentData);
        
        // Track this as a recent change
        this.trackRecentChange({
            type: 'comment',
            description: comment,
            location: `${this.getChapterTitleFromPath(filePath)} - ${fileName}`,
            timestamp: commentData.timestamp,
            filePath: filePath,
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

    showPropertyAssignmentModal(audioFile, type, parentChapter) {
        // Determine chapter and section IDs
        let chapterId, sectionId;
        
        if (type === 'section' && parentChapter) {
            chapterId = parentChapter.id;
            sectionId = this.currentSection?.id;
        } else if (type === 'chapter') {
            chapterId = this.currentChapter?.id;
            sectionId = null;
        } else {
            console.error('Could not determine chapter/section for assignment');
            return;
        }

        // Get available properties for this chapter/section
        const availableProperties = this.getAvailableProperties(chapterId, sectionId);
        
        if (availableProperties.length === 0) {
            alert('No hay propiedades disponibles para este capítulo/sección.');
            return;
        }

        // If there's only one property available, assign it directly without showing modal
        if (availableProperties.length === 1) {
            const property = availableProperties[0];
            this.assignAudioToProperty(chapterId, sectionId, property, audioFile.name);
            console.log(`Auto-assigned ${audioFile.name} to ${property} (only option available)`);
            
            // Refresh current view to show the assignment
            this.refreshCurrentView();
            return;
        }

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
        title.textContent = `Asignar "${audioFile.displayName}" a propiedad`;
        title.style.marginBottom = '20px';
        title.style.color = '#333';
        
        // Check if audio file is already assigned
        const currentAssignment = this.getPropertyForAudioFile(audioFile.name);
        
        if (currentAssignment) {
            const currentInfo = document.createElement('div');
            currentInfo.style.backgroundColor = '#fff3cd';
            currentInfo.style.padding = '10px';
            currentInfo.style.borderRadius = '4px';
            currentInfo.style.marginBottom = '15px';
            currentInfo.style.fontSize = '14px';
            currentInfo.innerHTML = `<strong>Asignación actual:</strong> ${currentAssignment}`;
            modal.appendChild(title);
            modal.appendChild(currentInfo);
        } else {
            modal.appendChild(title);
        }
        
        // Create dropdown container
        const dropdownContainer = document.createElement('div');
        dropdownContainer.style.marginBottom = '20px';
        
        const dropdownLabel = document.createElement('label');
        dropdownLabel.textContent = 'Seleccionar propiedad:';
        dropdownLabel.style.display = 'block';
        dropdownLabel.style.marginBottom = '8px';
        dropdownLabel.style.fontWeight = '500';
        
        const dropdown = document.createElement('select');
        dropdown.style.width = '100%';
        dropdown.style.padding = '10px';
        dropdown.style.border = '1px solid #ddd';
        dropdown.style.borderRadius = '4px';
        dropdown.style.fontSize = '14px';
        dropdown.style.backgroundColor = 'white';
        
        // Add default option
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = '-- Seleccionar propiedad --';
        dropdown.appendChild(defaultOption);
        
        // Add property options
        availableProperties.forEach(property => {
            const option = document.createElement('option');
            option.value = property;
            option.textContent = property;
            
            // Check if this property already has an assignment
            const existingAssignment = this.getAssignedAudioFile(chapterId, sectionId, property);
            if (existingAssignment) {
                option.textContent += ` (ya asignado a: ${existingAssignment})`;
                option.style.color = '#666';
            }
            
            dropdown.appendChild(option);
        });
        
        dropdownContainer.appendChild(dropdownLabel);
        dropdownContainer.appendChild(dropdown);
        
        // Create buttons container
        const buttonsContainer = document.createElement('div');
        buttonsContainer.style.display = 'flex';
        buttonsContainer.style.gap = '10px';
        buttonsContainer.style.justifyContent = 'flex-end';
        
        // Create assign button
        const assignBtn = document.createElement('button');
        assignBtn.textContent = 'Asignar';
        assignBtn.style.backgroundColor = '#3498db';
        assignBtn.style.color = 'white';
        assignBtn.style.border = 'none';
        assignBtn.style.padding = '10px 20px';
        assignBtn.style.borderRadius = '4px';
        assignBtn.style.cursor = 'pointer';
        assignBtn.style.fontSize = '14px';
        
        // Create unassign button (if currently assigned)
        let unassignBtn = null;
        if (currentAssignment) {
            unassignBtn = document.createElement('button');
            unassignBtn.textContent = 'Desasignar actual';
            unassignBtn.style.backgroundColor = '#e74c3c';
            unassignBtn.style.color = 'white';
            unassignBtn.style.border = 'none';
            unassignBtn.style.padding = '10px 20px';
            unassignBtn.style.borderRadius = '4px';
            unassignBtn.style.cursor = 'pointer';
            unassignBtn.style.fontSize = '14px';
        }
        
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
        assignBtn.onclick = () => {
            const selectedProperty = dropdown.value;
            if (!selectedProperty) {
                alert('Por favor selecciona una propiedad.');
                return;
            }
            
            // Confirm if overwriting existing assignment
            const existingAssignment = this.getAssignedAudioFile(chapterId, sectionId, selectedProperty);
            if (existingAssignment && existingAssignment !== audioFile.name) {
                if (!confirm(`La propiedad "${selectedProperty}" ya está asignada a "${existingAssignment}". ¿Quieres reemplazarla?`)) {
                    return;
                }
            }
            
            // Perform assignment
            this.assignAudioToProperty(chapterId, sectionId, selectedProperty, audioFile.name);
            document.body.removeChild(modalOverlay);
            
            // Refresh current view
            this.refreshCurrentView();
        };
        
        if (unassignBtn) {
            unassignBtn.onclick = () => {
                if (confirm(`¿Estás seguro de que quieres desasignar "${audioFile.name}" de la propiedad "${currentAssignment}"?`)) {
                    this.unassignProperty(currentAssignment);
                    document.body.removeChild(modalOverlay);
                    
                    // Refresh current view
                    this.refreshCurrentView();
                }
            };
        }
        
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
        if (unassignBtn) {
            buttonsContainer.appendChild(unassignBtn);
        }
        buttonsContainer.appendChild(assignBtn);
        modal.appendChild(dropdownContainer);
        modal.appendChild(buttonsContainer);
        modalOverlay.appendChild(modal);
        
        // Add to DOM and focus dropdown
        document.body.appendChild(modalOverlay);
        dropdown.focus();
    }

    refreshCurrentView() {
        // Refresh the current section or chapter view
        if (this.currentSection && this.currentChapter) {
            this.loadSection(this.currentChapter, this.currentSection);
        } else if (this.currentChapter) {
            this.loadChapter(this.currentChapter);
        }
        
        // Also refresh Indice if open
        this.refreshIndiceView();
    }

    schedulePropertiesDisplayUpdate(header, type, parentChapter, item = null) {
        // Try to add properties display after text manifests are loaded
        setTimeout(() => {
            // Clear any existing properties display first to prevent stale data
            const existingProperties = header.querySelector('.properties-display');
            if (existingProperties) {
                existingProperties.remove();
            }
            
            const propertiesDisplay = this.createPropertiesDisplay(type, parentChapter, item);
            if (propertiesDisplay) {
                // Insert the properties display right after the description (if exists) or title
                const description = header.querySelector('.section-description, .chapter-description');
                if (description) {
                    description.insertAdjacentElement('afterend', propertiesDisplay);
                } else {
                    header.appendChild(propertiesDisplay);
                }
            } else {
                // If still not available after delay, try once more in case manifests are still loading
                setTimeout(() => {
                    // Clear any existing properties display again before final retry
                    const existingDelayedProperties = header.querySelector('.properties-display');
                    if (existingDelayedProperties) {
                        existingDelayedProperties.remove();
                    }
                    
                    const delayedPropertiesDisplay = this.createPropertiesDisplay(type, parentChapter, item);
                    if (delayedPropertiesDisplay) {
                        // Insert the properties display right after the description (if exists) or title
                        const description = header.querySelector('.section-description, .chapter-description');
                        if (description) {
                            description.insertAdjacentElement('afterend', delayedPropertiesDisplay);
                        } else {
                            header.appendChild(delayedPropertiesDisplay);
                        }
                    }
                }, 500);
            }
        }, 100);
    }

    createPropertiesDisplay(type, parentChapter, item = null) {
        // Determine chapter and section IDs
        let chapterId, sectionId;
        
        if (type === 'section' && parentChapter && item) {
            // Use the item directly instead of relying on this.currentSection which might be stale
            chapterId = parentChapter.id;
            sectionId = item.id;
        } else if (type === 'chapter' && item) {
            // Use the item directly instead of relying on this.currentChapter which might be stale
            chapterId = item.id;
            sectionId = null;
        } else {
            // If no item provided, clear any existing properties display and return null
            return null;
        }

        // Get available properties
        const availableProperties = this.getAvailableProperties(chapterId, sectionId);
        
        if (availableProperties.length === 0) {
            return null;
        }

        // Create properties container
        const propertiesContainer = document.createElement('div');
        propertiesContainer.className = 'properties-display';
        propertiesContainer.style.marginTop = '15px';
        propertiesContainer.style.marginBottom = '15px';
        propertiesContainer.style.padding = '12px';
        propertiesContainer.style.backgroundColor = '#f8f9fa';
        propertiesContainer.style.border = '1px solid #e9ecef';
        propertiesContainer.style.borderRadius = '6px';
        
        // Properties title
        const propertiesTitle = document.createElement('div');
        propertiesTitle.textContent = 'Propiedades:';
        propertiesTitle.style.fontWeight = 'bold';
        propertiesTitle.style.fontSize = '14px';
        propertiesTitle.style.marginBottom = '8px';
        propertiesTitle.style.color = '#495057';
        propertiesContainer.appendChild(propertiesTitle);

        // Properties list
        const propertiesList = document.createElement('div');
        propertiesList.className = 'properties-list';
        propertiesList.style.display = 'flex';
        propertiesList.style.flexDirection = 'column';
        propertiesList.style.gap = '6px';

        availableProperties.forEach(property => {
            const propertyItem = this.createPropertyDisplayItem(chapterId, sectionId, property);
            propertiesList.appendChild(propertyItem);
        });

        propertiesContainer.appendChild(propertiesList);
        return propertiesContainer;
    }

    createPropertyDisplayItem(chapterId, sectionId, property) {
        const propertyItem = document.createElement('div');
        propertyItem.className = 'property-display-item';
        propertyItem.style.display = 'flex';
        propertyItem.style.alignItems = 'center';
        propertyItem.style.fontSize = '13px';
        propertyItem.style.paddingLeft = '16px';

        // Property name
        const propertyName = document.createElement('span');
        propertyName.textContent = property + ': ';
        propertyName.style.fontWeight = '500';
        propertyName.style.color = '#6c757d';
        propertyName.style.minWidth = '100px';

        // Assignment status
        const assignedAudio = this.getAssignedAudioFile(chapterId, sectionId, property);
        
        if (assignedAudio) {
            // Assigned - show filename with unassign button
            const assignmentContainer = document.createElement('span');
            assignmentContainer.style.display = 'flex';
            assignmentContainer.style.alignItems = 'center';
            assignmentContainer.style.gap = '8px';

            const audioFileName = document.createElement('span');
            audioFileName.textContent = assignedAudio;
            audioFileName.style.color = '#28a745';
            audioFileName.style.fontWeight = '500';
            audioFileName.style.backgroundColor = '#d4edda';
            audioFileName.style.padding = '2px 6px';
            audioFileName.style.borderRadius = '3px';
            audioFileName.style.fontSize = '12px';

            const unassignBtn = document.createElement('button');
            unassignBtn.textContent = '×';
            unassignBtn.title = `Desasignar ${assignedAudio} de ${property}`;
            unassignBtn.style.backgroundColor = '#dc3545';
            unassignBtn.style.color = 'white';
            unassignBtn.style.border = 'none';
            unassignBtn.style.borderRadius = '50%';
            unassignBtn.style.width = '20px';
            unassignBtn.style.height = '20px';
            unassignBtn.style.fontSize = '12px';
            unassignBtn.style.cursor = 'pointer';
            unassignBtn.style.display = 'flex';
            unassignBtn.style.alignItems = 'center';
            unassignBtn.style.justifyContent = 'center';
            unassignBtn.style.transition = 'all 0.2s ease';

            unassignBtn.onmouseover = () => {
                unassignBtn.style.backgroundColor = '#c82333';
                unassignBtn.style.transform = 'scale(1.1)';
            };
            unassignBtn.onmouseout = () => {
                unassignBtn.style.backgroundColor = '#dc3545';
                unassignBtn.style.transform = 'scale(1)';
            };

            unassignBtn.onclick = () => {
                const propertyKey = this.getPropertyKey(chapterId, sectionId, property);
                if (confirm(`¿Estás seguro de que quieres desasignar "${assignedAudio}" de la propiedad "${property}"?`)) {
                    this.unassignProperty(propertyKey);
                    this.refreshCurrentView();
                }
            };

            assignmentContainer.appendChild(audioFileName);
            assignmentContainer.appendChild(unassignBtn);
            propertyItem.appendChild(propertyName);
            propertyItem.appendChild(assignmentContainer);
        } else {
            // Not assigned
            const noAssignmentText = document.createElement('span');
            noAssignmentText.textContent = '[Sin asignación]';
            noAssignmentText.style.color = '#6c757d';
            noAssignmentText.style.fontStyle = 'italic';
            noAssignmentText.style.fontSize = '12px';

            propertyItem.appendChild(propertyName);
            propertyItem.appendChild(noAssignmentText);
        }

        return propertyItem;
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

    async markFileAsConfirmed(filePath, fileName, isConfirmed) {
        if (isConfirmed) {
            this.confirmedFiles[filePath] = {
                confirmed_at: new Date().toISOString(),
                name: fileName
            };
        } else {
            delete this.confirmedFiles[filePath];
        }
        await this.saveConfirmedFiles();
        console.log(`Marked file as ${isConfirmed ? 'confirmed' : 'not confirmed'}: ${fileName}`);
    }

    isFileConfirmed(filePath) {
        return this.confirmedFiles.hasOwnProperty(filePath);
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

    async loadUltimosCambiosView() {
        try {
            // Update active nav item
            document.querySelectorAll('.sidebar nav a').forEach(a => a.classList.remove('active'));
            event.target.classList.add('active');
            
            this.renderUltimosCambiosContent();
            this.currentChapter = null;
            this.currentSection = null;
        } catch (error) {
            console.error('Error loading ULTIMOS CAMBIOS view:', error);
            this.renderUltimosCambiosError();
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

    async renderUltimosCambiosContent() {
        const content = document.getElementById('chapter-content');
        const contentContainer = content.parentElement;
        
        // Reset content padding
        contentContainer.classList.remove('todo-view');
        content.style.paddingTop = '20px';
        
        const cambiosView = document.createElement('div');
        cambiosView.className = 'ultimos-cambios-view';
        
        const title = document.createElement('h1');
        title.className = 'cambios-title-main';
        title.textContent = 'ULTIMOS CAMBIOS';
        cambiosView.appendChild(title);
        
        // No description - removed as requested
        
        // Add loading message
        const loadingMsg = document.createElement('div');
        loadingMsg.style.textAlign = 'center';
        loadingMsg.style.padding = '40px';
        loadingMsg.style.color = '#666';
        loadingMsg.textContent = 'Cargando cambios recientes...';
        cambiosView.appendChild(loadingMsg);
        
        // Add to DOM first to show loading
        content.innerHTML = '';
        content.appendChild(cambiosView);
        
        // Get recent changes data
        const recentChanges = await this.getRecentChanges();
        
        // Remove loading message
        cambiosView.removeChild(loadingMsg);
        
        if (recentChanges.length === 0) {
            const emptyMsg = document.createElement('div');
            emptyMsg.style.textAlign = 'center';
            emptyMsg.style.padding = '40px';
            emptyMsg.style.color = '#666';
            emptyMsg.textContent = 'No hay cambios recientes registrados.';
            cambiosView.appendChild(emptyMsg);
        } else {
            const changesList = document.createElement('div');
            changesList.className = 'changes-list';
            
            recentChanges.forEach(change => {
                const changeItem = document.createElement('div');
                changeItem.className = 'change-item';
                
                const changeDate = document.createElement('div');
                changeDate.className = 'change-date';
                changeDate.textContent = change.date;
                
                const changeType = document.createElement('div');
                changeType.className = `change-type ${change.type}`;
                changeType.textContent = change.typeLabel;
                
                const changeDescription = document.createElement('div');
                changeDescription.className = 'change-description';
                changeDescription.textContent = change.description;
                
                const changeLocation = document.createElement('div');
                changeLocation.className = 'change-location';
                changeLocation.textContent = change.location;
                
                changeItem.appendChild(changeDate);
                changeItem.appendChild(changeType);
                changeItem.appendChild(changeDescription);
                changeItem.appendChild(changeLocation);
                
                changesList.appendChild(changeItem);
            });
            
            cambiosView.appendChild(changesList);
        }
        
        // Content is already in DOM, no need to re-add
    }

    async getRecentChanges() {
        console.log('Getting recent changes...');
        const now = Date.now(); // Fix the undefined variable
        const changes = [];
        
        // Check if we're on localhost (GitHub API will fail)
        const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        
        if (isLocalhost) {
            console.log('Running on localhost - using mock data and localStorage');
            
            // Create some mock recent changes for localhost testing
            const mockChanges = this.createMockRecentChanges();
            changes.push(...mockChanges);
            
            // Also include any localStorage changes (from comments, etc.)
            const localChanges = JSON.parse(localStorage.getItem('recentChanges') || '[]');
            localChanges.forEach(change => {
                changes.push({
                    date: new Date(change.timestamp).toLocaleString(),
                    type: change.type,
                    typeLabel: change.type === 'comment' ? 'Comentario' : 'Archivo Nuevo',
                    description: change.type === 'comment' 
                        ? `"${change.description.substring(0, 100)}${change.description.length > 100 ? '...' : ''}"` 
                        : change.description,
                    location: change.location,
                    timestamp: change.timestamp
                });
            });
            
        } else {
            console.log('Running on deployed site - trying GitHub API...');
            
            try {
                // Get recent commits from GitHub (only works when deployed)
                const recentCommits = await this.getRecentCommitsFromGitHubFast();
                console.log('Recent commits found:', recentCommits.length);
                recentCommits.forEach(commit => {
                    changes.push({
                        date: new Date(commit.timestamp).toLocaleString(),
                        type: 'file',
                        typeLabel: 'Archivo Agregado',
                        description: commit.description,
                        location: commit.location,
                        timestamp: commit.timestamp
                    });
                });

                // Get recent comments from GitHub Issues
                const recentIssueComments = await this.getRecentIssueComments();
                console.log('Recent issue comments found:', recentIssueComments.length);
                recentIssueComments.forEach(comment => {
                    changes.push({
                        date: new Date(comment.timestamp).toLocaleString(),
                        type: 'comment',
                        typeLabel: 'Comentario',
                        description: comment.description,
                        location: comment.location,
                        timestamp: comment.timestamp
                    });
                });

            } catch (error) {
                console.error('GitHub API failed, falling back to localStorage:', error);
                
                // Fallback to localStorage and mock data
                const mockChanges = this.createMockRecentChanges();
                changes.push(...mockChanges);
                
                const localChanges = JSON.parse(localStorage.getItem('recentChanges') || '[]');
                localChanges.forEach(change => {
                    changes.push({
                        date: new Date(change.timestamp).toLocaleString(),
                        type: change.type,
                        typeLabel: change.type === 'comment' ? 'Comentario' : 'Archivo Nuevo',
                        description: change.type === 'comment' 
                            ? `"${change.description.substring(0, 100)}${change.description.length > 100 ? '...' : ''}"` 
                            : change.description,
                        location: change.location,
                        timestamp: change.timestamp
                    });
                });
            }
        }
        
        // Sort by timestamp, newest first
        changes.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        // Limit to last 50 changes
        const finalChanges = changes.slice(0, 50);
        
        console.log('Final changes to display:', finalChanges.length);
        return finalChanges;
    }

    createMockRecentChanges() {
        // Create some realistic mock data for localhost testing
        const now = Date.now();
        const mockChanges = [
            {
                date: new Date(now - 1000 * 60 * 30).toLocaleString(), // 30 minutes ago
                type: 'file',
                typeLabel: 'Archivo Agregado',
                description: 'C1S1-main-compressed.mp3',
                location: 'Introducción a la Economía - S1',
                timestamp: new Date(now - 1000 * 60 * 30).toISOString()
            },
            {
                date: new Date(now - 1000 * 60 * 60 * 2).toLocaleString(), // 2 hours ago
                type: 'comment',
                typeLabel: 'Comentario',
                description: '"Necesita revisión del audio en la parte final"',
                location: 'Capítulo 2 - S3',
                timestamp: new Date(now - 1000 * 60 * 60 * 2).toISOString()
            },
            {
                date: new Date(now - 1000 * 60 * 60 * 6).toLocaleString(), // 6 hours ago
                type: 'file',
                typeLabel: 'Archivo Agregado',
                description: 'C2S4-description.txt',
                location: 'Microeconomía - S4',
                timestamp: new Date(now - 1000 * 60 * 60 * 6).toISOString()
            },
            {
                date: new Date(now - 1000 * 60 * 60 * 24).toLocaleString(), // 1 day ago
                type: 'comment',
                typeLabel: 'Comentario',
                description: '"Audio aprobado, listo para publicación"',
                location: 'Capítulo 1 - S7',
                timestamp: new Date(now - 1000 * 60 * 60 * 24).toISOString()
            },
            {
                date: new Date(now - 1000 * 60 * 60 * 24 * 2).toLocaleString(), // 2 days ago
                type: 'file',
                typeLabel: 'Archivo Agregado',
                description: 'C3S2-main-autonoe-sadaltager.mp3',
                location: 'Macroeconomía - S2',
                timestamp: new Date(now - 1000 * 60 * 60 * 24 * 2).toISOString()
            }
        ];
        
        console.log('Created mock changes for localhost:', mockChanges.length);
        return mockChanges;
    }

    async getAllComments() {
        const allComments = [];
        const commentsData = await this.githubApi.getFileContent('file_comments.json');
        
        for (const [filePath, comments] of Object.entries(commentsData)) {
            comments.forEach(comment => {
                allComments.push({
                    ...comment,
                    filePath: filePath,
                    fileName: filePath.split('/').pop(),
                    chapterTitle: this.getChapterTitleFromPath(filePath)
                });
            });
        }
        
        return allComments;
    }

    trackRecentChange(changeData) {
        const recentChanges = JSON.parse(localStorage.getItem('recentChanges') || '[]');
        
        // Add the new change
        recentChanges.unshift({
            ...changeData,
            id: Date.now() + Math.random(), // Simple unique ID
            timestamp: changeData.timestamp || new Date().toISOString()
        });
        
        // Keep only last 100 changes
        const limitedChanges = recentChanges.slice(0, 100);
        
        localStorage.setItem('recentChanges', JSON.stringify(limitedChanges));
        console.log('Tracked recent change:', changeData.type, changeData.description.substring(0, 50));
    }

    getRecentFileAdditions() {
        // Get tracked changes from localStorage
        const recentChanges = JSON.parse(localStorage.getItem('recentChanges') || '[]');
        return recentChanges
            .filter(change => change.type === 'file')
            .filter(change => {
                const fileAge = Date.now() - new Date(change.timestamp).getTime();
                return fileAge < (7 * 24 * 60 * 60 * 1000); // Last 7 days
            });
    }

    // Track when audio files are detected as new (you can call this when scanning for new files)
    trackNewAudioFile(filePath, fileName, location) {
        this.trackRecentChange({
            type: 'file',
            description: `Nuevo archivo de audio: ${fileName}`,
            location: location,
            filePath: filePath,
            fileName: fileName
        });
    }

    async getRecentCommitsFromGitHubFast() {
        try {
            console.log(`Fetching commits from: https://api.github.com/repos/${this.githubApi.owner}/${this.githubApi.repo}/commits`);
            
            // Use GitHub API to get recent commits (just basic info, no details)
            const response = await fetch(`https://api.github.com/repos/${this.githubApi.owner}/${this.githubApi.repo}/commits?per_page=20`, {
                headers: {
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            
            console.log('GitHub commits response status:', response.status);
            
            if (!response.ok) {
                throw new Error(`GitHub API error: ${response.status}`);
            }
            
            const commits = await response.json();
            console.log('Raw commits received:', commits.length);
            const recentCommits = [];
            
            // Process commits without fetching individual details (much faster)
            commits.forEach((commit, index) => {
                const commitMessage = commit.commit.message;
                const commitDate = commit.commit.author.date;
                
                console.log(`Processing commit ${index + 1}: ${commitMessage.substring(0, 50)}...`);
                
                // Always show the commit, but try to extract file info if available
                const audioFilePattern = /(\S+\.mp3)|(\S+\.txt)|(\S+\.json)/gi;
                const fileMatches = commitMessage.match(audioFilePattern);
                
                if (fileMatches) {
                    fileMatches.forEach(fileName => {
                        // Extract just the filename without path
                        const cleanFileName = fileName.split('/').pop();
                        
                        recentCommits.push({
                            description: `Archivo: ${cleanFileName}`,
                            location: this.guessLocationFromCommitMessage(commitMessage, cleanFileName),
                            timestamp: commitDate,
                            commitMessage: commitMessage
                        });
                    });
                } else {
                    // Show the commit message itself
                    recentCommits.push({
                        description: commitMessage.length > 80 ? commitMessage.substring(0, 80) + '...' : commitMessage,
                        location: this.guessLocationFromCommitMessage(commitMessage, ''),
                        timestamp: commitDate,
                        commitMessage: commitMessage
                    });
                }
            });
            
            console.log('Processed commits result:', recentCommits.length);
            return recentCommits.slice(0, 20); // Limit to 20 most recent
            
        } catch (error) {
            console.error('Error fetching commits from GitHub:', error);
            return [];
        }
    }

    getDateDaysAgo(days) {
        const date = new Date();
        date.setDate(date.getDate() - days);
        return date.toISOString();
    }

    guessLocationFromCommitMessage(message, fileName) {
        // Simple pattern matching to guess location from commit message
        const chapterPattern = /[Cc](\d+)/;
        const sectionPattern = /[Ss](\d+)/;
        
        const chapterMatch = message.match(chapterPattern);
        const sectionMatch = message.match(sectionPattern);
        
        let location = 'General';
        
        if (chapterMatch) {
            const chapterNum = parseInt(chapterMatch[1]);
            const chapter = this.bookStructure?.chapters?.find(ch => ch.id === `C${chapterNum}`);
            location = chapter ? chapter.title : `C${chapterNum}`;
            
            if (sectionMatch) {
                location += ` - S${sectionMatch[1]}`;
            }
        } else if (fileName.includes('C') && fileName.includes('S')) {
            // Try to extract from filename like "C1S2-main.mp3"
            const filePattern = /C(\d+)S(\d+)/;
            const match = fileName.match(filePattern);
            if (match) {
                const chapterNum = parseInt(match[1]);
                const sectionNum = parseInt(match[2]);
                const chapter = this.bookStructure?.chapters?.find(ch => ch.id === `C${chapterNum}`);
                location = chapter ? `${chapter.title} - S${sectionNum}` : `C${chapterNum} - S${sectionNum}`;
            }
        }
        
        return location;
    }

    async getRecentIssueComments() {
        try {
            // Get recent issues comments
            const response = await fetch(`https://api.github.com/repos/${this.githubApi.owner}/${this.githubApi.repo}/issues/comments?per_page=50&sort=created&direction=desc`, {
                headers: {
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`GitHub API error: ${response.status}`);
            }
            
            const comments = await response.json();
            const recentComments = [];
            
            comments.forEach(comment => {
                const commentDate = new Date(comment.created_at);
                const cutoffDate = new Date();
                cutoffDate.setDate(cutoffDate.getDate() - 30); // Last 30 days
                
                if (commentDate >= cutoffDate) {
                    recentComments.push({
                        description: `"${comment.body.substring(0, 100)}${comment.body.length > 100 ? '...' : ''}"`,
                        location: `Issue #${comment.issue_url.split('/').pop()}`,
                        timestamp: comment.created_at,
                        author: comment.user.login
                    });
                }
            });
            
            return recentComments;
            
        } catch (error) {
            console.error('Error fetching issue comments from GitHub:', error);
            return [];
        }
    }

    getLocationFromFilePath(filePath) {
        const pathParts = filePath.split('/');
        
        if (pathParts.includes('book1')) {
            // Extract chapter and section info
            const bookIndex = pathParts.indexOf('book1');
            if (bookIndex + 1 < pathParts.length) {
                const chapterPart = pathParts[bookIndex + 1]; // e.g., "C1", "C2"
                let location = chapterPart;
                
                if (bookIndex + 2 < pathParts.length) {
                    const sectionPart = pathParts[bookIndex + 2]; // e.g., "S1", "S2"
                    if (sectionPart.startsWith('S')) {
                        location += ` - ${sectionPart}`;
                    }
                }
                
                // Get chapter title if available
                if (this.bookStructure) {
                    const chapter = this.bookStructure.chapters.find(ch => ch.id === chapterPart);
                    if (chapter) {
                        location = chapter.title;
                        if (bookIndex + 2 < pathParts.length) {
                            const sectionPart = pathParts[bookIndex + 2];
                            if (sectionPart.startsWith('S')) {
                                location += ` - ${sectionPart}`;
                            }
                        }
                    }
                }
                
                return location;
            }
        }
        
        return filePath.includes('/') ? filePath.substring(0, filePath.lastIndexOf('/')) : 'Root';
    }

    getChapterTitleFromPath(filePath) {
        // Extract chapter info from file path
        const pathParts = filePath.split('/');
        if (pathParts.length >= 2) {
            const chapterPart = pathParts[1]; // e.g., "C1", "C2"
            const chapter = this.bookStructure.chapters.find(ch => ch.id === chapterPart);
            return chapter ? chapter.title : chapterPart;
        }
        return 'Desconocido';
    }

    renderUltimosCambiosError() {
        const content = document.getElementById('chapter-content');
        content.innerHTML = `
            <div class="ultimos-cambios-view">
                <h1 class="cambios-title-main">ULTIMOS CAMBIOS: Error</h1>
                <div class="cambios-description">
                    <p><strong>Error:</strong> No se pudo cargar la vista de últimos cambios.</p>
                    <p>Por favor, inténtalo de nuevo más tarde.</p>
                </div>
            </div>
        `;
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

    // To-Do V2 functionality
    async loadTodoV2View() {
        try {
            // Update active nav item
            document.querySelectorAll('.sidebar nav a').forEach(a => a.classList.remove('active'));
            event.target.classList.add('active');
            
            await this.renderTodoV2Content();
            this.currentChapter = null;
            this.currentSection = null;
        } catch (error) {
            console.error('Error loading Indice view:', error);
            this.renderTodoV2Error();
        }
    }

    async renderTodoV2Content() {
        const content = document.getElementById('chapter-content');
        const contentContainer = content.parentElement;
        
        // Add class to make content wider
        contentContainer.classList.add('todo-view');
        
        const todoV2View = document.createElement('div');
        todoV2View.className = 'todo-v2-content-view';
        
        const title = document.createElement('h1');
        title.className = 'todo-v2-title-main';
        title.textContent = 'Indice';
        todoV2View.appendChild(title);
        
        // Create the tree structure
        const treeContainer = document.createElement('div');
        treeContainer.className = 'todo-v2-tree';
        treeContainer.style.backgroundColor = '#fafafa';
        treeContainer.style.border = '1px solid #e8eaed';
        treeContainer.style.borderRadius = '8px';
        treeContainer.style.padding = '16px';
        treeContainer.style.marginTop = '20px';
        
        this.renderTodoV2Tree(treeContainer);
        
        todoV2View.appendChild(treeContainer);
        
        content.innerHTML = '';
        content.appendChild(todoV2View);
        
        // Reset padding for todo v2 view (no fixed header)
        content.style.paddingTop = '20px';
    }

    renderTodoV2Tree(container) {
        if (!this.bookStructure || !this.bookStructure.chapters) {
            container.innerHTML = '<p>No se pudo cargar la estructura del libro</p>';
            return;
        }

        // Book level
        const bookItem = this.createTodoV2Item('book', this.bookStructure.title, 'book', null, null);
        container.appendChild(bookItem);
        
        // Chapters level
        const chaptersContainer = document.createElement('div');
        chaptersContainer.className = 'todo-v2-level-1';
        chaptersContainer.style.marginLeft = '24px';
        chaptersContainer.style.borderLeft = '2px solid #e8eaed';
        chaptersContainer.style.paddingLeft = '16px';
        
        this.bookStructure.chapters.forEach(chapter => {
            const chapterItem = this.createTodoV2Item('chapter', chapter.title, chapter.id, chapter, null);
            chaptersContainer.appendChild(chapterItem);
            
            // Sections level
            if (chapter.sections && chapter.sections.length > 0) {
                const sectionsContainer = document.createElement('div');
                sectionsContainer.className = 'todo-v2-level-2';
                sectionsContainer.style.marginLeft = '24px';
                sectionsContainer.style.borderLeft = '2px solid #f1f3f4';
                sectionsContainer.style.paddingLeft = '16px';
                sectionsContainer.style.marginTop = '4px';
                sectionsContainer.style.marginBottom = '8px';
                
                chapter.sections.forEach(section => {
                    const sectionItem = this.createTodoV2Item('section', section.title, `${chapter.id}-${section.id}`, chapter, section);
                    sectionsContainer.appendChild(sectionItem);
                });
                
                chaptersContainer.appendChild(sectionsContainer);
            }
        });
        
        container.appendChild(chaptersContainer);
    }

    createTodoV2Item(type, title, id, chapter, section) {
        const itemContainer = document.createElement('div');
        itemContainer.className = `todo-v2-item todo-v2-item-${type}`;
        itemContainer.style.display = 'flex';
        itemContainer.style.alignItems = 'center';
        itemContainer.style.marginBottom = '6px';
        itemContainer.style.padding = '6px 8px';
        itemContainer.style.borderRadius = '4px';
        itemContainer.style.backgroundColor = type === 'book' ? '#f8f9fa' : type === 'chapter' ? '#f1f3f4' : '#ffffff';
        itemContainer.style.border = '1px solid #e8eaed';
        
        // Title (clickable)
        const titleSpan = document.createElement('span');
        titleSpan.className = 'todo-v2-title';
        titleSpan.textContent = title;
        titleSpan.style.cursor = type === 'book' ? 'default' : 'pointer';
        titleSpan.style.marginRight = '20px';
        titleSpan.style.flex = '1';
        titleSpan.style.minWidth = '250px';
        titleSpan.style.maxWidth = '300px';
        titleSpan.style.color = '#333';
        titleSpan.style.fontWeight = type === 'book' ? 'bold' : type === 'chapter' ? '600' : 'normal';
        titleSpan.style.fontSize = type === 'book' ? '16px' : type === 'chapter' ? '14px' : '13px';
        titleSpan.style.textDecoration = type === 'book' ? 'none' : 'underline';
        
        // Add click handler for navigation
        if (type !== 'book') {
            titleSpan.onclick = () => {
                if (type === 'section' && chapter && section) {
                    this.navigateToSectionFromTodoV2(chapter, section);
                } else if (type === 'chapter' && chapter) {
                    this.navigateToChapterFromTodoV2(chapter);
                }
            };
        }
        
        itemContainer.appendChild(titleSpan);
        
        // Properties container (replacing old button system)
        if (type !== 'book') {
            const propertiesContainer = this.createPropertiesContainer(type, chapter, section);
            itemContainer.appendChild(propertiesContainer);
        }
        
        // Comments container (add to all items including book)
        const commentsContainer = this.createIndexCommentsContainer(type, chapter, section);
        itemContainer.appendChild(commentsContainer);
        
        return itemContainer;
    }

    createPropertiesContainer(type, chapter, section) {
        const container = document.createElement('div');
        container.className = 'todo-v2-properties';
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.gap = '8px';
        container.style.alignItems = 'flex-end';
        
        // Get available properties for this chapter/section
        const chapterId = chapter.id;
        const sectionId = section ? section.id : null;
        const properties = this.getAvailableProperties(chapterId, sectionId);
        
        if (properties.length === 0) {
            // No properties available
            const noPropsSpan = document.createElement('span');
            noPropsSpan.textContent = 'No hay propiedades';
            noPropsSpan.style.fontSize = '11px';
            noPropsSpan.style.color = '#999';
            noPropsSpan.style.fontStyle = 'italic';
            container.appendChild(noPropsSpan);
        } else {
            // Create property items
            properties.forEach(property => {
                const propertyItem = this.createPropertyItem(chapterId, sectionId, property);
                container.appendChild(propertyItem);
            });
        }
        
        return container;
    }

    createPropertyItem(chapterId, sectionId, property) {
        const propertyContainer = document.createElement('div');
        propertyContainer.className = 'todo-v2-property-item';
        propertyContainer.style.display = 'flex';
        propertyContainer.style.alignItems = 'center';
        propertyContainer.style.gap = '8px';
        propertyContainer.style.fontSize = '11px';
        
        // Property name
        const propertyName = document.createElement('span');
        propertyName.textContent = property + ':';
        propertyName.style.color = '#666';
        propertyName.style.fontWeight = '500';
        propertyName.style.minWidth = '80px';
        propertyName.style.textAlign = 'right';
        
        // Check if there's an assigned audio file
        const assignedAudio = this.getAssignedAudioFile(chapterId, sectionId, property);
        const hasAssignment = !!assignedAudio;
        
        // Create buttons for this property
        const buttonsContainer = document.createElement('div');
        buttonsContainer.className = 'todo-v2-property-buttons';
        buttonsContainer.style.display = 'flex';
        buttonsContainer.style.gap = '4px';
        
        const okBtn = this.createPropertyButton('OK', chapterId, sectionId, property, 'ok', hasAssignment);
        const notOkBtn = this.createPropertyButton('NOT OK', chapterId, sectionId, property, 'notok', hasAssignment);
        const confirmarBtn = this.createPropertyButton('CONFIRMAR', chapterId, sectionId, property, 'confirmar', hasAssignment);
        
        buttonsContainer.appendChild(okBtn);
        buttonsContainer.appendChild(notOkBtn);
        buttonsContainer.appendChild(confirmarBtn);
        
        propertyContainer.appendChild(propertyName);
        propertyContainer.appendChild(buttonsContainer);
        
        return propertyContainer;
    }

    createPropertyButton(text, chapterId, sectionId, property, buttonType, isEnabled) {
        const button = document.createElement('span');
        button.textContent = text;
        button.className = `todo-v2-property-button todo-v2-property-button-${buttonType}`;
        button.style.fontSize = '9px';
        button.style.padding = '2px 4px';
        button.style.borderRadius = '3px';
        button.style.transition = 'all 0.15s ease';
        button.style.border = '1px solid #ddd';
        button.style.minWidth = '28px';
        button.style.textAlign = 'center';
        button.style.userSelect = 'none';
        button.style.lineHeight = '1';
        
        if (isEnabled) {
            // Get the assigned audio file and check its status
            const assignedAudio = this.getAssignedAudioFile(chapterId, sectionId, property);
            const audioFilePath = this.getAudioFilePath(chapterId, sectionId, assignedAudio);
            
            button.style.cursor = 'pointer';
            
            // Check the status of the assigned audio file
            let isActive = false;
            if (audioFilePath) {
                switch (buttonType) {
                    case 'ok':
                        isActive = this.isFileCompleted(audioFilePath);
                        break;
                    case 'notok':
                        isActive = this.isFileNotCompleted && this.isFileNotCompleted(audioFilePath);
                        break;
                    case 'confirmar':
                        isActive = this.isFileConfirmed(audioFilePath);
                        break;
                }
            }
            
            // Set button style based on status
            this.setPropertyButtonStyle(button, buttonType, isActive, true);
            
            // Add click handler
            button.onclick = () => {
                this.togglePropertyButtonStatus(chapterId, sectionId, property, buttonType, audioFilePath);
            };
        } else {
            // Disabled state - no audio file assigned
            button.style.cursor = 'not-allowed';
            button.style.backgroundColor = '#f5f5f5';
            button.style.color = '#ccc';
            button.style.borderColor = '#e5e5e5';
            button.style.opacity = '0.6';
            
            // Add tooltip
            button.title = 'No hay archivo de audio asignado a esta propiedad';
        }
        
        return button;
    }

    getAudioFilePath(chapterId, sectionId, audioFileName) {
        if (!audioFileName) return null;
        return sectionId ? `book1/${chapterId}/${sectionId}/${audioFileName}` : `book1/${chapterId}/${audioFileName}`;
    }

    setPropertyButtonStyle(button, buttonType, isActive, isEnabled) {
        if (!isEnabled) {
            // Disabled style already set in createPropertyButton
            return;
        }
        
        if (isActive) {
            // Extract the base button type (remove set prefix if present)
            const baseType = buttonType.includes('-') ? buttonType.split('-').pop() : buttonType;
            
            switch (baseType) {
                case 'ok':
                    button.style.backgroundColor = '#00C851';
                    button.style.color = 'white';
                    button.style.fontWeight = '600';
                    button.style.borderColor = '#00C851';
                    button.style.boxShadow = '0 1px 2px rgba(0,200,81,0.3)';
                    break;
                case 'notok':
                    button.style.backgroundColor = '#CC0000';
                    button.style.color = 'white';
                    button.style.fontWeight = '600';
                    button.style.borderColor = '#CC0000';
                    button.style.boxShadow = '0 1px 2px rgba(204,0,0,0.3)';
                    break;
                case 'confirmar':
                    button.style.backgroundColor = '#333333';
                    button.style.color = 'white';
                    button.style.fontWeight = '600';
                    button.style.borderColor = '#333333';
                    button.style.boxShadow = '0 1px 2px rgba(51,51,51,0.3)';
                    break;
            }
        } else {
            // Default/inactive state
            button.style.backgroundColor = 'transparent';
            button.style.color = '#666';
            button.style.fontWeight = 'normal';
            button.style.borderColor = '#ddd';
            button.style.boxShadow = 'none';
        }
    }

    togglePropertyButtonStatus(chapterId, sectionId, property, buttonType, audioFilePath) {
        if (!audioFilePath) return;
        
        let currentStatus = false;
        
        // Get current status
        switch (buttonType) {
            case 'ok':
                currentStatus = this.isFileCompleted(audioFilePath);
                break;
            case 'notok':
                currentStatus = this.isFileNotCompleted && this.isFileNotCompleted(audioFilePath);
                break;
            case 'confirmar':
                currentStatus = this.isFileConfirmed(audioFilePath);
                break;
        }
        
        const newStatus = !currentStatus;
        const audioFileName = audioFilePath.split('/').pop();
        
        // Update the status
        switch (buttonType) {
            case 'ok':
                this.markFileAsCompleted(audioFilePath, audioFileName, newStatus);
                if (newStatus && this.isFileNotCompleted && this.isFileNotCompleted(audioFilePath)) {
                    this.markFileAsNotCompleted(audioFilePath, audioFileName, false);
                }
                break;
            case 'notok':
                if (newStatus) {
                    // Ensure not completed functionality exists
                    if (!this.markFileAsNotCompleted) {
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
                    }
                }
                this.markFileAsNotCompleted(audioFilePath, audioFileName, newStatus);
                if (newStatus && this.isFileCompleted(audioFilePath)) {
                    this.markFileAsCompleted(audioFilePath, audioFileName, false);
                }
                break;
            case 'confirmar':
                this.markFileAsConfirmed(audioFilePath, audioFileName, newStatus);
                break;
        }
        
        // Refresh the entire Indice view to update all button states
        setTimeout(() => this.refreshIndiceView(), 100);
        
        // Also refresh the current section view if open
        setTimeout(() => this.refreshCurrentSectionView(), 100);
    }

    refreshIndiceView() {
        // Check if we're currently in the Indice view
        if (document.querySelector('.todo-v2-content-view')) {
            this.renderTodoV2Content();
        }
    }

    refreshCurrentSectionView() {
        // Refresh the current section/chapter view if we're not in Indice
        if (!document.querySelector('.todo-v2-content-view')) {
            if (this.currentSection && this.currentChapter) {
                this.loadSection(this.currentChapter, this.currentSection);
            } else if (this.currentChapter) {
                this.loadChapter(this.currentChapter);
            }
        }
    }

    synchronizeWithIndice() {
        // Update todo completion styles if in old To-Do view
        if (document.querySelector('.todo-content-view')) {
            this.updateTodoCompletionStyles();
        }
        
        // Refresh Indice view if it's open
        setTimeout(() => this.refreshIndiceView(), 50);
    }

    createTodoV2ButtonSet(itemId, setType) {
        const setContainer = document.createElement('div');
        setContainer.className = 'todo-v2-button-set';
        setContainer.style.display = 'flex';
        setContainer.style.gap = '4px';
        
        // Create OK, NOT OK, CONFIRMAR buttons for this set
        const prefix = setType ? `${setType}-` : '';
        const okBtn = this.createTodoV2Button('OK', itemId, `${prefix}ok`);
        const notOkBtn = this.createTodoV2Button('NOT OK', itemId, `${prefix}notok`);
        const confirmarBtn = this.createTodoV2Button('CONFIRMAR', itemId, `${prefix}confirmar`);
        
        setContainer.appendChild(okBtn);
        setContainer.appendChild(notOkBtn);
        setContainer.appendChild(confirmarBtn);
        
        return setContainer;
    }

    createTodoV2Button(text, itemId, buttonType) {
        const button = document.createElement('span');
        button.textContent = text;
        button.className = `todo-v2-button todo-v2-button-${buttonType}`;
        button.style.fontSize = '10px';
        button.style.cursor = 'pointer';
        button.style.padding = '3px 6px';
        button.style.borderRadius = '4px';
        button.style.transition = 'all 0.15s ease';
        button.style.border = '1px solid #ddd';
        button.style.minWidth = '35px';
        button.style.textAlign = 'center';
        button.style.userSelect = 'none';
        button.style.lineHeight = '1';
        
        // Set initial state
        const isActive = this.getTodoV2Status(itemId, buttonType);
        this.setTodoV2ButtonStyle(button, buttonType, isActive);
        
        // Add hover effect
        button.onmouseenter = () => {
            if (!this.getTodoV2Status(itemId, buttonType)) {
                button.style.backgroundColor = '#f5f5f5';
                button.style.borderColor = '#ccc';
            }
        };
        
        button.onmouseleave = () => {
            if (!this.getTodoV2Status(itemId, buttonType)) {
                button.style.backgroundColor = 'transparent';
                button.style.borderColor = '#ddd';
            }
        };
        
        // Add click handler
        button.onclick = async () => {
            const currentState = this.getTodoV2Status(itemId, buttonType);
            const newState = !currentState;
            
            // Update state
            await this.setTodoV2Status(itemId, buttonType, newState);
            
            // Update visual style
            this.setTodoV2ButtonStyle(button, buttonType, newState);
        };
        
        return button;
    }

    setTodoV2ButtonStyle(button, buttonType, isActive) {
        if (isActive) {
            // Extract the base button type (remove set prefix if present)
            const baseType = buttonType.includes('-') ? buttonType.split('-').pop() : buttonType;
            
            switch (baseType) {
                case 'ok':
                    button.style.backgroundColor = '#00C851';
                    button.style.color = 'white';
                    button.style.fontWeight = '600';
                    button.style.borderColor = '#00C851';
                    button.style.boxShadow = '0 1px 3px rgba(0,200,81,0.3)';
                    break;
                case 'notok':
                    button.style.backgroundColor = '#CC0000';
                    button.style.color = 'white';
                    button.style.fontWeight = '600';
                    button.style.borderColor = '#CC0000';
                    button.style.boxShadow = '0 1px 3px rgba(204,0,0,0.3)';
                    break;
                case 'confirmar':
                    button.style.backgroundColor = '#333333';
                    button.style.color = 'white';
                    button.style.fontWeight = '600';
                    button.style.borderColor = '#333333';
                    button.style.boxShadow = '0 1px 3px rgba(51,51,51,0.3)';
                    break;
            }
        } else {
            // Default/inactive state
            button.style.backgroundColor = 'transparent';
            button.style.color = '#666';
            button.style.fontWeight = 'normal';
            button.style.borderColor = '#ddd';
            button.style.boxShadow = 'none';
        }
    }

    getTodoV2Status(itemId, buttonType) {
        if (!this.todoV2Status[itemId]) {
            return false;
        }
        return this.todoV2Status[itemId][buttonType] || false;
    }

    async setTodoV2Status(itemId, buttonType, isActive) {
        if (!this.todoV2Status[itemId]) {
            this.todoV2Status[itemId] = {};
        }
        
        if (isActive) {
            this.todoV2Status[itemId][buttonType] = true;
        } else {
            delete this.todoV2Status[itemId][buttonType];
            
            // Clean up empty objects
            if (Object.keys(this.todoV2Status[itemId]).length === 0) {
                delete this.todoV2Status[itemId];
            }
        }
        
        // Save to storage
        await this.saveTodoV2Status();
    }

    async saveTodoV2Status() {
        try {
            const success = await this.githubApi.updateFile('todo_v2_status.json', this.todoV2Status, 'Update Todo V2 status');
            if (!success) {
                console.error('Failed to save Todo V2 status to GitHub - data not shared!');
            }
        } catch (error) {
            console.error('Could not save Todo V2 status to GitHub:', error);
        }
    }

    async savePropertyAssignments() {
        try {
            const success = await this.githubApi.updateFile('property_assignments.json', this.propertyAssignments, 'Update property assignments');
            if (!success) {
                console.error('Failed to save property assignments to GitHub - data not shared!');
            }
        } catch (error) {
            console.error('Could not save property assignments to GitHub:', error);
        }
    }

    // Property assignment helper functions
    getAvailableProperties(chapterId, sectionId = null) {
        const key = sectionId ? `${chapterId}-${sectionId}` : chapterId;
        return this.textManifestData[key] || [];
    }

    getPropertyKey(chapterId, sectionId, property) {
        return sectionId ? `${chapterId}-${sectionId}-${property}` : `${chapterId}-${property}`;
    }

    assignAudioToProperty(chapterId, sectionId, property, audioFileName) {
        const propertyKey = this.getPropertyKey(chapterId, sectionId, property);
        
        // Remove any existing assignment for this property
        this.unassignProperty(propertyKey);
        
        // Assign the audio file to the property
        this.propertyAssignments[propertyKey] = audioFileName;
        
        console.log(`Assigned ${audioFileName} to property ${propertyKey}`);
        this.savePropertyAssignments();
    }

    unassignProperty(propertyKey) {
        if (this.propertyAssignments[propertyKey]) {
            console.log(`Unassigned property ${propertyKey} from ${this.propertyAssignments[propertyKey]}`);
            delete this.propertyAssignments[propertyKey];
            this.savePropertyAssignments();
        }
    }

    getAssignedAudioFile(chapterId, sectionId, property) {
        const propertyKey = this.getPropertyKey(chapterId, sectionId, property);
        return this.propertyAssignments[propertyKey] || null;
    }

    isAudioFileAssigned(audioFileName) {
        return Object.values(this.propertyAssignments).includes(audioFileName);
    }

    getPropertyForAudioFile(audioFileName) {
        for (const [propertyKey, assignedFile] of Object.entries(this.propertyAssignments)) {
            if (assignedFile === audioFileName) {
                return propertyKey;
            }
        }
        return null;
    }

    navigateToSectionFromTodoV2(chapter, section) {
        console.log(`Navigating from Indice to ${chapter.id}-${section.id}: ${section.title}`);
        
        // Update active nav item - remove active from Indice and add to the section
        document.querySelectorAll('.sidebar nav a').forEach(a => a.classList.remove('active'));
        
        // Find and activate the corresponding section link in the sidebar
        const sectionLinks = document.querySelectorAll('.section-link');
        sectionLinks.forEach(link => {
            if (link.getAttribute('data-chapter-id') === chapter.id && 
                link.getAttribute('data-section-id') === section.id) {
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

    navigateToChapterFromTodoV2(chapter) {
        console.log(`Navigating from Indice to chapter ${chapter.id}: ${chapter.title}`);
        
        // Update active nav item - remove active from Indice and add to the chapter
        document.querySelectorAll('.sidebar nav a').forEach(a => a.classList.remove('active'));
        
        // Find and activate the corresponding chapter link in the sidebar
        const chapterLinks = document.querySelectorAll('.chapter-link');
        chapterLinks.forEach(link => {
            if (link.getAttribute('data-chapter-id') === chapter.id) {
                link.classList.add('active');
            }
        });
        
        // Load the chapter content
        this.loadChapter(chapter);
    }

    createIndexCommentsContainer(type, chapter, section) {
        const commentsContainer = document.createElement('div');
        commentsContainer.className = 'index-comments-container';
        commentsContainer.style.marginLeft = 'auto'; // Push to the right
        commentsContainer.style.display = 'flex';
        commentsContainer.style.alignItems = 'center';
        commentsContainer.style.gap = '8px';
        
        // Get comments for this item
        const comments = this.getCommentsForIndexItem(type, chapter, section);
        
        if (comments.length === 0) {
            return commentsContainer; // Return empty container if no comments
        }
        
        // Create comments toggle button
        const commentsToggle = document.createElement('button');
        commentsToggle.className = 'index-comments-toggle';
        commentsToggle.textContent = `💬 ${comments.length}`;
        commentsToggle.title = `${comments.length} comentario${comments.length !== 1 ? 's' : ''}`;
        
        // Style the toggle button
        commentsToggle.style.background = 'none';
        commentsToggle.style.border = '1px solid #ddd';
        commentsToggle.style.borderRadius = '12px';
        commentsToggle.style.padding = '4px 8px';
        commentsToggle.style.fontSize = '11px';
        commentsToggle.style.cursor = 'pointer';
        commentsToggle.style.color = '#666';
        commentsToggle.style.transition = 'all 0.2s ease';
        
        // Hover effects
        commentsToggle.addEventListener('mouseenter', () => {
            commentsToggle.style.backgroundColor = '#f0f0f0';
            commentsToggle.style.borderColor = '#999';
        });
        
        commentsToggle.addEventListener('mouseleave', () => {
            commentsToggle.style.backgroundColor = 'transparent';
            commentsToggle.style.borderColor = '#ddd';
        });
        
        // Create comments dropdown (initially hidden)
        const commentsDropdown = document.createElement('div');
        commentsDropdown.className = 'index-comments-dropdown';
        commentsDropdown.style.position = 'absolute';
        commentsDropdown.style.right = '0';
        commentsDropdown.style.top = '100%';
        commentsDropdown.style.marginTop = '4px';
        commentsDropdown.style.backgroundColor = 'white';
        commentsDropdown.style.border = '1px solid #ddd';
        commentsDropdown.style.borderRadius = '6px';
        commentsDropdown.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
        commentsDropdown.style.padding = '8px';
        commentsDropdown.style.minWidth = '250px';
        commentsDropdown.style.maxWidth = '350px';
        commentsDropdown.style.zIndex = '1000';
        commentsDropdown.style.display = 'none';
        
        // Populate comments dropdown
        comments.forEach((comment, index) => {
            const commentItem = document.createElement('div');
            commentItem.className = 'index-comment-item';
            commentItem.style.padding = '6px 0';
            commentItem.style.borderBottom = index < comments.length - 1 ? '1px solid #eee' : 'none';
            commentItem.style.fontSize = '12px';
            commentItem.style.lineHeight = '1.4';
            
            const commentText = document.createElement('div');
            commentText.textContent = comment.comment;
            commentText.style.color = '#333';
            commentText.style.marginBottom = '2px';
            
            const commentMeta = document.createElement('div');
            const date = new Date(comment.timestamp);
            commentMeta.textContent = `${date.toLocaleDateString()} - ${comment.fileName}`;
            commentMeta.style.color = '#999';
            commentMeta.style.fontSize = '10px';
            
            commentItem.appendChild(commentText);
            commentItem.appendChild(commentMeta);
            commentsDropdown.appendChild(commentItem);
        });
        
        // Position the container relatively for dropdown positioning
        commentsContainer.style.position = 'relative';
        
        // Toggle dropdown visibility
        let isDropdownVisible = false;
        commentsToggle.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            isDropdownVisible = !isDropdownVisible;
            commentsDropdown.style.display = isDropdownVisible ? 'block' : 'none';
            
            // Close when clicking outside
            if (isDropdownVisible) {
                const closeDropdown = (event) => {
                    if (!commentsContainer.contains(event.target)) {
                        commentsDropdown.style.display = 'none';
                        isDropdownVisible = false;
                        document.removeEventListener('click', closeDropdown);
                    }
                };
                setTimeout(() => document.addEventListener('click', closeDropdown), 0);
            }
        });
        
        commentsContainer.appendChild(commentsToggle);
        commentsContainer.appendChild(commentsDropdown);
        
        return commentsContainer;
    }

    getCommentsForIndexItem(type, chapter, section) {
        const allComments = [];
        
        if (type === 'book') {
            // For book level, get all comments from all chapters/sections
            Object.values(this.fileComments).forEach(fileComments => {
                allComments.push(...fileComments);
            });
        } else if (type === 'chapter') {
            // For chapter level, get all comments from files in that chapter
            const chapterPrefix = `book1/${chapter.id}/`;
            
            Object.entries(this.fileComments).forEach(([filePath, fileComments]) => {
                if (filePath.startsWith(chapterPrefix)) {
                    allComments.push(...fileComments);
                }
            });
        } else if (type === 'section' && section) {
            // For section level, get comments from files in that specific section
            const sectionPrefix = `book1/${chapter.id}/${section.id}/`;
            
            Object.entries(this.fileComments).forEach(([filePath, fileComments]) => {
                if (filePath.startsWith(sectionPrefix)) {
                    allComments.push(...fileComments);
                }
            });
        }
        
        // Sort by timestamp, newest first
        return allComments.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }

    renderTodoV2Error() {
        const content = document.getElementById('chapter-content');
        content.innerHTML = `
            <div class="todo-v2-content-view">
                <h1 class="todo-v2-title-main">Indice: Error</h1>
                <div class="todo-v2-description">
                    <p><strong>Error:</strong> No se pudo cargar la vista del Indice.</p>
                    <p>Por favor, asegúrate de que la estructura del libro esté cargada correctamente.</p>
                </div>
            </div>
        `;
    }

    async loadAllAudioManifests() {
        console.log('Loading all audio manifests...');
        const startTime = performance.now();
        
        if (!this.bookStructure || !this.bookStructure.chapters) {
            console.warn('Book structure not available for loading audio manifests');
            return;
        }

        // Build list of all paths to load in parallel
        const loadTasks = [];
        
        for (const chapter of this.bookStructure.chapters) {
            // Add chapter-level manifest task
            const chapterPath = `book1/${chapter.id}/`;
            const chapterKey = `${chapter.id}`;
            loadTasks.push({
                key: chapterKey,
                path: chapterPath,
                type: 'chapter',
                chapterId: chapter.id
            });

            // Add section-level manifest tasks
            if (chapter.sections) {
                for (const section of chapter.sections) {
                    const sectionPath = `book1/${chapter.id}/${section.id}/`;
                    const sectionKey = `${chapter.id}-${section.id}`;
                    loadTasks.push({
                        key: sectionKey,
                        path: sectionPath,
                        type: 'section',
                        chapterId: chapter.id,
                        sectionId: section.id
                    });
                }
            }
        }

        console.log(`Loading ${loadTasks.length} audio manifests in parallel...`);

        // Execute all loads in parallel
        const loadPromises = loadTasks.map(async (task) => {
            try {
                const audioFiles = await this.findAllAudioFiles(task.path);
                return {
                    key: task.key,
                    data: audioFiles.map(af => af.name),
                    success: true,
                    task
                };
            } catch (error) {
                console.warn(`Could not load audio manifest for ${task.key}:`, error);
                return {
                    key: task.key,
                    data: [],
                    success: false,
                    task,
                    error
                };
            }
        });

        // Wait for all to complete
        const results = await Promise.all(loadPromises);
        
        // Process results
        results.forEach(result => {
            this.audioManifestData[result.key] = result.data;
        });

        const endTime = performance.now();
        const totalTime = Math.round(endTime - startTime);
        console.log(`Audio manifest data loaded in ${totalTime}ms:`, this.audioManifestData);
    }

    async loadAllTextManifests() {
        console.log('Loading all text manifests...');
        const startTime = performance.now();
        
        if (!this.bookStructure || !this.bookStructure.chapters) {
            console.warn('Book structure not available for loading text manifests');
            return;
        }

        // Build list of all paths to load in parallel
        const loadTasks = [];
        
        for (const chapter of this.bookStructure.chapters) {
            // Add chapter-level manifest task
            const chapterPath = `book1/${chapter.id}/`;
            const chapterKey = `${chapter.id}`;
            loadTasks.push({
                key: chapterKey,
                path: chapterPath,
                type: 'chapter',
                chapterId: chapter.id
            });

            // Add section-level manifest tasks
            if (chapter.sections) {
                for (const section of chapter.sections) {
                    const sectionPath = `book1/${chapter.id}/${section.id}/`;
                    const sectionKey = `${chapter.id}-${section.id}`;
                    loadTasks.push({
                        key: sectionKey,
                        path: sectionPath,
                        type: 'section',
                        chapterId: chapter.id,
                        sectionId: section.id
                    });
                }
            }
        }

        console.log(`Loading ${loadTasks.length} text manifests in parallel...`);

        // Execute all loads in parallel
        const loadPromises = loadTasks.map(async (task) => {
            try {
                const textFiles = await this.findAllTextFiles(task.path);
                return {
                    key: task.key,
                    data: textFiles.map(tf => tf.name),
                    success: true,
                    task
                };
            } catch (error) {
                console.warn(`Could not load text manifest for ${task.key}:`, error);
                return {
                    key: task.key,
                    data: [],
                    success: false,
                    task,
                    error
                };
            }
        });

        // Wait for all to complete
        const results = await Promise.all(loadPromises);
        
        // Process results
        results.forEach(result => {
            this.textManifestData[result.key] = result.data;
        });

        const endTime = performance.now();
        const totalTime = Math.round(endTime - startTime);
        console.log(`Text manifest data loaded in ${totalTime}ms:`, this.textManifestData);
    }

    async findAllTextFiles(folderPath) {
        const manifestPath = `${folderPath}text_manifest.json`;
        try {
            const resp = await fetch(manifestPath, { cache: 'no-cache' });
            if (resp.ok) {
                const list = await resp.json();
                console.log(`Loaded text manifest ${manifestPath}: ${list.length} files -`, list);
                
                return list.map(fn => ({
                    path: folderPath + fn,
                    name: fn,
                    property: fn.replace(/\.txt$/, '') // Remove .txt extension for property name
                }));
            } else {
                console.warn(`Failed to load text manifest ${manifestPath}: HTTP ${resp.status}`);
            }
        } catch (error) {
            console.warn(`Error loading text manifest ${manifestPath}:`, error);
        }

        console.log(`No text manifest found for ${folderPath}`);
        return [];
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
            const [deleted, completed, comments, notCompleted, confirmed, todoV2, propertyAssignments] = await Promise.all([
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
                }),
                this.githubApi.getFileContent('confirmed_files.json').catch(e => {
                    console.warn('Failed to load confirmed files:', e);
                    return {};
                }),
                this.githubApi.getFileContent('todo_v2_status.json').catch(e => {
                    console.warn('Failed to load Todo V2 status:', e);
                    return {};
                }),
                this.githubApi.getFileContent('property_assignments.json').catch(e => {
                    console.warn('Failed to load property assignments:', e);
                    return {};
                })
            ]);

            this.deletedFiles = deleted || {};
            this.completedFiles = completed || {};
            this.fileComments = comments || {};
            this.notCompletedFiles = notCompleted || {};
            this.confirmedFiles = confirmed || {};
            this.todoV2Status = todoV2 || {};
            this.propertyAssignments = propertyAssignments || {};

            console.log('Shared data loaded from GitHub Issues:', {
                deletedCount: Object.keys(this.deletedFiles).length,
                completedCount: Object.keys(this.completedFiles).length,
                commentsCount: Object.keys(this.fileComments).length,
                notCompletedCount: Object.keys(this.notCompletedFiles).length,
                confirmedCount: Object.keys(this.confirmedFiles).length,
                todoV2Count: Object.keys(this.todoV2Status).length,
                propertyAssignmentsCount: Object.keys(this.propertyAssignments).length
            });
        } catch (error) {
            console.warn('Error loading shared data from GitHub:', error);
            this.deletedFiles = {};
            this.completedFiles = {};
            this.fileComments = {};
            this.notCompletedFiles = {};
            this.confirmedFiles = {};
            this.todoV2Status = {};
            this.propertyAssignments = {};
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