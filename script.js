class ChapterViewer {
    constructor() {
        this.bookStructure = null;
        this.currentChapter = null;
        this.currentSection = null;
        this.audioManifestData = {}; // Cache for audio manifest data
        this.init();
    }

    async init() {
        await this.loadBookStructure();
        console.log('Book structure loaded:', this.bookStructure);
        await this.renderNavigation();
        await this.loadAllAudioManifests();
    }

    async loadBookStructure() {
        console.log('Loading book structure...');
        
        try {
            // Try to load the static book structure first
            console.log('Attempting to load book-structure.json...');
            const response = await fetch('book-structure.json');
            console.log('book-structure.json response status:', response.status);
            
            if (response.ok) {
                this.bookStructure = await response.json();
                console.log('✅ Loaded book structure from static file with', this.bookStructure.chapters.length, 'chapters');
                return;
            } else {
                console.log('❌ book-structure.json returned status:', response.status);
            }
        } catch (error) {
            console.log('❌ Failed to load book-structure.json:', error);
        }

        // More detailed fallback for debugging
        console.log('🔄 Using fallback structure - this means book-structure.json is not deployed');
        
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
            <p>Esta tabla muestra todos los archivos de audio disponibles organizados por sección y capítulo. 
            Cada celda contiene los nombres de los archivos de audio que existen en esa combinación específica.</p>
            <p><strong>Filas:</strong> Secciones (S1, S2, S3, etc.) | <strong>Columnas:</strong> Capítulos (I, II, III, etc.)</p>
            <button onclick="location.reload();" style="margin-top: 10px; padding: 5px 10px; background: #3498db; color: white; border: none; border-radius: 3px; cursor: pointer;">🔄 Recargar página si la tabla está vacía</button>
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
                    console.log(`${chapter.id}-S${i}: Found ${audioFiles.length} audio files:`, audioFiles);
                    
                    if (audioFiles.length > 0) {
                        // Create individual clickable spans for each audio file
                        audioFiles.forEach(fileName => {
                            const fileSpan = document.createElement('span');
                            fileSpan.className = 'audio-file-item';
                            fileSpan.textContent = fileName;
                            fileSpan.title = `Haz clic para ir a ${section.title} - ${fileName}`;
                            
                            // Add click handler to navigate to the section
                            fileSpan.onclick = (e) => {
                                e.preventDefault();
                                this.navigateToSectionFromTodo(chapter, section);
                            };
                            
                            cell.appendChild(fileSpan);
                        });
                    } else {
                        cell.textContent = '—';
                        cell.className += ' empty';
                        cell.title = 'No hay archivos de audio';
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
        const statusDiv = document.createElement('div');
        statusDiv.style.textAlign = 'center';
        statusDiv.style.padding = '10px';
        statusDiv.style.color = '#666';
        statusDiv.style.fontSize = '0.9em';
        statusDiv.innerHTML = `📊 Total: ${totalAudioFiles} archivos de audio encontrados en ${maxSections} secciones y ${this.bookStructure.chapters.length} capítulos`;
        
        // Insert after table
        table.parentElement.appendChild(statusDiv);

        console.log(`To-Do table rendered with ${maxSections} section rows and ${this.bookStructure.chapters.length} chapter columns`);
        console.log(`Total audio files loaded: ${totalAudioFiles}`);
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
document.addEventListener('DOMContentLoaded', () => {
    new ChapterViewer();
});