class ChapterViewer {
    constructor() {
        this.chapters = [];
        this.currentChapter = null;
        this.init();
    }

    async init() {
        await this.loadChapters();
        this.renderNavigation();
    }

    async loadChapters() {
        try {
            const response = await fetch('chapters/chapters.json');
            if (response.ok) {
                this.chapters = await response.json();
            } else {
                this.chapters = await this.scanChaptersDirectory();
            }
        } catch (error) {
            console.log('Loading from chapters.json failed, scanning directory...');
            this.chapters = await this.scanChaptersDirectory();
        }
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
        const ul = document.createElement('ul');
        
        this.chapters.forEach(chapter => {
            const li = document.createElement('li');
            const a = document.createElement('a');
            a.href = '#';
            a.textContent = chapter.title;
            a.onclick = (e) => {
                e.preventDefault();
                this.loadChapter(chapter);
            };
            li.appendChild(a);
            ul.appendChild(li);
        });
        
        nav.appendChild(ul);
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
            this.renderChapter(chapter, text);
            this.currentChapter = chapter;
        } catch (error) {
            console.error('Error loading chapter:', error);
            this.renderError(chapter);
        }
    }

    renderChapter(chapter, text) {
        const content = document.getElementById('chapter-content');
        
        const header = document.createElement('div');
        header.className = 'chapter-header';
        
        const title = document.createElement('h1');
        title.className = 'chapter-title';
        title.textContent = chapter.title;
        header.appendChild(title);
        
        // Check if audio file exists and add player
        const audioPlayer = document.createElement('div');
        audioPlayer.className = 'audio-player';
        
        const audio = document.createElement('audio');
        audio.controls = true;
        audio.preload = 'metadata';
        audio.src = chapter.audioFile;
        
        // Add multiple source formats for better compatibility
        const mp3Source = document.createElement('source');
        mp3Source.src = chapter.audioFile;
        mp3Source.type = 'audio/mpeg';
        
        const oggSource = document.createElement('source');
        oggSource.src = chapter.audioFile.replace('.mp3', '.ogg');
        oggSource.type = 'audio/ogg';
        
        audio.appendChild(mp3Source);
        audio.appendChild(oggSource);
        
        // Better error handling
        audio.onerror = (e) => {
            console.warn(`Audio file not found or cannot be loaded: ${chapter.audioFile}`);
            audioPlayer.innerHTML = '<p style="color: #666; font-style: italic; margin: 10px 0;">Audio no disponible</p>';
        };
        
        audio.onloadstart = () => {
            console.log(`Loading audio: ${chapter.audioFile}`);
        };
        
        audio.oncanplay = () => {
            console.log(`Audio ready to play: ${chapter.audioFile}`);
        };
        
        audioPlayer.appendChild(audio);
        header.appendChild(audioPlayer);
        
        const textDiv = document.createElement('div');
        textDiv.className = 'chapter-text';
        
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

    renderError(chapter) {
        const content = document.getElementById('chapter-content');
        content.innerHTML = `
            <div class="chapter-header">
                <h1 class="chapter-title">${chapter.title}</h1>
            </div>
            <div class="chapter-text">
                <p><strong>Error:</strong> No se pudo cargar el archivo de texto para este capítulo.</p>
                <p>Por favor, asegúrate de que el archivo <code>${chapter.textFile}</code> existe en el directorio correcto.</p>
            </div>
        `;
    }
}

// Initialize the chapter viewer when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new ChapterViewer();
});