import React, { useState, useEffect } from 'react';
import api from '../api';
import styles from './ManageTaxonomyPage.module.css';
import toast from 'react-hot-toast';
import { Plus, Trash2, Library, BookOpen, Tag } from 'lucide-react';

const ManageTaxonomyPage = () => {
    const [taxonomies, setTaxonomies] = useState({ exam: [], subject: [], category: [] });
    const [newInputs, setNewInputs] = useState({ exam: '', subject: '', category: '' });
    const [loading, setLoading] = useState(true);

    const fetchTaxonomies = async () => {
        try {
            const res = await api.get('/taxonomy');
            setTaxonomies({
                exam: res.data.exam || [],
                subject: res.data.subject || [],
                category: res.data.category || []
            });
        } catch (error) {
            toast.error('Failed to load taxonomies');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTaxonomies();
    }, []);

    const handleInputChange = (type, value) => {
        setNewInputs(prev => ({ ...prev, [type]: value }));
    };

    const handleAdd = async (type) => {
        const option = newInputs[type];
        if (!option.trim()) return;

        try {
            const res = await api.post(`/taxonomy/${type}`, { option });
            setTaxonomies(prev => ({ ...prev, [type]: res.data }));
            setNewInputs(prev => ({ ...prev, [type]: '' }));
            toast.success('Added successfully!');
        } catch (error) {
            toast.error('Failed to add option');
            console.error(error);
        }
    };

    const handleDelete = async (type, option) => {
        if (!window.confirm(`Are you sure you want to delete "${option}"?`)) return;

        try {
            const res = await api.delete(`/taxonomy/${type}/${encodeURIComponent(option)}`);
            setTaxonomies(prev => ({ ...prev, [type]: res.data }));
            toast.success('Deleted successfully!');
        } catch (error) {
            toast.error('Failed to delete option');
            console.error(error);
        }
    };

    const renderCard = (title, type, icon) => (
        <div className={styles.card}>
            <h2 className={styles.cardTitle}>{icon} {title}</h2>
            
            <form 
                className={styles.addForm} 
                onSubmit={(e) => { e.preventDefault(); handleAdd(type); }}
            >
                <input
                    type="text"
                    className={styles.addInput}
                    placeholder={`Add new ${type}...`}
                    value={newInputs[type]}
                    onChange={(e) => handleInputChange(type, e.target.value)}
                />
                <button type="submit" className={styles.addBtn} disabled={!newInputs[type].trim()}>
                    <Plus size={18} /> Add
                </button>
            </form>

            <div className={styles.optionsList}>
                {taxonomies[type].map((opt, i) => (
                    <div key={i} className={styles.optionItem}>
                        <span>{opt}</span>
                        <button 
                            type="button" 
                            className={styles.deleteBtn}
                            onClick={() => handleDelete(type, opt)}
                            title="Delete"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                ))}
                {taxonomies[type].length === 0 && (
                    <div style={{ color: '#94a3b8', textAlign: 'center', padding: '1rem' }}>No items added yet.</div>
                )}
            </div>
        </div>
    );

    if (loading) {
        return <div className={styles.loader}>Loading taxonomies...</div>;
    }

    return (
        <div className={styles.pageWrapper}>
            <h1 className={styles.pageTitle}>Manage Taxonomy</h1>
            <p className={styles.pageSubtitle}>Configure the dynamic dropdown options for questions.</p>
            
            <div className={styles.taxonomyGrid}>
                {renderCard('Exams', 'exam', <Library size={20} color="#3b82f6" />)}
                {renderCard('Subjects', 'subject', <BookOpen size={20} color="#10b981" />)}
                {renderCard('Categories / Types', 'category', <Tag size={20} color="#8b5cf6" />)}
            </div>
        </div>
    );
};

export default ManageTaxonomyPage;
