// src/components/MathPreview.jsx
import React, { useRef, useEffect } from 'react';
import useMathJax from '../hooks/useMathJax';

const MathPreview = ({ latexString, className = '', style = {} }) => {
  const containerRef = useRef(null);
  useMathJax([latexString]);

  return (
    <div
      ref={containerRef}
      className={`mathjax-process ${className}`}
      style={style}
      dangerouslySetInnerHTML={{ __html: latexString || '' }}
    />
  );
};

export default MathPreview;
