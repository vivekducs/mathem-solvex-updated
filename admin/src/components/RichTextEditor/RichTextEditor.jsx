import React, { useEffect, useState, useRef, useMemo } from 'react';

import { useEditor, EditorContent } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';

import StarterKit from '@tiptap/starter-kit';

import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import TaskItem from '@tiptap/extension-task-item';
import TaskList from '@tiptap/extension-task-list';
import Youtube from '@tiptap/extension-youtube';
import CharacterCount from '@tiptap/extension-character-count';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableCell } from '@tiptap/extension-table-cell';


import { TextStyle } from '@tiptap/extension-text-style';
import { FontFamily } from '@tiptap/extension-font-family';
import { Color } from '@tiptap/extension-color';

import { common, createLowlight } from 'lowlight';
import { Node, mergeAttributes, Extension } from '@tiptap/core';

import { hydrateLatex } from '../../utils/mathHydration';
import styles from './RichTextEditor.module.css';
import MenuBar from './MenuBar';

// ─────────────────────────────────────────────────────────────
// FontSize extension (missing from @tiptap — create manually)
// ─────────────────────────────────────────────────────────────
const FontSize = Extension.create({
  name: 'fontSize',

  addOptions() {
    return { types: ['textStyle'] };
  },

  addGlobalAttributes() {
    return [{
      types: this.options.types,
      attributes: {
        fontSize: {
          default: null,
          parseHTML: element => element.style.fontSize?.replace(/['"]+/g, '') || null,
          renderHTML: attributes => {
            if (!attributes.fontSize) return {};
            return { style: `font-size: ${attributes.fontSize}` };
          },
        },
      },
    }];
  },
});

// ─────────────────────────────────────────────────────────────
// Custom Inline Math Node
// ─────────────────────────────────────────────────────────────
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
        parseHTML: element => {
          // Priority 1: data-latex attribute
          const attr = element.getAttribute('data-latex');
          if (attr) return attr;
          // Priority 2: strip delimiters from text content
          const text = element.textContent || '';
          return text.replace(/^\\\(|\\\)$/g, '').trim();
        },
        renderHTML: attributes => ({
          'data-latex': attributes.latex,
        }),
      },
    };
  },

  parseHTML() {
    return [
      { tag: 'span[data-latex]' },
      { tag: 'span.math-node' },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, {
      class: 'math-node',
    }), `\\(${HTMLAttributes.latex}\\)`];
  },
});

// ─────────────────────────────────────────────────────────────
// Custom Block Math Node
// ─────────────────────────────────────────────────────────────
const MathBlockNode = Node.create({
  name: 'mathBlock',
  group: 'block',
  content: '',
  marks: '',
  selectable: true,
  draggable: true,
  atom: true,

  addAttributes() {
    return {
      latex: {
        default: '',
        parseHTML: element => {
          const attr = element.getAttribute('data-latex');
          if (attr) return attr;
          const text = element.textContent || '';
          return text.replace(/^\\\[|\\\]$/g, '').trim();
        },
        renderHTML: attributes => ({
          'data-latex': attributes.latex,
        }),
      },
    };
  },

  parseHTML() {
    return [
      { tag: 'div[data-latex]' },
      { tag: 'div.math-block-node' },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, {
      class: 'math-block-node',
    }), `\\[${HTMLAttributes.latex}\\]`];
  },
});

// ─────────────────────────────────────────────────────────────
// Lowlight for code highlighting
// ─────────────────────────────────────────────────────────────
const lowlight = createLowlight(common);

// ─────────────────────────────────────────────────────────────
// Editor extensions (dynamic based on mode)
// ─────────────────────────────────────────────────────────────
const getEditorExtensions = (isBlogMode) => {
  return [
    StarterKit.configure({
      codeBlock: false,
      history: true,
      // In blog mode, StarterKit strips unknown styles/tags automatically,
      // providing clean HTML and removing Word-pasted pollution.
    }),
    Image.configure({ allowBase64: !isBlogMode }),
    Placeholder.configure({ placeholder: 'Start typing...' }),
    CodeBlockLowlight.configure({ lowlight }),
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
    Highlight,
    TaskList,
    TaskItem.configure({ nested: true }),
    Youtube.configure({ inline: false }),
    CharacterCount,
    ...(isBlogMode ? [] : [
      TextStyle,
      FontFamily,
      FontSize,
      Color,
    ]),

    MathNode,
    MathBlockNode,
    Table.configure({ resizable: true }),
    TableRow,
    TableHeader,
    TableCell,
  ];
};

// ─────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────
const RichTextEditor = ({ value, onChange, placeholder = 'Start typing...', onImageUpload, onMathClick, editorType = 'default' }) => {
  const [showSource, setShowSource] = useState(null);
  const isUpdatingRef = useRef(false);
  const editorContainerRef = useRef(null);

  const isBlogMode = editorType === 'blog';

  // ── Hydrate content on initial load ──
  // Memoize the initial hydrated value so we only hydrate once on mount
  const initialContent = useMemo(() => hydrateLatex(value || ''), []);

  const editorExtensions = useMemo(() => getEditorExtensions(isBlogMode), [isBlogMode]);

  const editor = useEditor({
    extensions: editorExtensions,
    content: initialContent,
    onUpdate: ({ editor }) => {
      isUpdatingRef.current = true;
      onChange(editor.getHTML());
      setTimeout(() => {
        isUpdatingRef.current = false;
      }, 0);
    },
    editorProps: {
      handlePaste: (view, event) => {
        const items = Array.from(event.clipboardData?.items || []);
        const imageItem = items.find(item => item.type.startsWith('image/'));
        if (imageItem) {
          const file = imageItem.getAsFile();
          if (file) {
            handleImageUpload(file);
            return true; // handled
          }
        }
        return false;
      },
      handleDrop: (view, event, slice, moved) => {
        if (!moved && event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0]) {
          const file = event.dataTransfer.files[0];
          if (file.type.startsWith('image/')) {
            handleImageUpload(file);
            return true; // handled
          }
        }
        return false;
      },
    },
  });

  // ── Controlled component sync (hydrate before setting) ──
  useEffect(() => {
    if (editor && value !== undefined && !isUpdatingRef.current) {
      const currentContent = editor.getHTML();
      if (value !== currentContent) {
        const hydrated = hydrateLatex(value);
        editor.commands.setContent(hydrated, false);
      }
    }
  }, [value, editor]);

  // ── Prevent MathJax from processing inside the editor ──
  useEffect(() => {
    if (editorContainerRef.current && window.MathJax) {
      // Tell MathJax to skip this container
      const el = editorContainerRef.current;
      el.classList.add('mathjax-ignore');
      // Also set the attribute MathJax v3 respects
      el.setAttribute('data-mathjax-ignore', '');
    }
  }, [editor]);

  // ── Image upload handler ──
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

  // ── Math insertion handler ──
  const handleMathInsert = () => {
    if (onMathClick) {
      onMathClick((latex) => {
        // Heuristic: use block math for multi-line or long expressions
        const isBlock = latex.includes('\\\\') || latex.includes('\\begin') || latex.length > 80;
        editor.chain().focus().insertContent({
          type: isBlock ? 'mathBlock' : 'math',
          attrs: { latex },
        }).run();
      });
    } else {
      const latex = window.prompt('Enter LaTeX');
      if (latex) {
        editor.chain().focus().insertContent({
          type: 'math',
          attrs: { latex },
        }).run();
      }
    }
  };

  // ── Markdown converter ──
  const getMarkdown = () => {
    let html = editor.getHTML();
    return html
      .replace(/<h1>(.*?)<\/h1>/g, '# $1\n')
      .replace(/<h2>(.*?)<\/h2>/g, '## $1\n')
      .replace(/<h3>(.*?)<\/h3>/g, '### $1\n')
      .replace(/<strong>(.*?)<\/strong>/g, '**$1**')
      .replace(/<em>(.*?)<\/em>/g, '_$1_')
      .replace(/<p>(.*?)<\/p>/g, '$1\n\n')
      .replace(/<ul>(.*?)<\/ul>/gs, (m, c) => c.replace(/<li>(.*?)<\/li>/g, '* $1\n') + '\n')
      .replace(/<ol>(.*?)<\/ol>/gs, (m, c) => c.replace(/<li>(.*?)<\/li>/g, '1. $1\n') + '\n')
      .replace(/<a href="(.*?)">(.*?)<\/a>/g, '[$2]($1)')
      .replace(/<img src="(.*?)" alt="(.*?)" \/>/g, '![$2]($1)')
      .replace(/<(span|div)\s+data-latex="(.*?)"[^>]*>.*?<\/(span|div)>/g, '$$$$$2$$$$')
      .replace(/<br \/>/g, '\n')
      .replace(/&nbsp;/g, ' ')
      .replace(/<.*?>/g, '');
  };

  if (!editor) {
    return null;
  }

  return (
    <div className={styles.editorContainer} ref={editorContainerRef} data-mathjax-ignore="">
      <MenuBar
        editor={editor}
        onImageUpload={handleImageUpload}
        onMathClick={handleMathInsert}
        isBlogMode={isBlogMode}
      />

      {editor && (
        <BubbleMenu className={styles.bubbleMenu} tippyOptions={{ duration: 100 }} editor={editor}>
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); editor.chain().focus().toggleBold().run(); }}
            className={editor.isActive('bold') ? styles.bubbleBtnActive : styles.bubbleBtn}
          >
            Bold
          </button>
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); editor.chain().focus().toggleItalic().run(); }}
            className={editor.isActive('italic') ? styles.bubbleBtnActive : styles.bubbleBtn}
          >
            Italic
          </button>
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); editor.chain().focus().toggleStrike().run(); }}
            className={editor.isActive('strike') ? styles.bubbleBtnActive : styles.bubbleBtn}
          >
            Strike
          </button>
        </BubbleMenu>
      )}

      <div className={styles.exportTabs}>
        <button
          type="button"
          className={!showSource ? styles.tabActive : ''}
          onClick={() => setShowSource(null)}
        >
          Visual
        </button>
        <button
          type="button"
          className={showSource === 'html' ? styles.tabActive : ''}
          onClick={() => setShowSource('html')}
        >
          HTML
        </button>
        <button
          type="button"
          className={showSource === 'markdown' ? styles.tabActive : ''}
          onClick={() => setShowSource('markdown')}
        >
          Markdown
        </button>
      </div>

      {!showSource ? (
        <div className={styles.editorContentWrapper}>
          <div className={styles.editorContent} onDrop={(e) => {
            e.preventDefault();
            const files = e.dataTransfer.files;
            if (files.length > 0 && files[0].type.startsWith('image/')) {
              handleImageUpload(files[0]);
            }
          }}>
            <EditorContent editor={editor} />
          </div>

          <div className={styles.editorFooter}>
            <div className={styles.characterCount}>
              {editor.storage.characterCount.characters()} characters
              {' · '}
              {editor.storage.characterCount.words()} words
            </div>
          </div>
        </div>
      ) : (
        <div className={styles.sourceView}>
          <textarea
            readOnly
            value={showSource === 'html' ? editor.getHTML() : getMarkdown()}
          />
          <button
            type="button"
            className={styles.copyBtn}
            onClick={() => {
              navigator.clipboard.writeText(showSource === 'html' ? editor.getHTML() : getMarkdown());
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
