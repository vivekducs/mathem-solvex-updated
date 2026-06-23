import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import RichTextEditor from '../components/RichTextEditor/RichTextEditor';
import styles from './AddQuestionPage.module.css';
import toast from 'react-hot-toast';
import MathLiveModal from '../components/MathLiveModal';
import MathPreview from '../components/MathPreview'; // Reusing existing preview
import { PlusCircle, Trash2, Eye, LayoutTemplate, Image as ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const AddQuestionPage = () => {
    const { id } = useParams();
    const isEditMode = Boolean(id);
    const auth = useAuth();
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        questionType: '', exam: '', subject: '', topic: '', year: new Date().getFullYear(),
        questionText: '', explanationText: '', videoURL: '', difficulty: 'Medium',
        options: [
            { text: '', imageURL: '', isCorrect: true },
            { text: '', imageURL: '', isCorrect: false },
            { text: '', imageURL: '', isCorrect: false },
            { text: '', imageURL: '', isCorrect: false },
        ],
    });

    const [taxonomies, setTaxonomies] = useState({ exam: [], subject: [], category: [] });

    const [imageFiles, setImageFiles] = useState({});
    const [imagePreviews, setImagePreviews] = useState({});
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);


    // MathLive State
    const [isMathModalOpen, setIsMathModalOpen] = useState(false);
    const [mathCallback, setMathCallback] = useState(null);

    // Split pane state
    const [showPreviewPane, setShowPreviewPane] = useState(window.innerWidth > 1024);

    const [editorMode, setEditorMode] = useState('latex'); // 'latex' or 'rich'

    useEffect(() => {
        const handleResize = () => setShowPreviewPane(window.innerWidth > 1024);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const taxRes = await api.get('/taxonomy');
                const loadedTaxonomies = {
                    exam: taxRes.data.exam || [],
                    subject: taxRes.data.subject || [],
                    category: taxRes.data.category || []
                };
                setTaxonomies(loadedTaxonomies);
                
                // Set initial form data if not in edit mode to the first available option
                if (!isEditMode) {
                    setFormData(prev => ({
                        ...prev,
                        questionType: loadedTaxonomies.category[0] || 'PYQ',
                        exam: loadedTaxonomies.exam[0] || 'NIMCET',
                        subject: loadedTaxonomies.subject[0] || ''
                    }));
                }
            } catch (err) {
                console.error("Failed to load taxonomies", err);
                toast.error('Failed to load taxonomy options.');
            }
        };

        fetchInitialData();
    }, [isEditMode]);

    useEffect(() => {
        if (isEditMode) {
            setLoading(true);
            api.get(`/questions/${id}`)
                .then(res => {
                    const data = res.data;
                    if (!data.questionType) data.questionType = data.year ? 'PYQ' : 'Practice';
                    setFormData(data);
                })
                .catch(err => setError('Failed to load question data.'))
                .finally(() => setLoading(false));
        }
    }, [id, isEditMode]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
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


    const handleEditorChange = (content, fieldName, optionIndex = null) => {
        if (optionIndex !== null) {
            const newOptions = [...formData.options];
            newOptions[optionIndex].text = content;
            setFormData(prev => ({ ...prev, options: newOptions }));
        } else {
            setFormData(prev => ({ ...prev, [fieldName]: content }));
        }
    };

    const handleFileChange = (e) => {
        const { name, files } = e.target;
        if (files[0]) {
            setImageFiles(prev => ({ ...prev, [name]: files[0] }));
            // Generate local preview URL
            const url = URL.createObjectURL(files[0]);
            setImagePreviews(prev => ({ ...prev, [name]: url }));
        }
    };


    const handleCorrectOptionChange = (index) => {
        const newOptions = formData.options.map((opt, i) => ({ ...opt, isCorrect: i === index }));
        setFormData(prev => ({ ...prev, options: newOptions }));
    };

    const addOption = () => {
        setFormData(prev => ({
            ...prev,
            options: [...prev.options, { text: '', imageURL: '', isCorrect: false }]
        }));
    };

    const removeOption = (indexToRemove) => {
        if (formData.options.length <= 2) {
            toast.error("You must have at least 2 options.");
            return;
        }
        setFormData(prev => {
            const newOptions = prev.options.filter((_, i) => i !== indexToRemove);
            if (prev.options[indexToRemove].isCorrect) {
                newOptions[0].isCorrect = true; // Auto assign if correcting was deleted
            }
            return { ...prev, options: newOptions };
        });

        // Cleanup removed option images from state to avoid sending garbage
        const newImageFiles = { ...imageFiles };
        delete newImageFiles[`option_${indexToRemove}_image`];
        setImageFiles(newImageFiles);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        const submissionData = new FormData();

        // Append text fields
        submissionData.append('questionType', formData.questionType);
        submissionData.append('exam', formData.exam);
        submissionData.append('subject', formData.subject);
        submissionData.append('topic', formData.topic);
        if (formData.questionType === 'PYQ') {
            submissionData.append('year', formData.year);
        }
        submissionData.append('questionText', formData.questionText);
        submissionData.append('explanationText', formData.explanationText);
        submissionData.append('videoURL', formData.videoURL);
        submissionData.append('difficulty', formData.difficulty);
        submissionData.append('options', JSON.stringify(formData.options));

        // Append files
        for (const key in imageFiles) {
            if (imageFiles[key]) {
                submissionData.append(key, imageFiles[key]);
            }
        }

        try {
            if (isEditMode) {
                await api.put(`/questions/${id}`, submissionData);
                toast.success('Question updated successfully!');
                navigate('/admin/questions');
            } else {
                await api.post('/questions', submissionData);
                toast.success('Question added successfully!');
                setFormData(prev => ({
                    ...prev, questionText: '', explanationText: '', videoURL: '',
                    options: prev.options.map(opt => ({ ...opt, text: '', imageURL: '' }))
                }));
                setImageFiles({});
                window.scrollTo(0, 0);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to save question.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const openMathModal = (callback) => {
        setMathCallback(() => callback);
        setIsMathModalOpen(true);
    };

    const handleInsertMath = (latex) => {
        if (mathCallback) {
            mathCallback(latex);
        }
    };

    if (loading && isEditMode) return <div className={styles.loaderSpinner}>Loading Question...</div>;

    return (
        <div className={styles.pageWrapper}>
            <div className={styles.headerBar}>
                <div>
                    <h1 className={styles.pageTitle}>{isEditMode ? 'Edit Question' : 'Add New Question'}</h1>
                    <p className={styles.pageSubtitle}>Create rich mathematical questions with the visual editor.</p>
                </div>
                <button
                    className={styles.togglePreviewBtn}
                    onClick={() => setShowPreviewPane(!showPreviewPane)}
                >
                    <LayoutTemplate size={20} />
                    {showPreviewPane ? 'Hide Preview' : 'Show Live Preview'}
                </button>
            </div>

            <div className={`${styles.mainContainer} ${showPreviewPane ? styles.splitMode : ''}`}>

                {/* Editor Pane */}
                <div className={styles.editorPane}>
                    <form onSubmit={handleSubmit} className={styles.formContainer}>
                        <AnimatePresence>
                            {error && (
                                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className={styles.errorAlert}>
                                    {error}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Top Metadata Section */}
                        <div className={styles.cardSection}>
                            <h2 className={styles.sectionTitle}>Question Metadata</h2>
                            <div className={styles.grid}>
                                <div className={styles.inputGroup}>
                                    <label>Type</label>
                                    <select name="questionType" value={formData.questionType} onChange={handleInputChange}>
                                        {taxonomies.category.map(opt => (
                                            <option key={opt} value={opt}>{opt}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className={styles.inputGroup}>
                                    <label>Exam</label>
                                    <select name="exam" value={formData.exam} onChange={handleInputChange}>
                                        {taxonomies.exam.map(opt => (
                                            <option key={opt} value={opt}>{opt}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className={styles.inputGroup}>
                                    <label>Subject</label>
                                    <select name="subject" value={formData.subject} onChange={handleInputChange}>
                                        <option value="">Select a Subject...</option>
                                        {taxonomies.subject.map(opt => (
                                            <option key={opt} value={opt}>{opt}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className={styles.inputGroup}>
                                    <label>Topic</label>
                                    <input type="text" name="topic" value={formData.topic} onChange={handleInputChange} placeholder="e.g., Calculus" required />
                                </div>
                                {formData.questionType === 'PYQ' && (
                                    <div className={styles.inputGroup}>
                                        <label>Year</label>
                                        <input type="number" name="year" value={formData.year} onChange={handleInputChange} required />
                                    </div>
                                )}
                                <div className={styles.inputGroup}>
                                    <label>Difficulty</label>
                                    <select name="difficulty" value={formData.difficulty} onChange={handleInputChange}>
                                        <option value="Easy">Easy</option><option value="Medium">Medium</option><option value="Hard">Hard</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Question Text Section */}
                        <div className={styles.cardSection}>
                            <div className={styles.sectionHeader}>
                                <h2 className={styles.sectionTitle}>Question Content</h2>
                                <div className={styles.editorToggle}>
                                    <label className={styles.radioLabel}>
                                        <input type="radio" checked={editorMode === 'latex'} onChange={() => setEditorMode('latex')} />
                                        Raw LaTeX
                                    </label>
                                    <label className={styles.radioLabel}>
                                        <input type="radio" checked={editorMode === 'rich'} onChange={() => setEditorMode('rich')} />
                                        Rich Text
                                    </label>
                                </div>
                            </div>
                            <div className={styles.editorWrapper}>
                                {editorMode === 'latex' ? (
                                    <textarea
                                        className={styles.rawTextarea}
                                        value={formData.questionText}
                                        onChange={(e) => handleEditorChange(e.target.value, 'questionText')}
                                        placeholder="Type your question here (LaTeX allowed)..."
                                        rows={6}
                                    />
                                ) : (
                                    <RichTextEditor
                                        value={formData.questionText}
                                        onChange={(c) => handleEditorChange(c, 'questionText')}
                                        onMathClick={openMathModal}
                                        onImageUpload={handleEditorImageUpload}
                                        placeholder="Type your question here..."
                                    />
                                )}
                            </div>
                            <div className={styles.fileInputWrapper}>
                                <label><ImageIcon size={18} /> Image for Question (Optional)</label>
                                <input type="file" name="questionImage" onChange={handleFileChange} accept="image/*" />
                            </div>
                        </div>

                        {/* Options Section */}
                        <div className={styles.cardSection}>
                            <h2 className={styles.sectionTitle}>Options</h2>
                            <AnimatePresence>
                                {formData.options.map((option, index) => (
                                    <motion.div
                                        key={index}
                                        className={`${styles.optionBox} ${option.isCorrect ? styles.correctOptionBox : ''}`}
                                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
                                    >
                                        <div className={styles.optionHeader}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <span className={styles.optionBadge}>Option {String.fromCharCode(65 + index)}</span>
                                                <label className={styles.radioLabel}>
                                                    <input type="radio" name="correctOption" checked={option.isCorrect} onChange={() => handleCorrectOptionChange(index)} />
                                                    Set as Correct Answer
                                                </label>
                                            </div>
                                            <div className={styles.optionActions}>
                                                <button type="button" className={styles.removeBtn} onClick={() => removeOption(index)} title="Remove Option">
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </div>

                                        {editorMode === 'latex' ? (
                                            <textarea
                                                className={styles.rawTextarea}
                                                value={option.text}
                                                onChange={(e) => handleEditorChange(e.target.value, 'text', index)}
                                                placeholder={`Option ${String.fromCharCode(65 + index)} content...`}
                                                rows={3}
                                            />
                                        ) : (
                                            <RichTextEditor
                                                value={option.text}
                                                onChange={(c) => handleEditorChange(c, 'text', index)}
                                                onMathClick={openMathModal}
                                                onImageUpload={handleEditorImageUpload}
                                                placeholder={`Option ${String.fromCharCode(65 + index)} content...`}
                                            />
                                        )}

                                        <div className={styles.fileInputWrapperSmall}>
                                            <label><ImageIcon size={14} /> Option Image (Optional)</label>
                                            <input type="file" name={`option_${index}_image`} onChange={handleFileChange} accept="image/*" />
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>

                            <button type="button" className={styles.addOptionBtn} onClick={addOption}>
                                <PlusCircle size={20} /> Add Another Option
                            </button>
                        </div>

                        {/* Explanation Section */}
                        <div className={styles.cardSection}>
                            <div className={styles.sectionHeader}>
                                <h2 className={styles.sectionTitle}>Explanation & Video</h2>
                            </div>
                            <div className={styles.inputGroup}>
                                <input type="text" name="videoURL" value={formData.videoURL} onChange={handleInputChange} placeholder="Video Solution URL (YouTube link)" />
                            </div>
                            <div className={styles.editorWrapper}>
                                {editorMode === 'latex' ? (
                                    <textarea
                                        className={styles.rawTextarea}
                                        value={formData.explanationText}
                                        onChange={(e) => handleEditorChange(e.target.value, 'explanationText')}
                                        placeholder="Explain the solution step by step..."
                                        rows={6}
                                    />
                                ) : (
                                    <RichTextEditor
                                        value={formData.explanationText}
                                        onChange={(c) => handleEditorChange(c, 'explanationText')}
                                        onMathClick={openMathModal}
                                        onImageUpload={handleEditorImageUpload}
                                        placeholder="Explain the solution step by step..."
                                    />
                                )}
                            </div>
                        </div>

                        {/* Submit */}
                        <div className={styles.stickyActionArea}>
                            <button type="submit" className={styles.submitBtn} disabled={loading}>
                                {loading ? 'Saving Question...' : (isEditMode ? 'Update Question' : 'Publish Question')}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Live Preview Pane */}
                <AnimatePresence>
                    {showPreviewPane && (
                        <motion.div
                            className={styles.previewPane}
                            initial={{ x: 100, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: 100, opacity: 0 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                        >
                            <div className={styles.previewSticky}>
                                <h2 className={styles.previewTitle}><Eye size={20} /> Live Preview</h2>
                                <div className={styles.previewCard}>
                                    <div className={styles.previewMeta}>
                                        <span className={styles.badgeBlue}>{formData.exam}</span>
                                        <span className={styles.badgeGray}>{formData.subject} - {formData.topic}</span>
                                        {formData.questionType === 'PYQ' && <span className={styles.badgeGray}>{formData.year}</span>}
                                        <span className={styles.badgePurple}>{formData.questionType}</span>
                                    </div>

                                    <div className={styles.previewQText}>
                                        <MathPreview content={formData.questionText || '<p class="text-gray-400">Question text will appear here...</p>'} style={{ whiteSpace: 'pre-wrap' }} />
                                        {(imagePreviews.questionImage || formData.questionImageURL) && (
                                            <div className={styles.previewImageWrap}>
                                                <img src={imagePreviews.questionImage || formData.questionImageURL} alt="Question" />
                                            </div>
                                        )}
                                    </div>


                                    <div className={styles.previewOptionsGrid}>
                                        {formData.options.map((opt, i) => (
                                            <div key={i} className={`${styles.previewOptionbox} ${opt.isCorrect ? styles.previewOptionboxCorrect : ''}`}>
                                                <span className={styles.previewOptLabel}>{String.fromCharCode(65 + i)}</span>
                                                <div className={styles.previewOptContent}>
                                                    <MathPreview content={opt.text || '<span class="text-gray-300">Option text...</span>'} style={{ whiteSpace: 'pre-wrap' }} />
                                                    {(imagePreviews[`option_${i}_image`] || opt.imageURL) && (
                                                        <div className={styles.previewOptionImage}>
                                                            <img src={imagePreviews[`option_${i}_image`] || opt.imageURL} alt={`Option ${i}`} />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>


                                    {formData.explanationText && (
                                        <div className={styles.previewExplanation}>
                                            <h4>Explanation:</h4>
                                            <MathPreview content={formData.explanationText} style={{ whiteSpace: 'pre-wrap' }} />
                                            {(imagePreviews.explanationImage || formData.explanationImageURL) && (
                                                <div className={styles.previewImageWrap}>
                                                    <img src={imagePreviews.explanationImage || formData.explanationImageURL} alt="Explanation" />
                                                </div>
                                            )}
                                        </div>
                                    )}

                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

            </div>

            <MathLiveModal
                isOpen={isMathModalOpen}
                onClose={() => setIsMathModalOpen(false)}
                onInsert={handleInsertMath}
            />
        </div>
    );
};

export default AddQuestionPage;
