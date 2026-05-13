import React, { useRef } from 'react';
import {
  Bold, Italic, List, ListOrdered, Quote, Code,
  Image as ImageIcon, Link as LinkIcon, Undo, Redo,
  Calculator, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Underline as UnderlineIcon, Heading1, Heading2, Heading3,
  Code2, Strikethrough, Highlighter, CheckSquare, Minus, Youtube,
  Type, ALargeSmall
} from 'lucide-react';
import styles from './RichTextEditor.module.css';

const FONT_FAMILIES = [
  { label: 'Default', value: '' },
  { label: 'Inter', value: 'Inter' },
  { label: 'Georgia', value: 'Georgia' },
  { label: 'Times New Roman', value: 'Times New Roman' },
  { label: 'Arial', value: 'Arial' },
  { label: 'Courier New', value: 'Courier New' },
  { label: 'Verdana', value: 'Verdana' },
];

const FONT_SIZES = [
  { label: 'Size', value: '' },
  { label: '12px', value: '12px' },
  { label: '14px', value: '14px' },
  { label: '16px', value: '16px' },
  { label: '18px', value: '18px' },
  { label: '20px', value: '20px' },
  { label: '24px', value: '24px' },
  { label: '28px', value: '28px' },
  { label: '32px', value: '32px' },
];

const MenuBar = ({ editor, onImageUpload, onMathClick, isBlogMode }) => {
  const fileInputRef = useRef(null);

  if (!editor) {
    return null;
  }

  const handleAction = (e, action) => {
    e.preventDefault();
    action();
  };

  const addLink = (e) => {
    e.preventDefault();
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL', previousUrl);
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  const addYoutubeVideo = (e) => {
    e.preventDefault();
    const url = prompt('Enter YouTube URL');
    if (url) {
      editor.commands.setYoutubeVideo({
        src: url,
        width: Math.max(320, parseInt(editor.view.dom.clientWidth, 10) - 60) || 640,
        height: Math.max(180, parseInt(editor.view.dom.clientWidth, 10) * 0.5) || 480,
      });
    }
  };

  const addMath = (e) => {
    e.preventDefault();
    if (onMathClick) {
      onMathClick();
    } else {
      const latex = window.prompt('Enter LaTeX (e.g., E=mc^2)');
      if (latex) {
        editor.chain().focus().insertContent({
          type: 'math',
          attrs: { latex },
        }).run();
      }
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      onImageUpload(file);
    }
    e.target.value = null;
  };

  const handleFontFamily = (e) => {
    const value = e.target.value;
    if (value) {
      editor.chain().focus().setFontFamily(value).run();
    } else {
      editor.chain().focus().unsetFontFamily().run();
    }
  };

  const handleFontSize = (e) => {
    const value = e.target.value;
    if (value) {
      editor.chain().focus().setMark('textStyle', { fontSize: value }).run();
    } else {
      editor.chain().focus().unsetMark('textStyle').run();
    }
  };

  const ToolbarButton = ({ onClick, isActive, title, children }) => (
    <button
      type="button"
      onClick={onClick}
      className={`${styles.toolbarBtn} ${isActive ? styles.toolbarBtnActive : ''}`}
      title={title}
    >
      {children}
    </button>
  );

  return (
    <div className={styles.toolbar}>
      {/* Font Family & Size (hidden in blog mode for SEO) */}
      {!isBlogMode && (
        <div className={styles.toolbarGroup}>
          <select
            className={styles.toolbarSelect}
            onChange={handleFontFamily}
            value={editor.getAttributes('textStyle').fontFamily || ''}
            title="Font Family"
          >
            {FONT_FAMILIES.map(f => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
          <select
            className={styles.toolbarSelectSmall}
            onChange={handleFontSize}
            value={editor.getAttributes('textStyle').fontSize || ''}
            title="Font Size"
          >
            {FONT_SIZES.map(f => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
        </div>
      )}

      {/* Text Formatting */}
      <div className={styles.toolbarGroup}>
        <ToolbarButton
          onClick={(e) => handleAction(e, () => editor.chain().focus().toggleBold().run())}
          isActive={editor.isActive('bold')}
          title="Bold"
        >
          <Bold size={18} />
        </ToolbarButton>
        <ToolbarButton
          onClick={(e) => handleAction(e, () => editor.chain().focus().toggleItalic().run())}
          isActive={editor.isActive('italic')}
          title="Italic"
        >
          <Italic size={18} />
        </ToolbarButton>
        <ToolbarButton
          onClick={(e) => handleAction(e, () => editor.chain().focus().toggleUnderline().run())}
          isActive={editor.isActive('underline')}
          title="Underline"
        >
          <UnderlineIcon size={18} />
        </ToolbarButton>
        <ToolbarButton
          onClick={(e) => handleAction(e, () => editor.chain().focus().toggleStrike().run())}
          isActive={editor.isActive('strike')}
          title="Strikethrough"
        >
          <Strikethrough size={18} />
        </ToolbarButton>
        <ToolbarButton
          onClick={(e) => handleAction(e, () => editor.chain().focus().toggleHighlight().run())}
          isActive={editor.isActive('highlight')}
          title="Highlight"
        >
          <Highlighter size={18} />
        </ToolbarButton>
      </div>

      {/* Alignment */}
      <div className={styles.toolbarGroup}>
        <ToolbarButton
          onClick={(e) => handleAction(e, () => editor.chain().focus().setTextAlign('left').run())}
          isActive={editor.isActive({ textAlign: 'left' })}
          title="Align Left"
        >
          <AlignLeft size={18} />
        </ToolbarButton>
        <ToolbarButton
          onClick={(e) => handleAction(e, () => editor.chain().focus().setTextAlign('center').run())}
          isActive={editor.isActive({ textAlign: 'center' })}
          title="Align Center"
        >
          <AlignCenter size={18} />
        </ToolbarButton>
        <ToolbarButton
          onClick={(e) => handleAction(e, () => editor.chain().focus().setTextAlign('right').run())}
          isActive={editor.isActive({ textAlign: 'right' })}
          title="Align Right"
        >
          <AlignRight size={18} />
        </ToolbarButton>
        <ToolbarButton
          onClick={(e) => handleAction(e, () => editor.chain().focus().setTextAlign('justify').run())}
          isActive={editor.isActive({ textAlign: 'justify' })}
          title="Justify"
        >
          <AlignJustify size={18} />
        </ToolbarButton>
      </div>

      {/* Headings */}
      <div className={styles.toolbarGroup}>
        <ToolbarButton
          onClick={(e) => handleAction(e, () => editor.chain().focus().toggleHeading({ level: 1 }).run())}
          isActive={editor.isActive('heading', { level: 1 })}
          title="Heading 1"
        >
          <Heading1 size={18} />
        </ToolbarButton>
        <ToolbarButton
          onClick={(e) => handleAction(e, () => editor.chain().focus().toggleHeading({ level: 2 }).run())}
          isActive={editor.isActive('heading', { level: 2 })}
          title="Heading 2"
        >
          <Heading2 size={18} />
        </ToolbarButton>
        <ToolbarButton
          onClick={(e) => handleAction(e, () => editor.chain().focus().toggleHeading({ level: 3 }).run())}
          isActive={editor.isActive('heading', { level: 3 })}
          title="Heading 3"
        >
          <Heading3 size={18} />
        </ToolbarButton>
      </div>

      {/* Lists & Block */}
      <div className={styles.toolbarGroup}>
        <ToolbarButton
          onClick={(e) => handleAction(e, () => editor.chain().focus().toggleBulletList().run())}
          isActive={editor.isActive('bulletList')}
          title="Bullet List"
        >
          <List size={18} />
        </ToolbarButton>
        <ToolbarButton
          onClick={(e) => handleAction(e, () => editor.chain().focus().toggleOrderedList().run())}
          isActive={editor.isActive('orderedList')}
          title="Ordered List"
        >
          <ListOrdered size={18} />
        </ToolbarButton>
        <ToolbarButton
          onClick={(e) => handleAction(e, () => editor.chain().focus().toggleTaskList().run())}
          isActive={editor.isActive('taskList')}
          title="Task List"
        >
          <CheckSquare size={18} />
        </ToolbarButton>
        <ToolbarButton
          onClick={(e) => handleAction(e, () => editor.chain().focus().toggleBlockquote().run())}
          isActive={editor.isActive('blockquote')}
          title="Blockquote"
        >
          <Quote size={18} />
        </ToolbarButton>
        <ToolbarButton
          onClick={(e) => handleAction(e, () => editor.chain().focus().toggleCodeBlock().run())}
          isActive={editor.isActive('codeBlock')}
          title="Code Block"
        >
          <Code2 size={18} />
        </ToolbarButton>
        <ToolbarButton
          onClick={(e) => handleAction(e, () => editor.chain().focus().setHorizontalRule().run())}
          isActive={false}
          title="Horizontal Rule"
        >
          <Minus size={18} />
        </ToolbarButton>
      </div>

      {/* Insert */}
      <div className={styles.toolbarGroup}>
        <ToolbarButton onClick={addLink} isActive={editor.isActive('link')} title="Link">
          <LinkIcon size={18} />
        </ToolbarButton>
        <button type="button" onClick={(e) => { e.preventDefault(); fileInputRef.current?.click(); }} className={styles.toolbarBtn} title="Image">
          <ImageIcon size={18} />
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            accept="image/*"
            onChange={handleFileChange}
          />
        </button>
        <ToolbarButton onClick={addYoutubeVideo} isActive={editor.isActive('youtube')} title="YouTube Video">
          <Youtube size={18} />
        </ToolbarButton>
        <ToolbarButton onClick={addMath} isActive={false} title="Math Equation (LaTeX)">
          <Calculator size={18} />
        </ToolbarButton>
      </div>

      {/* History */}
      <div className={styles.toolbarGroup} style={{ marginLeft: 'auto' }}>
        <ToolbarButton onClick={(e) => handleAction(e, () => editor.chain().focus().undo().run())} isActive={false} title="Undo">
          <Undo size={18} />
        </ToolbarButton>
        <ToolbarButton onClick={(e) => handleAction(e, () => editor.chain().focus().redo().run())} isActive={false} title="Redo">
          <Redo size={18} />
        </ToolbarButton>
      </div>
    </div>
  );
};

export default MenuBar;
