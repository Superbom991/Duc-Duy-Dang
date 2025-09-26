import React, { useState, useRef, useCallback, useEffect } from 'react';

interface ImageInputProps {
    sourceFiles: File[];
    activeSourceFile: File | null;
    onFilesSelect: (files: File[]) => void;
    onFileRemove: (file: File) => void;
    onFileActivate: (file: File) => void;
}

export const ImageInput: React.FC<ImageInputProps> = ({ 
    sourceFiles, 
    activeSourceFile,
    onFilesSelect, 
    onFileRemove,
    onFileActivate
}) => {
    const [isCapturing, setIsCapturing] = useState<boolean>(false);
    const [cameraError, setCameraError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const [previewUrls, setPreviewUrls] = useState<Map<File, string>>(new Map());

    useEffect(() => {
        const newUrls = new Map<File, string>();
        let urlsChanged = false;

        // Create URLs for new files
        sourceFiles.forEach(file => {
            if (previewUrls.has(file)) {
                newUrls.set(file, previewUrls.get(file)!);
            } else {
                const url = URL.createObjectURL(file);
                newUrls.set(file, url);
                urlsChanged = true;
            }
        });

        // Revoke URLs for removed files
        for (const [file, url] of previewUrls.entries()) {
            if (!newUrls.has(file)) {
                URL.revokeObjectURL(url);
                urlsChanged = true;
            }
        }
        
        if (urlsChanged) {
            setPreviewUrls(newUrls);
        }

    }, [sourceFiles]);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (files && files.length > 0) {
            onFilesSelect(Array.from(files));
            stopCamera();
            // Clear the input value to allow selecting the same file again
            event.target.value = '';
        }
    };
    
    const stopCamera = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        setIsCapturing(false);
    }, []);

    const startCamera = async () => {
        stopCamera(); 
        setCameraError(null);
        setIsCapturing(true);

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (err) {
            console.error("Camera access denied:", err);
            setCameraError("Không thể truy cập camera. Vui lòng cấp quyền và thử lại.");
            setIsCapturing(false);
        }
    };

    const captureImage = () => {
        if (!videoRef.current || !streamRef.current) return;

        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        const context = canvas.getContext('2d');
        if (context) {
            context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
            canvas.toBlob((blob) => {
                if (blob) {
                    const file = new File([blob], `capture-${Date.now()}.png`, { type: 'image/png' });
                    onFilesSelect([file]);
                }
                stopCamera();
            }, 'image/png');
        }
    };

    const activePreviewUrl = activeSourceFile ? previewUrls.get(activeSourceFile) : null;

    return (
        <div className="w-full">
            <div className="relative w-full aspect-video bg-slate-700/50 rounded-lg flex items-center justify-center border-2 border-dashed border-slate-600 overflow-hidden">
                {isCapturing ? (
                    <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                ) : activePreviewUrl ? (
                    <img src={activePreviewUrl} alt="Preview" className="w-full h-full object-contain" />
                ) : (
                    <div className="text-center text-slate-400 p-4">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L20 16m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <p className="mt-2 text-sm">Tải ảnh lên hoặc dùng camera</p>
                    </div>
                )}
                {cameraError && <div className="absolute inset-0 bg-black/70 flex items-center justify-center p-4 text-center text-red-400">{cameraError}</div>}
            </div>

            {sourceFiles.length > 0 && (
                <div className="mt-4 p-2 bg-slate-900/50 rounded-lg">
                    <div className="flex gap-3 overflow-x-auto pb-2">
                        {sourceFiles.map((file) => (
                            <div key={`${file.name}-${file.lastModified}`} className="relative flex-shrink-0 group">
                                <button
                                    onClick={() => onFileActivate(file)}
                                    className={`block w-20 h-20 rounded-md overflow-hidden border-2 transition ${
                                        activeSourceFile === file ? 'border-amber-400 ring-2 ring-amber-400' : 'border-slate-600 hover:border-slate-500'
                                    }`}
                                >
                                    <img src={previewUrls.get(file)} alt={file.name} className="w-full h-full object-cover" />
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); onFileRemove(file); }}
                                    className="absolute -top-1.5 -right-1.5 z-10 w-5 h-5 bg-red-600 text-white rounded-full flex items-center justify-center text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity"
                                    aria-label="Remove image"
                                >
                                    &#x2715;
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}


            <div className="mt-4 flex flex-col sm:flex-row gap-2">
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/png, image/jpeg, image/webp"
                    className="hidden"
                    multiple
                />
                {!isCapturing ? (
                    <>
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="flex-1 bg-slate-600 hover:bg-slate-500 text-white font-medium py-2 px-4 rounded-md transition"
                        >
                            Chọn ảnh từ máy
                        </button>
                        <button
                            onClick={startCamera}
                            className="flex-1 bg-slate-600 hover:bg-slate-500 text-white font-medium py-2 px-4 rounded-md transition"
                        >
                            Dùng camera
                        </button>
                    </>
                ) : (
                    <>
                         <button
                            onClick={captureImage}
                            className="flex-1 bg-red-600 hover:bg-red-500 text-white font-medium py-2 px-4 rounded-md transition"
                        >
                            Chụp ảnh
                        </button>
                        <button
                            onClick={stopCamera}
                            className="flex-1 bg-slate-600 hover:bg-slate-500 text-white font-medium py-2 px-4 rounded-md transition"
                        >
                            Hủy
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};