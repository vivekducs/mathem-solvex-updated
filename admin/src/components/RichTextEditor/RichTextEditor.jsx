import React, { useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { common, createLowlight } from 'lowlight';
import styles from './RichTextEditor.module.css';
import MenuBar from './MenuBar';

// Custom LaTeX extension placeholder - for now we'll use a simple node
// In a real scenario, this would be more complex with KaTeX integration
import { Node, mergeAttributes } from '@tiptap/core';

const MathNode = Node.create({
  name: 'math',
  group: 'inline',
  inline: true,
  selectable: true,
  draggable: true,
  atom: true,

  addAttributes() {
    return {
      latex: {
        default: '',
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-latex]',
        getAttrs: element => ({
          latex: element.getAttribute('data-latex'),
        }),
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, { 
      'data-latex': HTMLAttributes.latex,
      class: 'math-node' 
    }), `\\(${HTMLAttributes.latex}\\)`];
  },
});

const lowlight = createLowlight(common);

const RichTextEditor = ({ value, onChange, placeholder = 'Start typing...', onImageUpload, onMathClick }) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false,
      }),
      Underline,
      Image.configure({
        allowBase64: true,
      }),
      Link.configure({
        openOnClick: false,
      }),
      Placeholder.configure({
        placeholder,
      }),
      CodeBlockLowlight.configure({
        lowlight,
      }),
      MathNode,
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  // Expose methods via ref if needed, but for now we'll use a callback-based approach
  React.useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value, false);
    }
  }, [value, editor]);

  const handleImageUpload = (file) => {
    if (!file) return;
    
    if (onImageUpload) {
      onImageUpload(file).then(url => {
        editor.chain().focus().setImage({ src: url }).run();
      });
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        editor.chain().focus().setImage({ src: e.target.result }).run();
      };
      reader.readAsDataURL(file);
    }
  };

  const [showSource, setShowSource] = React.useState(null); // null | 'html' | 'markdown'

  const handleMathInsert = () => {
    if (onMathClick) {
      onMathClick((latex) => {
        editor.chain().focus().insertContent(`<span data-latex="${latex}">\\(${latex}\\)</span> `).run();
      });
    } else {
      const latex = window.prompt('Enter LaTeX');
      if (latex) {
        editor.chain().focus().insertContent(`<span data-latex="${latex}">\\(${latex}\\)</span> `).run();
      }
    }
  };

  // Simple Markdown Converter (Fallback since we can't install turndown easily)
  const getMarkdown = () => {
    let html = editor.getHTML();
    // Very basic conversion - in a real app, use 'turndown'
    return html
      .replace(/<h1>(.*?)<\/h1>/g, '# $1\n')
      .replace(/<h2>(.*?)<\/h2>/g, '## $1\n')
      .replace(/<strong>(.*?)<\/strong>/g, '**$1**')
      .replace(/<em>(.*?)<\/em>/g, '_$1_')
      .replace(/<p>(.*?)<\/p>/g, '$1\n\n')
      .replace(/<ul>(.*?)<\/ul>/gs, (m, c) => c.replace(/<li>(.*?)<\/li>/g, '* $1\n') + '\n')
      .replace(/<ol>(.*?)<\/ol>/gs, (m, c) => c.replace(/<li>(.*?)<\/li>/g, '1. $1\n') + '\n')
      .replace(/<a href="(.*?)">(.*?)<\/a>/g, '[$2]($1)')
      .replace(/<img src="(.*?)" alt="(.*?)" \/>/g, '![$2]($1)')
      .replace(/<span data-latex="(.*?)">(.*?)<\/span>/g, '$$$1$$')
      .replace(/<br \/>/g, '\n')
      .replace(/&nbsp;/g, ' ')
      .replace(/<.*?>/g, ''); // Strip remaining tags
  };

  if (!editor) {
    return null;
  }

  return (
    <div className={styles.editorContainer}>
      <MenuBar 
        editor={editor} 
        onImageUpload={handleImageUpload} 
        onMathClick={handleMathInsert}
      />
      
      <div className={styles.exportTabs}>
        <button 
          className={!showSource ? styles.tabActive : ''} 
          onClick={() => setShowSource(null)}
        >
          Visual
        </button>
        <button 
          className={showSource === 'html' ? styles.tabActive : ''} 
          onClick={() => setShowSource('html')}
        >
          HTML
        </button>
        <button 
          className={showSource === 'markdown' ? styles.tabActive : ''} 
          onClick={() => setShowSource('markdown')}
        >
          Markdown
        </button>
      </div>

      {!showSource ? (
        <div className={styles.editorContent} onDrop={(e) => {
            e.preventDefault();
            const files = e.dataTransfer.files;
            if (files.length > 0 && files[0].type.startsWith('image/')) {
              handleImageUpload(files[0]);
            }
        }}>
          <EditorContent editor={editor} />
        </div>
      ) : (
        <div className={styles.sourceView}>
          <textarea 
            readOnly 
            value={showSource === 'html' ? editor.getHTML() : getMarkdown()} 
          />
          <button 
            className={styles.copyBtn}
            onClick={() => {
              navigator.clipboard.writeText(showSource === 'html' ? editor.getHTML() : getMarkdown());
              toast?.success && toast.success('Copied to clipboard!');
            }}
          >
            Copy {showSource.toUpperCase()}
          </button>
        </div>
      )}
    </div>
  );
};

export default RichTextEditor;
