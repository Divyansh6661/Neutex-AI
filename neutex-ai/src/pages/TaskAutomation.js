import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { makeAPICall } from '../config/api';
import { Zap, ChevronLeft, Settings, User, Sparkles, Wand2, Copy, Download, Cpu, Layers, BarChart3, Clock, Moon, Sun, FileText, Database } from 'lucide-react';
import N8NWorkflowManager from '../components/N8NWorkflowManager';

export default function TaskAutomation({ onNavigate }) {
  const { isDarkMode, toggleTheme } = useTheme();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [automationDescription, setAutomationDescription] = useState('');
  const [selectedType, setSelectedType] = useState('workflow');
  const [complexityLevel, setComplexityLevel] = useState('standard');
  const [generatedAutomation, setGeneratedAutomation] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState('generate'); // 'generate' or 'workflows'

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

  const automationTypes = [
    { id: 'workflow', name: 'Workflow', description: 'Step-by-step process design' },
    { id: 'script', name: 'Script', description: 'Executable automation code' },
    { id: 'integration', name: 'API Integration', description: 'Connect different services' },
    { id: 'schedule', name: 'Scheduled Task', description: 'Time-based automation' },
    { id: 'event', name: 'Event-Driven', description: 'Trigger-based automation' },
    { id: 'data', name: 'Data Pipeline', description: 'Data processing automation' }
  ];

  const complexityLevels = [
    { id: 'simple', name: 'Simple', color: 'bg-green-500' },
    { id: 'standard', name: 'Standard', color: 'bg-blue-500' },
    { id: 'advanced', name: 'Advanced', color: 'bg-purple-500' }
  ];

  const handleGenerateAutomation = async () => {
    if (automationDescription.trim()) {
      setIsGenerating(true);
      try {
       const response = await makeAPICall('/api/generate-automation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: automationDescription.trim(),
          automationType: selectedType,
          complexity: complexityLevel
        })
      });
        const data = await response.json();
        
        if (response.ok) {
          setGeneratedAutomation(data.automation);
          console.log('Generated with:', data.provider, 'using model:', data.model);
        } else {
          setGeneratedAutomation('Error: ' + data.error);
        }
      } catch (error) {
        console.error('Network error:', error);
        setGeneratedAutomation('Network error. Check if backend server is running.');
      }
      setIsGenerating(false);
    }
  };

  const handleCopyAutomation = () => {
    navigator.clipboard.writeText(generatedAutomation);
    // You could add a toast notification here if desired
  };

  const handleDownloadAutomation = () => {
    const blob = new Blob([generatedAutomation], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `automation-${selectedType}-${Date.now()}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className={getThemeClasses(
      "min-h-screen bg-gradient-to-br from-slate-50 via-orange-50 to-red-50 text-slate-900",
      "min-h-screen bg-gradient-to-br from-gray-900 via-orange-900 to-red-900 text-white"
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
                "p-2 text-gray-300 hover:text-orange-400 hover:bg-gray-700/60 rounded-xl transition-all duration-200"
              )}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-600 to-red-600 rounded-xl flex items-center justify-center shadow-lg">
                <Zap className="w-7 h-7 text-white animate-pulse" />
              </div>
              <div>
                <h1 className={getThemeClasses(
                  "text-2xl font-bold bg-gradient-to-r from-slate-900 to-orange-600 bg-clip-text text-transparent",
                  "text-2xl font-bold text-white"
                )}>
                  Task Automation Assistant
                </h1>
                <p className={getThemeClasses("text-sm text-slate-600", "text-sm text-gray-400")}>AI-Powered Workflow Generation</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Direct Theme Toggle Button */}
            <button 
              onClick={toggleTheme}
              className={getThemeClasses(
                "p-3 text-slate-600 hover:text-orange-600 hover:bg-white/60 rounded-xl transition-all duration-200 hover:scale-105 backdrop-blur-sm",
                "p-3 text-gray-300 hover:text-orange-400 hover:bg-gray-700/60 rounded-xl transition-all duration-200 hover:scale-105 backdrop-blur-sm"
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
              "p-3 text-slate-600 hover:text-orange-600 hover:bg-white/60 rounded-xl transition-all duration-200",
              "p-3 text-gray-300 hover:text-orange-400 hover:bg-gray-700/60 rounded-xl transition-all duration-200"
            )}>
              <Settings className="w-5 h-5" />
            </button>
            <button className={getThemeClasses(
              "p-3 text-slate-600 hover:text-orange-600 hover:bg-white/60 rounded-xl transition-all duration-200",
              "p-3 text-gray-300 hover:text-orange-400 hover:bg-gray-700/60 rounded-xl transition-all duration-200"
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
        {/* Tab Navigation */}
        <div className="mb-8">
          <div className={getThemeClasses(
            "flex space-x-1 p-1 bg-white/60 backdrop-blur-sm rounded-2xl border border-white/30",
            "flex space-x-1 p-1 bg-gray-800/60 backdrop-blur-sm rounded-2xl border border-gray-700/30"
          )}>
            <button
              onClick={() => setActiveTab('generate')}
              className={`flex-1 px-6 py-3 rounded-xl text-sm font-medium transition-all duration-300 flex items-center justify-center space-x-2 ${
                activeTab === 'generate'
                  ? 'bg-orange-500 text-white shadow-lg'
                  : getThemeClasses('text-slate-600 hover:text-orange-600', 'text-gray-300 hover:text-orange-400')
              }`}
            >
              <Wand2 className="w-4 h-4" />
              <span>AI Generator</span>
            </button>
            <button
              onClick={() => setActiveTab('workflows')}
              className={`flex-1 px-6 py-3 rounded-xl text-sm font-medium transition-all duration-300 flex items-center justify-center space-x-2 ${
                activeTab === 'workflows'
                  ? 'bg-orange-500 text-white shadow-lg'
                  : getThemeClasses('text-slate-600 hover:text-orange-600', 'text-gray-300 hover:text-orange-400')
              }`}
            >
              <Database className="w-4 h-4" />
              <span>N8N Workflows</span>
            </button>
          </div>
        </div>

        {activeTab === 'generate' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Automation Generation Area */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Automation Description */}
            <div className={getThemeClasses(
              "bg-white/80 backdrop-blur-sm rounded-3xl p-6 border border-white/50 shadow-lg",
              "bg-gray-800/80 backdrop-blur-sm rounded-3xl p-6 border border-gray-700/50 shadow-lg"
            )}>
              <h2 className={getThemeClasses(
                "text-2xl font-bold text-slate-900 mb-6 flex items-center space-x-2",
                "text-2xl font-bold text-white mb-6 flex items-center space-x-2"
              )}>
                <Wand2 className="w-6 h-6 text-orange-600" />
                <span>Describe Your Automation</span>
              </h2>
              
              <div className="space-y-4">
                <textarea
                  value={automationDescription}
                  onChange={(e) => setAutomationDescription(e.target.value)}
                  placeholder="Describe what you want to automate... e.g., 'Send daily sales reports via email every morning at 9 AM' or 'Automatically backup database and notify team on completion'"
                  className={getThemeClasses(
                    "w-full h-32 px-6 py-4 border-2 border-white/50 rounded-2xl bg-white/70 backdrop-blur-sm text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-4 focus:ring-orange-500/30 focus:border-orange-500 transition-all duration-300 text-lg resize-none",
                    "w-full h-32 px-6 py-4 border-2 border-gray-600/50 rounded-2xl bg-gray-700/70 backdrop-blur-sm text-white placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-orange-500/30 focus:border-orange-500 transition-all duration-300 text-lg resize-none"
                  )}
                />
                
                <button
                  onClick={handleGenerateAutomation}
                  disabled={!automationDescription.trim() || isGenerating}
                  className="w-full px-8 py-4 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-2xl hover:from-orange-700 hover:to-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center space-x-3 font-semibold text-lg shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
                >
                  {isGenerating ? (
                    <>
                      <Sparkles className="w-6 h-6 animate-spin" />
                      <span>Generating Automation...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-6 h-6" />
                      <span>Generate Automation</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Generated Automation Display */}
            <div className={getThemeClasses(
              "bg-white/80 backdrop-blur-sm rounded-3xl p-6 border border-white/50 shadow-lg",
              "bg-gray-800/80 backdrop-blur-sm rounded-3xl p-6 border border-gray-700/50 shadow-lg"
            )}>
              <h3 className={getThemeClasses(
                "text-xl font-bold text-slate-900 mb-6 flex items-center space-x-2",
                "text-xl font-bold text-white mb-6 flex items-center space-x-2"
              )}>
                <BarChart3 className="w-5 h-5 text-orange-600" />
                <span>Generated Automation Workflow</span>
              </h3>
              
              {isGenerating ? (
                <div className="w-full h-[500px] flex flex-col items-center justify-center">
                  <Sparkles className="w-16 h-16 text-orange-500 animate-spin mb-4" />
                  <p className={getThemeClasses("text-lg font-medium text-slate-700", "text-lg font-medium text-gray-200")}>Creating your automation workflow...</p>
                  <p className={getThemeClasses("text-sm text-slate-500 mt-2", "text-sm text-gray-400 mt-2")}>This may take a moment</p>
                </div>
              ) : generatedAutomation ? (
                <div className="space-y-4">
                  <div className={getThemeClasses(
                    "bg-slate-900 rounded-2xl p-6 border border-slate-700 h-[500px] overflow-y-auto",
                    "bg-gray-900 rounded-2xl p-6 border border-gray-600 h-[500px] overflow-y-auto"
                  )}>
                    <pre className="whitespace-pre-wrap text-sm text-white font-mono leading-relaxed">
                      {generatedAutomation}
                    </pre>
                  </div>
                  
                  <div className="flex space-x-2">
                    <button
                      onClick={handleCopyAutomation}
                      className="flex-1 px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl transition-all duration-300 flex items-center justify-center space-x-2"
                    >
                      <Copy className="w-4 h-4" />
                      <span>Copy Workflow</span>
                    </button>
                    <button
                      onClick={handleDownloadAutomation}
                      className="flex-1 px-4 py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl transition-all duration-300 flex items-center justify-center space-x-2"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className={getThemeClasses(
                  "w-full h-96 flex flex-col items-center justify-center text-slate-500",
                  "w-full h-96 flex flex-col items-center justify-center text-gray-400"
                )}>
                  <Zap className="w-16 h-16 mb-4 opacity-50" />
                  <p className="text-lg font-medium">Your automation workflow will appear here</p>
                  <p className="text-sm">Describe your automation needs above and click generate</p>
                </div>
              )}
            </div>
          </div>

          {/* Settings Sidebar */}
          <div className="space-y-6">
            
            {/* Automation Type Selection */}
            <div className={getThemeClasses(
              "bg-white/80 backdrop-blur-sm rounded-3xl p-6 border border-white/50 shadow-lg",
              "bg-gray-800/80 backdrop-blur-sm rounded-3xl p-6 border border-gray-700/50 shadow-lg"
            )}>
              <h3 className={getThemeClasses(
                "text-lg font-bold text-slate-900 mb-4 flex items-center space-x-2",
                "text-lg font-bold text-white mb-4 flex items-center space-x-2"
              )}>
                <Layers className="w-5 h-5 text-blue-600" />
                <span>Automation Type</span>
              </h3>
              
              <div className="space-y-2">
                {automationTypes.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => setSelectedType(type.id)}
                    className={`w-full p-3 rounded-xl text-left transition-all duration-300 ${
                      selectedType === type.id
                        ? 'bg-blue-500 text-white shadow-lg'
                        : getThemeClasses(
                            'bg-white/70 hover:bg-white/90 text-slate-900',
                            'bg-gray-700/70 hover:bg-gray-600/90 text-gray-200'
                          )
                    }`}
                  >
                    <div className="font-medium text-sm">{type.name}</div>
                    <div className={`text-xs ${selectedType === type.id ? 'text-blue-100' : getThemeClasses('text-slate-600', 'text-gray-400')}`}>
                      {type.description}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Complexity Level */}
            <div className={getThemeClasses(
              "bg-white/80 backdrop-blur-sm rounded-3xl p-6 border border-white/50 shadow-lg",
              "bg-gray-800/80 backdrop-blur-sm rounded-3xl p-6 border border-gray-700/50 shadow-lg"
            )}>
              <h3 className={getThemeClasses(
                "text-lg font-bold text-slate-900 mb-4 flex items-center space-x-2",
                "text-lg font-bold text-white mb-4 flex items-center space-x-2"
              )}>
                <Cpu className="w-5 h-5 text-purple-600" />
                <span>Complexity Level</span>
              </h3>
              
              <div className="space-y-2">
                {complexityLevels.map((level) => (
                  <button
                    key={level.id}
                    onClick={() => setComplexityLevel(level.id)}
                    className={`w-full p-3 rounded-xl text-center transition-all duration-300 ${
                      complexityLevel === level.id
                        ? `${level.color} text-white shadow-lg scale-105`
                        : getThemeClasses(
                            'bg-white/70 hover:bg-white/90 text-slate-900',
                            'bg-gray-700/70 hover:bg-gray-600/90 text-gray-200'
                          )
                    }`}
                  >
                    <span className="font-medium">{level.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Examples */}
            <div className={getThemeClasses(
              "bg-white/80 backdrop-blur-sm rounded-3xl p-6 border border-white/50 shadow-lg",
              "bg-gray-800/80 backdrop-blur-sm rounded-3xl p-6 border border-gray-700/50 shadow-lg"
            )}>
              <h3 className={getThemeClasses(
                "text-lg font-bold text-slate-900 mb-4 flex items-center space-x-2",
                "text-lg font-bold text-white mb-4 flex items-center space-x-2"
              )}>
                <Sparkles className="w-5 h-5 text-green-600" />
                <span>Example Automations</span>
              </h3>
              
              <div className="space-y-2">
                {[
                  'Daily database backup with email notification',
                  'Monitor website uptime and alert team',
                  'Process CSV files and generate reports',
                  'Social media posting scheduler'
                ].map((example, index) => (
                  <button
                    key={index}
                    onClick={() => setAutomationDescription(example)}
                    className={getThemeClasses(
                      "w-full p-3 text-left bg-white/70 hover:bg-white/90 rounded-xl text-slate-900 transition-all duration-200 text-sm",
                      "w-full p-3 text-left bg-gray-700/70 hover:bg-gray-600/90 rounded-xl text-gray-200 transition-all duration-200 text-sm"
                    )}
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>

            {/* AI Model Info */}
            <div className={getThemeClasses(
              "bg-white/80 backdrop-blur-sm rounded-3xl p-6 border border-white/50 shadow-lg",
              "bg-gray-800/80 backdrop-blur-sm rounded-3xl p-6 border border-gray-700/50 shadow-lg"
            )}>
              <h3 className={getThemeClasses(
                "text-lg font-bold text-slate-900 mb-4 flex items-center space-x-2",
                "text-lg font-bold text-white mb-4 flex items-center space-x-2"
              )}>
                <Clock className="w-5 h-5 text-orange-600" />
                <span>AI Models</span>
              </h3>
              
              <div className="space-y-3">
                <div className={getThemeClasses(
                  "p-3 bg-green-50 rounded-xl border border-green-200",
                  "p-3 bg-green-900/30 rounded-xl border border-green-700/50"
                )}>
                  <div className={getThemeClasses("font-medium text-green-800 text-sm", "font-medium text-green-200 text-sm")}>Kimi K2</div>
                  <div className={getThemeClasses("text-xs text-green-600", "text-xs text-green-300")}>Primary - Reasoning specialist</div>
                </div>
                <div className={getThemeClasses(
                  "p-3 bg-blue-50 rounded-xl border border-blue-200",
                  "p-3 bg-blue-900/30 rounded-xl border border-blue-700/50"
                )}>
                  <div className={getThemeClasses("font-medium text-blue-800 text-sm", "font-medium text-blue-200 text-sm")}>GPT-OSS-120B</div>
                  <div className={getThemeClasses("text-xs text-blue-600", "text-xs text-blue-300")}>Fallback - fast inference</div>
                </div>
                <div className={getThemeClasses(
                  "p-3 bg-purple-50 rounded-xl border border-purple-200",
                  "p-3 bg-purple-900/30 rounded-xl border border-purple-700/50"
                )}>
                  <div className={getThemeClasses("font-medium text-purple-800 text-sm", "font-medium text-purple-200 text-sm")}>Gemini 2.0</div>
                  <div className={getThemeClasses("text-xs text-purple-600", "text-xs text-purple-300")}>Final - Reliable generation</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        ) : (
          /* N8N Workflows Tab */
          <N8NWorkflowManager 
            isDarkMode={isDarkMode}
            getThemeClasses={getThemeClasses}
          />
        )}
      </main>
    </div>
  );
}