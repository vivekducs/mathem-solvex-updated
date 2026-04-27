import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api';
import toast from 'react-hot-toast';
import RichTextEditor from '../components/RichTextEditor/RichTextEditor';
import {
  Save, Image as ImageIcon, Trash2, ListOrdered, FilePlus2, Settings2, ImagePlus, SlidersHorizontal
} from 'lucide-react';
import styles from './AddPostPage.module.css';

const AddPostPage = () => {
  const { id } = useParams();
  const isEditMode = Boolean(id);
  const navigate = useNavigate();
  const editorRef = useRef(null);

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: 'Blog',
    metaDescription: '',
    keywords: '',
    featuredImage: '',
    videoURL: ''
  });

  const [featuredImageFile, setFeaturedImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [pageMode, setPageMode] = useState(true);
  const [dragActive, setDragActive] = useState(false);

  // New: independent sticky admin panel with tabs
  const [activeTab, setActiveTab] = useState('publish'); // 'publish' | 'media' | 'seo'
  const [drawerOpen, setDrawerOpen] = useState(false);   // mobile bottom drawer

  const tinymceApiKey = import.meta.env.VITE_TINYMCE_API_KEY;

  // Fetch post data
  useEffect(() => {
    if (!isEditMode) return;
    setLoading(true);
    api.get(`/posts/id/${id}`)
      .then(res => {
        const post = res.data;
        setFormData({
          title: post.title || '',
          content: post.content || '',
          category: post.category || 'Blog',
          metaDescription: post.metaDescription || '',
          keywords: (post.keywords || []).join(', '),
          featuredImage: post.featuredImage || '',
          videoURL: post.videoURL || ''
        });
        if (post.featuredImage) setImagePreview(post.featuredImage);
      })
      .catch(() => toast.error('Failed to load post data.'))
      .finally(() => setLoading(false));
  }, [id, isEditMode]);

  // Unsaved changes guard
  useEffect(() => {
    const handler = (e) => {
      if (!isDirty || loading) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty, loading]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setIsDirty(true);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Please select an image file.'); return; }
    if (file.size > 4 * 1024 * 1024) { toast.error('Image too large (max 4 MB).'); return; }
    setFeaturedImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setIsDirty(true);
  };

  const onFeaturedDrop = (e) => {
    e.preventDefault(); e.stopPropagation(); setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Please drop an image file.'); return; }
    if (file.size > 4 * 1024 * 1024) { toast.error('Image too large (max 4 MB).'); return; }
    setFeaturedImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setIsDirty(true);
  };

  const removeImage = () => {
    setFeaturedImageFile(null);
    setImagePreview('');
    setFormData(prev => ({ ...prev, featuredImage: '' }));
    setIsDirty(true);
  };

  const slugFromTitle = (title) =>
    title.toLowerCase().trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');

  const getVideoEmbed = (url) => {
    if (!url) return null;
    try {
      const u = new URL(url);
      if (u.hostname.includes('youtube.com') || u.hostname.includes('youtu.be')) {
        const id = u.searchParams.get('v') || u.pathname.split('/').filter(Boolean).pop();
        if (!id) return null;
        return (
          <div className={styles.videoFrameWrap}>
            <iframe
              className={styles.videoFrame}
              src={`https://www.youtube.com/embed/${id}`}
              title="YouTube"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
        );
      }
      if (u.hostname.includes('instagram.com')) {
        return <blockquote className={styles.instagramNote}>Instagram link detected. Preview will show on public page after publish.</blockquote>;
      }
    } catch { /* ignore */ }
    return null;
  };

  const insertTOC = () => editorRef.current?.execCommand('mceInsertContent', false, '<div class="mce-toc"></div>');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.title.trim().length < 5) { toast.error('Title must be at least 5 characters.'); return; }
    if (formData.content.length < 30) { toast.error('Please add more body content.'); return; }
    
    setLoading(true);
    const submissionData = new FormData();
    const contentWithMeta = `${formData.content}
      <div data-meta-category="${formData.category}" style="display:none"></div>`;
    Object.keys(formData).forEach(key => {
      submissionData.append(key, key === 'content' ? contentWithMeta : formData[key]);
    });
    if (featuredImageFile) submissionData.append('featuredImage', featuredImageFile);

    try {
      if (isEditMode) await api.put(`/posts/${id}`, submissionData);
      else await api.post('/posts', submissionData);
      toast.success(`Post ${isEditMode ? 'updated' : 'created'} successfully!`);
      setIsDirty(false);
      navigate('/admin/posts');
    } catch {
      toast.error('Failed to save post.');
    } finally {
      setLoading(false);
    }
  };

  const handleEditorImageUpload = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await api.post('/posts/upload-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return res.data.location;
    } catch (err) {
      toast.error('Image upload failed');
      throw err;
    }
  };



  const metaLen = formData.metaDescription.length;
  const metaTip =
    metaLen === 0 ? 'Add a compelling summary (aim 120–160 characters).'
    : metaLen < 50 ? 'A bit short — consider adding detail.'
    : metaLen <= 160 ? 'Looks good for Google.'
    : 'Too long for most snippets — consider trimming.';

  return (
    <form className={styles.pageWrap} onSubmit={handleSubmit}>
      {/* Top bar */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.headerTitle}>{isEditMode ? 'Edit Post' : 'Create New Post'}</h1>
          <div className={styles.slugPreview}>
            Permalink: <span>/{slugFromTitle(formData.title) || 'your-title'}</span>
          </div>
        </div>
        <div className={styles.headerActions}>
          <button type="button" className={styles.secondaryBtn} title="Insert Table of Contents" onClick={insertTOC}>
            <ListOrdered size={16} />
            Insert TOC
          </button>
          <button type="submit" className={styles.submitBtn} disabled={loading}>
            <Save size={18} />
            {loading ? 'Saving…' : isEditMode ? 'Update Post' : 'Publish Post'}
          </button>
        </div>
      </header>

      {/* 2-column: Editor (scrolls with page) + Sticky Admin Panel (independent scroll) */}
      <div className={styles.layout}>
        {/* Left: content editor */}
        <main className={styles.editorCol}>
          <fieldset className={styles.card}>
            <legend className={styles.cardTitle}>Main Content</legend>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              placeholder="Post Title"
              className={styles.titleInput}
              required
            />
          </fieldset>

          <fieldset className={styles.card}>
            <legend className={styles.cardTitle}>Body Content</legend>

            <div className={styles.toolbarRow}>
              <label className={styles.toggleRow}>
                <input type="checkbox" checked={pageMode} onChange={() => setPageMode(v => !v)} />
                <span>Document layout (margin + border + ruler)</span>
              </label>

              <button
                type="button"
                className={styles.secondaryBtn}
                onClick={() => editorRef.current?.execCommand('mceInsertContent', false, '<hr class="mce-pagebreak" />')}
                title="Insert Page Break"
              >
                <FilePlus2 size={16} />
                Page Break
              </button>
            </div>

            <RichTextEditor
              value={formData.content}
              onChange={(newContent) => {
                setFormData(prev => ({ ...prev, content: newContent }));
                if (!isDirty) setIsDirty(true);
              }}
              onImageUpload={handleEditorImageUpload}
              placeholder="Write your amazing post here..."
            />
          </fieldset>
        </main>

        {/* Right: sticky independent admin panel */}
        <aside className={styles.sideDock}>
          {/* Tab bar */}
          <div className={styles.tabBar} role="tablist" aria-label="Admin panel">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'publish'}
              className={`${styles.tabBtn} ${activeTab === 'publish' ? styles.tabActive : ''}`}
              onClick={() => setActiveTab('publish')}
              title="Publish"
            >
              <Settings2 size={16} /> <span>Publish</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'media'}
              className={`${styles.tabBtn} ${activeTab === 'media' ? styles.tabActive : ''}`}
              onClick={() => setActiveTab('media')}
              title="Media"
            >
              <ImagePlus size={16} /> <span>Media</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'seo'}
              className={`${styles.tabBtn} ${activeTab === 'seo' ? styles.tabActive : ''}`}
              onClick={() => setActiveTab('seo')}
              title="SEO"
            >
              <SlidersHorizontal size={16} /> <span>SEO</span>
            </button>
          </div>

          {/* Scroll area (independent) */}
          <div className={styles.dockScroll}>
            {/* PUBLISH */}
            {activeTab === 'publish' && (
              <div className={styles.card}>
                <legend className={styles.cardTitle}>Publish</legend>
                <div className={styles.inputGroup}>
                  <label>Category</label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    className={styles.selectInput}
                  >
                    <option value="Blog">Blog Post</option>
                    <option value="News">News</option>
                    <option value="Notification">Exam Notification</option>
                    <option value="Strategy">Strategy Guide</option>
                  </select>
                </div>

                <button type="submit" className={styles.submitBtnFull} disabled={loading}>
                  <Save size={18} />
                  {loading ? 'Saving…' : isEditMode ? 'Update' : 'Publish'}
                </button>

                <p className={styles.infoText}>
                  Tip: Use H2/H3 for sections. Add a TOC for long posts.
                </p>
              </div>
            )}

            {/* MEDIA */}
            {activeTab === 'media' && (
              <div className={styles.card}>
                <legend className={styles.cardTitle}>Media</legend>

                <div
                  className={`${styles.imageUploader} ${dragActive ? styles.uploadActive : ''}`}
                  onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setDragActive(true); }}
                  onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setDragActive(false); }}
                  onDrop={onFeaturedDrop}
                >
                  {imagePreview ? (
                    <div className={styles.imagePreview}>
                      <img src={imagePreview} alt="Featured preview" />
                      <button type="button" onClick={removeImage} className={styles.removeImageBtn} title="Remove image">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ) : (
                    <label htmlFor="file-upload" className={styles.uploadLabel}>
                      <ImageIcon size={48} />
                      <span>Click or drag & drop to upload image (max 4 MB)</span>
                    </label>
                  )}
                  <input
                    id="file-upload"
                    type="file"
                    onChange={handleFileChange}
                    accept="image/*"
                    style={{ display: 'none' }}
                  />
                </div>

                <div className={styles.inputGroup}>
                  <label>YouTube/Instagram Video URL (Optional)</label>
                  <input
                    type="text"
                    name="videoURL"
                    value={formData.videoURL}
                    onChange={handleInputChange}
                    placeholder="Paste video link here"
                  />
                  <div style={{ marginTop: 8 }}>{getVideoEmbed(formData.videoURL)}</div>
                </div>
              </div>
            )}

            {/* SEO */}
            {activeTab === 'seo' && (
              <div className={styles.card}>
                <legend className={styles.cardTitle}>SEO Settings</legend>

                <div className={styles.inputGroup}>
                  <label>Meta Description</label>
                  <textarea
                    name="metaDescription"
                    value={formData.metaDescription}
                    onChange={handleInputChange}
                    rows="4"
                    placeholder="Short description for Google (aim 120–160 chars)"
                  />
                  <span
                    className={styles.charCount}
                    style={{
                      color:
                        metaLen === 0 ? '#6b7280' :
                        metaLen <= 160 && metaLen >= 50 ? '#059669' : '#b91c1c'
                    }}
                  >
                    {metaLen} / 160 • {metaTip}
                  </span>
                </div>

                <div className={styles.inputGroup}>
                  <label>Keywords (comma-separated)</label>
                  <input
                    type="text"
                    name="keywords"
                    value={formData.keywords}
                    onChange={handleInputChange}
                    placeholder="nimcet 2025, cuet pg"
                  />
                  <div className={styles.chipsWrap}>
                    {formData.keywords
                      .split(',')
                      .map(k => k.trim())
                      .filter(Boolean)
                      .slice(0, 12)
                      .map((k, i) => (
                        <span key={i} className={styles.chip}>{k}</span>
                      ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* Mobile floating action to open drawer */}
      <button
        type="button"
        className={styles.fab}
        onClick={() => setDrawerOpen(true)}
        aria-label="Open admin panel"
      >
        <Settings2 size={20} />
      </button>

      {/* Mobile bottom drawer for the admin panel */}
      <div className={`${styles.drawer} ${drawerOpen ? styles.drawerOpen : ''}`} role="dialog" aria-modal="true">
        <div className={styles.drawerHeader}>
          <div className={styles.tabBarMobile}>
            <button
              type="button"
              className={`${styles.tabBtn} ${activeTab === 'publish' ? styles.tabActive : ''}`}
              onClick={() => setActiveTab('publish')}
            >
              <Settings2 size={16} /> <span>Publish</span>
            </button>
            <button
              type="button"
              className={`${styles.tabBtn} ${activeTab === 'media' ? styles.tabActive : ''}`}
              onClick={() => setActiveTab('media')}
            >
              <ImagePlus size={16} /> <span>Media</span>
            </button>
            <button
              type="button"
              className={`${styles.tabBtn} ${activeTab === 'seo' ? styles.tabActive : ''}`}
              onClick={() => setActiveTab('seo')}
            >
              <SlidersHorizontal size={16} /> <span>SEO</span>
            </button>
          </div>
          <button type="button" className={styles.drawerClose} onClick={() => setDrawerOpen(false)}>Close</button>
        </div>
        <div className={styles.drawerBody}>
          {/* Reuse same content as sidebar, based on activeTab */}
          {activeTab === 'publish' && (
            <div className={styles.card}>
              <legend className={styles.cardTitle}>Publish</legend>
              <div className={styles.inputGroup}>
                <label>Category</label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  className={styles.selectInput}
                >
                  <option value="Blog">Blog Post</option>
                  <option value="News">News</option>
                  <option value="Notification">Exam Notification</option>
                  <option value="Strategy">Strategy Guide</option>
                </select>
              </div>
              <button type="submit" className={styles.submitBtnFull} disabled={loading}>
                <Save size={18} />
                {loading ? 'Saving…' : isEditMode ? 'Update' : 'Publish'}
              </button>
            </div>
          )}

          {activeTab === 'media' && (
            <div className={styles.card}>
              <legend className={styles.cardTitle}>Media</legend>
              <div
                className={`${styles.imageUploader} ${dragActive ? styles.uploadActive : ''}`}
                onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setDragActive(true); }}
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setDragActive(false); }}
                onDrop={onFeaturedDrop}
              >
                {imagePreview ? (
                  <div className={styles.imagePreview}>
                    <img src={imagePreview} alt="Featured preview" />
                    <button type="button" onClick={removeImage} className={styles.removeImageBtn} title="Remove image">
                      <Trash2 size={16} />
                    </button>
                  </div>
                ) : (
                  <label htmlFor="file-upload-mobile" className={styles.uploadLabel}>
                    <ImageIcon size={48} />
                    <span>Tap or drag & drop to upload image (max 4 MB)</span>
                  </label>
                )}
                <input
                  id="file-upload-mobile"
                  type="file"
                  onChange={handleFileChange}
                  accept="image/*"
                  style={{ display: 'none' }}
                />
              </div>

              <div className={styles.inputGroup}>
                <label>YouTube/Instagram Video URL (Optional)</label>
                <input
                  type="text"
                  name="videoURL"
                  value={formData.videoURL}
                  onChange={handleInputChange}
                  placeholder="Paste video link here"
                />
                <div style={{ marginTop: 8 }}>{getVideoEmbed(formData.videoURL)}</div>
              </div>
            </div>
          )}

          {activeTab === 'seo' && (
            <div className={styles.card}>
              <legend className={styles.cardTitle}>SEO Settings</legend>
              <div className={styles.inputGroup}>
                <label>Meta Description</label>
                <textarea
                  name="metaDescription"
                  value={formData.metaDescription}
                  onChange={handleInputChange}
                  rows="4"
                  placeholder="Short description for Google (aim 120–160 chars)"
                />
                <span
                  className={styles.charCount}
                  style={{
                    color:
                      metaLen === 0 ? '#6b7280' :
                      metaLen <= 160 && metaLen >= 50 ? '#059669' : '#b91c1c'
                  }}
                >
                  {metaLen} / 160 • {metaTip}
                </span>
              </div>

              <div className={styles.inputGroup}>
                <label>Keywords (comma-separated)</label>
                <input
                  type="text"
                  name="keywords"
                  value={formData.keywords}
                  onChange={handleInputChange}
                  placeholder="nimcet 2025, cuet pg"
                />
                <div className={styles.chipsWrap}>
                  {formData.keywords
                    .split(',')
                    .map(k => k.trim())
                    .filter(Boolean)
                    .slice(0, 12)
                    .map((k, i) => (
                      <span key={i} className={styles.chip}>{k}</span>
                    ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </form>
  );
};

export default AddPostPage;
