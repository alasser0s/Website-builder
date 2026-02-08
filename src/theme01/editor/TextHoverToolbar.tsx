import React from 'react';

interface TextEditorPopupProps {
    nodeId: string;
    nodeType: 'heading' | 'paragraph' | 'button';
    styles: Record<string, unknown>;
    onUpdateStyles: (nodeId: string, styles: Record<string, unknown>) => void;
    position: { top: number; left: number };
    onClose: () => void;
}

const FONT_FAMILY_OPTIONS = [
    { value: 'inherit', label: 'الخط' },
    { value: 'Cairo', label: 'Cairo' },
    { value: 'Tajawal', label: 'Tajawal' },
    { value: 'Almarai', label: 'Almarai' },
    { value: 'IBM Plex Sans Arabic', label: 'IBM Plex Sans' },
    { value: 'Noto Sans Arabic', label: 'Noto Sans' },
    { value: 'Inter', label: 'Inter' },
    { value: 'Roboto', label: 'Roboto' },
];

const FONT_SIZE_MAP: Record<string, number> = {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
    '5xl': 48,
    '6xl': 60,
};

// FONT_SIZE_OPTIONS removed - no longer used since we store raw numeric values

function getFontSizeValue(size: string): number {
    return FONT_SIZE_MAP[size] ?? (parseInt(size, 10) || 16);
}

// Note: getSizeToken was removed as we now store raw numeric fontSize values

export function TextEditorPopup({
    nodeId,
    styles,
    onUpdateStyles,
    position,
    onClose,
}: TextEditorPopupProps) {
    const currentFontFamily = (styles.fontFamily as string) ?? 'inherit';
    const currentFontSize = styles.fontSize ?? 'base';
    const currentFontWeight = (styles.fontWeight as string) ?? 'normal';
    const currentTextDecoration = (styles.textDecoration as string) ?? 'none';
    const currentFontStyle = (styles.fontStyle as string) ?? 'normal';
    const currentTextAlign = (styles.textAlign as string) ?? 'start';
    const currentColor = (styles.color as string) ?? '#000000';
    const currentBgColor = (styles.backgroundColor as string) ?? 'transparent';

    // Handle both numeric and string fontSize values
    const fontSizeNum = typeof currentFontSize === 'number'
        ? currentFontSize
        : getFontSizeValue(String(currentFontSize));

    const setStyle = (patch: Record<string, unknown>) => {
        onUpdateStyles(nodeId, patch);
    };

    const isBold = ['bold', 'semibold', 'extrabold', 'black'].includes(currentFontWeight);
    const isUnderline = currentTextDecoration === 'underline';
    const isItalic = currentFontStyle === 'italic';
    const isStrikethrough = currentTextDecoration === 'line-through';

    const toggleBold = () => {
        setStyle({ fontWeight: isBold ? 'normal' : 'bold' });
    };

    const toggleUnderline = () => {
        if (currentTextDecoration === 'underline') {
            setStyle({ textDecoration: 'none' });
        } else {
            setStyle({ textDecoration: 'underline' });
        }
    };

    const toggleItalic = () => {
        setStyle({ fontStyle: isItalic ? 'normal' : 'italic' });
    };

    const toggleStrikethrough = () => {
        if (currentTextDecoration === 'line-through') {
            setStyle({ textDecoration: 'none' });
        } else {
            setStyle({ textDecoration: 'line-through' });
        }
    };

    const clearFormatting = () => {
        setStyle({
            fontWeight: 'normal',
            fontStyle: 'normal',
            textDecoration: 'none',
            color: undefined,
            backgroundColor: undefined,
        });
    };

    const handleFontSizeSlider = (event: React.ChangeEvent<HTMLInputElement>) => {
        const value = parseInt(event.target.value, 10);
        // Store raw numeric value for direct inline style pass-through
        setStyle({ fontSize: value });
    };

    const handleFontSizeInput = (event: React.ChangeEvent<HTMLInputElement>) => {
        const value = parseInt(event.target.value, 10);
        if (Number.isFinite(value) && value > 0) {
            // Store raw numeric value for direct inline style pass-through
            setStyle({ fontSize: value });
        }
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
                <span className="editor-popup-title">اعداد النص</span>
            </div>
            <div className="editor-popup-body">
                {/* Font Family */}
                <div className="popup-field">
                    <label className="popup-field-label">الخط</label>
                    <select
                        className="popup-select"
                        value={currentFontFamily}
                        onChange={(e) => setStyle({ fontFamily: e.target.value })}
                    >
                        {FONT_FAMILY_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                                {opt.label}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Font Size */}
                <div className="popup-field">
                    <label className="popup-field-label">مقاس الخط</label>
                    <div className="font-size-control">
                        <input
                            type="number"
                            className="font-size-input"
                            value={fontSizeNum}
                            onChange={handleFontSizeInput}
                            min={10}
                            max={72}
                        />
                        <input
                            type="range"
                            className="font-size-slider"
                            min={10}
                            max={72}
                            value={fontSizeNum}
                            onChange={handleFontSizeSlider}
                        />
                    </div>
                </div>

                {/* Text Formatting */}
                <div className="text-format-group">
                    <button
                        type="button"
                        className={`text-format-btn ${isBold ? 'active' : ''}`}
                        onClick={toggleBold}
                        title="عريض"
                    >
                        B
                    </button>
                    <button
                        type="button"
                        className={`text-format-btn ${isUnderline ? 'active' : ''}`}
                        onClick={toggleUnderline}
                        title="تسطير"
                        style={{ textDecoration: 'underline' }}
                    >
                        U
                    </button>
                    <button
                        type="button"
                        className={`text-format-btn ${isItalic ? 'active' : ''}`}
                        onClick={toggleItalic}
                        title="مائل"
                        style={{ fontStyle: 'italic' }}
                    >
                        I
                    </button>
                    <button
                        type="button"
                        className={`text-format-btn ${isStrikethrough ? 'active' : ''}`}
                        onClick={toggleStrikethrough}
                        title="يتوسطه خط"
                        style={{ textDecoration: 'line-through' }}
                    >
                        S
                    </button>
                    <span className="format-divider" />
                    {/* Text Color */}
                    <button
                        type="button"
                        className="text-format-btn color-picker-btn"
                        title="لون النص"
                    >
                        <span style={{ color: currentColor }}>A</span>
                        <span
                            className="color-indicator"
                            style={{ backgroundColor: currentColor }}
                        />
                        <input
                            type="color"
                            value={currentColor === 'inherit' ? '#000000' : currentColor}
                            onChange={(e) => setStyle({ color: e.target.value })}
                        />
                    </button>
                    {/* Background Color */}
                    <button
                        type="button"
                        className="text-format-btn color-picker-btn"
                        title="لون الخلفية"
                    >
                        <span
                            className="color-indicator"
                            style={{ backgroundColor: currentBgColor === 'transparent' ? '#ffffff' : currentBgColor }}
                        />
                        <input
                            type="color"
                            value={currentBgColor === 'transparent' ? '#ffffff' : currentBgColor}
                            onChange={(e) => setStyle({ backgroundColor: e.target.value })}
                        />
                    </button>
                    <span className="format-divider" />
                    <button
                        type="button"
                        className="text-format-btn"
                        onClick={clearFormatting}
                        title="مسح التنسيق"
                    >
                        ✕
                    </button>
                </div>

                {/* Text Alignment */}
                <div className="text-align-group">
                    <button
                        type="button"
                        className={`text-format-btn ${currentTextAlign === 'end' || currentTextAlign === 'right' ? 'active' : ''}`}
                        onClick={() => setStyle({ textAlign: 'end' })}
                        title="محاذاة لليمين"
                    >
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M3 21v-2h18v2H3Zm6-4v-2h12v2H9Zm-6-4v-2h18v2H3Zm6-4V7h12v2H9ZM3 5V3h18v2H3Z" />
                        </svg>
                    </button>
                    <button
                        type="button"
                        className={`text-format-btn ${currentTextAlign === 'center' ? 'active' : ''}`}
                        onClick={() => setStyle({ textAlign: 'center' })}
                        title="وسط"
                    >
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M3 21v-2h18v2H3Zm4-4v-2h10v2H7ZM3 13v-2h18v2H3Zm4-4V7h10v2H7ZM3 5V3h18v2H3Z" />
                        </svg>
                    </button>
                    <button
                        type="button"
                        className={`text-format-btn ${currentTextAlign === 'start' || currentTextAlign === 'left' ? 'active' : ''}`}
                        onClick={() => setStyle({ textAlign: 'start' })}
                        title="محاذاة لليسار"
                    >
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M3 21v-2h18v2H3Zm0-4v-2h12v2H3Zm0-4v-2h18v2H3Zm0-4V7h12v2H3ZM3 5V3h18v2H3Z" />
                        </svg>
                    </button>
                    <button
                        type="button"
                        className={`text-format-btn ${currentTextAlign === 'justify' ? 'active' : ''}`}
                        onClick={() => setStyle({ textAlign: 'justify' })}
                        title="ضبط"
                    >
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M3 21v-2h18v2H3Zm0-4v-2h18v2H3Zm0-4v-2h18v2H3Zm0-4V7h18v2H3ZM3 5V3h18v2H3Z" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
}

// Keep old export name for backward compatibility
export { TextEditorPopup as TextHoverToolbar };
export type { TextEditorPopupProps as TextHoverToolbarProps };
