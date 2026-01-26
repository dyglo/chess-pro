import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'ChessPro',
        short_name: 'ChessPro',
        description: 'ChessPro is a modern chess web app with AI coaching, puzzles, and leagues designed to keep you playing longer.',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#000000',
        icons: [
            {
                src: '/icons8-chess.svg',
                sizes: 'any',
                type: 'image/svg+xml',
            },
            {
                src: '/icons8-chess-30.png',
                sizes: '30x30',
                type: 'image/png',
            },
        ],
    }
}
