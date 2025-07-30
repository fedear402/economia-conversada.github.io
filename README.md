# Visor de Capítulos

Un sitio web simple para mostrar capítulos de texto con archivos MP3 asociados.

## Estructura de archivos

```
/
├── index.html          # Página principal
├── styles.css          # Estilos CSS
├── script.js           # Funcionalidad JavaScript
└── chapters/           # Carpeta de capítulos
    ├── chapters.json   # Configuración de capítulos (opcional)
    ├── capitulo1.txt   # Texto del capítulo 1
    ├── capitulo1.mp3   # Audio del capítulo 1
    ├── capitulo2.txt   # Texto del capítulo 2
    ├── capitulo2.mp3   # Audio del capítulo 2
    └── ...
```

## Uso

1. Abre `index.html` en tu navegador
2. Agrega tus archivos de texto (`.txt`) en la carpeta `chapters/`
3. Agrega tus archivos de audio (`.mp3`) correspondientes
4. Opcionalmente, modifica `chapters.json` para personalizar títulos

## Agregar nuevos capítulos

Para agregar un nuevo capítulo:

1. Crea un archivo de texto: `chapters/capituloX.txt`
2. Agrega el archivo MP3 correspondiente: `chapters/capituloX.mp3`
3. Actualiza `chapters.json` con la nueva entrada:

```json
{
    "id": X,
    "title": "Capítulo X: Tu Título",
    "textFile": "chapters/capituloX.txt",
    "audioFile": "chapters/capituloX.mp3"
}
```

## Características

- Diseño limpio inspirado en arXiv
- Navegación lateral con lista de capítulos
- Reproductor de audio HTML5 integrado
- Texto justificado para mejor legibilidad
- Responsive design para móviles
- Carga automática de capítulos desde archivos locales