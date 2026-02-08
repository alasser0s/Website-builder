import React from 'react';

interface TextEditorPopupProps {
    nodeId: string;
    nodeType: 'heading' | 'paragraph' | 'button';
    styles: Record<string, unknown>;
    onUpdateStyles: (nodeId: string, styles: Record<string, unknown>) => void;
    position: { top: number; left: number };
    onClose: () => void;
}





// Helper to safely get font size number
const getFontSizeValue = (val: unknown): number => {
    if (typeof val === 'number') return val;
    if (typeof val === 'string' && val.endsWith('px')) return parseInt(val, 10);
    return 16; // default
};

export function TextHoverToolbar({
    nodeId,
    styles,
    onUpdateStyles,
    position,

}: TextEditorPopupProps) {
    // --- HELPER FUNCTIONS FOR CSS STRINGS ---
    const isBold = (s: any) => s.fontWeight === 'bold' || s.fontWeight === 700 || s.fontWeight === '700';
    const isItalic = (s: any) => s.fontStyle === 'italic';
    const isUnderline = (s: any) => s.textDecoration === 'underline';

    const currentFontSize = getFontSizeValue(styles.fontSize);
    const currentColor = (styles.color as string) || '#000000';
    const currentAlign = (styles.textAlign as string) || 'left';

    const setStyle = (newStyles: Record<string, unknown>) => {
        onUpdateStyles(nodeId, { ...styles, ...newStyles });
    };

    // --- UPDATED TOGGLES (THE FIX) ---
    const toggleBold = () => {
        // Send 'bold' or 'normal' (CSS valid strings), NOT true/false
        setStyle({ fontWeight: isBold(styles) ? 'normal' : 'bold' });
    };

    const toggleItalic = () => {
        setStyle({ fontStyle: isItalic(styles) ? 'normal' : 'italic' });
    };

    const toggleUnderline = () => {
        setStyle({ textDecoration: isUnderline(styles) ? 'none' : 'underline' });
    };

    const setAlign = (align: 'left' | 'center' | 'right') => {
        setStyle({ textAlign: align });
    };

    const handleFontSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseInt(e.target.value, 10);
        if (!isNaN(val)) setStyle({ fontSize: val });
    };

    return (
        <div
            className="text-hover-toolbar"
            style={{
                position: 'fixed',
                top: position.top - 60,
                left: position.left,
                zIndex: 9999,
                backgroundColor: 'white',
                padding: '8px',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                display: 'flex',
                gap: '8px',
                alignItems: 'center',
                flexWrap: 'wrap',
                maxWidth: '320px'
            }}
        >
            {/* Bold Button */}
            <button
                className={`toolbar-btn ${isBold(styles) ? 'active' : ''}`}
                onClick={toggleBold}
                style={{ fontWeight: 'bold', background: isBold(styles) ? '#e5e7eb' : 'transparent' }}
            >
                B
            </button>

            {/* Italic Button */}
            <button
                className={`toolbar-btn ${isItalic(styles) ? 'active' : ''}`}
                onClick={toggleItalic}
                style={{ fontStyle: 'italic', background: isItalic(styles) ? '#e5e7eb' : 'transparent' }}
            >
                I
            </button>

            {/* Underline Button */}
            <button
                className={`toolbar-btn ${isUnderline(styles) ? 'active' : ''}`}
                onClick={toggleUnderline}
                style={{ textDecoration: 'underline', background: isUnderline(styles) ? '#e5e7eb' : 'transparent' }}
            >
                U
            </button>

            <div className="toolbar-divider" style={{ width: 1, height: 20, background: '#e5e7eb' }} />

            {/* Alignment */}
            <button onClick={() => setAlign('left')} style={{ background: currentAlign === 'left' ? '#e5e7eb' : 'transparent' }}>L</button>
            <button onClick={() => setAlign('center')} style={{ background: currentAlign === 'center' ? '#e5e7eb' : 'transparent' }}>C</button>
            <button onClick={() => setAlign('right')} style={{ background: currentAlign === 'right' ? '#e5e7eb' : 'transparent' }}>R</button>

            <div className="toolbar-divider" style={{ width: 1, height: 20, background: '#e5e7eb' }} />

            {/* Font Size Input (No resets!) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: 10, color: '#666' }}>Size:</span>
                <input
                    type="number"
                    value={currentFontSize}
                    onChange={handleFontSizeChange}
                    style={{ width: 40, padding: 4, borderRadius: 4, border: '1px solid #ddd' }}
                />
            </div>

            {/* Color Picker */}
            <input
                type="color"
                value={currentColor}
                onChange={(e) => setStyle({ color: e.target.value })}
                style={{ width: 24, height: 24, padding: 0, border: 'none', background: 'none', cursor: 'pointer' }}
            />
        </div>
    );
}
