// src/components/MathPreview.jsx
import React, { useRef, useEffect } from 'react';
import useMathJax from '../hooks/useMathJax';

const MathPreview = ({ content = '', latexString = '', className = '', style = {} }) => {
  const containerRef = useRef(null);
  const displayContent = content || latexString;
  useMathJax([displayContent]);

  return (
    <div
      ref={containerRef}
      className={`mathjax-process ${className}`}
      style={style}
      dangerouslySetInnerHTML={{ __html: displayContent || '' }}
    />
  );
};


export default MathPreview;
