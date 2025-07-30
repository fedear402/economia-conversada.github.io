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
        
        // Base structure with dynamic title/description loading
        this.bookStructure = {
            title: "Economía Conversada",
            chapters: [
                {
                    id: 'C1',
                    title: 'I',
                    textFile: 'book1/C1/chapter.txt',
                    audioFile: null,
                    sections: [
                        { id: 'S1', title: 'Sección 1', textFile: 'book1/C1/S1/main.txt', audioFile: null, description: null },
                        { id: 'S2', title: 'Sección 2', textFile: 'book1/C1/S2/main.txt', audioFile: null, description: null },
                        { id: 'S3', title: 'Sección 3', textFile: 'book1/C1/S3/main.txt', audioFile: null, description: null },
                        { id: 'S4', title: 'Sección 4', textFile: 'book1/C1/S4/main.txt', audioFile: null, description: null },
                        { id: 'S5', title: 'Sección 5', textFile: 'book1/C1/S5/main.txt', audioFile: null, description: null },
                        { id: 'S6', title: 'Sección 6', textFile: 'book1/C1/S6/main.txt', audioFile: null, description: null },
                        { id: 'S7', title: 'Sección 7', textFile: 'book1/C1/S7/main.txt', audioFile: null, description: null }
                    ]
                },
                {
                    id: 'C2',
                    title: 'II',
                    textFile: 'book1/C2/chapter.txt',
                    audioFile: null,
                    sections: [
                        { id: 'S1', title: 'Sección 1', textFile: 'book1/C2/S1/main.txt', audioFile: null, description: null },
                        { id: 'S2', title: 'Sección 2', textFile: 'book1/C2/S2/main.txt', audioFile: null, description: null },
                        { id: 'S3', title: 'Sección 3', textFile: 'book1/C2/S3/main.txt', audioFile: null, description: null },
                        { id: 'S4', title: 'Sección 4', textFile: 'book1/C2/S4/main.txt', audioFile: null, description: null },
                        { id: 'S5', title: 'Sección 5', textFile: 'book1/C2/S5/main.txt', audioFile: null, description: null },
                        { id: 'S6', title: 'Sección 6', textFile: 'book1/C2/S6/main.txt', audioFile: null, description: null },
                        { id: 'S7', title: 'Sección 7', textFile: 'book1/C2/S7/main.txt', audioFile: null, description: null },
                        { id: 'S8', title: 'Sección 8', textFile: 'book1/C2/S8/main.txt', audioFile: null, description: null }
                    ]
                },
                {
                    id: 'C3',
                    title: 'III',
                    textFile: 'book1/C3/chapter.txt',
                    audioFile: null,
                    sections: [
                        { id: 'S1', title: 'Sección 1', textFile: 'book1/C3/S1/main.txt', audioFile: null, description: null },
                        { id: 'S2', title: 'Sección 2', textFile: 'book1/C3/S2/main.txt', audioFile: null, description: null },
                        { id: 'S3', title: 'Sección 3', textFile: 'book1/C3/S3/main.txt', audioFile: null, description: null },
                        { id: 'S4', title: 'Sección 4', textFile: 'book1/C3/S4/main.txt', audioFile: null, description: null },
                        { id: 'S5', title: 'Sección 5', textFile: 'book1/C3/S5/main.txt', audioFile: null, description: null },
                        { id: 'S6', title: 'Sección 6', textFile: 'book1/C3/S6/main.txt', audioFile: null, description: null },
                        { id: 'S7', title: 'Sección 7', textFile: 'book1/C3/S7/main.txt', audioFile: null, description: null },
                        { id: 'S8', title: 'Sección 8', textFile: 'book1/C3/S8/main.txt', audioFile: null, description: null },
                        { id: 'S9', title: 'Sección 9', textFile: 'book1/C3/S9/main.txt', audioFile: null, description: null },
                        { id: 'S10', title: 'Sección 10', textFile: 'book1/C3/S10/main.txt', audioFile: null, description: null }
                    ]
                },
                {
                    id: 'C4',
                    title: 'IV',
                    textFile: 'book1/C4/chapter.txt',
                    audioFile: null,
                    sections: [
                        { id: 'S1', title: 'Sección 1', textFile: 'book1/C4/S1/main.txt', audioFile: null, description: null },
                        { id: 'S2', title: 'Sección 2', textFile: 'book1/C4/S2/main.txt', audioFile: null, description: null },
                        { id: 'S3', title: 'Sección 3', textFile: 'book1/C4/S3/main.txt', audioFile: null, description: null },
                        { id: 'S4', title: 'Sección 4', textFile: 'book1/C4/S4/main.txt', audioFile: null, description: null },
                        { id: 'S5', title: 'Sección 5', textFile: 'book1/C4/S5/main.txt', audioFile: null, description: null },
                        { id: 'S6', title: 'Sección 6', textFile: 'book1/C4/S6/main.txt', audioFile: null, description: null },
                        { id: 'S7', title: 'Sección 7', textFile: 'book1/C4/S7/main.txt', audioFile: null, description: null },
                        { id: 'S8', title: 'Sección 8', textFile: 'book1/C4/S8/main.txt', audioFile: null, description: null },
                        { id: 'S9', title: 'Sección 9', textFile: 'book1/C4/S9/main.txt', audioFile: null, description: null },
                        { id: 'S10', title: 'Sección 10', textFile: 'book1/C4/S10/main.txt', audioFile: null, description: null },
                        { id: 'S11', title: 'Sección 11', textFile: 'book1/C4/S11/main.txt', audioFile: null, description: null }
                    ]
                },
                {
                    id: 'C5',
                    title: 'V',
                    textFile: 'book1/C5/chapter.txt',
                    audioFile: null,
                    sections: [
                        { id: 'S1', title: 'Sección 1', textFile: 'book1/C5/S1/main.txt', audioFile: null, description: null },
                        { id: 'S2', title: 'Sección 2', textFile: 'book1/C5/S2/main.txt', audioFile: null, description: null },
                        { id: 'S3', title: 'Sección 3', textFile: 'book1/C5/S3/main.txt', audioFile: null, description: null },
                        { id: 'S4', title: 'Sección 4', textFile: 'book1/C5/S4/main.txt', audioFile: null, description: null },
                        { id: 'S5', title: 'Sección 5', textFile: 'book1/C5/S5/main.txt', audioFile: null, description: null }
                    ]
                },
                {
                    id: 'C6',
                    title: 'VI',
                    textFile: 'book1/C6/chapter.txt',
                    audioFile: null,
                    sections: [
                        { id: 'S1', title: 'Sección 1', textFile: 'book1/C6/S1/main.txt', audioFile: null, description: null },
                        { id: 'S2', title: 'Sección 2', textFile: 'book1/C6/S2/main.txt', audioFile: null, description: null },
                        { id: 'S3', title: 'Sección 3', textFile: 'book1/C6/S3/main.txt', audioFile: null, description: null },
                        { id: 'S4', title: 'Sección 4', textFile: 'book1/C6/S4/main.txt', audioFile: null, description: null },
                        { id: 'S5', title: 'Sección 5', textFile: 'book1/C6/S5/main.txt', audioFile: null, description: null }
                    ]
                }
            ]
        };
        
        console.log('Book structure loaded with', this.bookStructure.chapters.length, 'chapters');
    }

    async loadTitle(filePath) {
        try {
            const response = await fetch(filePath);
            if (response.ok) {
                return (await response.text()).trim();
            }
        } catch (error) {
            console.log(`Could not load title from ${filePath}`);
        }
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

    async findAllAudioFiles(folderPath, chapterId = null, sectionId = null) {
        const audioExtensions = ['mp3', 'wav', 'ogg', 'm4a'];
        const foundFiles = [];
        
        console.log(`Looking for audio files in ${folderPath}`);
        
        // Common patterns to try
        const patterns = [];
        
        // If we have chapter and section info, try the specific pattern first
        if (chapterId && sectionId) {
            const chapterNum = chapterId.toLowerCase();
            const sectionNum = sectionId.toLowerCase();
            patterns.push(`${chapterNum}${sectionNum}`);
        }
        
        // Add common naming patterns
        patterns.push(
            'audio', 'section', 'main', 'track', 'sound', 'clip',
            '01', '02', '03', '04', '05', '06', '07', '08', '09', '10',
            '1', '2', '3', '4', '5', '6', '7', '8', '9', '10',
            '11', '12', '13', '14', '15', '16', '17', '18', '19', '20',
            'intro', 'outro', 'beginning', 'end', 'start', 'finish',
            'chapter', 'part', 'segment', 'piece',
            // Patterns with hyphens
            '1-escena', '2-conversacion', '3-dialogo', '4-narracion', '5-resumen',
            '1-scene', '2-conversation', '3-dialogue', '4-narration', '5-summary',
            '1-intro', '2-main', '3-outro', '4-conclusion', '5-final'
        );
        
        // Try all combinations of patterns and extensions
        for (const pattern of patterns) {
            for (const ext of audioExtensions) {
                try {
                    const audioPath = `${folderPath}${pattern}.${ext}`;
                    const response = await fetch(audioPath, { method: 'HEAD' });
                    if (response.ok) {
                        const fileName = `${pattern}.${ext}`;
                        console.log(`Found audio file: ${audioPath}`);
                        foundFiles.push({
                            path: audioPath,
                            name: fileName,
                            displayName: this.formatAudioName(fileName)
                        });
                    }
                } catch (error) {
                    // Continue to next combination
                }
            }
        }
        
        // Try some additional patterns that might exist
        const additionalPatterns = [
            'description', 'dialogue', 'narration', 'voice', 'speech',
            'summary', 'title', 'chapter_summary', 'section_title',
            'chapter_summary_beginning', 'chapter_summary_end',
            'location_description', 'Glaucón_Sócrates', 'Teofrasto_solo'
        ];
        
        for (const pattern of additionalPatterns) {
            for (const ext of audioExtensions) {
                try {
                    const audioPath = `${folderPath}${pattern}.${ext}`;
                    const response = await fetch(audioPath, { method: 'HEAD' });
                    if (response.ok) {
                        const fileName = `${pattern}.${ext}`;
                        // Check if we already found this file
                        if (!foundFiles.some(f => f.path === audioPath)) {
                            console.log(`Found additional audio file: ${audioPath}`);
                            foundFiles.push({
                                path: audioPath,
                                name: fileName,
                                displayName: this.formatAudioName(fileName)
                            });
                        }
                    }
                } catch (error) {
                    // Continue to next combination
                }
            }
        }
        
        console.log(`Found ${foundFiles.length} audio files in ${folderPath}`);
        return foundFiles;
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
        
        for (const chapter of this.bookStructure.chapters) {
            const chapterLi = document.createElement('li');
            chapterLi.className = 'chapter-item';
            
            // Load actual chapter title
            const chapterTitlePath = `book1/${chapter.id}/title.txt`;
            const actualChapterTitle = await this.loadTitle(chapterTitlePath) || chapter.title;
            
            const chapterLink = document.createElement('a');
            chapterLink.href = '#';
            chapterLink.textContent = actualChapterTitle;
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
                
                for (const section of chapter.sections) {
                    const sectionLi = document.createElement('li');
                    sectionLi.className = 'section-item';
                    
                    // Load actual section title
                    const sectionTitlePath = `book1/${chapter.id}/${section.id}/title.txt`;
                    const actualSectionTitle = await this.loadTitle(sectionTitlePath) || section.title;
                    
                    const sectionLink = document.createElement('a');
                    sectionLink.href = '#';
                    sectionLink.textContent = actualSectionTitle;
                    sectionLink.className = 'section-link';
                    sectionLink.onclick = (e) => {
                        e.preventDefault();
                        this.loadSection(chapter, section);
                    };
                    
                    sectionLi.appendChild(sectionLink);
                    sectionsUl.appendChild(sectionLi);
                }
                
                chapterLi.appendChild(sectionsUl);
            }
            
            ul.appendChild(chapterLi);
        }
        
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
            
            // Load the actual title and audio for this chapter
            const titlePath = `book1/${chapter.id}/title.txt`;
            const audioFolderPath = `book1/${chapter.id}/`;
            
            const actualTitle = await this.loadTitle(titlePath) || chapter.title;
            const audioFiles = await this.findAllAudioFiles(audioFolderPath, chapter.id);
            
            // Create an enhanced chapter object with loaded data
            const enhancedChapter = {
                ...chapter,
                title: actualTitle,
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
            
            // Load the actual title and description for this section
            const titlePath = `book1/${chapter.id}/${section.id}/title.txt`;
            const descriptionPath = `book1/${chapter.id}/${section.id}/description.txt`;
            const audioFolderPath = `book1/${chapter.id}/${section.id}/`;
            
            const actualTitle = await this.loadTitle(titlePath) || section.title;
            const actualDescription = await this.loadDescription(descriptionPath);
            const audioFiles = await this.findAllAudioFiles(audioFolderPath, chapter.id, section.id);
            
            // Create an enhanced section object with loaded data
            const enhancedSection = {
                ...section,
                title: actualTitle,
                description: actualDescription,
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