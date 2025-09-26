import React, { useEffect } from 'react';

interface ImageModalProps {
    imageUrl: string;
    onClose: () => void;
}

export const ImageModal: React.FC<ImageModalProps> = ({ imageUrl, onClose }) => {
    // Effect to handle Escape key press
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        // Prevent background scrolling
        document.body.style.overflow = 'hidden';

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            // Restore background scrolling
            document.body.style.overflow = 'auto';
        };
    }, [onClose]);

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-80 z-50 flex items-center justify-center p-4 animate-fadeIn"
            onClick={onClose}
            aria-modal="true"
            role="dialog"
        >
            <button 
                onClick={onClose}
                className="absolute top-4 right-4 text-white text-4xl hover:text-amber-300 transition-colors z-10"
                aria-label="Close"
            >
                &times;
            </button>
            <div 
                className="relative max-w-full max-h-full"
                onClick={(e) => e.stopPropagation()} // Prevent closing when clicking on the image container
            >
                <img 
                    src={imageUrl} 
                    alt="Zoomed in result" 
                    className="block max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl" 
                />
            </div>
             <style>{`
                @keyframes fadeIn {
                  from { opacity: 0; }
                  to { opacity: 1; }
                }
                .animate-fadeIn {
                  animation: fadeIn 0.2s ease-out forwards;
                }
            `}</style>
        </div>
    );
};
