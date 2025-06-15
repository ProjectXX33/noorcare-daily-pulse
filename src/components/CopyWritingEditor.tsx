import React, { useMemo, useState, useEffect } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { Label } from '@/components/ui/label';

interface CopyWritingEditorProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  height?: string;
  showCharCount?: boolean;
  maxChars?: number;
}

export const CopyWritingEditor: React.FC<CopyWritingEditorProps> = ({
  label,
  value,
  onChange,
  placeholder = "Enter your copy...",
  height = "200px",
  showCharCount = false,
  maxChars = 160
}) => {
  // Get plain text length for character counting
  const getTextLength = (html: string) => {
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent?.length || 0;
  };

  const textLength = getTextLength(value);
  const isOverLimit = showCharCount && textLength > maxChars;
  
  // State to track if we're on mobile
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Custom toolbar configuration for copy writing with RTL/LTR support
  const modules = useMemo(() => {
    if (isMobile) {
      // Simplified mobile toolbar
      return {
        toolbar: {
          container: [
            // Essential formatting only
            [{ 'header': [1, 2, false] }],
            ['bold', 'italic'],
            [{ 'list': 'ordered'}, { 'list': 'bullet' }],
            ['link', 'clean']
          ]
        },
        clipboard: {
          matchVisual: false,
        }
      };
    } else {
      // Full desktop toolbar
      return {
        toolbar: {
          container: [
            // Essential formatting (first row - most important)
            [{ 'header': [1, 2, 3, false] }],
            ['bold', 'italic', 'underline'],
            
            // Lists and alignment (second row)
            [{ 'list': 'ordered'}, { 'list': 'bullet' }],
            [{ 'align': ['', 'center', 'right', 'justify'] }],
            
            // Colors and advanced formatting (third row)
            [{ 'color': [] }, { 'background': [] }],
            ['link', 'blockquote'],
            
            // Utility tools (fourth row)
            [{ 'direction': 'rtl' }],
            ['clean']
          ]
        },
        clipboard: {
          matchVisual: false,
        }
      };
    }
  }, [isMobile]);

  const formats = [
    'header', 'font', 'size',
    'bold', 'italic', 'underline', 'strike', 'blockquote',
    'list', 'bullet', 'indent',
    'link', 'image', 'video',
    'color', 'background',
    'align',
    'code-block'
  ];

  // Custom styles for the editor
  const editorStyle = {
    height: height,
    marginBottom: '42px' // Space for toolbar
  };

  // Custom CSS styles as a string to inject
  const customStyles = `
    .copy-writing-editor .ql-editor {
      min-height: ${height};
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      line-height: 1.6;
      direction: ltr;
      text-align: left;
      word-wrap: break-word;
      word-break: break-word;
      overflow-wrap: break-word;
      white-space: pre-wrap;
    }
    
    .copy-writing-editor .ql-toolbar {
      border-bottom: 1px solid #e5e7eb;
      background: #f9fafb;
      padding: 8px;
      flex-wrap: wrap;
    }
    
    .copy-writing-editor .ql-container {
      border: none;
    }
    
    .copy-writing-editor .ql-editor.ql-blank::before {
      color: #9ca3af;
      font-style: italic;
    }
    
    .copy-writing-editor .ql-picker.ql-color .ql-picker-options {
      padding: 8px;
      z-index: 1000;
    }
    
    .copy-writing-editor .ql-picker.ql-color .ql-picker-item {
      width: 20px;
      height: 20px;
      margin: 2px;
      border-radius: 3px;
    }
    
    .copy-writing-editor .ql-picker-options {
      z-index: 1000;
      max-height: 200px;
      overflow-y: auto;
      border: 1px solid #ccc;
      background: white;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    }
    
    .copy-writing-editor .ql-picker-item {
      padding: 8px 12px;
      cursor: pointer;
    }
    
    .copy-writing-editor .ql-picker-item:hover {
      background: #f3f4f6;
    }
    
    /* Header picker specific styles */
    .copy-writing-editor .ql-picker.ql-header .ql-picker-options {
      min-width: 120px;
      max-height: 250px;
    }
    
    .copy-writing-editor .ql-picker.ql-header .ql-picker-item {
      padding: 10px 12px;
      font-weight: normal;
    }
    
    .copy-writing-editor .ql-picker.ql-header .ql-picker-item[data-value="1"] {
      font-size: 2em;
      font-weight: bold;
    }
    
    .copy-writing-editor .ql-picker.ql-header .ql-picker-item[data-value="2"] {
      font-size: 1.5em;
      font-weight: bold;
    }
    
    .copy-writing-editor .ql-picker.ql-header .ql-picker-item[data-value="3"] {
      font-size: 1.17em;
      font-weight: bold;
    }
    
    .copy-writing-editor .ql-picker.ql-header .ql-picker-item:not([data-value]) {
      font-size: 1em;
    }
    
    .copy-writing-editor .ql-toolbar button:hover {
      background: #e5e7eb;
    }
    
    .copy-writing-editor .ql-toolbar button.ql-active {
      background: #3b82f6;
      color: white;
    }
    
    .copy-writing-editor .ql-editor:focus {
      outline: none;
    }
    
    .copy-writing-editor:focus-within {
      outline: none;
      box-shadow: none;
    }
    
    .copy-writing-editor .ql-container {
      border: 1px solid #d1d5db;
      border-top: none;
      transition: border-color 0.2s;
    }
    
    .copy-writing-editor:focus-within .ql-container {
      border-color: #3b82f6;
    }

    /* Base responsive improvements */
    .copy-writing-editor {
      touch-action: manipulation;
    }
    
    .copy-writing-editor .ql-toolbar {
      user-select: none;
      -webkit-user-select: none;
    }
    
    .copy-writing-editor .ql-editor {
      -webkit-overflow-scrolling: touch;
      overflow-y: auto;
    }

    /* Mobile Optimizations */
    @media (max-width: 768px) {
      .copy-writing-editor .ql-toolbar {
        padding: 4px;
        gap: 2px;
        border-radius: 6px 6px 0 0;
        background: #f8fafc;
      }
      
      .copy-writing-editor .ql-toolbar button {
        width: 28px;
        height: 28px;
        padding: 4px;
        margin: 1px;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 1px solid #e2e8f0;
        background: white;
        transition: all 0.15s;
        font-size: 12px;
      }
      
      .copy-writing-editor .ql-toolbar button:hover {
        background: #f1f5f9;
        border-color: #cbd5e1;
      }
      
      .copy-writing-editor .ql-toolbar button.ql-active {
        background: #3b82f6;
        border-color: #3b82f6;
        color: white;
      }
      
      .copy-writing-editor .ql-toolbar .ql-formats {
        margin-right: 6px;
        margin-bottom: 3px;
        display: flex;
        flex-wrap: wrap;
        gap: 2px;
      }
      
      .copy-writing-editor .ql-toolbar .ql-picker {
        width: auto;
        min-width: 60px;
        height: 28px;
        border: 1px solid #e2e8f0;
        border-radius: 4px;
        background: white;
        font-size: 11px;
      }
      
      .copy-writing-editor .ql-toolbar .ql-picker-label {
        padding: 4px 8px;
        font-size: 11px;
        height: 26px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
      }
      
      .copy-writing-editor .ql-toolbar .ql-picker-options {
        border-radius: 4px;
        box-shadow: 0 2px 4px -1px rgba(0, 0, 0, 0.1);
        font-size: 12px;
        max-height: 200px;
        overflow-y: auto;
        z-index: 1000;
        min-width: 100px;
        background: white;
        border: 1px solid #e2e8f0;
      }
      
      .copy-writing-editor .ql-toolbar .ql-picker.ql-header .ql-picker-options {
        min-width: 120px;
        max-height: 180px;
      }
      
      .copy-writing-editor .ql-toolbar .ql-picker.ql-header .ql-picker-item {
        padding: 8px 10px;
        white-space: nowrap;
      }
      
      .copy-writing-editor .ql-toolbar .ql-picker.ql-header .ql-picker-item[data-value="1"] {
        font-size: 1.4em;
        font-weight: bold;
      }
      
      .copy-writing-editor .ql-toolbar .ql-picker.ql-header .ql-picker-item[data-value="2"] {
        font-size: 1.2em;
        font-weight: bold;
      }
      
      .copy-writing-editor .ql-editor {
        font-size: 16px; /* Prevents zoom on iOS */
        padding: 12px;
        min-height: calc(${height} - 15px);
      }
      
      .copy-writing-editor .ql-editor.ql-blank::before {
        font-size: 16px;
        padding: 12px;
      }
      
      .copy-writing-editor .ql-container {
        border-radius: 0 0 6px 6px;
      }
    }

    /* Touch-friendly improvements for all touch devices */
    @media (pointer: coarse) and (min-width: 769px) {
      .copy-writing-editor .ql-toolbar button {
        min-width: 36px;
        min-height: 36px;
        padding: 8px;
        margin: 2px;
        border: 1px solid #e5e7eb;
        border-radius: 6px;
        background: white;
      }
      
      .copy-writing-editor .ql-toolbar .ql-picker-label {
        min-height: 36px;
        padding: 8px 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
      }
      
      .copy-writing-editor .ql-toolbar .ql-picker {
        min-height: 36px;
        border-radius: 6px;
      }
    }

    /* Extra small screens (phones in portrait) */
    @media (max-width: 480px) {
      .copy-writing-editor .ql-toolbar {
        padding: 3px;
        gap: 1px;
        background: #f8fafc;
      }
      
      .copy-writing-editor .ql-toolbar button {
        width: 24px;
        height: 24px;
        padding: 3px;
        margin: 0.5px;
        font-size: 10px;
        border-radius: 3px;
      }
      
      .copy-writing-editor .ql-toolbar .ql-picker {
        min-width: 50px;
        height: 24px;
        font-size: 10px;
      }
      
      .copy-writing-editor .ql-toolbar .ql-picker-label {
        padding: 3px 6px;
        font-size: 10px;
        height: 22px;
      }
      
      .copy-writing-editor .ql-toolbar .ql-formats {
        margin-right: 4px;
        margin-bottom: 2px;
        gap: 1px;
      }
      
      .copy-writing-editor .ql-editor {
        padding: 10px;
        font-size: 16px;
      }
      
      .copy-writing-editor .ql-editor.ql-blank::before {
        padding: 10px;
      }
      
      /* Mobile dropdown improvements */
      .copy-writing-editor .ql-toolbar .ql-picker-options {
        position: absolute;
        top: 100%;
        left: 0;
        right: auto;
        max-height: 150px;
        min-width: 100px;
        z-index: 1001;
      }
      
      .copy-writing-editor .ql-toolbar .ql-picker.ql-header .ql-picker-options {
        min-width: 110px;
        max-height: 140px;
      }
      
      .copy-writing-editor .ql-toolbar .ql-picker.ql-header .ql-picker-item {
        padding: 6px 8px;
        font-size: 11px;
      }
      
      .copy-writing-editor .ql-toolbar .ql-picker.ql-header .ql-picker-item[data-value="1"] {
        font-size: 1.2em;
        font-weight: bold;
      }
      
      .copy-writing-editor .ql-toolbar .ql-picker.ql-header .ql-picker-item[data-value="2"] {
        font-size: 1.1em;
        font-weight: bold;
      }
    }
  `;

  // Create and inject styles
  React.useEffect(() => {
    const styleId = 'copy-writing-editor-styles';
    let styleElement = document.getElementById(styleId) as HTMLStyleElement;
    
    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = styleId;
      styleElement.type = 'text/css';
      document.head.appendChild(styleElement);
    }
    
    styleElement.innerHTML = customStyles;
    
    return () => {
      // Cleanup on unmount
      const element = document.getElementById(styleId);
      if (element) {
        element.remove();
      }
    };
  }, [height]);

  return (
    <div className="space-y-2" dir="ltr">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-0">
        <Label className="text-sm font-medium text-left">{label}</Label>
        {showCharCount && (
          <span className={`text-xs ${isOverLimit ? 'text-red-500' : 'text-gray-500'} text-left sm:text-right`}>
            {textLength}/{maxChars} characters
            {isOverLimit && ' (over limit)'}
          </span>
        )}
      </div>
      <div className={`border rounded-lg overflow-hidden bg-white ${isOverLimit ? 'border-red-300' : ''} touch-manipulation`}>
        <ReactQuill
          theme="snow"
          value={value}
          onChange={onChange}
          modules={modules}
          formats={formats}
          placeholder={placeholder}
          style={editorStyle}
          className="copy-writing-editor"
        />
      </div>
    </div>
  );
}; 