import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { makeAPICall } from '../config/api';
import { 
  ChevronLeft, Settings, User, FileText, Upload, Sparkles, 
  Copy, Download, RefreshCw, Moon, Sun, File, BookOpen, 
  Zap, BarChart3, Clock, Archive
} from 'lucide-react';

const DocumentSummarizer = ({ onNavigate }) => {
  const { isDarkMode, toggleTheme } = useTheme();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedFile, setSelectedFile] = useState(null);
  const [textInput, setTextInput] = useState('');
  const [summaryLength, setSummaryLength] = useState('medium');
  const [summaryStyle, setSummaryStyle] = useState('bullet-points');
  const [focusArea, setFocusArea] = useState('general');
  const [isProcessing, setIsProcessing] = useState(false);
  const [summary, setSummary] = useState('');
  const [keyPoints, setKeyPoints] = useState([]);
  const [documentStats, setDocumentStats] = useState({});
  const [activeTab, setActiveTab] = useState('upload');
  const [statusMessage, setStatusMessage] = useState('');
  const [summaryHistory, setSummaryHistory] = useState([]);
  
  // NEW: Smart Templates State
  const [documentTemplates, setDocumentTemplates] = useState({});
  const [detectedType, setDetectedType] = useState(null);
  const [showingDetectedSettings, setShowingDetectedSettings] = useState(false);
  
  const fileInputRef = useRef(null);

  // Theme classes helper
  const getThemeClasses = (lightClasses, darkClasses) => {
    return isDarkMode ? darkClasses : lightClasses;
  };

  // Update current time
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Load summary history
  useEffect(() => {
    const savedHistory = localStorage.getItem('neutex_summary_history');
    if (savedHistory) {
      try {
        setSummaryHistory(JSON.parse(savedHistory));
      } catch (error) {
        console.error('Error loading summary history:', error);
      }
    }
  }, []);

  // NEW: Load templates when component mounts
  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const response = await makeAPICall('/api/document-templates');
        const data = await response.json();
        if (data.success) {
          setDocumentTemplates(data.templates);
        }
      } catch (error) {
        console.error('Failed to load document templates:', error);
      }
    };
    
    loadTemplates();
  }, []);

  // NEW: Apply template settings
  const applyTemplate = (templateKey) => {
    const template = documentTemplates[templateKey];
    if (template) {
      setSummaryLength(template.settings.summaryLength);
      setSummaryStyle(template.settings.summaryStyle);
      setFocusArea(template.settings.focusArea);
      setStatusMessage(`Applied ${template.name} template settings`);
    }
  };

  // Summary length options
  const lengthOptions = [
    { id: 'short', name: 'Short', description: '2-3 sentences', tokens: '50-100' },
    { id: 'medium', name: 'Medium', description: '1-2 paragraphs', tokens: '150-250' },
    { id: 'long', name: 'Long', description: '3-4 paragraphs', tokens: '300-500' },
    { id: 'detailed', name: 'Detailed', description: 'Comprehensive', tokens: '500-800' }
  ];

  // Summary style options
  const styleOptions = [
    { id: 'bullet-points', name: 'Bullet Points', description: 'Key points in list format' },
    { id: 'paragraph', name: 'Paragraph', description: 'Flowing narrative summary' },
    { id: 'executive', name: 'Executive Summary', description: 'Business-focused overview' },
    { id: 'academic', name: 'Academic', description: 'Scholarly analysis style' },
    { id: 'casual', name: 'Casual', description: 'Easy-to-read explanation' }
  ];

  // Focus area options
  const focusOptions = [
    { id: 'general', name: 'General Overview', description: 'Balanced summary of all content' },
    { id: 'key-findings', name: 'Key Findings', description: 'Focus on main discoveries' },
    { id: 'action-items', name: 'Action Items', description: 'Actionable tasks and next steps' },
    { id: 'key-information', name: 'Key Information', description: 'Extract names, dates, and important details' },
    { id: 'date-extraction', name: 'Date & Timeline', description: 'Focus on dates, deadlines, and chronology' },
    { id: 'technical', name: 'Technical Details', description: 'Emphasize technical aspects' },
    { id: 'business', name: 'Business Impact', description: 'Focus on business implications' }
  ];
  // NEW: File type information helper
  const getFileTypeInfo = (file) => {
    const typeMap = {
      'text/plain': {
        name: 'Text Document',
        icon: '📄',
        description: 'Plain text file'
      },
      'application/pdf': {
        name: 'PDF Document',
        icon: '📕',
        description: 'Portable Document Format'
      },
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': {
        name: 'Word Document',
        icon: '📘',
        description: 'Microsoft Word document'
      },
      'application/msword': {
        name: 'Word Document (Legacy)',
        icon: '📘',
        description: 'Microsoft Word document'
      },
      'text/csv': {
        name: 'CSV Data',
        icon: '📊',
        description: 'Comma-separated values'
      },
      'application/csv': {
        name: 'CSV Data',
        icon: '📊',
        description: 'Comma-separated values'
      },
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
        name: 'Excel Spreadsheet',
        icon: '📗',
        description: 'Microsoft Excel workbook'
      },
      'application/vnd.ms-excel': {
        name: 'Excel Spreadsheet',
        icon: '📗',
        description: 'Microsoft Excel workbook'
      },
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': {
        name: 'PowerPoint Presentation',
        icon: '📙',
        description: 'Microsoft PowerPoint presentation'
      },
      'application/vnd.ms-powerpoint': {
        name: 'PowerPoint Presentation',
        icon: '📙',
        description: 'Microsoft PowerPoint presentation'
      },
      'text/html': {
        name: 'HTML Document',
        icon: '🌐',
        description: 'Web page document'
      },
      'application/rtf': {
        name: 'RTF Document',
        icon: '📄',
        description: 'Rich Text Format'
      },
      'text/rtf': {
        name: 'RTF Document',
        icon: '📄',
        description: 'Rich Text Format'
      }
    };

    return typeMap[file.type] || {
      name: 'Unknown Format',
      icon: '❓',
      description: 'Unsupported file type'
    };
  };

  // NEW: File size formatter
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // ENHANCED: Handle file upload with new file types
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Check file size (limit to 25MB for larger files like Excel/PowerPoint)
      if (file.size > 25 * 1024 * 1024) {
        setStatusMessage('File too large. Please select a file under 25MB.');
        return;
      }

      // UPDATED: Expanded file type support
      const allowedTypes = [
        // Text formats
        'text/plain',
        'text/csv',
        'text/html',
        'application/rtf',
        'text/rtf',
        
        // Document formats
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        
        // Presentation formats
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        
        // Spreadsheet formats
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/csv'
      ];
      
      if (!allowedTypes.includes(file.type)) {
        setStatusMessage('Unsupported file type. Supported formats: TXT, PDF, DOCX, RTF, CSV, HTML, XLSX, PPTX');
        return;
      }

      setSelectedFile(file);
      setStatusMessage(`File "${file.name}" selected successfully.`);
      
      // Enhanced file type detection and stats
      const fileTypeInfo = getFileTypeInfo(file);
      
      setDocumentStats({
        name: file.name,
        size: formatFileSize(file.size),
        type: fileTypeInfo.name,
        icon: fileTypeInfo.icon,
        description: fileTypeInfo.description,
        lastModified: new Date(file.lastModified).toLocaleDateString()
      });
    }
  };

  // UPDATED: Process document with template detection
  const processDocument = async () => {
    if (!selectedFile && !textInput.trim()) {
      setStatusMessage('Please upload a file or enter text to summarize.');
      return;
    }

    try {
      setIsProcessing(true);
      setStatusMessage('Processing document...');

      const formData = new FormData();
      
      if (selectedFile) {
        formData.append('file', selectedFile);
      }
      
      formData.append('summaryLength', summaryLength);
      formData.append('summaryStyle', summaryStyle);
      formData.append('focusArea', focusArea);
      formData.append('textContent', textInput);

      const response = await makeAPICall('/api/summarize-document', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (data.success) {
        setSummary(data.summary);
        setKeyPoints(data.keyPoints || []);
        
        // Handle document type detection
        if (data.documentType) {
          setDetectedType(data.documentType);
          
          if (data.documentType.appliedAutomatically) {
            setShowingDetectedSettings(true);
            setStatusMessage(`Auto-detected as ${data.documentType.template.name} and applied optimal settings`);
          } else if (data.documentType.confidence > 3) {
            setStatusMessage(`Document appears to be a ${data.documentType.template.name}. Consider using the suggested template.`);
          } else {
            setStatusMessage('Document summarized successfully!');
          }
        } else {
          setStatusMessage('Document summarized successfully!');
        }
        
        // Save to history with document type
        const historyItem = {
          id: Date.now(),
          title: selectedFile ? selectedFile.name : 'Text Input',
          summary: data.summary,
          length: summaryLength,
          style: summaryStyle,
          focus: focusArea,
          documentType: data.documentType?.detected || 'general',
          timestamp: new Date().toISOString()
        };
        
        const updatedHistory = [historyItem, ...summaryHistory.slice(0, 9)];
        setSummaryHistory(updatedHistory);
        localStorage.setItem('neutex_summary_history', JSON.stringify(updatedHistory));
        
      } else {
        throw new Error(data.error || 'Summarization failed');
      }
    } catch (error) {
      console.error('Summarization error:', error);
      setStatusMessage(`Error: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Copy summary to clipboard
  const copySummary = () => {
    navigator.clipboard.writeText(summary);
    setStatusMessage('Summary copied to clipboard!');
  };

  // Download summary
  const downloadSummary = () => {
    const content = `Document Summary\n==================\n\nOriginal: ${selectedFile ? selectedFile.name : 'Text Input'}\nStyle: ${summaryStyle}\nLength: ${summaryLength}\nFocus: ${focusArea}\nGenerated: ${new Date().toLocaleString()}\n\n${summary}`;
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `summary-${Date.now()}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Clear form
  const clearForm = () => {
    setSelectedFile(null);
    setTextInput('');
    setSummary('');
    setKeyPoints([]);
    setDocumentStats({});
    setStatusMessage('');
    setDetectedType(null);
    setShowingDetectedSettings(false);
  };

  return (
    <div className={getThemeClasses(
      "min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 text-slate-900",
      "min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-indigo-900 text-white"
    )}>
      {/* Header */}
      <header className={getThemeClasses(
        "relative border-b border-white/20 bg-white/60 backdrop-blur-xl shadow-sm",
        "relative border-b border-gray-700/50 bg-gray-900/60 backdrop-blur-xl shadow-sm"
      )}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => onNavigate('home')}
              className={getThemeClasses(
                "p-2 text-slate-600 hover:text-blue-600 hover:bg-white/60 rounded-xl transition-all duration-200",
                "p-2 text-gray-300 hover:text-blue-400 hover:bg-gray-700/60 rounded-xl transition-all duration-200"
              )}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <FileText className="w-7 h-7 text-white animate-pulse" />
              </div>
              <div>
                <h1 className={getThemeClasses(
                  "text-2xl font-bold bg-gradient-to-r from-slate-900 to-blue-600 bg-clip-text text-transparent",
                  "text-2xl font-bold text-white"
                )}>
                  Document Summarizer
                </h1>
                <p className={getThemeClasses("text-sm text-slate-600", "text-sm text-gray-400")}>
                  AI-Powered Document Analysis
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button 
              onClick={toggleTheme}
              className={getThemeClasses(
                "p-3 text-slate-600 hover:text-blue-600 hover:bg-white/60 rounded-xl transition-all duration-200",
                "p-3 text-gray-300 hover:text-blue-400 hover:bg-gray-700/60 rounded-xl transition-all duration-200"
              )}
            >
              {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <button className={getThemeClasses(
              "p-3 text-slate-600 hover:text-blue-600 hover:bg-white/60 rounded-xl transition-all duration-200",
              "p-3 text-gray-300 hover:text-blue-400 hover:bg-gray-700/60 rounded-xl transition-all duration-200"
            )}>
              <Settings className="w-5 h-5" />
            </button>
            <button className={getThemeClasses(
              "p-3 text-slate-600 hover:text-blue-600 hover:bg-white/60 rounded-xl transition-all duration-200",
              "p-3 text-gray-300 hover:text-blue-400 hover:bg-gray-700/60 rounded-xl transition-all duration-200"
            )}>
              <User className="w-5 h-5" />
            </button>
            <div className={getThemeClasses(
              "ml-4 px-4 py-2 bg-white/40 backdrop-blur-sm rounded-lg border border-white/30",
              "ml-4 px-4 py-2 bg-gray-800/40 backdrop-blur-sm rounded-lg border border-gray-700/30"
            )}>
              <div className={getThemeClasses(
                "text-sm text-slate-700 font-medium flex items-center space-x-2",
                "text-sm text-gray-300 font-medium flex items-center space-x-2"
              )}>
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span>{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="relative max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Input Section */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Input Tabs */}
            <div className={getThemeClasses(
              "bg-white/80 backdrop-blur-sm rounded-3xl p-6 border border-white/50 shadow-lg",
              "bg-gray-800/80 backdrop-blur-sm rounded-3xl p-6 border border-gray-700/50 shadow-lg"
            )}>
              <div className="flex space-x-2 mb-6">
                <button
                  onClick={() => setActiveTab('upload')}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition-all ${
                    activeTab === 'upload' 
                      ? 'bg-blue-600 text-white shadow-lg' 
                      : getThemeClasses(
                          'bg-white/60 text-slate-600 hover:bg-white/80',
                          'bg-gray-700/60 text-gray-300 hover:bg-gray-700/80'
                        )
                  }`}
                >
                  <Upload className="w-4 h-4" />
                  <span>Upload File</span>
                </button>
                <button
                  onClick={() => setActiveTab('text')}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition-all ${
                    activeTab === 'text' 
                      ? 'bg-blue-600 text-white shadow-lg' 
                      : getThemeClasses(
                          'bg-white/60 text-slate-600 hover:bg-white/80',
                          'bg-gray-700/60 text-gray-300 hover:bg-gray-700/80'
                        )
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  <span>Paste Text</span>
                </button>
              </div>

              {/* Upload Tab */}
              {activeTab === 'upload' && (
                <div className="space-y-4">
                  <h3 className={getThemeClasses(
                    "text-xl font-bold text-slate-900",
                    "text-xl font-bold text-white"
                  )}>
                    Upload Document
                  </h3>
                  
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className={getThemeClasses(
                      "border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-blue-400 cursor-pointer transition-colors bg-gray-50/50",
                      "border-2 border-dashed border-gray-600 rounded-xl p-8 text-center hover:border-blue-400 cursor-pointer transition-colors bg-gray-700/50"
                    )}
                  >
                    {selectedFile ? (
                      <div className="space-y-4">
                        <span className="text-4xl">{documentStats.icon}</span>
                        <div>
                          <p className={getThemeClasses("text-lg font-medium text-slate-900", "text-lg font-medium text-white")}>
                            {selectedFile.name}
                          </p>
                          <p className={getThemeClasses("text-sm text-slate-600", "text-sm text-gray-400")}>
                            {documentStats.size} • {documentStats.type}
                          </p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedFile(null);
                            setDocumentStats({});
                          }}
                          className="text-red-500 hover:text-red-600 text-sm"
                        >
                          Remove File
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <Upload className={getThemeClasses("w-12 h-12 text-gray-400 mx-auto", "w-12 h-12 text-gray-500 mx-auto")} />
                        <div>
                          <p className={getThemeClasses("text-lg font-medium text-slate-900", "text-lg font-medium text-white")}>
                            Drop files here or click to upload
                          </p>
                          <p className={getThemeClasses("text-sm text-slate-600", "text-sm text-gray-400")}>
                            Supports TXT, PDF, DOCX, RTF, CSV, HTML, XLSX, PPTX files up to 25MB
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".txt,.pdf,.doc,.docx,.rtf,.csv,.html,.xlsx,.xls,.pptx,.ppt"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>
              )}

              {/* Text Tab */}
              {activeTab === 'text' && (
                <div className="space-y-4">
                  <h3 className={getThemeClasses(
                    "text-xl font-bold text-slate-900",
                    "text-xl font-bold text-white"
                  )}>
                    Paste Your Text
                  </h3>
                  
                  <textarea
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    placeholder="Paste your document text here..."
                    className={getThemeClasses(
                      "w-full h-64 px-4 py-3 border-2 border-white/50 rounded-xl bg-white/70 text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-4 focus:ring-blue-500/30 focus:border-blue-500 transition-all resize-none",
                      "w-full h-64 px-4 py-3 border-2 border-gray-600/50 rounded-xl bg-gray-700/70 text-white placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-blue-500/30 focus:border-blue-500 transition-all resize-none"
                    )}
                  />
                  
                  <div className="flex justify-between text-sm">
                    <span className={getThemeClasses("text-slate-600", "text-gray-400")}>
                      {textInput.length} characters
                    </span>
                    <span className={getThemeClasses("text-slate-600", "text-gray-400")}>
                      ~{Math.ceil(textInput.split(' ').length)} words
                    </span>
                  </div>
                </div>
              )}

              {/* Process Button */}
              <div className="mt-6">
                <button
                  onClick={processDocument}
                  disabled={isProcessing || (!selectedFile && !textInput.trim())}
                  className="w-full px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center space-x-3 font-semibold text-lg shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
                >
                  {isProcessing ? (
                    <>
                      <Sparkles className="w-6 h-6 animate-spin" />
                      <span>Processing Document...</span>
                    </>
                  ) : (
                    <>
                      <BookOpen className="w-6 h-6" />
                      <span>Summarize Document</span>
                    </>
                  )}
                </button>
              </div>

              {/* Status Message */}
              {statusMessage && (
                <div className={getThemeClasses(
                  "mt-4 p-4 bg-blue-50 border border-blue-200 rounded-xl",
                  "mt-4 p-4 bg-blue-900/20 border border-blue-800 rounded-xl"
                )}>
                  <p className={getThemeClasses("text-blue-800", "text-blue-300")}>
                    {statusMessage}
                  </p>
                </div>
              )}
            </div>

            {/* Summary Output */}
            {summary && (
              <div className={getThemeClasses(
                "bg-white/80 backdrop-blur-sm rounded-3xl p-6 border border-white/50 shadow-lg",
                "bg-gray-800/80 backdrop-blur-sm rounded-3xl p-6 border border-gray-700/50 shadow-lg"
              )}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className={getThemeClasses(
                    "text-xl font-bold text-slate-900",
                    "text-xl font-bold text-white"
                  )}>
                    Summary
                  </h3>
                  <div className="flex space-x-2">
                    <button
                      onClick={copySummary}
                      className={getThemeClasses(
                        "p-2 text-slate-500 hover:text-blue-600 rounded-lg transition-colors",
                        "p-2 text-gray-400 hover:text-blue-400 rounded-lg transition-colors"
                      )}
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={downloadSummary}
                      className={getThemeClasses(
                        "p-2 text-slate-500 hover:text-green-600 rounded-lg transition-colors",
                        "p-2 text-gray-400 hover:text-green-400 rounded-lg transition-colors"
                      )}
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <div className={getThemeClasses(
                    "p-4 bg-white/60 rounded-xl border border-white/50 text-slate-800 leading-relaxed",
                    "p-4 bg-gray-700/60 rounded-xl border border-gray-600/50 text-gray-200 leading-relaxed"
                  )}>
                    {/* Fixed: Display summary with proper line breaks for bullet points */}
                    {summaryStyle === 'bullet-points' ? (
                      // Special handling for bullet points - each on separate line
                      <div className="space-y-2">
                        {summary.split('\n').map((line, index) => {
                          const trimmedLine = line.trim();
                          if (!trimmedLine) return null;
                          
                          return (
                            <div key={index} className="flex items-start">
                              <span className="text-blue-500 mr-3 mt-1 flex-shrink-0">•</span>
                              <span className="flex-1">{trimmedLine.replace(/^[•\-]\s*/, '')}</span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      // For other styles, preserve line breaks with pre-line
                      <div style={{ whiteSpace: 'pre-line' }}>
                        {summary}
                      </div>
                    )}
                  </div>

                {/* Show document type detection info */}
                {detectedType && (
                  <div className="mt-2 text-xs text-gray-500 flex items-center space-x-2">
                    <span>{detectedType.template.icon}</span>
                    <span>Processed as: {detectedType.template.name}</span>
                    {detectedType.appliedAutomatically && (
                      <span className="text-green-500">(auto-detected)</span>
                    )}
                  </div>
                )}

                {keyPoints.length > 0 && (
                  <div className="mt-4">
                    <h4 className={getThemeClasses(
                      "font-semibold text-slate-900 mb-2",
                      "font-semibold text-white mb-2"
                    )}>
                      Key Points:
                    </h4>
                    <ul className="space-y-1">
                      {keyPoints.map((point, index) => (
                        <li key={index} className={getThemeClasses(
                          "text-slate-700 flex items-start space-x-2",
                          "text-gray-300 flex items-start space-x-2"
                        )}>
                          <span className="text-blue-600 mt-1">•</span>
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Settings Sidebar */}
          <div className="space-y-6">
            
            {/* NEW: Smart Templates Section */}
            <div className={getThemeClasses(
              "bg-white/80 backdrop-blur-sm rounded-3xl p-6 border border-white/50 shadow-lg",
              "bg-gray-800/80 backdrop-blur-sm rounded-3xl p-6 border border-gray-700/50 shadow-lg"
            )}>
              <h3 className={getThemeClasses(
                "text-lg font-bold text-slate-900 mb-4 flex items-center space-x-2",
                "text-lg font-bold text-white mb-4 flex items-center space-x-2"
              )}>
                <span className="text-2xl">🎯</span>
                <span>Smart Templates</span>
              </h3>
              
              {/* Detection Results */}
              {detectedType && detectedType.confidence > 2 && (
                <div className={getThemeClasses(
                  "mb-4 p-3 bg-blue-50 border border-blue-200 rounded-xl",
                  "mb-4 p-3 bg-blue-900/20 border border-blue-800 rounded-xl"
                )}>
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="text-xl">{detectedType.template.icon}</span>
                    <span className={getThemeClasses(
                      "font-medium text-blue-800",
                      "font-medium text-blue-300"
                    )}>
                      Detected: {detectedType.template.name}
                    </span>
                    <span className={getThemeClasses(
                      "text-xs px-2 py-1 bg-blue-200 text-blue-700 rounded",
                      "text-xs px-2 py-1 bg-blue-800 text-blue-200 rounded"
                    )}>
                      {Math.round(detectedType.confidence * 10)}% confidence
                    </span>
                  </div>
                  <p className={getThemeClasses(
                    "text-sm text-blue-700 mb-2",
                    "text-sm text-blue-300 mb-2"
                  )}>
                    {detectedType.template.description}
                  </p>
                  {!detectedType.appliedAutomatically && (
                    <button
                      onClick={() => applyTemplate(detectedType.detected)}
                      className="text-sm bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Apply Suggested Settings
                    </button>
                  )}
                  {detectedType.appliedAutomatically && (
                    <span className={getThemeClasses(
                      "text-sm text-green-700 font-medium",
                      "text-sm text-green-300 font-medium"
                    )}>
                      ✓ Settings applied automatically
                    </span>
                  )}
                </div>
              )}
              
              {/* Template Grid */}
              <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto">
                {Object.entries(documentTemplates).map(([key, template]) => (
                  <button
                    key={key}
                    onClick={() => applyTemplate(key)}
                    className={getThemeClasses(
                      "p-3 text-left bg-white/70 hover:bg-white/90 rounded-xl transition-all duration-200 border border-transparent hover:border-blue-300",
                      "p-3 text-left bg-gray-700/70 hover:bg-gray-600/90 rounded-xl transition-all duration-200 border border-transparent hover:border-blue-500"
                    )}
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-xl">{template.icon}</span>
                      <div className="flex-1">
                        <div className={getThemeClasses(
                          "font-medium text-sm text-slate-900",
                          "font-medium text-sm text-white"
                        )}>
                          {template.name}
                        </div>
                        <div className={getThemeClasses(
                          "text-xs text-slate-600 mt-1",
                          "text-xs text-gray-400 mt-1"
                        )}>
                          {template.description}
                        </div>
                      </div>
                      {detectedType?.detected === key && (
                        <span className="text-blue-500 text-sm">★</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Summary Settings */}
            <div className={getThemeClasses(
              "bg-white/80 backdrop-blur-sm rounded-3xl p-6 border border-white/50 shadow-lg",
              "bg-gray-800/80 backdrop-blur-sm rounded-3xl p-6 border border-gray-700/50 shadow-lg"
            )}>
              <h3 className={getThemeClasses(
                "text-lg font-bold text-slate-900 mb-4 flex items-center space-x-2",
                "text-lg font-bold text-white mb-4 flex items-center space-x-2"
              )}>
                <Zap className="w-5 h-5 text-blue-600" />
                <span>Summary Settings</span>
              </h3>
              
              {/* Length */}
              <div className="space-y-3 mb-6">
                <label className={getThemeClasses(
                  "block text-sm font-medium text-slate-700",
                  "block text-sm font-medium text-gray-300"
                )}>
                  Summary Length
                </label>
                <select
                  value={summaryLength}
                  onChange={(e) => setSummaryLength(e.target.value)}
                  className={getThemeClasses(
                    "w-full p-3 bg-white/90 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900",
                    "w-full p-3 bg-gray-700/90 border border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white"
                  )}
                >
                  {lengthOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.name} - {option.description} ({option.tokens} tokens)
                    </option>
                  ))}
                </select>
              </div>

              {/* Style */}
              <div className="space-y-3 mb-6">
                <label className={getThemeClasses(
                  "block text-sm font-medium text-slate-700",
                  "block text-sm font-medium text-gray-300"
                )}>
                  Summary Style
                </label>
                <select
                  value={summaryStyle}
                  onChange={(e) => setSummaryStyle(e.target.value)}
                  className={getThemeClasses(
                    "w-full p-3 bg-white/90 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900",
                    "w-full p-3 bg-gray-700/90 border border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white"
                  )}
                >
                  {styleOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Focus Area */}
              <div className="space-y-3">
                <label className={getThemeClasses(
                  "block text-sm font-medium text-slate-700",
                  "block text-sm font-medium text-gray-300"
                )}>
                  Focus Area
                </label>
                <select
                  value={focusArea}
                  onChange={(e) => setFocusArea(e.target.value)}
                  className={getThemeClasses(
                    "w-full p-3 bg-white/90 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900",
                    "w-full p-3 bg-gray-700/90 border border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white"
                  )}
                >
                  {focusOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Document Stats */}
            {Object.keys(documentStats).length > 0 && (
              <div className={getThemeClasses(
                "bg-white/80 backdrop-blur-sm rounded-3xl p-6 border border-white/50 shadow-lg",
                "bg-gray-800/80 backdrop-blur-sm rounded-3xl p-6 border border-gray-700/50 shadow-lg"
              )}>
                <h3 className={getThemeClasses(
                  "text-lg font-bold text-slate-900 mb-4 flex items-center space-x-2",
                  "text-lg font-bold text-white mb-4 flex items-center space-x-2"
                )}>
                  <BarChart3 className="w-5 h-5 text-green-600" />
                  <span>Document Info</span>
                </h3>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className={getThemeClasses("text-slate-600", "text-gray-400")}>File:</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">{documentStats.icon}</span>
                      <span className={getThemeClasses("text-slate-900 font-medium", "text-white font-medium")}>
                        {documentStats.name}
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className={getThemeClasses("text-slate-600", "text-gray-400")}>Type:</span>
                    <span className={getThemeClasses("text-slate-900 font-medium", "text-white font-medium")}>
                      {documentStats.type}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className={getThemeClasses("text-slate-600", "text-gray-400")}>Size:</span>
                    <span className={getThemeClasses("text-slate-900 font-medium", "text-white font-medium")}>
                      {documentStats.size}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className={getThemeClasses("text-slate-600", "text-gray-400")}>Modified:</span>
                    <span className={getThemeClasses("text-slate-900 font-medium", "text-white font-medium")}>
                      {documentStats.lastModified}
                    </span>
                  </div>
                  {documentStats.description && (
                    <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <p className={getThemeClasses("text-xs text-blue-700", "text-xs text-blue-300")}>
                        {documentStats.description}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className={getThemeClasses(
              "bg-white/80 backdrop-blur-sm rounded-3xl p-6 border border-white/50 shadow-lg",
              "bg-gray-800/80 backdrop-blur-sm rounded-3xl p-6 border border-gray-700/50 shadow-lg"
            )}>
              <h3 className={getThemeClasses(
                "text-lg font-bold text-slate-900 mb-4 flex items-center space-x-2",
                "text-lg font-bold text-white mb-4 flex items-center space-x-2"
              )}>
                <Clock className="w-5 h-5 text-orange-600" />
                <span>Quick Actions</span>
              </h3>
              
              <div className="space-y-2">
                <button
                  onClick={clearForm}
                  className={getThemeClasses(
                    "w-full p-3 text-left bg-white/70 hover:bg-white/90 rounded-xl text-slate-900 transition-all duration-200 text-sm",
                    "w-full p-3 text-left bg-gray-700/70 hover:bg-gray-600/90 rounded-xl text-gray-200 transition-all duration-200 text-sm"
                  )}
                >
                  <RefreshCw className="w-4 h-4 inline mr-2" />
                  Clear All
                </button>
                
                {summaryHistory.length > 0 && (
                  <button
                    onClick={() => {
                      setSummaryHistory([]);
                      localStorage.removeItem('neutex_summary_history');
                      setStatusMessage('Summary history cleared');
                    }}
                    className={getThemeClasses(
                      "w-full p-3 text-left bg-white/70 hover:bg-white/90 rounded-xl text-slate-900 transition-all duration-200 text-sm",
                      "w-full p-3 text-left bg-gray-700/70 hover:bg-gray-600/90 rounded-xl text-gray-200 transition-all duration-200 text-sm"
                    )}
                  >
                    <Archive className="w-4 h-4 inline mr-2" />
                    Clear History
                  </button>
                )}
              </div>
            </div>

            {/* Summary History */}
            {summaryHistory.length > 0 && (
              <div className={getThemeClasses(
                "bg-white/80 backdrop-blur-sm rounded-3xl p-6 border border-white/50 shadow-lg",
                "bg-gray-800/80 backdrop-blur-sm rounded-3xl p-6 border border-gray-700/50 shadow-lg"
              )}>
                <h3 className={getThemeClasses(
                  "text-lg font-bold text-slate-900 mb-4 flex items-center space-x-2",
                  "text-lg font-bold text-white mb-4 flex items-center space-x-2"
                )}>
                  <Archive className="w-5 h-5 text-purple-600" />
                  <span>Recent Summaries</span>
                </h3>
                
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {summaryHistory.slice(0, 5).map((item) => (
                    <div key={item.id} className={getThemeClasses(
                      "p-3 bg-white/70 rounded-xl hover:bg-white/90 transition-colors cursor-pointer",
                      "p-3 bg-gray-700/70 rounded-xl hover:bg-gray-600/90 transition-colors cursor-pointer"
                    )}
                    onClick={() => {
                      setSummary(item.summary);
                      setSummaryLength(item.length);
                      setSummaryStyle(item.style);
                      setFocusArea(item.focus);
                    }}>
                      <div className={getThemeClasses(
                        "font-medium text-sm text-slate-900 truncate",
                        "font-medium text-sm text-white truncate"
                      )}>
                        {item.title}
                      </div>
                      <div className={getThemeClasses(
                        "text-xs text-slate-600 mt-1",
                        "text-xs text-gray-400 mt-1"
                      )}>
                        {new Date(item.timestamp).toLocaleDateString()} • {item.style} • {item.length}
                        {item.documentType && item.documentType !== 'general' && (
                          <span> • {documentTemplates[item.documentType]?.name || item.documentType}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tips */}
            <div className={getThemeClasses(
              "bg-white/80 backdrop-blur-sm rounded-3xl p-6 border border-white/50 shadow-lg",
              "bg-gray-800/80 backdrop-blur-sm rounded-3xl p-6 border border-gray-700/50 shadow-lg"
            )}>
              <h3 className={getThemeClasses(
                "text-lg font-bold text-slate-900 mb-4 flex items-center space-x-2",
                "text-lg font-bold text-white mb-4 flex items-center space-x-2"
              )}>
                <Sparkles className="w-5 h-5 text-yellow-600" />
                <span>Tips</span>
              </h3>
              
              <div className="space-y-3">
                {[
                  'Try the Smart Templates for optimal settings',
                  'Upload business files: Excel, PowerPoint, CSV',
                  'HTML files are cleaned automatically',
                  'Large files use smart chunking automatically'
                ].map((tip, index) => (
                  <div key={index} className={getThemeClasses(
                    "p-3 bg-white/70 rounded-xl text-slate-900 text-sm",
                    "p-3 bg-gray-700/70 rounded-xl text-gray-200 text-sm"
                  )}>
                    <div className="flex items-start space-x-2">
                      <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full mt-2 flex-shrink-0"></div>
                      <span>{tip}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default DocumentSummarizer;