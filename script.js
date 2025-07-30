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
            
            // Load the actual title for this chapter
            const titlePath = `book1/${chapter.id}/title.txt`;
            const actualTitle = await this.loadTitle(titlePath) || chapter.title;
            
            // Create an enhanced chapter object with loaded data
            const enhancedChapter = {
                ...chapter,
                title: actualTitle
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
            
            const actualTitle = await this.loadTitle(titlePath) || section.title;
            const actualDescription = await this.loadDescription(descriptionPath);
            
            // Create an enhanced section object with loaded data
            const enhancedSection = {
                ...section,
                title: actualTitle,
                description: actualDescription
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
        
        // Check if audio file exists and add player
        if (item.audioFile) {
            const audioPlayer = document.createElement('div');
            audioPlayer.className = 'audio-player';
            
            const audio = document.createElement('audio');
            audio.controls = true;
            audio.preload = 'metadata';
            audio.src = item.audioFile;
            
            // Add multiple source formats for better compatibility
            const mp3Source = document.createElement('source');
            mp3Source.src = item.audioFile;
            mp3Source.type = 'audio/mpeg';
            
            const oggSource = document.createElement('source');
            oggSource.src = item.audioFile.replace('.mp3', '.ogg');
            oggSource.type = 'audio/ogg';
            
            const wavSource = document.createElement('source');
            wavSource.src = item.audioFile.replace('.mp3', '.wav');
            wavSource.type = 'audio/wav';
            
            audio.appendChild(mp3Source);
            audio.appendChild(oggSource);
            audio.appendChild(wavSource);
            
            // Better error handling
            audio.onerror = (e) => {
                console.warn(`Audio file not found or cannot be loaded: ${item.audioFile}`);
                audioPlayer.innerHTML = '<p style="color: #666; font-style: italic; margin: 10px 0;">Audio no disponible</p>';
            };
            
            audio.onloadstart = () => {
                console.log(`Loading audio: ${item.audioFile}`);
            };
            
            audio.oncanplay = () => {
                console.log(`Audio ready to play: ${item.audioFile}`);
            };
            
            audioPlayer.appendChild(audio);
            header.appendChild(audioPlayer);
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