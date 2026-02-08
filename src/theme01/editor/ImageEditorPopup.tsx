import React, { useRef } from 'react';

interface ImageEditorPopupProps {
    nodeId: string;
    currentSrc: string;
    objectFit: string;
    position: { top: number; left: number };
    onClose: () => void;
    onUpdateStyles: (nodeId: string, styles: Record<string, unknown>) => void;
    onUpdateData: (nodeId: string, data: Record<string, unknown>) => void;
    onUpload: (file: File) => void;
}

const OBJECT_FIT_OPTIONS = [
    { value: 'cover', label: 'ملأ' },
    { value: 'contain', label: 'احتواء' },
    { value: 'fill', label: 'تمديد' },
    { value: 'none', label: 'بدون' },
];

export function ImageEditorPopup({
    nodeId,
    currentSrc,
    objectFit,
    position,
    onClose,
    onUpdateStyles,
    onUpdateData,
    onUpload,
}: ImageEditorPopupProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            onUpload(file);
        }
    };

    const handleObjectFitChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        // Use onUpdateStyles so objectFit applies as inline style
        onUpdateStyles(nodeId, { objectFit: event.target.value });
    };

    return (
        <div
            className="editor-popup"
            style={{
                top: position.top,
                left: position.left,
            }}
            onMouseDown={(e) => e.stopPropagation()}
        >
            <div className="editor-popup-header">
                <div className="editor-popup-header-actions">
                    <button
                        type="button"
                        className="editor-popup-close"
                        onClick={onClose}
                        title="إغلاق"
                    >
                        ✕
                    </button>
                    <button
                        type="button"
                        className="editor-popup-help"
                        title="مساعدة"
                    >
                        ?
                    </button>
                </div>
                <span className="editor-popup-title">اعداد الصور</span>
            </div>
            <div className="editor-popup-body">
                <div className="popup-field">
                    <select
                        className="popup-select"
                        value={objectFit}
                        onChange={handleObjectFitChange}
                    >
                        {OBJECT_FIT_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                                {opt.label}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="image-preview-container">
                    {currentSrc ? (
                        <img
                            src={currentSrc}
                            alt="Preview"
                            className="image-preview-img"
                        />
                    ) : (
                        <div
                            className="image-preview-img"
                            style={{ background: 'rgba(0,0,0,0.05)' }}
                        />
                    )}
                    <button
                        type="button"
                        className="image-upload-btn"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        اختار صورة
                    </button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="image-upload-input"
                        onChange={handleFileChange}
                    />
                </div>

                {/* AI Text Edit Button */}
                <button
                    type="button"
                    className="ai-edit-btn"
                    onClick={() => {
                        // TODO: Implement AI text editing functionality
                        console.log('AI text edit clicked for image', nodeId);
                    }}
                >
                    تعديل النص بالذكاء الصناعي
                </button>
            </div>
        </div>
    );
}

export type { ImageEditorPopupProps };
