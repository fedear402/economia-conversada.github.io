class ChapterViewer {
    constructor() {
        this.bookStructure = null;
        this.currentChapter = null;
        this.currentSection = null;
        this.init();
    }

    async init() {
        await this.loadBookStructure();
        this.renderNavigation();
    }

    async loadBookStructure() {
        try {
            const response = await fetch('/api/book-structure');
            if (response.ok) {
                this.bookStructure = await response.json();
            } else {
                this.bookStructure = await this.loadFallbackStructure();
            }
        } catch (error) {
            console.log('Loading from API failed, using fallback...');
            this.bookStructure = await this.loadFallbackStructure();
        }
    }

    async loadFallbackStructure() {
        try {
            const response = await fetch('chapters/chapters.json');
            if (response.ok) {
                const chapters = await response.json();
                return {
                    title: "Economía Conversada",
                    chapters: chapters
                };
            }
        } catch (error) {
            console.log('Fallback failed, using default structure');
        }
        
        return {
            title: "Economía Conversada",
            chapters: await this.scanChaptersDirectory()
        };
    }

    async scanChaptersDirectory() {
        const chapters = [];
        const chapterNumbers = [1, 2, 3, 4, 5]; // Default chapters, modify as needed
        
        for (let i of chapterNumbers) {
            const chapterData = {
                id: i,
                title: `Capítulo ${i}`,
                textFile: `chapters/capitulo${i}.txt`,
                audioFile: `chapters/capitulo${i}.mp3`
            };
            chapters.push(chapterData);
        }
        
        return chapters;
    }

    renderNavigation() {
        const nav = document.getElementById('chapter-nav');
        nav.innerHTML = '';
        
        if (!this.bookStructure || !this.bookStructure.chapters) {
            nav.innerHTML = '<p>No se pudo cargar la estructura del libro</p>';
            return;
        }

        const ul = document.createElement('ul');
        ul.className = 'book-navigation';
        
        this.bookStructure.chapters.forEach(chapter => {
            const chapterLi = document.createElement('li');
            chapterLi.className = 'chapter-item';
            
            const chapterLink = document.createElement('a');
            chapterLink.href = '#';
            chapterLink.textContent = chapter.title;
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
                    sectionLink.textContent = section.title;
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
            this.renderContent(chapter, text, 'chapter');
            this.currentChapter = chapter;
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
            this.renderContent(section, text, 'section', chapter);
            this.currentChapter = chapter;
            this.currentSection = section;
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