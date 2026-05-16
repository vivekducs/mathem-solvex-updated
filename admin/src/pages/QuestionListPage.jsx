import React, { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../api';
import styles from './QuestionListPage.module.css';
import MathPreview from '../components/MathPreview';
import toast from 'react-hot-toast';
import { PlusCircle, Edit, Trash2, ArrowUpDown, RefreshCw } from 'lucide-react';
import { useDebounce } from '../hooks/useDebounce';

const ITEMS_PER_PAGE = 15;

const QuestionListPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);

  // ── Dynamic filter options from backend ──
  const [filterOptions, setFilterOptions] = useState({
    exams: [],
    subjects: [],
    topics: [],
    years: [],
  });
  const [filtersLoading, setFiltersLoading] = useState(true);

  // ── Filters synced with URL params ──
  const [filters, setFilters] = useState({
    exam: searchParams.get('exam') || '',
    subject: searchParams.get('subject') || '',
    topic: searchParams.get('topic') || '',
    year: searchParams.get('year') || '',
  });
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [currentPage, setCurrentPage] = useState(
    parseInt(searchParams.get('page')) || 1
  );
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [sortConfig, setSortConfig] = useState({
    key: searchParams.get('sortBy') || 'questionNumber',
    direction: searchParams.get('order') || 'desc',
  });
  const [pageInput, setPageInput] = useState('');

  const debouncedSearchTerm = useDebounce(searchTerm, 400);

  // ── Fetch filter options from backend on mount ──
  useEffect(() => {
    let alive = true;
    const fetchFilterOptions = async () => {
      try {
        setFiltersLoading(true);
        const res = await api.get('/questions/filters');
        if (alive) {
          setFilterOptions({
            exams: res.data.exams || [],
            subjects: res.data.subjects || [],
            topics: res.data.topics || [],
            years: res.data.years || [],
          });
        }
      } catch (err) {
        console.error('Error fetching filter options:', err);
      } finally {
        if (alive) setFiltersLoading(false);
      }
    };
    fetchFilterOptions();
    return () => { alive = false; };
  }, []);

  // ── Sync filters to URL search params ──
  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.exam) params.set('exam', filters.exam);
    if (filters.subject) params.set('subject', filters.subject);
    if (filters.topic) params.set('topic', filters.topic);
    if (filters.year) params.set('year', filters.year);
    if (debouncedSearchTerm) params.set('search', debouncedSearchTerm);
    if (currentPage > 1) params.set('page', currentPage);
    if (sortConfig.key !== 'questionNumber') params.set('sortBy', sortConfig.key);
    if (sortConfig.direction !== 'desc') params.set('order', sortConfig.direction);
    setSearchParams(params, { replace: true });
  }, [filters, debouncedSearchTerm, currentPage, sortConfig, setSearchParams]);

  // ── Fetch questions ──
  const fetchQuestions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage,
        limit: ITEMS_PER_PAGE,
        search: debouncedSearchTerm,
        exam: filters.exam,
        subject: filters.subject,
        topic: filters.topic,
        year: filters.year,
        sortField: sortConfig.key,
        sortOrder: sortConfig.direction === 'asc' ? 1 : -1,
      });

      const response = await api.get(`/questions?${params.toString()}`);
      setQuestions(response.data.questions || []);
      setTotalPages(response.data.totalPages || 1);
      setTotalCount(response.data.totalDocs || 0);
    } catch (error) {
      console.error('Error fetching questions:', error);
      toast.error('Could not load questions. Please check server connection.');
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  }, [currentPage, filters, debouncedSearchTerm, sortConfig]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to permanently delete this question?')) {
      try {
        await api.delete(`/questions/${id}`);
        toast.success('Question deleted successfully!');
        fetchQuestions();
      } catch (error) {
        console.error('Error deleting question:', error);
        toast.error('Delete failed. Please try again.');
      }
    }
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setCurrentPage(1);
    setSortConfig({ key, direction });
  };

  const handleFilterChange = (e) => {
    setCurrentPage(1);
    setFilters((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const resetFilters = () => {
    setFilters({ exam: '', subject: '', topic: '', year: '' });
    setSearchTerm('');
    setCurrentPage(1);
    setSortConfig({ key: 'questionNumber', direction: 'desc' });
  };

  const goToPage = () => {
    const page = Number(pageInput);
    if (!page || page < 1 || page > totalPages) {
      toast.error(`Page must be between 1 and ${totalPages}`);
      return;
    }
    setCurrentPage(page);
    setPageInput('');
  };

  const numColumns = 6;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>Question Management</h1>
        <Link to="/admin/questions/add" className={styles.addBtn}>
          <PlusCircle size={20} />
          Add New Question
        </Link>
      </header>

      <div className={styles.card}>
        <div className={styles.filterControls}>
          <input
            type="text"
            value={searchTerm}
            placeholder="Search questions by text or Q.No..."
            className={styles.searchInput}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
          />

          <select name="exam" value={filters.exam} onChange={handleFilterChange} className={styles.filterDropdown}>
            <option value="">All Exams</option>
            {filterOptions.exams.map((exam) => (
              <option key={exam} value={exam}>{exam}</option>
            ))}
          </select>

          <select name="subject" value={filters.subject} onChange={handleFilterChange} className={styles.filterDropdown}>
            <option value="">All Subjects</option>
            {filterOptions.subjects.map((subj) => (
              <option key={subj} value={subj}>{subj}</option>
            ))}
          </select>

          <select name="topic" value={filters.topic} onChange={handleFilterChange} className={styles.filterDropdown}>
            <option value="">All Topics</option>
            {filterOptions.topics.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>

          <select name="year" value={filters.year} onChange={handleFilterChange} className={styles.filterDropdown}>
            <option value="">All Years</option>
            {filterOptions.years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>

          <button onClick={resetFilters} className={styles.clearBtn}>
            <RefreshCw size={14} />
            Clear
          </button>
        </div>

        <div className={styles.tableWrapper}>
          <p className={styles.countInfo}>
            Showing {questions.length} of {totalCount} total questions.
            {filtersLoading && ' (Loading filters...)'}
          </p>

          <table className={styles.questionsTable}>
            <thead>
              <tr>
                <th onClick={() => handleSort('questionNumber')}>
                  <div className={styles.sortableContent}>
                    Q. No. <ArrowUpDown size={14} />
                  </div>
                </th>
                <th onClick={() => handleSort('exam')}>
                  <div className={styles.sortableContent}>
                    Exam <ArrowUpDown size={14} />
                  </div>
                </th>
                <th onClick={() => handleSort('subject')}>
                  <div className={styles.sortableContent}>
                    Subject <ArrowUpDown size={14} />
                  </div>
                </th>
                <th onClick={() => handleSort('year')}>
                  <div className={styles.sortableContent}>
                    Year <ArrowUpDown size={14} />
                  </div>
                </th>
                <th>Question Preview</th>
                <th className={styles.actionsHeader}>Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={numColumns} className={styles.loader}>Loading...</td>
                </tr>
              ) : questions.length > 0 ? (
                questions.map((question) => (
                  <tr key={question._id}>
                    <td>{question.questionNumber}</td>
                    <td>{question.exam}</td>
                    <td>{question.subject}</td>
                    <td>{question.year}</td>
                    <td>
                      <div className={styles.questionPreview}>
                        <MathPreview latexString={question.questionText} />
                      </div>
                    </td>
                    <td className={styles.actionsCell}>
                      <Link
                        to={`/admin/questions/edit/${question._id}`}
                        className={`${styles.actionBtn} ${styles.editBtn}`}
                        title="Edit"
                      >
                        <Edit size={18} />
                      </Link>
                      <button
                        onClick={() => handleDelete(question._id)}
                        className={`${styles.actionBtn} ${styles.deleteBtn}`}
                        title="Delete"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={numColumns} className={styles.noResults}>
                    No questions found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className={styles.pagination}>
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            Previous
          </button>

          <span>Page {currentPage} of {totalPages}</span>

          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages || totalPages === 0}
          >
            Next
          </button>

          {/* Go to page */}
          <input
            type="number"
            placeholder="Go to page"
            value={pageInput}
            onChange={(e) => setPageInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && goToPage()}
            style={{ width: '90px', marginLeft: '8px' }}
          />
          <button onClick={goToPage}>Go</button>
        </div>
      </div>
    </div>
  );
};

export default QuestionListPage;
