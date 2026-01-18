import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { makeAPICall } from '../config/api';
import { 
  ChevronLeft, Settings, User, Upload, BarChart3, PieChart, 
  TrendingUp, FileSpreadsheet, Brain, Download, Copy, RefreshCw, 
  Moon, Sun, Search, Filter, Zap, AlertCircle, CheckCircle,
  Database, LineChart, Activity, Target, Layers, Sparkles
} from 'lucide-react';

import { 
  BarChart, Bar, LineChart as RechartsLineChart, Line, ScatterChart, Scatter, 
  PieChart as RechartsPieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer 
} from 'recharts';

const DataAnalystDashboard = ({ onNavigate }) => {
  const { isDarkMode, toggleTheme } = useTheme();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [uploadedFile, setUploadedFile] = useState(null);
  const [fileData, setFileData] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [analysisResults, setAnalysisResults] = useState(null);
  const [naturalQuery, setNaturalQuery] = useState('');
  const [queryResult, setQueryResult] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedColumns, setSelectedColumns] = useState([]);
  const [chartType, setChartType] = useState('bar');
  const [insights, setInsights] = useState([]);
  const [xAxisColumn, setXAxisColumn] = useState('');
  const [yAxisColumn, setYAxisColumn] = useState('');
  
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

  // Enhanced file upload with better validation
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (file) {
      if (!file.name.match(/\.(csv|xlsx|xls)$/i)) {
        setStatusMessage('Please upload a CSV or Excel file');
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        setStatusMessage('File size must be less than 10MB');
        return;
      }

      setUploadedFile(file);
      setIsProcessing(true);
      setStatusMessage('Processing your data file...');

      try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await makeAPICall('/api/analyze-data', {
        method: 'POST',
        body: formData
      });

        const data = await response.json();

        if (data.success) {
          setFileData(data.fileData);
          setAnalysisResults(data.analysis);
          setInsights(data.insights || []);
          setStatusMessage('Data analysis completed successfully!');
        } else {
          setStatusMessage(`Analysis failed: ${data.error}`);
        }
      } catch (error) {
        console.error('Error analyzing data:', error);
        setStatusMessage(`Error: ${error.message}`);
      } finally {
        setIsProcessing(false);
      }
    }
  };

  // Enhanced natural language query
  const handleNaturalQuery = async () => {
    if (!naturalQuery.trim() || !fileData) {
      setStatusMessage('Please enter a query and ensure data is loaded');
      return;
    }

    setIsProcessing(true);
    setStatusMessage('Processing your query...');

    try {
   const response = await makeAPICall('/api/query-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: naturalQuery,
        data: fileData,
        fileName: uploadedFile?.name
      })
    });

      const data = await response.json();

      if (data.success) {
        setQueryResult(data.result);
        setStatusMessage('Query executed successfully!');
      } else {
        setStatusMessage(`Query failed: ${data.error}`);
      }
    } catch (error) {
      console.error('Error executing query:', error);
      setStatusMessage(`Error: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Generate insights with AI
const generateInsights = async (switchToTab = false) => {
  if (!fileData) {
    setStatusMessage('Please upload data first');
    return;
  }

  setIsProcessing(true);
  setStatusMessage('Generating AI insights...');

  // Auto-switch to insights tab if triggered from sidebar
  if (switchToTab) {
    setActiveTab('insights');
  }

  try {
        const response = await makeAPICall('/api/generate-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: fileData,
          fileName: uploadedFile?.name,
          columns: selectedColumns.length > 0 ? selectedColumns : Object.keys(fileData[0] || {})
        })
      });

    const data = await response.json();

    if (data.success) {
      setInsights(data.insights);
      setStatusMessage('Insights generated successfully!');
    } else {
      setStatusMessage(`Insight generation failed: ${data.error}`);
    }
  } catch (error) {
    console.error('Error generating insights:', error);
    setStatusMessage(`Error: ${error.message}`);
  } finally {
    setIsProcessing(false);
  }
};

  // Export results
  const exportResults = () => {
    if (!analysisResults) return;

    const exportData = {
      fileName: uploadedFile?.name,
      timestamp: new Date().toISOString(),
      summary: analysisResults,
      insights: insights,
      queryResults: queryResult ? [{ query: naturalQuery, result: queryResult }] : []
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `data-analysis-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Use sample data
  const useSampleData = () => {
    const sampleData = [
      { Date: '2024-01-01', Product: 'Alpha', Units: 120, Price: 9.99, Sales: 1198.8 },
      { Date: '2024-01-08', Product: 'Beta', Units: 75, Price: 14.50, Sales: 1087.5 },
      { Date: '2024-01-15', Product: 'Alpha', Units: 150, Price: 9.99, Sales: 1498.5 },
      { Date: '2024-01-22', Product: 'Gamma', Units: 60, Price: 19.00, Sales: 1140 },
      { Date: '2024-01-29', Product: 'Beta', Units: 90, Price: 14.50, Sales: 1305 },
      { Date: '2024-02-05', Product: 'Alpha', Units: 170, Price: 10.49, Sales: 1783.3 },
      { Date: '2024-02-12', Product: 'Gamma', Units: 80, Price: 19.00, Sales: 1520 },
      { Date: '2024-02-19', Product: 'Beta', Units: 110, Price: 14.50, Sales: 1595 },
      { Date: '2024-02-26', Product: 'Alpha', Units: 160, Price: 10.49, Sales: 1678.4 },
      { Date: '2024-03-04', Product: 'Gamma', Units: 95, Price: 19.00, Sales: 1805 }
    ];

    setFileData(sampleData);
    setAnalysisResults({
      fileName: 'Sample Dataset',
      totalRows: sampleData.length,
      totalColumns: Object.keys(sampleData[0]).length,
      columns: Object.keys(sampleData[0])
    });
    setInsights([
      'Sample dataset loaded with sales data across 3 products',
      'Alpha product shows consistent performance with highest volume',
      'Gamma has the highest price point at $19.00',
      'Sales trend appears to be growing over the time period'
    ]);
    setStatusMessage('Sample dataset loaded successfully!');
  };

  const clearData = () => {
    setFileData(null);
    setAnalysisResults(null);
    setInsights([]);
    setQueryResult('');
    setNaturalQuery('');
    setUploadedFile(null);
    setStatusMessage('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const tabs = [
    { id: 'overview', name: 'Overview', icon: Database },
    { id: 'insights', name: 'AI Insights', icon: Brain },
    { id: 'query', name: 'Natural Language Query', icon: Search },
    { id: 'charts', name: 'Visualizations', icon: BarChart3 },
    { id: 'report', name: 'Report', icon: FileSpreadsheet }
  ];

  const suggestedQueries = [
    'Show me sales trends over time',
    'What are the top performing products?',
    'Average price by product category',
    'Correlation between price and units sold',
    'Total revenue breakdown by month'
  ];

  return (
    <div className={getThemeClasses(
      "min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 text-slate-900 relative overflow-hidden",
      "min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-sky-900 text-white relative overflow-hidden"
    )}>
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(30)].map((_, i) => (
          <div
            key={i}
            className={getThemeClasses(
              "absolute w-1 h-1 bg-blue-400 rounded-full opacity-30 animate-pulse",
              "absolute w-1 h-1 bg-blue-400 rounded-full opacity-20 animate-pulse"
            )}
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${3 + Math.random() * 4}s`
            }}
          />
        ))}
      </div>

      {/* Header */}
      <header className={getThemeClasses(
        "sticky top-0 z-20 backdrop-blur-xl bg-white/60 border-b border-white/20 shadow-xl",
        "sticky top-0 z-20 backdrop-blur-xl bg-white/5 border-b border-white/10 shadow-xl"
      )}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => onNavigate('home')}
              className={getThemeClasses(
                "p-2 text-slate-600 hover:text-blue-600 hover:bg-white/60 rounded-xl transition-all duration-200",
                "p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-xl transition-all duration-200"
              )}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center space-x-3">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-tr from-emerald-400 to-indigo-500 grid place-items-center shadow-lg shadow-emerald-500/20">
                <Sparkles className="w-7 h-7 text-white animate-pulse" />
              </div>
              <div>
                <h1 className={getThemeClasses(
                  "text-2xl md:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-slate-900 to-blue-600 bg-clip-text text-transparent",
                  "text-2xl md:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent"
                )}>
                  AI Data Analyst Dashboard
                </h1>
                <p className={getThemeClasses(
                  "text-slate-600 text-sm",
                  "text-white/60 text-sm"
                )}>Upload data, ask questions, get insights, and export reports</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <button 
              onClick={toggleTheme}
              className={getThemeClasses(
                "p-3 text-slate-600 hover:text-blue-600 hover:bg-white/60 rounded-xl transition-all duration-200",
                "p-3 text-white/60 hover:text-white hover:bg-white/10 rounded-xl transition-all duration-200"
              )}
            >
              {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <button className={getThemeClasses(
              "p-3 text-slate-600 hover:text-blue-600 hover:bg-white/60 rounded-xl transition-all duration-200",
              "p-3 text-white/60 hover:text-white hover:bg-white/10 rounded-xl transition-all duration-200"
            )}>
              <Settings className="w-5 h-5" />
            </button>
            <button className={getThemeClasses(
              "p-3 text-slate-600 hover:text-blue-600 hover:bg-white/60 rounded-xl transition-all duration-200",
              "p-3 text-white/60 hover:text-white hover:bg-white/10 rounded-xl transition-all duration-200"
            )}>
              <User className="w-5 h-5" />
            </button>
            <button
              onClick={exportResults}
              disabled={!analysisResults}
              className="px-4 py-2 rounded-xl bg-emerald-400/90 hover:bg-emerald-400 text-black font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              Export Report
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Sidebar */}
          <aside className="lg:col-span-4 space-y-6">
            
            {/* Upload Section */}
            <section className={getThemeClasses(
              "rounded-2xl border border-white/20 bg-white/80 backdrop-blur-sm p-6 shadow-xl hover:shadow-2xl transition-all duration-300",
              "rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-6 shadow-xl hover:shadow-2xl transition-all duration-300"
            )}>
              <h2 className={getThemeClasses(
                "font-bold text-lg mb-4 flex items-center space-x-2 text-slate-900",
                "font-bold text-lg mb-4 flex items-center space-x-2 text-white"
              )}>
                <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                <span>1) Add your data</span>
              </h2>
              
              <div 
                onClick={() => fileInputRef.current?.click()}
                className={getThemeClasses(
                  "rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-6 cursor-pointer hover:border-slate-400 hover:bg-slate-100 transition-all duration-300 group",
                  "rounded-xl border-2 border-dashed border-white/20 bg-white/5 p-6 cursor-pointer hover:border-white/40 hover:bg-white/10 transition-all duration-300 group"
                )}
              >
                {isProcessing ? (
                  <div className="text-center space-y-3">
                    <RefreshCw className="w-8 h-8 text-blue-400 mx-auto animate-spin" />
                    <p className={getThemeClasses("text-slate-800", "text-white/80")}>Processing your data...</p>
                  </div>
                ) : (
                  <div className="text-center space-y-3">
                    <FileSpreadsheet className={getThemeClasses(
                      "w-8 h-8 text-slate-600 group-hover:text-slate-800 mx-auto transition-colors",
                      "w-8 h-8 text-white/60 group-hover:text-white/80 mx-auto transition-colors"
                    )} />
                    <div>
                      <p className={getThemeClasses("text-slate-800 mb-1", "text-white/80 mb-1")}>Drop your data file here or click to browse</p>
                      <p className={getThemeClasses("text-xs text-slate-500", "text-xs text-white/50")}>Supports CSV, Excel files up to 10MB</p>
                    </div>
                  </div>
                )}
              </div>
              
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileUpload}
                className="hidden"
              />

              <div className="mt-4 flex items-center gap-2">
                <button
                  onClick={useSampleData}
                  className={getThemeClasses(
                    "px-3 py-2 rounded-lg bg-slate-200 hover:bg-slate-300 text-sm border border-slate-300 transition-all duration-200 text-slate-800",
                    "px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-sm border border-white/10 transition-all duration-200 text-white"
                  )}
                >
                  Use sample dataset
                </button>
                <button
                  onClick={clearData}
                  className={getThemeClasses(
                    "px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-sm border border-slate-300 transition-all duration-200 text-slate-800",
                    "px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm border border-white/10 transition-all duration-200 text-white"
                  )}
                >
                  Clear
                </button>
              </div>

              {analysisResults && (
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className={getThemeClasses(
                    "rounded-lg bg-slate-100 border border-slate-200 p-3",
                    "rounded-lg bg-white/5 border border-white/10 p-3"
                  )}>
                    <div className={getThemeClasses("text-xs text-slate-600", "text-xs text-white/60")}>Rows</div>
                    <div className={getThemeClasses("text-lg font-bold text-slate-900", "text-lg font-bold text-white")}>{analysisResults.totalRows}</div>
                  </div>
                  <div className={getThemeClasses(
                    "rounded-lg bg-slate-100 border border-slate-200 p-3",
                    "rounded-lg bg-white/5 border border-white/10 p-3"
                  )}>
                    <div className={getThemeClasses("text-xs text-slate-600", "text-xs text-white/60")}>Columns</div>
                    <div className={getThemeClasses("text-lg font-bold text-slate-900", "text-lg font-bold text-white")}>{analysisResults.totalColumns}</div>
                  </div>
                </div>
              )}
            </section>

            {/* Natural Language Query */}
            <section className={getThemeClasses(
              "rounded-2xl border border-white/20 bg-white/80 backdrop-blur-sm p-6 shadow-xl hover:shadow-2xl transition-all duration-300",
              "rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-6 shadow-xl hover:shadow-2xl transition-all duration-300"
            )}>
              <h2 className={getThemeClasses(
                "font-bold text-lg mb-4 flex items-center space-x-2 text-slate-900",
                "font-bold text-lg mb-4 flex items-center space-x-2 text-white"
              )}>
                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                <span>2) Ask a question</span>
              </h2>
              
              <div className={getThemeClasses(
                "rounded-xl bg-slate-100 border border-slate-200 p-4",
                "rounded-xl bg-white/5 border border-white/10 p-4"
              )}>
                <input
                  type="text"
                  value={naturalQuery}
                  onChange={(e) => setNaturalQuery(e.target.value)}
                  placeholder='Try: "Show me sales trends" or "Top performing products"'
                  className={getThemeClasses(
                    "w-full bg-transparent outline-none text-slate-900 placeholder-slate-500 text-sm",
                    "w-full bg-transparent outline-none text-white placeholder-white/50 text-sm"
                  )}
                  onKeyPress={(e) => e.key === 'Enter' && handleNaturalQuery()}
                />
                
                <div className="flex items-center gap-2 mt-3">
                  <button
                    onClick={handleNaturalQuery}
                    disabled={!naturalQuery.trim() || !fileData || isProcessing}
                    className="px-4 py-2 rounded-lg bg-emerald-400/90 hover:bg-emerald-400 text-black font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    Ask AI
                  </button>
                  <button
                    onClick={() => setNaturalQuery(suggestedQueries[Math.floor(Math.random() * suggestedQueries.length)])}
                    className={getThemeClasses(
                      "px-4 py-2 rounded-lg bg-slate-200 hover:bg-slate-300 text-sm border border-slate-300 transition-all duration-200 text-slate-800",
                      "px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-sm border border-white/10 transition-all duration-200 text-white"
                    )}
                  >
                    Suggest
                  </button>
                </div>

                <div className="mt-3">
                  <p className={getThemeClasses("text-xs text-slate-600", "text-xs text-white/60")}>
                    Examples: "Total revenue", "Average price by category", "Top 5 products", "Correlation analysis"
                  </p>
                </div>
              </div>

              {queryResult && (
                <div className={getThemeClasses(
                  "mt-4 rounded-xl bg-slate-100 border border-slate-200 p-4",
                  "mt-4 rounded-xl bg-white/5 border border-white/10 p-4"
                )}>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className={getThemeClasses("font-semibold text-slate-900 text-sm", "font-semibold text-white text-sm")}>AI Response</h4>
                    <button
                      onClick={() => navigator.clipboard.writeText(queryResult)}
                      className={getThemeClasses(
                        "p-1 hover:bg-slate-200 rounded text-slate-600 hover:text-slate-900",
                        "p-1 hover:bg-white/10 rounded text-white/60 hover:text-white"
                      )}
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                  <div className={getThemeClasses(
                    "text-sm text-slate-800 whitespace-pre-wrap",
                    "text-sm text-white/80 whitespace-pre-wrap"
                  )}>{queryResult}</div>
                </div>
              )}
            </section>

            {/* Quick Actions */}
            <section className={getThemeClasses(
              "rounded-2xl border border-white/20 bg-white/80 backdrop-blur-sm p-6 shadow-xl hover:shadow-2xl transition-all duration-300",
              "rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-6 shadow-xl hover:shadow-2xl transition-all duration-300"
            )}>
              <h2 className={getThemeClasses(
                "font-bold text-lg mb-4 flex items-center space-x-2 text-slate-900",
                "font-bold text-lg mb-4 flex items-center space-x-2 text-white"
              )}>
                <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                <span>3) Quick actions</span>
              </h2>
              
              <div className="space-y-3">
                <button
                  onClick={generateInsights}
                  disabled={!fileData || isProcessing}
                  className="w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-white font-semibold text-sm flex items-center justify-center space-x-2 transition-all duration-300"
                >
                  <Brain className="w-4 h-4" />
                  <span>Generate AI Insights</span>
                </button>
                
                <button
                  onClick={exportResults}
                  disabled={!analysisResults}
                  className="w-full px-4 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-white font-semibold text-sm flex items-center justify-center space-x-2 transition-all duration-300"
                >
                  <Download className="w-4 h-4" />
                  <span>Export Results</span>
                </button>
              </div>
            </section>

            {/* Status Message */}
            {statusMessage && (
              <div className={getThemeClasses(
                "rounded-xl bg-blue-50 border border-blue-200 p-4 backdrop-blur-sm",
                "rounded-xl bg-blue-500/10 border border-blue-500/20 p-4 backdrop-blur-sm"
              )}>
                <p className={getThemeClasses(
                  "text-blue-800 text-sm flex items-center space-x-2",
                  "text-blue-300 text-sm flex items-center space-x-2"
                )}>
                  <CheckCircle className="w-4 h-4" />
                  <span>{statusMessage}</span>
                </p>
              </div>
            )}
          </aside>

          {/* Main Content */}
          <main className="lg:col-span-8 space-y-6">
            
            {/* Tabs */}
            <div className="flex items-center gap-2 flex-wrap">
              {tabs.map((tab) => {
                const IconComponent = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={getThemeClasses(
                      `flex items-center space-x-2 px-4 py-3 rounded-xl transition-all duration-200 border border-slate-200 ${
                        activeTab === tab.id
                          ? 'bg-slate-200 text-slate-900 shadow-lg'
                          : 'bg-white/80 text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                      }`,
                      `flex items-center space-x-2 px-4 py-3 rounded-xl transition-all duration-200 border border-white/10 ${
                        activeTab === tab.id
                          ? 'bg-white/15 text-white shadow-lg'
                          : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
                      }`
                    )}
                  >
                    <IconComponent className="w-4 h-4" />
                    <span className="font-medium text-sm">{tab.name}</span>
                  </button>
                );
              })}
            </div>

            {/* Tab Content */}
            {activeTab === 'overview' && (
              <div className={getThemeClasses(
                "rounded-2xl border border-white/20 bg-white/80 backdrop-blur-sm p-6 shadow-xl",
                "rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-6 shadow-xl"
              )}>
                <h3 className={getThemeClasses(
                  "font-semibold text-xl mb-6 text-slate-900",
                  "font-semibold text-xl mb-6 text-white"
                )}>Dataset Overview</h3>
                
                {fileData && fileData.length > 0 ? (
                  <div className="space-y-6">
                    {/* Summary Cards */}
                    {analysisResults && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className={getThemeClasses(
                          "rounded-xl bg-blue-50 border border-blue-200 p-4",
                          "rounded-xl bg-blue-500/10 border border-blue-500/20 p-4"
                        )}>
                          <div className="flex items-center space-x-3">
                            <Database className="w-8 h-8 text-blue-400" />
                            <div>
                              <p className={getThemeClasses("text-2xl font-bold text-blue-800", "text-2xl font-bold text-blue-300")}>{analysisResults.totalRows}</p>
                              <p className={getThemeClasses("text-xs text-blue-600", "text-xs text-blue-400")}>Total Rows</p>
                            </div>
                          </div>
                        </div>
                        
                        <div className={getThemeClasses(
                          "rounded-xl bg-emerald-50 border border-emerald-200 p-4",
                          "rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4"
                        )}>
                          <div className="flex items-center space-x-3">
                            <Layers className="w-8 h-8 text-emerald-400" />
                            <div>
                              <p className={getThemeClasses("text-2xl font-bold text-emerald-800", "text-2xl font-bold text-emerald-300")}>{analysisResults.totalColumns}</p>
                              <p className={getThemeClasses("text-xs text-emerald-600", "text-xs text-emerald-400")}>Columns</p>
                            </div>
                          </div>
                        </div>

                        <div className={getThemeClasses(
                          "rounded-xl bg-purple-50 border border-purple-200 p-4",
                          "rounded-xl bg-purple-500/10 border border-purple-500/20 p-4"
                        )}>
                          <div className="flex items-center space-x-3">
                            <Target className="w-8 h-8 text-purple-400" />
                            <div>
                              <p className={getThemeClasses("text-2xl font-bold text-purple-800", "text-2xl font-bold text-purple-300")}>{insights.length}</p>
                              <p className={getThemeClasses("text-xs text-purple-600", "text-xs text-purple-400")}>AI Insights</p>
                            </div>
                          </div>
                        </div>

                        <div className={getThemeClasses(
                          "rounded-xl bg-orange-50 border border-orange-200 p-4",
                          "rounded-xl bg-orange-500/10 border border-orange-500/20 p-4"
                        )}>
                          <div className="flex items-center space-x-3">
                            <Activity className="w-8 h-8 text-orange-400" />
                            <div>
                              <p className={getThemeClasses("text-2xl font-bold text-orange-800", "text-2xl font-bold text-orange-300")}>Ready</p>
                              <p className={getThemeClasses("text-xs text-orange-600", "text-xs text-orange-400")}>Status</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Data Preview */}
                    <div className={getThemeClasses(
                      "overflow-x-auto rounded-xl border border-slate-200",
                      "overflow-x-auto rounded-xl border border-white/10"
                    )}>
                      <table className="w-full text-sm">
                        <thead className={getThemeClasses("bg-slate-100", "bg-white/10")}>
                          <tr>
                            {Object.keys(fileData[0] || {}).map((header) => (
                              <th key={header} className={getThemeClasses(
                                "text-left px-4 py-3 text-slate-700 font-semibold text-xs uppercase tracking-wider",
                                "text-left px-4 py-3 text-white/80 font-semibold text-xs uppercase tracking-wider"
                              )}>
                                {header}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className={getThemeClasses("divide-y divide-slate-200", "divide-y divide-white/10")}>
                          {fileData.slice(0, 8).map((row, index) => (
                            <tr key={index} className={getThemeClasses(
                              index % 2 === 0 ? 'bg-slate-50' : 'bg-transparent',
                              index % 2 === 0 ? 'bg-white/5' : 'bg-transparent'
                            )}>
                              {Object.values(row).map((value, cellIndex) => (
                                <td key={cellIndex} className={getThemeClasses(
                                  "px-4 py-3 text-slate-900 whitespace-nowrap",
                                  "px-4 py-3 text-white/90 whitespace-nowrap"
                                )}>
                                  {String(value).substring(0, 50)}
                                  {String(value).length > 50 ? '...' : ''}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <FileSpreadsheet className={getThemeClasses("w-16 h-16 text-slate-400 mx-auto mb-4", "w-16 h-16 text-white/40 mx-auto mb-4")} />
                    <p className={getThemeClasses("text-slate-700 text-lg", "text-white/70 text-lg")}>No data yet. Upload a file or use the sample dataset to get started.</p>
                  </div>
                )}
              </div>
            )}

              {activeTab === 'insights' && (
              <div className={getThemeClasses(
                "rounded-2xl border border-white/20 bg-white/80 backdrop-blur-sm p-6 shadow-xl",
                "rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-6 shadow-xl"
              )}>
                <h3 className={getThemeClasses(
                  "font-semibold text-xl mb-6 text-slate-900 flex items-center space-x-2",
                  "font-semibold text-xl mb-6 text-white flex items-center space-x-2"
                )}>
                  <Brain className="w-6 h-6 text-purple-400" />
                  <span>AI-Generated Insights</span>
                </h3>
                
                {insights.length === 0 && (
                  <div className="text-center py-12">
                    <Brain className={getThemeClasses("w-16 h-16 text-slate-400 mx-auto mb-6", "w-16 h-16 text-white/40 mx-auto mb-6")} />
                    <p className={getThemeClasses("text-slate-700 mb-6 text-lg", "text-white/70 mb-6 text-lg")}>
                      {fileData ? 'Generate insights to see AI analysis of your data' : 'Upload data to generate AI insights'}
                    </p>
                    {fileData && (
                      <button
                        onClick={() => generateInsights(false)}
                        disabled={isProcessing}
                        className="px-8 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-white font-semibold text-lg flex items-center justify-center space-x-3 mx-auto transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
                      >
                        {isProcessing ? (
                          <>
                            <RefreshCw className="w-5 h-5 animate-spin" />
                            <span>Generating Insights...</span>
                          </>
                        ) : (
                          <>
                            <Brain className="w-5 h-5" />
                            <span>Generate AI Insights</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                )}
                
                {insights.length > 0 && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-500">
                        {insights.length} insights generated
                      </div>
                      <button
                        onClick={() => generateInsights(false)}
                        disabled={isProcessing}
                        className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white font-medium text-sm flex items-center space-x-2 transition-all duration-300"
                      >
                        {isProcessing ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>Regenerating...</span>
                          </>
                        ) : (
                          <>
                            <RefreshCw className="w-4 h-4" />
                            <span>Regenerate</span>
                          </>
                        )}
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {insights.map((insight, index) => (
                        <div key={index} className={getThemeClasses(
                          "rounded-xl border border-slate-200 bg-slate-50 p-4 hover:bg-slate-100 transition-all duration-200",
                          "rounded-xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 transition-all duration-200"
                        )}>
                          <div className="flex items-start space-x-3">
                            <div className="w-2 h-2 bg-emerald-400 rounded-full mt-2 flex-shrink-0"></div>
                            <p className={getThemeClasses("text-slate-900 text-sm leading-relaxed", "text-white/90 text-sm leading-relaxed")}>{insight}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            {activeTab === 'query' && (
              <div className={getThemeClasses(
                "rounded-2xl border border-white/20 bg-white/80 backdrop-blur-sm p-6 shadow-xl",
                "rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-6 shadow-xl"
              )}>
                <h3 className={getThemeClasses(
                  "font-semibold text-xl mb-6 text-slate-900 flex items-center space-x-2",
                  "font-semibold text-xl mb-6 text-white flex items-center space-x-2"
                )}>
                  <Search className="w-6 h-6 text-blue-400" />
                  <span>Natural Language Analytics</span>
                </h3>
                
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className={getThemeClasses(
                        "block text-sm font-medium text-slate-700 mb-2",
                        "block text-sm font-medium text-white/70 mb-2"
                      )}>Try these examples:</label>
                      <div className="space-y-2">
                        {suggestedQueries.map((query, index) => (
                          <button
                            key={index}
                            onClick={() => setNaturalQuery(query)}
                            className={getThemeClasses(
                              "block w-full text-left px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm border border-slate-200 transition-all duration-200",
                              "block w-full text-left px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/80 text-sm border border-white/10 transition-all duration-200"
                            )}
                          >
                            {query}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <label className={getThemeClasses(
                      "block text-sm font-medium text-slate-700 mb-2",
                      "block text-sm font-medium text-white/70 mb-2"
                    )}>Your Question:</label>
                    <div className="flex space-x-3">
                      <input
                        type="text"
                        value={naturalQuery}
                        onChange={(e) => setNaturalQuery(e.target.value)}
                        placeholder="Ask anything about your data..."
                        className={getThemeClasses(
                          "flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50",
                          "flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                        )}
                        onKeyPress={(e) => e.key === 'Enter' && handleNaturalQuery()}
                      />
                      <button
                        onClick={handleNaturalQuery}
                        disabled={!naturalQuery.trim() || !fileData || isProcessing}
                        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-white font-semibold transition-all duration-200 flex items-center space-x-2"
                      >
                        <Search className="w-4 h-4" />
                        <span>Analyze</span>
                      </button>
                    </div>
                  </div>
                </div>

                {queryResult && (
                  <div className={getThemeClasses(
                    "rounded-xl bg-blue-50 border border-blue-200 p-6",
                    "rounded-xl bg-blue-500/10 border border-blue-500/20 p-6"
                  )}>
                    <div className="flex items-center justify-between mb-4">
                      <h4 className={getThemeClasses(
                        "font-semibold text-blue-800 flex items-center space-x-2",
                        "font-semibold text-blue-300 flex items-center space-x-2"
                      )}>
                        <Brain className="w-5 h-5" />
                        <span>AI Analysis Result</span>
                      </h4>
                      <button
                        onClick={() => navigator.clipboard.writeText(queryResult)}
                        className={getThemeClasses(
                          "p-2 hover:bg-blue-100 rounded-lg text-blue-600 hover:text-blue-800 transition-colors",
                          "p-2 hover:bg-blue-500/20 rounded-lg text-blue-300 hover:text-blue-200 transition-colors"
                        )}
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="prose prose-slate max-w-none">
                      <p className={getThemeClasses(
                        "text-blue-900 whitespace-pre-wrap leading-relaxed",
                        "text-blue-100 whitespace-pre-wrap leading-relaxed"
                      )}>{queryResult}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'charts' && (
            <div className={getThemeClasses(
              "rounded-2xl border border-white/20 bg-white/80 backdrop-blur-sm p-6 shadow-xl",
              "rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-6 shadow-xl"
            )}>
              <h3 className={getThemeClasses(
                "font-semibold text-xl mb-6 text-slate-900 flex items-center space-x-2",
                "font-semibold text-xl mb-6 text-white flex items-center space-x-2"
              )}>
                <BarChart3 className="w-6 h-6 text-emerald-400" />
                <span>Data Visualizations</span>
              </h3>
              
              {fileData && fileData.length > 0 ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className={getThemeClasses(
                        "block text-sm font-medium text-slate-700 mb-2",
                        "block text-sm font-medium text-white/70 mb-2"
                      )}>Chart Type</label>
                      <select
                        value={chartType}
                        onChange={(e) => setChartType(e.target.value)}
                        className={getThemeClasses(
                          "w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 dropdown-light",
                          "w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 dropdown-dark"
                        )}
                        style={{
                          backgroundColor: isDarkMode ? '#374151' : '#ffffff',
                          color: isDarkMode ? '#ffffff' : '#1e293b'
                        }}
                      >
                        <option value="bar" style={{backgroundColor: isDarkMode ? '#374151' : '#ffffff', color: isDarkMode ? '#ffffff' : '#1e293b'}}>Bar Chart</option>
                        <option value="line" style={{backgroundColor: isDarkMode ? '#374151' : '#ffffff', color: isDarkMode ? '#ffffff' : '#1e293b'}}>Line Chart</option>
                        <option value="scatter" style={{backgroundColor: isDarkMode ? '#374151' : '#ffffff', color: isDarkMode ? '#ffffff' : '#1e293b'}}>Scatter Plot</option>
                        <option value="pie" style={{backgroundColor: isDarkMode ? '#374151' : '#ffffff', color: isDarkMode ? '#ffffff' : '#1e293b'}}>Pie Chart</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className={getThemeClasses(
                        "block text-sm font-medium text-slate-700 mb-2",
                        "block text-sm font-medium text-white/70 mb-2"
                      )}>X Axis</label>
                      <select
                        value={xAxisColumn}
                        onChange={(e) => setXAxisColumn(e.target.value)}
                        className={getThemeClasses(
                          "w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 dropdown-light",
                          "w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 dropdown-dark"
                        )}
                        style={{
                          backgroundColor: isDarkMode ? '#374151' : '#ffffff',
                          color: isDarkMode ? '#ffffff' : '#1e293b'
                        }}
                      >
                        <option value="" style={{backgroundColor: isDarkMode ? '#374151' : '#ffffff', color: isDarkMode ? '#ffffff' : '#1e293b'}}>Select Column</option>
                        {fileData.length > 0 && Object.keys(fileData[0]).map((column) => (
                          <option 
                            key={column} 
                            value={column}
                            style={{backgroundColor: isDarkMode ? '#374151' : '#ffffff', color: isDarkMode ? '#ffffff' : '#1e293b'}}
                          >
                            {column}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className={getThemeClasses(
                        "block text-sm font-medium text-slate-700 mb-2",
                        "block text-sm font-medium text-white/70 mb-2"
                      )}>Y Axis</label>
                      <select
                        value={yAxisColumn}
                        onChange={(e) => setYAxisColumn(e.target.value)}
                        className={getThemeClasses(
                          "w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 dropdown-light",
                          "w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 dropdown-dark"
                        )}
                        style={{
                          backgroundColor: isDarkMode ? '#374151' : '#ffffff',
                          color: isDarkMode ? '#ffffff' : '#1e293b'
                        }}
                      >
                        <option value="" style={{backgroundColor: isDarkMode ? '#374151' : '#ffffff', color: isDarkMode ? '#ffffff' : '#1e293b'}}>Select Column</option>
                        {fileData.length > 0 && Object.keys(fileData[0]).map((column) => (
                          <option 
                            key={column} 
                            value={column}
                            style={{backgroundColor: isDarkMode ? '#374151' : '#ffffff', color: isDarkMode ? '#ffffff' : '#1e293b'}}
                          >
                            {column}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Debug info */}
                  {xAxisColumn && yAxisColumn && (
                    <div className="text-sm text-gray-500 mb-4">
                      Chart: {chartType} | X: {xAxisColumn} | Y: {yAxisColumn} | Data points: {fileData.length}
                    </div>
                  )}

                  {/* Chart Rendering Area */}
                  <div className={getThemeClasses(
                    "rounded-xl bg-slate-50 border border-slate-200 p-6 min-h-[400px]",
                    "rounded-xl bg-white/5 border border-white/10 p-6 min-h-[400px]"
                  )}>
                    {xAxisColumn && yAxisColumn ? (
                      <div style={{ width: '100%', height: '400px' }}>
                        <ChartErrorBoundary>
                          <ChartRenderer 
                            data={fileData}
                            chartType={chartType}
                            xAxis={xAxisColumn}
                            yAxis={yAxisColumn}
                            isDarkMode={isDarkMode}
                          />
                        </ChartErrorBoundary>
                      </div>
                    ) : (
                      <div className={getThemeClasses("text-center text-slate-600 flex flex-col items-center justify-center h-full", "text-center text-white/60 flex flex-col items-center justify-center h-full")}>
                        <BarChart3 className="w-16 h-16 mx-auto mb-4 opacity-50" />
                        <p className="text-lg font-medium">Select X and Y axis columns to generate chart</p>
                        <p className="text-sm mt-2">Choose the data columns you want to visualize</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <BarChart3 className={getThemeClasses("w-16 h-16 text-slate-400 mx-auto mb-4", "w-16 h-16 text-white/40 mx-auto mb-4")} />
                  <p className={getThemeClasses("text-slate-700 text-lg", "text-white/70 text-lg")}>Upload data to create visualizations</p>
                </div>
              )}
            </div>
          )}

            {activeTab === 'report' && (
              <div className={getThemeClasses(
                "rounded-2xl border border-white/20 bg-white/80 backdrop-blur-sm p-6 shadow-xl",
                "rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-6 shadow-xl"
              )}>
                <h3 className={getThemeClasses(
                  "font-semibold text-xl mb-6 text-slate-900 flex items-center space-x-2",
                  "font-semibold text-xl mb-6 text-white flex items-center space-x-2"
                )}>
                  <FileSpreadsheet className="w-6 h-6 text-orange-400" />
                  <span>Analysis Report</span>
                </h3>
                
                {analysisResults ? (
                  <div className="space-y-6">
                    {/* Executive Summary */}
                    <div className={getThemeClasses(
                      "rounded-xl border border-slate-200 bg-slate-50 p-6",
                      "rounded-xl border border-white/10 bg-white/5 p-6"
                    )}>
                      <h4 className={getThemeClasses("font-semibold text-slate-900 mb-4", "font-semibold text-white mb-4")}>Executive Summary</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className={getThemeClasses(
                          "rounded-lg bg-blue-50 border border-blue-200 p-3",
                          "rounded-lg bg-blue-500/10 border border-blue-500/20 p-3"
                        )}>
                          <div className={getThemeClasses("text-xs text-blue-600", "text-xs text-blue-400")}>Total Records</div>
                          <div className={getThemeClasses("text-lg font-bold text-blue-800", "text-lg font-bold text-blue-300")}>{analysisResults.totalRows}</div>
                        </div>
                        <div className={getThemeClasses(
                          "rounded-lg bg-emerald-50 border border-emerald-200 p-3",
                          "rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3"
                        )}>
                          <div className={getThemeClasses("text-xs text-emerald-600", "text-xs text-emerald-400")}>Data Fields</div>
                          <div className={getThemeClasses("text-lg font-bold text-emerald-800", "text-lg font-bold text-emerald-300")}>{analysisResults.totalColumns}</div>
                        </div>
                        <div className={getThemeClasses(
                          "rounded-lg bg-purple-50 border border-purple-200 p-3",
                          "rounded-lg bg-purple-500/10 border border-purple-500/20 p-3"
                        )}>
                          <div className={getThemeClasses("text-xs text-purple-600", "text-xs text-purple-400")}>AI Insights</div>
                          <div className={getThemeClasses("text-lg font-bold text-purple-800", "text-lg font-bold text-purple-300")}>{insights.length}</div>
                        </div>
                        <div className={getThemeClasses(
                          "rounded-lg bg-orange-50 border border-orange-200 p-3",
                          "rounded-lg bg-orange-500/10 border border-orange-500/20 p-3"
                        )}>
                          <div className={getThemeClasses("text-xs text-orange-600", "text-xs text-orange-400")}>Analysis Date</div>
                          <div className={getThemeClasses("text-lg font-bold text-orange-800", "text-lg font-bold text-orange-300")}>{new Date().toLocaleDateString()}</div>
                        </div>
                      </div>
                    </div>

                    {/* Key Insights */}
                    <div className={getThemeClasses(
                      "rounded-xl border border-slate-200 bg-slate-50 p-6",
                      "rounded-xl border border-white/10 bg-white/5 p-6"
                    )}>
                      <h4 className={getThemeClasses("font-semibold text-slate-900 mb-4", "font-semibold text-white mb-4")}>Key Insights</h4>
                      {insights.length > 0 ? (
                        <ul className="space-y-3">
                          {insights.slice(0, 6).map((insight, index) => (
                            <li key={index} className="flex items-start space-x-3">
                              <div className="w-2 h-2 bg-emerald-400 rounded-full mt-2 flex-shrink-0"></div>
                              <span className={getThemeClasses("text-slate-900 text-sm", "text-white/90 text-sm")}>{insight}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className={getThemeClasses("text-slate-600", "text-white/60")}>No insights generated yet. Use the AI Insights tab to generate analysis.</p>
                      )}
                    </div>

                    {/* Data Sample */}
                    <div className={getThemeClasses(
                      "rounded-xl border border-slate-200 bg-slate-50 p-6",
                      "rounded-xl border border-white/10 bg-white/5 p-6"
                    )}>
                      <h4 className={getThemeClasses("font-semibold text-slate-900 mb-4", "font-semibold text-white mb-4")}>Data Sample</h4>
                      {fileData && (
                        <div className="overflow-x-auto rounded-lg">
                          <table className="w-full text-sm">
                            <thead className={getThemeClasses("bg-slate-100", "bg-white/10")}>
                              <tr>
                                {Object.keys(fileData[0] || {}).map((header) => (
                                  <th key={header} className={getThemeClasses(
                                    "text-left px-3 py-2 text-slate-700 font-medium text-xs",
                                    "text-left px-3 py-2 text-white/80 font-medium text-xs"
                                  )}>
                                    {header}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {fileData.slice(0, 5).map((row, index) => (
                                <tr key={index} className={getThemeClasses(
                                  index % 2 === 0 ? 'bg-slate-50' : '',
                                  index % 2 === 0 ? 'bg-white/5' : ''
                                )}>
                                  {Object.values(row).map((value, cellIndex) => (
                                    <td key={cellIndex} className={getThemeClasses(
                                      "px-3 py-2 text-slate-900 text-xs",
                                      "px-3 py-2 text-white/90 text-xs"
                                    )}>
                                      {String(value)}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                    <div className="flex justify-end">
                      <button
                        onClick={exportResults}
                        className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 rounded-xl text-white font-semibold transition-all duration-200 flex items-center space-x-2"
                      >
                        <Download className="w-4 h-4" />
                        <span>Export Full Report</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <FileSpreadsheet className={getThemeClasses("w-16 h-16 text-slate-400 mx-auto mb-4", "w-16 h-16 text-white/40 mx-auto mb-4")} />
                    <p className={getThemeClasses("text-slate-700", "text-white/70")}>Upload and analyze data to generate a report</p>
                  </div>
                )}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

// Replace your ChartRenderer component with this improved version:

// Replace your ChartRenderer component with this improved version:

// Replace your ChartRenderer component with this improved version:

const ChartRenderer = ({ data, chartType, xAxis, yAxis, isDarkMode }) => {
  console.log('ChartRenderer called with:', { chartType, xAxis, yAxis, dataLength: data?.length });
  
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <BarChart3 className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium mb-2">No Data Available</p>
          <p className="text-sm opacity-70">Please upload data first</p>
        </div>
      </div>
    );
  }

  // Process data for charting with better validation
  const processedData = data.slice(0, 50).map((item, index) => {
    const xValue = item[xAxis];
    let yValue = item[yAxis];
    
    // Convert Y value to number if it's not already
    if (typeof yValue === 'string') {
      const parsed = parseFloat(yValue);
      yValue = isNaN(parsed) ? 0 : parsed;
    } else if (typeof yValue !== 'number') {
      yValue = 0;
    }
    
    return {
      id: index,
      [xAxis]: xValue,
      [yAxis]: yValue,
      name: String(xValue).substring(0, 15)
    };
  });

  console.log('Processed data sample:', processedData.slice(0, 3));

  // Better color palette with more contrast
  const colors = [
    '#3B82F6', // Blue
    '#10B981', // Emerald
    '#F59E0B', // Amber
    '#EF4444', // Red
    '#8B5CF6', // Violet
    '#06B6D4', // Cyan
    '#84CC16', // Lime
    '#F97316', // Orange
    '#EC4899', // Pink
    '#6366F1'  // Indigo
  ];

  // Enhanced tooltip styling for better visibility
  const getTooltipStyle = (chartType) => {
    const baseStyle = {
      backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF',
      border: isDarkMode ? '2px solid #374151' : '2px solid #E5E7EB',
      borderRadius: '12px',
      color: isDarkMode ? '#FFFFFF' : '#1F2937',
      padding: '12px',
      fontSize: '14px',
      fontWeight: '500',
      boxShadow: isDarkMode 
        ? '0 10px 25px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1)' 
        : '0 10px 25px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05)',
      backdropFilter: 'blur(8px)',
      zIndex: 1000
    };

    // Special styling for pie and scatter charts
    if (chartType === 'pie' || chartType === 'scatter') {
      return {
        ...baseStyle,
        backgroundColor: isDarkMode ? '#111827' : '#FFFFFF',
        border: isDarkMode ? '3px solid #4B5563' : '3px solid #D1D5DB',
        boxShadow: isDarkMode 
          ? '0 20px 40px rgba(0, 0, 0, 0.8), 0 0 0 2px rgba(255, 255, 255, 0.2)' 
          : '0 20px 40px rgba(105, 51, 51, 0.25), 0 0 0 2px rgba(0, 0, 0, 0.1)',
        fontSize: '15px',
        fontWeight: '600'
      };
    }

    return baseStyle;
  };

  const axisProps = {
    tick: { fill: isDarkMode ? '#E5E7EB' : '#374151', fontSize: 12, fontWeight: '500' },
    tickLine: { stroke: isDarkMode ? '#4B5563' : '#D1D5DB' },
    axisLine: { stroke: isDarkMode ? '#4B5563' : '#D1D5DB' }
  };

  const chartKey = `${chartType}-${xAxis}-${yAxis}-${data.length}`;

  try {
    if (chartType === 'bar') {
      return (
        <div key={chartKey} style={{ width: '100%', height: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={processedData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#374151' : '#E5E7EB'} />
              <XAxis 
                dataKey={xAxis} 
                {...axisProps}
                interval={0}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis {...axisProps} />
              <Tooltip 
                contentStyle={getTooltipStyle('bar')}
                cursor={{ fill: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)' }}
              />
              <Legend />
              <Bar dataKey={yAxis} fill={colors[0]} name={yAxis} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      );
    }
    
    if (chartType === 'line') {
      return (
        <div key={chartKey} style={{ width: '100%', height: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <RechartsLineChart data={processedData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#374151' : '#E5E7EB'} />
              <XAxis 
                dataKey={xAxis} 
                {...axisProps}
                interval={0}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis {...axisProps} />
              <Tooltip 
                contentStyle={getTooltipStyle('line')}
                cursor={{ stroke: isDarkMode ? '#E5E7EB' : '#374151', strokeWidth: 2 }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey={yAxis} 
                stroke={colors[0]} 
                strokeWidth={3} 
                name={yAxis}
                dot={{ fill: colors[0], strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: colors[0], strokeWidth: 2 }}
              />
            </RechartsLineChart>
          </ResponsiveContainer>
        </div>
      );
    }
    
    if (chartType === 'scatter') {
      return (
        <div key={chartKey} style={{ width: '100%', height: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart data={processedData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#374151' : '#E5E7EB'} />
              <XAxis dataKey={xAxis} {...axisProps} />
              <YAxis dataKey={yAxis} {...axisProps} />
              <Tooltip 
                contentStyle={getTooltipStyle('scatter')}
                cursor={{ strokeDasharray: '3 3' }}
              />
              <Scatter 
                dataKey={yAxis} 
                fill={colors[0]} 
                name={yAxis}
                shape="circle"
              />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      );
    }
    
    if (chartType === 'pie') {
      return (
        <div key={chartKey} style={{ width: '100%', height: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <RechartsPieChart>
              <Pie
                data={processedData.slice(0, 10)}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => 
                  `${String(name).substring(0, 10)} ${(percent * 100).toFixed(0)}%`
                }
                outerRadius={120}
                fill="#8884d8"
                dataKey={yAxis}
                nameKey="name"
                stroke={isDarkMode ? '#374151' : '#FFFFFF'}
                strokeWidth={2}
              >
                {processedData.slice(0, 10).map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={colors[index % colors.length]}
                  />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={getTooltipStyle('pie')}
              />
              <Legend 
                wrapperStyle={{
                  paddingTop: '20px',
                  fontSize: '14px',
                  color: isDarkMode ? '#E5E7EB' : '#374151'
                }}
              />
            </RechartsPieChart>
          </ResponsiveContainer>
        </div>
      );
    }

    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <BarChart3 className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium mb-2">Unsupported Chart Type</p>
          <p className="text-sm opacity-70">Please select a valid chart type</p>
        </div>
      </div>
    );

  } catch (error) {
    console.error('Chart rendering error:', error);
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <BarChart3 className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium mb-2">Chart Error</p>
          <p className="text-sm opacity-70">Unable to render chart: {error.message}</p>
          <p className="text-xs mt-2 opacity-50">Try selecting different columns or refresh the page</p>
        </div>
      </div>
    );
  }
};

// Also add this Error Boundary component to wrap around the ChartRenderer:
class ChartErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Chart Error Boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <BarChart3 className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">Chart Error</p>
            <p className="text-sm opacity-70">Something went wrong with the chart</p>
            <button 
              onClick={() => this.setState({ hasError: false, error: null })}
              className="mt-2 px-3 py-1 bg-blue-500 text-white rounded text-xs"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default DataAnalystDashboard;