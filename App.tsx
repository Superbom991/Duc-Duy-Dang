import React, { useState, useCallback } from 'react';
import { ImageInput } from './components/ImageInput';
import { Spinner } from './components/Spinner';
import { ImageModal } from './components/ImageModal';
import { generateMidAutumnImage } from './services/geminiService';
import { FESTIVAL_MOMENTS, ASPECT_RATIOS } from './constants';

interface GeneratedItem {
  id: string;
  resultUrl: string;
  sourceFiles: File[];
  moment: string;
  aspectRatio: string;
}

const App: React.FC = () => {
    const [sourceFiles, setSourceFiles] = useState<File[]>([]);
    const [activeSourceFile, setActiveSourceFile] = useState<File | null>(null);
    const [aspectRatio, setAspectRatio] = useState<string>(ASPECT_RATIOS[0].value);
    const [moment, setMoment] = useState<string>(FESTIVAL_MOMENTS[0]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [generatedItems, setGeneratedItems] = useState<GeneratedItem[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [zoomedImageUrl, setZoomedImageUrl] = useState<string | null>(null);

    const handleFilesSelect = useCallback((newFiles: File[]) => {
        // Filter out files that might already be in the list to avoid duplicates
        const uniqueNewFiles = newFiles.filter(
            newFile => !sourceFiles.some(
                existingFile => existingFile.name === newFile.name && existingFile.lastModified === newFile.lastModified
            )
        );

        if (uniqueNewFiles.length > 0) {
            setSourceFiles(prev => [...prev, ...uniqueNewFiles]);
            // If there's no active file, set the first new one as active
            if (!activeSourceFile) {
                setActiveSourceFile(uniqueNewFiles[0]);
            }
        }
    }, [sourceFiles, activeSourceFile]);

    const handleFileRemove = useCallback((fileToRemove: File) => {
        setSourceFiles(prev => {
            const newFiles = prev.filter(f => f !== fileToRemove);
            if (activeSourceFile === fileToRemove) {
                setActiveSourceFile(newFiles.length > 0 ? newFiles[0] : null);
            }
            return newFiles;
        });
    }, [activeSourceFile]);

    const handleGenerate = useCallback(async () => {
        if (sourceFiles.length === 0) {
            setError('Vui lòng tải lên ít nhất một hình ảnh để tạo.');
            return;
        }
        setIsLoading(true);
        setError(null);

        try {
            const result = await generateMidAutumnImage(sourceFiles, moment, aspectRatio);
            const newItem: GeneratedItem = {
                id: `${Date.now()}-${Math.random()}`,
                resultUrl: result,
                sourceFiles: sourceFiles,
                moment: moment,
                aspectRatio: aspectRatio,
            };
            setGeneratedItems(prev => [newItem, ...prev]);
        } catch (err) {
            console.error(err);
            setError(err instanceof Error ? err.message : 'Đã xảy ra lỗi không xác định. Vui lòng thử lại.');
        } finally {
            setIsLoading(false);
        }
    }, [sourceFiles, moment, aspectRatio]);

    const handleEdit = (item: GeneratedItem) => {
      setSourceFiles(item.sourceFiles);
      setActiveSourceFile(item.sourceFiles.length > 0 ? item.sourceFiles[0] : null);
      setMoment(item.moment);
      setAspectRatio(item.aspectRatio);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const downloadImage = (url: string) => {
        if (!url) return;
        const link = document.createElement('a');
        link.href = url;
        link.download = `ruc-ro-trung-thu-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="min-h-screen bg-slate-900 text-white p-4 sm:p-8" style={{ background: 'radial-gradient(circle, rgba(23,37,84,1) 0%, rgba(15,23,42,1) 100%)' }}>
            <div className="container mx-auto max-w-6xl">
                <header className="text-center mb-8">
                    <h1 className="text-4xl sm:text-6xl font-bold text-amber-300 drop-shadow-[0_2px_2px_rgba(0,0,0,0.7)]">Rực Rỡ Trung Thu</h1>
                    <p className="text-slate-300 mt-2 text-lg">Biến ảnh của bạn thành khoảnh khắc Trung Thu diệu kỳ</p>
                </header>

                <main className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Control Panel */}
                    <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700 shadow-lg flex flex-col gap-6">
                        <div>
                            <label className="text-lg font-semibold text-amber-200 mb-2 block">1. Tải ảnh của bạn (có thể chọn nhiều ảnh)</label>
                            <ImageInput 
                                sourceFiles={sourceFiles}
                                activeSourceFile={activeSourceFile}
                                onFilesSelect={handleFilesSelect}
                                onFileRemove={handleFileRemove}
                                onFileActivate={setActiveSourceFile}
                            />
                        </div>

                        <div>
                            <label htmlFor="moment" className="text-lg font-semibold text-amber-200 mb-2 block">2. Chọn ý tưởng</label>
                            <select
                                id="moment"
                                value={moment}
                                onChange={(e) => setMoment(e.target.value)}
                                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-amber-400 focus:border-amber-400 transition"
                            >
                                {FESTIVAL_MOMENTS.map((m, index) => (
                                    <option key={index} value={m}>{m}</option>
                                ))}
                            </select>
                        </div>
                        
                        <div>
                            <label className="text-lg font-semibold text-amber-200 mb-2 block">3. Chọn tỷ lệ ảnh</label>
                            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                                {ASPECT_RATIOS.map(({ label, value }) => (
                                     <button
                                        key={value}
                                        onClick={() => setAspectRatio(value)}
                                        className={`py-2 px-3 rounded-lg text-sm font-medium transition ${
                                            aspectRatio === value
                                                ? 'bg-amber-500 text-slate-900 shadow-md'
                                                : 'bg-slate-700 hover:bg-slate-600'
                                        }`}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <button
                            onClick={handleGenerate}
                            disabled={isLoading || sourceFiles.length === 0}
                            className="w-full bg-red-700 hover:bg-red-600 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-lg text-xl transition-all duration-300 shadow-lg hover:shadow-red-500/50 flex items-center justify-center gap-3"
                        >
                            {isLoading ? <><Spinner /> Đang xử lý...</> : 'Tạo ảnh'}
                        </button>
                    </div>

                    {/* Result Display */}
                    <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700 shadow-lg flex flex-col justify-center items-center min-h-[400px] lg:min-h-0 max-h-[80vh] overflow-hidden">
                        {isLoading && (
                            <div className="text-center">
                                <Spinner size="lg" />
                                <p className="mt-4 text-amber-200 text-lg">AI đang kiến tạo khoảnh khắc của bạn...</p>
                                <p className="text-slate-400">Quá trình này có thể mất một vài phút.</p>
                            </div>
                        )}
                        {!isLoading && error && (
                            <div className="text-center text-red-400 bg-red-900/50 border border-red-700 p-4 rounded-lg">
                                <h3 className="font-bold text-lg">Lỗi!</h3>
                                <p>{error}</p>
                            </div>
                        )}
                        {!isLoading && generatedItems.length > 0 && (
                            <div className="w-full h-full overflow-y-auto space-y-6 pr-2 custom-scrollbar">
                                {generatedItems.map((item) => (
                                    <div key={item.id} className="text-center bg-slate-900/40 p-3 rounded-xl shadow-md animate-fadeInUp">
                                        <div className="rounded-lg overflow-hidden cursor-pointer" onClick={() => setZoomedImageUrl(item.resultUrl)}>
                                            <img src={item.resultUrl} alt="Generated Mid-Autumn Festival" className="w-full h-auto object-contain max-h-[500px] transition-transform duration-300 ease-in-out hover:scale-105" />
                                        </div>
                                        <div className="mt-4 flex flex-wrap justify-center gap-3">
                                            <button
                                                onClick={() => handleEdit(item)}
                                                className="bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 px-4 rounded-lg transition-transform duration-200 hover:scale-105 flex items-center gap-2"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L16.732 3.732z" /></svg>
                                                Sửa
                                            </button>
                                             <button
                                                onClick={() => setZoomedImageUrl(item.resultUrl)}
                                                className="bg-sky-600 hover:bg-sky-500 text-white font-bold py-2 px-4 rounded-lg transition-transform duration-200 hover:scale-105 flex items-center gap-2"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                                Phóng to
                                            </button>
                                            <button
                                                onClick={() => downloadImage(item.resultUrl)}
                                                className="bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold py-2 px-6 rounded-lg transition-transform duration-200 hover:scale-105"
                                            >
                                                Tải xuống
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        {!isLoading && !error && generatedItems.length === 0 && (
                             <div className="text-center text-slate-400">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto mb-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <p className="text-lg">Album ảnh của bạn sẽ xuất hiện ở đây.</p>
                            </div>
                        )}
                    </div>
                </main>
            </div>
             {zoomedImageUrl && (
                <ImageModal imageUrl={zoomedImageUrl} onClose={() => setZoomedImageUrl(null)} />
            )}
            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 8px; } 
                .custom-scrollbar::-webkit-scrollbar-track { background: #1e293b; } 
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #475569; border-radius: 4px; } 
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #64748b; }
                @keyframes fadeInUp {
                  from {
                    opacity: 0;
                    transform: translateY(20px);
                  }
                  to {
                    opacity: 1;
                    transform: translateY(0);
                  }
                }
                .animate-fadeInUp {
                  animation: fadeInUp 0.5s ease-out forwards;
                }
            `}</style>
        </div>
    );
};

export default App;