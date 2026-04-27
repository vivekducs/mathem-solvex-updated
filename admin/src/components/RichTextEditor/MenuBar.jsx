import React, { useRef } from 'react';
import { 
  Bold, Italic, List, ListOrdered, Quote, Code, 
  Image as ImageIcon, Link as LinkIcon, Undo, Redo, 
  Type, Calculator, Trash2, AlignLeft, AlignCenter, AlignRight,
  Underline as UnderlineIcon, Heading1, Heading2, Code2
} from 'lucide-react';
import styles from './RichTextEditor.module.css';

const MenuBar = ({ editor, onImageUpload, onMathClick }) => {
  const fileInputRef = useRef(null);

  if (!editor) {
    return null;
  }

  const addLink = () => {
    const url = window.prompt('URL');
    if (url) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  };

  const addMath = () => {
    if (onMathClick) {
      onMathClick();
    } else {
      const latex = window.prompt('Enter LaTeX (e.g., E=mc^2)');
      if (latex) {
        editor.chain().focus().insertContent(`<span data-latex="${latex}">\\(${latex}\\)</span>`).run();
      }
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      onImageUpload(file);
    }
    e.target.value = null; // Reset for same file upload
  };

  return (
    <div className={styles.toolbar}>
      <div className={styles.toolbarGroup}>
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`${styles.toolbarBtn} ${editor.isActive('bold') ? styles.toolbarBtnActive : ''}`}
          title="Bold"
        >
          <Bold size={18} />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`${styles.toolbarBtn} ${editor.isActive('italic') ? styles.toolbarBtnActive : ''}`}
          title="Italic"
        >
          <Italic size={18} />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={`${styles.toolbarBtn} ${editor.isActive('underline') ? styles.toolbarBtnActive : ''}`}
          title="Underline"
        >
          <UnderlineIcon size={18} />
        </button>
      </div>

      <div className={styles.toolbarGroup}>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={`${styles.toolbarBtn} ${editor.isActive('heading', { level: 1 }) ? styles.toolbarBtnActive : ''}`}
          title="Heading 1"
        >
          <Heading1 size={18} />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`${styles.toolbarBtn} ${editor.isActive('heading', { level: 2 }) ? styles.toolbarBtnActive : ''}`}
          title="Heading 2"
        >
          <Heading2 size={18} />
        </button>
      </div>

      <div className={styles.toolbarGroup}>
        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`${styles.toolbarBtn} ${editor.isActive('bulletList') ? styles.toolbarBtnActive : ''}`}
          title="Bullet List"
        >
          <List size={18} />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`${styles.toolbarBtn} ${editor.isActive('orderedList') ? styles.toolbarBtnActive : ''}`}
          title="Ordered List"
        >
          <ListOrdered size={18} />
        </button>
      </div>

      <div className={styles.toolbarGroup}>
        <button
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={`${styles.toolbarBtn} ${editor.isActive('blockquote') ? styles.toolbarBtnActive : ''}`}
          title="Blockquote"
        >
          <Quote size={18} />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          className={`${styles.toolbarBtn} ${editor.isActive('codeBlock') ? styles.toolbarBtnActive : ''}`}
          title="Code Block"
        >
          <Code2 size={18} />
        </button>
      </div>

      <div className={styles.toolbarGroup}>
        <button onClick={addLink} className={`${styles.toolbarBtn} ${editor.isActive('link') ? styles.toolbarBtnActive : ''}`} title="Link">
          <LinkIcon size={18} />
        </button>
        <button onClick={() => fileInputRef.current?.click()} className={styles.toolbarBtn} title="Image">
          <ImageIcon size={18} />
          <input 
            type="file" 
            ref={fileInputRef} 
            style={{ display: 'none' }} 
            accept="image/*" 
            onChange={handleFileChange}
          />
        </button>
        <button onClick={addMath} className={styles.toolbarBtn} title="Math Equation">
          <Calculator size={18} />
        </button>
      </div>

      <div className={styles.toolbarGroup} style={{ marginLeft: 'auto' }}>
        <button onClick={() => editor.chain().focus().undo().run()} className={styles.toolbarBtn} title="Undo">
          <Undo size={18} />
        </button>
        <button onClick={() => editor.chain().focus().redo().run()} className={styles.toolbarBtn} title="Redo">
          <Redo size={18} />
        </button>
      </div>
    </div>
  );
};

export default MenuBar;
