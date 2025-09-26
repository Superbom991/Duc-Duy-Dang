
import { GoogleGenAI, Modality } from "@google/genai";

const fileToGenerativePart = async (file: File) => {
    const base64EncodedDataPromise = new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(file);
    });
    return {
        inlineData: {
            data: await base64EncodedDataPromise,
            mimeType: file.type,
        },
    };
};

const preprocessImage = (file: File, aspectRatioStr: string): Promise<File> => {
    return new Promise((resolve, reject) => {
        const [w, h] = aspectRatioStr.split(':').map(Number);
        if (!w || !h) {
            return reject(new Error('Invalid aspect ratio string'));
        }
        const targetAspectRatio = w / h;

        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                if (!ctx) {
                    return reject(new Error('Could not get canvas context'));
                }

                const originalWidth = img.width;
                const originalHeight = img.height;
                const originalAspectRatio = originalWidth / originalHeight;

                let canvasWidth = originalWidth;
                let canvasHeight = originalHeight;

                if (originalAspectRatio > targetAspectRatio) {
                    // Original image is wider than target, so we need to add height
                    canvasHeight = originalWidth / targetAspectRatio;
                } else if (originalAspectRatio < targetAspectRatio) {
                    // Original image is taller than target, so we need to add width
                    canvasWidth = originalHeight * targetAspectRatio;
                }

                canvas.width = Math.round(canvasWidth);
                canvas.height = Math.round(canvasHeight);

                // Fill with white background
                ctx.fillStyle = 'white';
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                // Center the original image on the canvas
                const dx = (canvas.width - originalWidth) / 2;
                const dy = (canvas.height - originalHeight) / 2;

                ctx.drawImage(img, dx, dy, originalWidth, originalHeight);

                canvas.toBlob((blob) => {
                    if (blob) {
                        const newFile = new File([blob], file.name.replace(/\.[^/.]+$/, ".png"), {
                            type: 'image/png',
                            lastModified: Date.now(),
                        });
                        resolve(newFile);
                    } else {
                        reject(new Error('Canvas toBlob failed'));
                    }
                }, 'image/png', 1);
            };
            img.onerror = (err) => {
                reject(new Error('Failed to load image for processing'));
            };
            if (event.target?.result) {
                img.src = event.target.result as string;
            } else {
                reject(new Error('File reader result is null'));
            }
        };
        reader.onerror = () => {
            reject(new Error('Failed to read file for processing'));
        };
        reader.readAsDataURL(file);
    });
};


const constructPrompt = (idea: string, aspectRatio: string, imageCount: number): string => {
    const faceFidelityRule = `
YÊU CẦU TỐI THƯỢỢNG: ĐỘ CHÍNH XÁC CỦA GƯƠNG MẶT
1.  Đây là ưu tiên SỐ MỘT, quan trọng hơn tất cả các yêu cầu khác.
2.  SAO CHÉP CHÍNH XÁC 100% từng đường nét, chi tiết, biểu cảm trên gương mặt của (những) người trong ảnh gốc. Khuôn mặt trong ảnh kết quả phải GIỐNG HỆT ảnh gốc.
3.  TUYỆT ĐỐI KHÔNG được sáng tạo, thay đổi, làm đẹp, hay 'AI-hóa' gương mặt. Giữ nguyên mọi đặc điểm nhận dạng.
`;

    const compositionRule = `
YÊU CẦU VỀ BỐ CỤC VÀ BỐI CẢNH:
1.  Bức ảnh kết quả BẮT BUỘC phải có tỷ lệ khung hình chính xác là ${aspectRatio}.
2.  Các hình ảnh gốc có thể đã được thêm các khoảng trắng (viền trắng) để đạt đúng tỷ lệ. Nhiệm vụ của bạn là PHẢI lấp đầy HOÀN TOÀN các khoảng trắng này một cách sáng tạo, mở rộng bối cảnh một cách liền mạch để tạo ra một hình ảnh hoàn chỉnh.
3.  Kết quả cuối cùng TUYỆT ĐỐI không được có bất kỳ viền trắng nào.
`;

    if (imageCount > 1) {
        const multiPersonPrompt = `
${faceFidelityRule}
${compositionRule}

YÊU CẦU VỀ KỊCH BẢN:
1.  Bạn được cung cấp NHIỀU HÌNH ẢNH. Nhiệm vụ của bạn là lấy TẤT CẢ MỌI NGƯỜI từ các hình ảnh này và đưa họ vào CÙNG MỘT BỨC ẢNH MỚI.
2.  Tạo ra một bối cảnh hoàn chỉnh dựa trên ý tưởng "${idea}".
3.  Sắp xếp tất cả mọi người vào trong bối cảnh đó một cách TỰ NHIÊN và HỢP LÝ. Hãy tạo ra tư thế, hành động và tương tác MỚI cho họ sao cho phù hợp với bối cảnh chung. Ví dụ, nếu bối cảnh là "Gia đình sum vầy", họ nên ngồi gần nhau, trò chuyện, cười đùa.
4.  Toàn bộ nhân vật, hành động, trang phục và bối cảnh phải thống nhất, hài hòa như một bức ảnh chụp khoảnh khắc đời thực. Bức ảnh phải có chất lượng cao, sắc nét. Tránh tạo ra ảnh theo phong cách vẽ hay hoạt hình.
`;
        return multiPersonPrompt.trim();
    }

    // Single person prompt
    const singlePersonPrompt = `
${faceFidelityRule}
${compositionRule}

YÊU CẦU VỀ KỊCH BẢN:
1.  Tạo một bức ảnh chụp chân thật và tự nhiên của người trong ảnh gốc.
2.  Tạo ra một bối cảnh hoàn chỉnh dựa trên ý tưởng "${idea}", và đặt người đó vào trong bối cảnh ấy.
3.  Yêu cầu then chốt là phải tạo ra một tư thế và hành động MỚI cho người đó sao cho HOÀN TOÀN LOGIC và PHÙ HỢP với vai trò của họ trong bối cảnh đó. Ví dụ, nếu bối cảnh là "cầu thủ bóng đá chuyên nghiệp", người đó phải đang mặc trang phục cầu thủ và thực hiện hành động như sút bóng, ăn mừng, hoặc đứng trên sân cỏ.
4.  Toàn bộ nhân vật, hành động, trang phục và bối cảnh phải thống nhất, hài hòa như một bức ảnh chụp khoảnh khắc đời thực. Bức ảnh phải có chất lượng cao, sắc nét. Tránh tạo ra ảnh theo phong cách vẽ hay hoạt hình.
`;
    return singlePersonPrompt.trim();
};

export const generateMidAutumnImage = async (
    imageFiles: File[],
    idea: string,
    aspectRatio: string
): Promise<string> => {
    if (!process.env.API_KEY) {
        throw new Error("API key is not configured.");
    }
    if (imageFiles.length === 0) {
        throw new Error("No images provided for generation.");
    }

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const processedImageFiles = await Promise.all(
        imageFiles.map(file => preprocessImage(file, aspectRatio))
    );

    const imageParts = await Promise.all(
        processedImageFiles.map(file => fileToGenerativePart(file))
    );

    const textPrompt = constructPrompt(idea, aspectRatio, imageFiles.length);

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: [...imageParts, { text: textPrompt }],
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });

    for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
            const mimeType = part.inlineData.mimeType;
            const base64ImageBytes = part.inlineData.data;
            return `data:${mimeType};base64,${base64ImageBytes}`;
        }
    }

    throw new Error("Không nhận được hình ảnh từ AI. Vui lòng thử lại với ảnh hoặc ý tưởng khác.");
};
