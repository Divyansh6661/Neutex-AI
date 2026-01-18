import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { makeAPICall } from '../config/api';
import { Code, ChevronLeft, Settings, User, Terminal, Play, Copy, FileCode, Zap, Cpu, Download, Moon, Sun } from 'lucide-react';

export default function CodeGenerator({ onNavigate }) {
  const { isDarkMode, toggleTheme } = useTheme();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [prompt, setPrompt] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('javascript');
  const [codeType, setCodeType] = useState('function');
  const [customLanguage, setCustomLanguage] = useState('');
  const [customCodeType, setCustomCodeType] = useState('');
  const [complexityLevel, setComplexityLevel] = useState('standard');
  const [showCustomLanguage, setShowCustomLanguage] = useState(false);
  const [showCustomCodeType, setShowCustomCodeType] = useState(false);
  const [selectedModel, setSelectedModel] = useState('google/gemini-2.0-flash-exp:free');

  // Theme-based styling function
  const getThemeClasses = (lightClasses, darkClasses) => {
    return isDarkMode ? darkClasses : lightClasses;
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleGenerate = async () => {
    if (prompt.trim()) {
      setIsGenerating(true);
      try {
        const finalLanguage = selectedLanguage === 'custom' ? customLanguage : selectedLanguage;
        const finalCodeType = codeType === 'custom' ? customCodeType : codeType;
        
        const response = await makeAPICall('/api/generate-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt.trim(),
          language: finalLanguage,
          codeType: finalCodeType,
          complexity: complexityLevel,
          model: selectedModel
        })
      });
        
        const data = await response.json();
        
        if (response.ok) {
          setGeneratedCode(data.code);
          console.log('Generated with:', data.provider, 'using model:', data.model);
          if (data.fallback) {
          console.log('Used fallback provider due to primary failure');
          }
        } else {
          setGeneratedCode('// Error: ' + data.error);
        }
      } catch (error) {
        console.error('Network error:', error);
        setGeneratedCode('// Network error. Check if backend server is running.');
      }
      setIsGenerating(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedCode);
  };

  const languages = [
    { id: 'javascript', name: 'JavaScript', color: 'bg-yellow-500' },
    { id: 'python', name: 'Python', color: 'bg-blue-500' },
    { id: 'react', name: 'React', color: 'bg-cyan-500' },
    { id: 'java', name: 'Java', color: 'bg-red-500' },
    { id: 'cpp', name: 'C++', color: 'bg-purple-500' },
    { id: 'html', name: 'HTML/CSS', color: 'bg-green-500' },
    { id: 'custom', name: 'Custom', color: 'bg-gray-500' }
  ];

  const codeTypes = [
    { id: 'function', name: 'Function' },
    { id: 'class', name: 'Class' },
    { id: 'component', name: 'Component' },
    { id: 'algorithm', name: 'Algorithm' },
    { id: 'api', name: 'API' },
    { id: 'utility', name: 'Utility' },
    { id: 'custom', name: 'Custom' }
  ];

  const models = [
    { 
      id: 'google/gemini-2.0-flash-exp:free', 
      name: 'Gemini 2.0 Flash', 
      description: 'Fast, cost-effective',
      cost: 'Free'
    },
    { 
      id: 'moonshotai/kimi-k2:free',
      name: 'MoonshotAI: Kimi K2', 
      description: '1T params MoE, excellent for coding & reasoning',
      cost: 'Free'
    },
    { 
      id: 'qwen/qwen3-coder:free',
      name: 'Qwen3 Coder 480B', 
      description: 'Specialized coding model, large context',
      cost: 'Free'
    },
    { 
      id: 'deepseek/deepseek-chat-v3.1:free', 
      name: 'DeepSeek Chat V3.1', 
      description: 'Specialized for coding, reliable',
      cost: 'Free'
    },
    { 
      id: 'openai/gpt-oss-120b:free',
      name: 'GPT-OSS-120b', 
      description: 'OpenAI open-source model',
      cost: 'Free'
    },
    { 
      id: 'z-ai/glm-4.5-air:free', 
      name: 'GLM 4.5 Air', 
      description: 'Fast, balanced performance',
      cost: 'Free'
    },
    { 
      id: 'x-ai/grok-code-fast-1',
      name: 'Grok Code Fast 1', 
      description: 'Specialized for coding, fast',
      cost: '$0.20/M tokens'
    }
  ];

  const complexityLevels = [
    { 
      id: 'simple', 
      name: 'Simple', 
      description: 'Minimal code, basic functionality only',
      color: 'bg-green-500'
    },
    { 
      id: 'standard', 
      name: 'Standard', 
      description: 'Good practices, moderate detail',
      color: 'bg-blue-500'
    },
    { 
      id: 'comprehensive', 
      name: 'Comprehensive', 
      description: 'Full documentation, tests, error handling',
      color: 'bg-purple-500'
    }
  ];

  return (
    <div className={getThemeClasses(
      "min-h-screen bg-gradient-to-br from-slate-50 via-green-50 to-emerald-50 text-slate-900",
      "min-h-screen bg-gradient-to-br from-gray-900 via-green-900 to-emerald-900 text-white"
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
                "p-2 text-gray-300 hover:text-green-400 hover:bg-gray-700/60 rounded-xl transition-all duration-200"
              )}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-green-600 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                <Code className="w-7 h-7 text-white animate-pulse" />
              </div>
              <div>
                <h1 className={getThemeClasses(
                  "text-2xl font-bold bg-gradient-to-r from-slate-900 to-green-600 bg-clip-text text-transparent",
                  "text-2xl font-bold text-white"
                )}>
                  Code Generator
                </h1>
                <p className={getThemeClasses("text-sm text-slate-600", "text-sm text-gray-400")}>Intelligent Code Creation</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Direct Theme Toggle Button */}
            <button 
              onClick={toggleTheme}
              className={getThemeClasses(
                "p-3 text-slate-600 hover:text-green-600 hover:bg-white/60 rounded-xl transition-all duration-200 hover:scale-105 backdrop-blur-sm",
                "p-3 text-gray-300 hover:text-green-400 hover:bg-gray-700/60 rounded-xl transition-all duration-200 hover:scale-105 backdrop-blur-sm"
              )}
              title={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
            >
              {isDarkMode ? (
                <Sun className="w-5 h-5" />
              ) : (
                <Moon className="w-5 h-5" />
              )}
            </button>

            <button className={getThemeClasses(
              "p-3 text-slate-600 hover:text-green-600 hover:bg-white/60 rounded-xl transition-all duration-200",
              "p-3 text-gray-300 hover:text-green-400 hover:bg-gray-700/60 rounded-xl transition-all duration-200"
            )}>
              <Settings className="w-5 h-5" />
            </button>
            <button className={getThemeClasses(
              "p-3 text-slate-600 hover:text-green-600 hover:bg-white/60 rounded-xl transition-all duration-200",
              "p-3 text-gray-300 hover:text-green-400 hover:bg-gray-700/60 rounded-xl transition-all duration-200"
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
          
          {/* Code Generation Area */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Prompt Input */}
            <div className={getThemeClasses(
              "bg-white/80 backdrop-blur-sm rounded-3xl p-6 border border-white/50 shadow-lg",
              "bg-gray-800/80 backdrop-blur-sm rounded-3xl p-6 border border-gray-700/50 shadow-lg"
            )}>
              <h2 className={getThemeClasses(
                "text-2xl font-bold text-slate-900 mb-6 flex items-center space-x-2",
                "text-2xl font-bold text-white mb-6 flex items-center space-x-2"
              )}>
                <Terminal className="w-6 h-6 text-green-600" />
                <span>Describe Your Code</span>
              </h2>
              
              <div className="space-y-4">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe what you want to code... e.g., 'Create a function that validates email addresses and returns true/false'"
                  className={getThemeClasses(
                    "w-full h-32 px-6 py-4 border-2 border-white/50 rounded-2xl bg-white/70 backdrop-blur-sm text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-4 focus:ring-green-500/30 focus:border-green-500 transition-all duration-300 text-lg resize-none",
                    "w-full h-32 px-6 py-4 border-2 border-gray-600/50 rounded-2xl bg-gray-700/70 backdrop-blur-sm text-white placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-green-500/30 focus:border-green-500 transition-all duration-300 text-lg resize-none"
                  )}
                />
                
                <button
                  onClick={handleGenerate}
                  disabled={!prompt.trim() || isGenerating}
                  className="w-full px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-2xl hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center space-x-3 font-semibold text-lg shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
                >
                  {isGenerating ? (
                    <>
                      <Cpu className="w-6 h-6 animate-spin" />
                      <span>Generating Code...</span>
                    </>
                  ) : (
                    <>
                      <Code className="w-6 h-6" />
                      <span>Generate Code</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Generated Code Display */}
            <div className={getThemeClasses(
              "bg-white/80 backdrop-blur-sm rounded-3xl p-6 border border-white/50 shadow-lg",
              "bg-gray-800/80 backdrop-blur-sm rounded-3xl p-6 border border-gray-700/50 shadow-lg"
            )}>
              <div className="flex items-center justify-between mb-4">
                <h3 className={getThemeClasses(
                  "text-lg font-bold text-slate-900 flex items-center space-x-2",
                  "text-lg font-bold text-white flex items-center space-x-2"
                )}>
                  <FileCode className="w-5 h-5 text-green-600" />
                  <span>Generated Code</span>
                </h3>
                
                {generatedCode && (
                  <div className="flex space-x-2">
                    <button 
                      onClick={copyToClipboard}
                      className="flex items-center space-x-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-all duration-200"
                    >
                      <Copy className="w-4 h-4" />
                      <span className="text-sm">Copy</span>
                    </button>
                    <button className="flex items-center space-x-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-all duration-200">
                      <Download className="w-4 h-4" />
                      <span className="text-sm">Download</span>
                    </button>
                  </div>
                )}
              </div>
              
              <div className="bg-slate-900 rounded-2xl p-6 font-mono text-sm overflow-auto min-h-96 max-h-[600px]">
                {isGenerating ? (
                  <div className="text-center py-12">
                    <Cpu className="w-12 h-12 text-green-400 animate-spin mx-auto mb-4" />
                    <p className="text-green-400 text-lg">Generating your code...</p>
                    <p className="text-slate-400 mt-2">This may take a moment</p>
                  </div>
                ) : generatedCode ? (
                  <pre 
                    className="whitespace-pre text-gray-300 leading-6" 
                    style={{ 
                      tabSize: 4, 
                      fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Monaco, Consolas, "Liberation Mono", "Courier New", monospace'
                    }}
                  >
                    {generatedCode}
                  </pre>
                ) : (
                  <div className="text-center py-12 text-slate-500">
                    <FileCode className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg">Your generated code will appear here</p>
                    <p className="text-sm">Enter a prompt above and click generate</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Settings Sidebar */}
          <div className="space-y-6">
            
            {/* Language Selection with Custom Option */}
            <div className={getThemeClasses(
              "bg-white/80 backdrop-blur-sm rounded-3xl p-6 border border-white/50 shadow-lg",
              "bg-gray-800/80 backdrop-blur-sm rounded-3xl p-6 border border-gray-700/50 shadow-lg"
            )}>
              <h3 className={getThemeClasses(
                "text-lg font-bold text-slate-900 mb-4 flex items-center space-x-2",
                "text-lg font-bold text-white mb-4 flex items-center space-x-2"
              )}>
                <Code className="w-5 h-5 text-green-600" />
                <span>Language</span>
              </h3>
              
              <div className="grid grid-cols-2 gap-2">
                {languages.map((lang) => (
                  <button
                    key={lang.id}
                    onClick={() => {
                      setSelectedLanguage(lang.id);
                      setShowCustomLanguage(lang.id === 'custom');
                      if (lang.id !== 'custom') {
                        setCustomLanguage('');
                      }
                    }}
                    className={`p-3 rounded-xl text-center transition-all duration-300 ${
                      selectedLanguage === lang.id
                        ? `${lang.color} text-white shadow-lg scale-105`
                        : getThemeClasses(
                            'bg-white/70 hover:bg-white/90 text-slate-900',
                            'bg-gray-700/70 hover:bg-gray-600/90 text-gray-200'
                          )
                    }`}
                  >
                    <span className="font-medium text-sm">{lang.name}</span>
                  </button>
                ))}
              </div>
              
              {/* Custom Language Input */}
              {showCustomLanguage && (
                <div className="mt-4">
                  <input
                    type="text"
                    value={customLanguage}
                    onChange={(e) => setCustomLanguage(e.target.value)}
                    placeholder="Enter custom language (e.g., Rust, Go, Swift, PHP)"
                    className={getThemeClasses(
                      "w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-green-500 focus:outline-none text-slate-900 bg-white/90",
                      "w-full px-4 py-3 border-2 border-gray-600 rounded-xl focus:border-green-500 focus:outline-none text-white bg-gray-700/90"
                    )}
                  />
                  <p className={getThemeClasses("text-xs text-slate-500 mt-1", "text-xs text-gray-400 mt-1")}>Examples: Rust, Go, Swift, PHP, Kotlin, Dart</p>
                </div>
              )}
            </div>

            {/* Code Type Selection - Dropdown */}
            <div className={getThemeClasses(
              "bg-white/80 backdrop-blur-sm rounded-3xl p-6 border border-white/50 shadow-lg",
              "bg-gray-800/80 backdrop-blur-sm rounded-3xl p-6 border border-gray-700/50 shadow-lg"
            )}>
              <h3 className={getThemeClasses(
                "text-lg font-bold text-slate-900 mb-4 flex items-center space-x-2",
                "text-lg font-bold text-white mb-4 flex items-center space-x-2"
              )}>
                <Terminal className="w-5 h-5 text-blue-600" />
                <span>Code Type</span>
              </h3>
              
              <div className="relative">
                <select
                  value={codeType}
                  onChange={(e) => {
                    setCodeType(e.target.value);
                    setShowCustomCodeType(e.target.value === 'custom');
                  }}
                  className={getThemeClasses(
                    "w-full p-4 bg-white/90 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none text-slate-900 appearance-none cursor-pointer",
                    "w-full p-4 bg-gray-700/90 border-2 border-gray-600 rounded-xl focus:border-blue-500 focus:outline-none text-white appearance-none cursor-pointer"
                  )}
                >
                  {codeTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </select>
                
                {/* Custom dropdown arrow */}
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <svg className={getThemeClasses("w-5 h-5 text-gray-400", "w-5 h-5 text-gray-500")} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
              
              {/* Custom Code Type Input */}
              {showCustomCodeType && (
                <div className="mt-4">
                  <input
                    type="text"
                    value={customCodeType}
                    onChange={(e) => setCustomCodeType(e.target.value)}
                    placeholder="Enter code type (e.g., Database Schema, Config File)"
                    className={getThemeClasses(
                      "w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none text-slate-900 bg-white/90",
                      "w-full px-4 py-3 border-2 border-gray-600 rounded-xl focus:border-blue-500 focus:outline-none text-white bg-gray-700/90"
                    )}
                  />
                </div>
              )}
            </div>

            {/* Universal Complexity Level - Always Visible */}
            <div className={getThemeClasses(
              "bg-white/80 backdrop-blur-sm rounded-3xl p-6 border border-white/50 shadow-lg",
              "bg-gray-800/80 backdrop-blur-sm rounded-3xl p-6 border border-gray-700/50 shadow-lg"
            )}>
              <h3 className={getThemeClasses(
                "text-lg font-bold text-slate-900 mb-4 flex items-center space-x-2",
                "text-lg font-bold text-white mb-4 flex items-center space-x-2"
              )}>
                <Zap className="w-5 h-5 text-orange-600" />
                <span>Complexity Level</span>
              </h3>
              
              <div className="space-y-3">
                {complexityLevels.map((level) => (
                  <button
                    key={level.id}
                    onClick={() => setComplexityLevel(level.id)}
                    className={`w-full p-4 rounded-xl text-left transition-all duration-300 ${
                      complexityLevel === level.id
                        ? `${level.color} text-white shadow-lg transform scale-105`
                        : getThemeClasses(
                            'bg-white/70 hover:bg-white/90 text-slate-900',
                            'bg-gray-700/70 hover:bg-gray-600/90 text-gray-200'
                          )
                    }`}
                  >
                    <div className="font-medium text-base">{level.name}</div>
                    <div className={`text-sm mt-1 ${
                      complexityLevel === level.id ? 'text-white/80' : getThemeClasses('text-slate-600', 'text-gray-400')
                    }`}>
                      {level.description}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* AI Model Selection - Dropdown */}
            <div className={getThemeClasses(
              "bg-white/80 backdrop-blur-sm rounded-3xl p-6 border border-white/50 shadow-lg",
              "bg-gray-800/80 backdrop-blur-sm rounded-3xl p-6 border border-gray-700/50 shadow-lg"
            )}>
              <h3 className={getThemeClasses(
                "text-lg font-bold text-slate-900 mb-4 flex items-center space-x-2",
                "text-lg font-bold text-white mb-4 flex items-center space-x-2"
              )}>
                <Cpu className="w-5 h-5 text-orange-600" />
                <span>AI Model</span>
              </h3>
              
              <div className="relative">
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className={getThemeClasses(
                    "w-full p-4 bg-white/90 border-2 border-gray-300 rounded-xl focus:border-orange-500 focus:outline-none text-slate-900 appearance-none cursor-pointer",
                    "w-full p-4 bg-gray-700/90 border-2 border-gray-600 rounded-xl focus:border-orange-500 focus:outline-none text-white appearance-none cursor-pointer"
                  )}
                >
                  {models.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name} - {model.cost}
                    </option>
                  ))}
                </select>
                
                {/* Custom dropdown arrow */}
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <svg className={getThemeClasses("w-5 h-5 text-gray-400", "w-5 h-5 text-gray-500")} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
              
              {/* Model description */}
              <div className={getThemeClasses(
                "mt-3 p-3 bg-orange-50 rounded-xl border border-orange-200",
                "mt-3 p-3 bg-orange-900/30 rounded-xl border border-orange-700/50"
              )}>
                <div className={getThemeClasses("text-sm text-orange-800", "text-sm text-orange-200")}>
                  {models.find(m => m.id === selectedModel)?.description}
                </div>
                <div className={getThemeClasses("text-xs text-orange-600 mt-1", "text-xs text-orange-300 mt-1")}>
                  Cost: {models.find(m => m.id === selectedModel)?.cost}
                </div>
              </div>
            </div>

            {/* Quick Templates */}
            <div className={getThemeClasses(
              "bg-white/80 backdrop-blur-sm rounded-3xl p-6 border border-white/50 shadow-lg",
              "bg-gray-800/80 backdrop-blur-sm rounded-3xl p-6 border border-gray-700/50 shadow-lg"
            )}>
              <h3 className={getThemeClasses(
                "text-lg font-bold text-slate-900 mb-4 flex items-center space-x-2",
                "text-lg font-bold text-white mb-4 flex items-center space-x-2"
              )}>
                <Zap className="w-5 h-5 text-orange-600" />
                <span>Quick Templates</span>
              </h3>
              
              <div className="space-y-2">
                {[
                  'API endpoint with error handling',
                  'React component with state',
                  'Data validation function',
                  'Database connection setup',
                  'Write a short code for adding two numbers',
                  'Create a simple login form'
                ].map((template, index) => (
                  <button
                    key={index}
                    onClick={() => setPrompt(template)}
                    className={getThemeClasses(
                      "w-full p-3 text-left bg-white/70 hover:bg-white/90 rounded-xl text-slate-900 transition-all duration-200 text-sm",
                      "w-full p-3 text-left bg-gray-700/70 hover:bg-gray-600/90 rounded-xl text-gray-200 transition-all duration-200 text-sm"
                    )}
                  >
                    {template}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}