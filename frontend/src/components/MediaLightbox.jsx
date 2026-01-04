import { X, DownloadSimple, MagnifyingGlassPlus, MagnifyingGlassMinus } from '@phosphor-icons/react';
import { useState, useEffect } from 'react';

export default function MediaLightbox({ src, onClose }) {
    const [scale, setScale] = useState(1);

    // Lock body scroll
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = 'unset'; };
    }, []);

    const handleDownload = async () => {
        try {
            const response = await fetch(src);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `image-${Date.now()}.jpg`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        } catch (e) {
            console.error("Download failed", e);
        }
    };

    return (
        <div className="fixed inset-0 z-99999 flex items-center justify-center bg-black/90 backdrop-blur-sm animate-fade-in" onClick={onClose}>
            {/* Toolbar */}
            <div className="absolute top-4 right-4 flex gap-4" onClick={(e) => e.stopPropagation()}>
                <button
                    onClick={() => setScale(s => Math.min(s + 0.5, 3))}
                    className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                    aria-label="Zoom In"
                >
                    <MagnifyingGlassPlus size={24} />
                </button>
                <button
                    onClick={() => setScale(s => Math.max(s - 0.5, 0.5))}
                    className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                    aria-label="Zoom Out"
                >
                    <MagnifyingGlassMinus size={24} />
                </button>
                <button
                    onClick={handleDownload}
                    className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                    aria-label="Download"
                >
                    <DownloadSimple size={24} />
                </button>
                <button
                    onClick={onClose}
                    className="p-2 rounded-full bg-white/10 hover:bg-red-500/80 text-white transition-colors"
                    aria-label="Close"
                >
                    <X size={24} />
                </button>
            </div>

            {/* Image Container */}
            <div
                className="relative overflow-hidden cursor-move"
                onClick={(e) => e.stopPropagation()}
            >
                <img
                    src={src}
                    alt="Lightbox"
                    className="max-h-[90vh] max-w-[90vw] object-contain transition-transform duration-200"
                    style={{ transform: `scale(${scale})` }}
                />
            </div>
        </div>
    );
}
