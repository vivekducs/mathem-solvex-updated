import React, { useState, useEffect } from 'react';
import { useParams, Link, useLocation, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import styles from './PYQResourcesPage.module.css';
import { 
  Download, 
  FileText, 
  ArrowLeft, 
  LayoutGrid, 
  CalendarDays, 
  Search, 
  Sparkles, 
  AlertCircle,
  BookOpen,
  CheckCircle2
} from 'lucide-react';
import { PYQ_DATA } from '../data/resourceData';

const trackPdfClick = (pdfTitle, examName) => {
  if (typeof window.gtag === 'function') {
    window.gtag('event', 'view_pdf', {
      'event_category': 'Resources',
      'event_label': `${examName} - ${pdfTitle}`,
      'transport_type': 'beacon'
    });
  }
};

const PYQResourcesPage = () => {
  const { examName } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [viewType, setViewType] = useState('yearwise'); // 'yearwise' or 'topicwise'
  const [searchTerm, setSearchTerm] = useState('');

  // Reset view to yearwise when exam changes to avoid stuck states
  useEffect(() => {
    setViewType('yearwise');
    setSearchTerm('');
  }, [examName]);

  // Helper for proper capitalization (e.g., nimcet -> NIMCET)
  const formatExamTitle = (name) => {
    if (!name) return '';
    // Handle special cases or default to uppercase/capitalized
    if (name.toUpperCase() === 'CUET PG') return 'CUET PG';
    if (name.toUpperCase() === 'MAH-CET') return 'MAH-CET';
    return name.toUpperCase();
  };

  // --- 1. LANDING PAGE VIEW (No exam selected) ---
  if (!examName) {
    return (
      <>
        <Helmet>
          <title>MCA Entrance PYQ PDF Download | NIMCET, CUET PG, JAMIA, MAH-CET</title>
          <meta name="description" content="Free download of official Previous Year Question (PYQ) papers for NIMCET, CUET PG, JAMIA, MAH-CET, AMU, and VITMEE. Year-wise and Topic-wise solutions." />
          <meta name="keywords" content="NIMCET PYQ, CUET PG Papers, JAMIA MCA Entrance, MAH-CET MCA, AMU MCA, VITMEE Previous Papers, MCA Entrance PDF" />
          <link rel="canonical" href={window.location.origin + location.pathname} />
          
          <meta property="og:title" content="All MCA Entrance PYQ Downloads" />
          <meta property="og:description" content="Access free PDF downloads of official question papers for all major MCA entrance exams." />
        </Helmet>
        
        <div className={styles.container}>
          <div className={styles.header}>
            <h1>PYQ Resource Center</h1>
            <p>Select an exam to download official previous year question papers.</p>
          </div>
          
          <div className={styles.examGrid}>
            {Object.keys(PYQ_DATA).map(exam => {
              const data = PYQ_DATA[exam];
              const totalPapers = (data.yearwise?.length || 0) + (data.topicwise?.length || 0);
              
              return (
                <Link 
                  to={`/resources/${exam}`} 
                  key={exam} 
                  className={styles.examCard}
                  aria-label={`View ${exam} resources`}
                >
                  <div className={styles.cardIcon}>
                    <BookOpen size={32} />
                  </div>
                  <div className={styles.cardContent}>
                    <h2>{exam}</h2>
                    <span className={styles.badge}>{totalPapers} Resources</span>
                  </div>
                  <div className={styles.cardFooter}>
                    <span>View Papers</span>
                    <ArrowLeft className={styles.arrowRotate} size={16} />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </>
    );
  }

  // --- 2. DETAIL PAGE VIEW (Exam selected) ---
  const formattedExamName = decodeURIComponent(examName);
  const currentExamData = PYQ_DATA[formattedExamName];

  // 404 Handling
  if (!currentExamData) {
    return (
      <div className={styles.container}>
         <Helmet><title>Exam Not Found</title></Helmet>
         <div className={styles.emptyState}>
            <AlertCircle size={48} color="#e11d48" />
            <h2>Exam Not Found</h2>
            <p>We couldn't find resources for "{formattedExamName}".</p>
            <Link to="/resources" className={styles.backBtn} style={{marginTop: '20px'}}>Back to All Exams</Link>
         </div>
      </div>
    );
  }

  // Determine availability of data types
  const hasYearWise = currentExamData.yearwise && currentExamData.yearwise.length > 0;
  const hasTopicWise = currentExamData.topicwise && currentExamData.topicwise.length > 0;

  // Get current list based on view type
  const currentList = currentExamData[viewType] || [];

  // Filter functionality
  const filteredData = currentList.filter(item => 
    item.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <Helmet>
        <title>{`${formatExamTitle(formattedExamName)} Previous Year Papers PDF | Download Free`}</title>
        <meta name="description" content={`Download ${formattedExamName} previous year question papers PDF. Official papers and topic-wise solutions available for free.`} />
        <link rel="canonical" href={window.location.origin + location.pathname} />
      </Helmet>

      <div className={styles.container}>
        {/* Navigation Bar */}
        <div className={styles.topNav}>
          <Link to="/resources" className={styles.backBtn}>
            <ArrowLeft size={18} /> All Exams
          </Link>
          <div className={styles.breadcrumb}>
            <span>Resources</span> / <span className={styles.activeCrumb}>{formattedExamName}</span>
          </div>
        </div>

        <div className={styles.header}>
          <h1>{formattedExamName} Papers</h1>
          
          <div className={styles.controls}>
             {/* Search Box - Only show if there is data to search */}
             {currentList.length > 5 && (
              <div className={styles.searchBox}>
                <Search size={16} className={styles.searchIcon}/>
                <input 
                  type="text" 
                  placeholder="Search papers..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
             )}

            {/* Toggle Buttons - Only show if both types exist, otherwise just show label or nothing */}
            {hasTopicWise && hasYearWise && (
              <div className={styles.toggleContainer}>
                <button 
                  className={`${styles.toggleBtn} ${viewType === 'yearwise' ? styles.active : ''}`}
                  onClick={() => setViewType('yearwise')}
                >
                  <CalendarDays size={18} /> Year-wise
                </button>
                <button 
                  className={`${styles.toggleBtn} ${viewType === 'topicwise' ? styles.active : ''}`}
                  onClick={() => setViewType('topicwise')}
                >
                  <LayoutGrid size={18} /> Topic-wise
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Content Grid */}
        <div className={styles.pdfGrid}>
          {filteredData.length > 0 ? (
            filteredData.map(pdf => (
              <div key={pdf.id} className={`${styles.pdfCard} ${pdf.isSpecial ? styles.specialCard : ''}`}>
                <div className={styles.pdfInfo}>
                  <div className={styles.pdfTitleWrapper}>
                    <div className={styles.iconBox}>
                      <FileText className={styles.pdfIcon} size={20} />
                    </div>
                    <div className={styles.textStack}>
                        <h3>
                          {pdf.title}
                          {pdf.isNew && <span className={styles.newBadge}><Sparkles size={10} /> New</span>}
                        </h3>
                        {pdf.year && <span className={styles.metaYear}>{pdf.year} Official Paper</span>}
                        {!pdf.year && <span className={styles.metaTopic}>Topic Wise PDF</span>}
                        {pdf.description && <p className={styles.pdfDescription}>{pdf.description}</p>}
                    </div>
                  </div>
                  <div className={styles.cardActions}>
                    {pdf.year && (
                      <Link to={`/test?exam=${encodeURIComponent(formattedExamName)}&year=${pdf.year}`} className={styles.solveBtn}>
                        <CheckCircle2 size={16} /> <span>Solve Paper</span>
                      </Link>
                    )}
                    <a 
                      href={pdf.url} 
                      onClick={() => trackPdfClick(pdf.title, formattedExamName)}
                      target={pdf.openInSamePage ? "_self" : "_blank"} 
                      rel="noopener noreferrer" 
                      className={styles.downloadBtn}
                    >
                      {pdf.openInSamePage ? <BookOpen size={16} /> : <Download size={16} />} 
                      <span>{pdf.openInSamePage ? "Open Paper" : "Open PDF"}</span>
                    </a>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}><Search size={40} /></div>
              <p>No papers found here yet.</p>
              {!hasTopicWise && viewType === 'topicwise' && (
                 <p className={styles.subHint}>Topic-wise papers are coming soon for {formattedExamName}.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default PYQResourcesPage;