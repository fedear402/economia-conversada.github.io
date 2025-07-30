class ChapterViewer {
    constructor() {
        this.bookStructure = null;
        this.currentChapter = null;
        this.currentSection = null;
        this.init();
    }

    async init() {
        await this.loadBookStructure();
        console.log('Book structure loaded:', this.bookStructure);
        await this.renderNavigation();
    }

    async loadBookStructure() {
        console.log('Loading book structure...');
        
        try {
            // Try to load the static book structure first (works on both localhost and Vercel)
            const response = await fetch('book-structure.json');
            if (response.ok) {
                this.bookStructure = await response.json();
                console.log('Loaded book structure from static file with', this.bookStructure.chapters.length, 'chapters');
                return;
            }
        } catch (error) {
            console.log('Failed to load book-structure.json:', error);
        }

        // Fallback to hardcoded structure (should not be needed now)
        console.log('Using fallback structure');
        this.bookStructure = {
            title: "Economía Conversada",
            chapters: []
        };
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
        const resp = await fetch(manifestPath);
        if (resp.ok) {
        const list = await resp.json();
        return list.map(fn => ({
            path: folderPath + fn,
            name: fn,
            displayName: this.formatAudioName(fn)
        }));
        }
    } catch (_) { /* no manifest – fall back */ }

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
        
        const header = document.createElement('div');
        header.className = `${type}-header`;
        
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
                
                // Add audio file label
                const audioLabel = document.createElement('div');
                audioLabel.className = 'audio-label';
                audioLabel.textContent = audioFile.displayName;
                audioPlayerContainer.appendChild(audioLabel);
                
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
                const headerHeight = header.offsetHeight;
                const baseOffset = 20; // Small buffer space
                const totalPadding = headerHeight + baseOffset;
                
                content.style.paddingTop = `${totalPadding}px`;
                console.log(`Adjusted content padding to ${totalPadding}px (header: ${headerHeight}px + buffer: ${baseOffset}px)`);
            }
        });
    }

    renderError(item, type = 'chapter', parentChapter = null) {
        const content = document.getElementById('chapter-content');
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
document.addEventListener('DOMContentLoaded', () => {
    new ChapterViewer();
});