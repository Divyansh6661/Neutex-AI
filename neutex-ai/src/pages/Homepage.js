import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { makeAPICall } from '../config/api';
import { Mic, MicOff, Image, Eye, Code, Zap, Settings, User, Send, Sparkles, Brain, Cpu, X, Square, Volume2, Moon, Sun,Play, ArrowRight, FileText,BarChart3} from 'lucide-react';

export default function Homepage({ onNavigate }) {
  const { isDarkMode, toggleTheme, getThemeClasses } = useTheme();
  const [isListening, setIsListening] = useState(false);
  const [userMessage, setUserMessage] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [recognition, setRecognition] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showVoicePopup, setShowVoicePopup] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [voiceConversation, setVoiceConversation] = useState([]);
  const [isInConversation, setIsInConversation] = useState(false);
  const [waitingForResponse, setWaitingForResponse] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
 
  // Voice selection states
  const [preferredVoice, setPreferredVoice] = useState(null);
  const [availableVoices, setAvailableVoices] = useState([]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Voice loading and selection
  useEffect(() => {
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length === 0) return;
      
      const englishVoices = voices.filter(voice => voice.lang.startsWith('en'));
      setAvailableVoices(englishVoices);
      console.log('VOICE DEBUG: Loaded', englishVoices.length, 'English voices');
      
      const savedVoiceName = localStorage.getItem('neutex_preferred_voice');
      if (savedVoiceName) {
        const savedVoice = englishVoices.find(v => v.name === savedVoiceName);
        if (savedVoice) {
          console.log('VOICE DEBUG: Restored saved voice:', savedVoice.name);
          setPreferredVoice(savedVoice);
          return;
        }
      }
      
      if (!preferredVoice) {
        const ariaVoice = englishVoices.find(voice => 
          voice.name === 'Microsoft Aria Online (Natural) - English (United States)'
        );
        
        if (ariaVoice) {
          console.log('VOICE DEBUG: Auto-selecting Aria voice');
          setPreferredVoice(ariaVoice);
          saveVoicePreferences(ariaVoice);
        } else {
          const naturalVoice = englishVoices.find(v => v.name.includes('Natural') || v.name.includes('Neural'));
          const fallbackVoice = naturalVoice || englishVoices[0];
          console.log('VOICE DEBUG: Aria not found, using fallback:', fallbackVoice?.name);
          setPreferredVoice(fallbackVoice);
          saveVoicePreferences(fallbackVoice);
        }
      }
    };
    
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  const saveVoicePreferences = (voice) => {
    if (voice) {
      localStorage.setItem('neutex_preferred_voice', voice.name);
      console.log('VOICE DEBUG: Saved voice preference:', voice.name);
    }
  };

  // Initialize Web Speech Recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognitionInstance = new SpeechRecognition();
      
      recognitionInstance.continuous = false;
      recognitionInstance.interimResults = true;
      recognitionInstance.lang = 'en-US';
      
      recognitionInstance.onstart = () => {
        console.log('Web Speech recognition started');
        setIsListening(true);
      };
      
      recognitionInstance.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }
        
        setTranscript(finalTranscript || interimTranscript);
        
        if (finalTranscript) {
          setUserMessage(finalTranscript);
          setIsListening(false);
          handleVoiceMessage(finalTranscript, 'web-speech');
        }
      };
      
      recognitionInstance.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        setWaitingForResponse(false);
      };
      
      recognitionInstance.onend = () => {
        console.log('Speech recognition ended');
        setIsListening(false);
      };
      
      setRecognition(recognitionInstance);
    }
  }, []);

  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setWaitingForResponse(false);
  };

  const openVoicePopup = () => {
    if (!recognition) {
      alert('Speech recognition is not supported in your browser. Please use Chrome, Edge, or Safari.');
      return;
    }
    setShowVoicePopup(true);
    setTranscript('');
    setUserMessage('');
    setVoiceConversation([]);
    setIsInConversation(false);
    setWaitingForResponse(false);
  };

  const closeVoicePopup = () => {
    if (recognition && isListening) {
      recognition.stop();
    }
    stopSpeaking();
    setShowVoicePopup(false);
    setIsListening(false);
    setIsInConversation(false);
    setTranscript('');
    setVoiceConversation([]);
    setWaitingForResponse(false);
  };

  const startContinuousConversation = () => {
    console.log('Starting continuous conversation');
    setIsInConversation(true);
    setWaitingForResponse(false);
  };

  const stopContinuousConversation = () => {
    console.log('Stopping continuous conversation');
    setIsInConversation(false);
    setWaitingForResponse(false);
    if (recognition && isListening) {
      recognition.stop();
    }
    stopSpeaking();
    
    if (voiceConversation.length > 0) {
      localStorage.setItem('voiceConversation', JSON.stringify(voiceConversation));
      setShowVoicePopup(false);
      onNavigate('chatbot');
    }
  };

  const startListening = () => {
    if (!isListening && recognition) {
      console.log('Starting Web Speech Recognition');
      recognition.start();
    }
  };

  const handleVoiceMessage = async (message, provider = 'web-speech') => {
    if (!message.trim()) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: message,
      timestamp: new Date(),
      isVoice: true,
      provider: provider
    };
    
    setVoiceConversation(prev => [...prev, userMessage]);
    setTranscript('');
    setWaitingForResponse(true);

    try {
      const response = await makeAPICall('/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: message,
    conversationHistory: voiceConversation.slice(-10)  // ✅ Correct variable
  })
});

      const data = await response.json();

      if (response.ok) {
        const assistantMessage = {
          id: Date.now() + 1,
          type: 'assistant',
          content: data.response,
          model: data.model,
          timestamp: new Date()
        };
        
        setVoiceConversation(prev => [...prev, assistantMessage]);
        
        if ('speechSynthesis' in window) {
          const cleanTextForSpeech = (text) => {
            return text
              .replace(/\*\*\*\*(.*?)\*\*\*\*/g, '$1')
              .replace(/\*\*\*(.*?)\*\*\*/g, '$1')
              .replace(/\*\*(.*?)\*\*/g, '$1')
              .replace(/\*(.*?)\*/g, '$1')
              .replace(/`(.*?)`/g, '$1')
              .replace(/#{1,6}\s/g, '')
              .replace(/^\* /gm, '')
              .replace(/^\- /gm, '')
              .replace(/^\+ /gm, '')
              .replace(/^\d+\.\s/gm, '')
              .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
              .replace(/\n+/g, '. ')
              .replace(/\s+/g, ' ')
              .trim();
          };

          const speechText = cleanTextForSpeech(data.response);
          
          setTimeout(() => {
            const utterance = new SpeechSynthesisUtterance(speechText);
            
            let voiceToUse = preferredVoice;
            
            if (!voiceToUse) {
              const savedVoiceName = localStorage.getItem('neutex_preferred_voice');
              if (savedVoiceName) {
                const voices = window.speechSynthesis.getVoices();
                voiceToUse = voices.find(v => v.name === savedVoiceName);
                if (voiceToUse) {
                  setPreferredVoice(voiceToUse);
                  console.log('SPEECH: Restored voice from localStorage:', voiceToUse.name);
                }
              }
            }
            
            if (voiceToUse) {
              utterance.voice = voiceToUse;
              console.log('SPEECH: Using preferred voice:', voiceToUse.name, voiceToUse.lang);
            } else {
              console.log('SPEECH: No preferred voice available, using browser default');
            }
            
            utterance.rate = 1.0;
            utterance.pitch = 1.0;
            utterance.volume = 0.8;
            
            utterance.onstart = () => {
              console.log('SPEECH: Started speaking');
            };
            
            utterance.onend = () => {
              console.log('SPEECH: Finished speaking');
              setWaitingForResponse(false);
            };
            
            utterance.onerror = (event) => {
              console.error('SPEECH: Error occurred:', event.error);
              setWaitingForResponse(false);
            };
            
            if (window.speechSynthesis.speaking) {
              window.speechSynthesis.cancel();
            }
            
            window.speechSynthesis.speak(utterance);
          }, 100);

        } else {
          setWaitingForResponse(false);
        }
      } else {
        throw new Error(data.error || 'Failed to get response');
      }
    } catch (error) {
      console.error('Voice conversation error:', error);
      const errorMessage = {
        id: Date.now() + 1,
        type: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date()
      };
      setVoiceConversation(prev => [...prev, errorMessage]);
      setWaitingForResponse(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (userMessage.trim()) {
      if (isInConversation) {
        handleVoiceMessage(userMessage, 'text-input');
      } else {
        // Use a different localStorage key for regular text messages
        localStorage.setItem('textMessage', userMessage); // Changed from 'voiceMessage'
        setShowVoicePopup(false);
        onNavigate('chatbot');
      }
      setUserMessage('');
    }
  };

    const features = [
    { 
      icon: Image, 
      title: 'Text to Image', 
      subtitle: 'Generation',
      description: 'Create professional visuals from descriptions',
      gradient: 'from-purple-500 to-pink-500',
      bgGradient: isDarkMode ? 'from-purple-900/20 to-pink-900/20' : 'from-purple-50 to-pink-50',
      page: 'textToImage'
    },
    { 
      icon: Play, 
      title: 'Text to Video', 
      subtitle: 'Generation',
      description: 'Generate videos from text descriptions or image using AI',
      gradient: 'from-green-500 to-emerald-500',
      bgGradient: isDarkMode ? 'from-green-900/20 to-emerald-900/20' : 'from-green-50 to-emerald-50',
      page: 'textToVideo'
    },
    { 
      icon: Eye, 
      title: 'Object', 
      subtitle: 'Detection',
      description: 'Advanced computer vision and analysis',
      gradient: 'from-blue-500 to-cyan-500',
      bgGradient: isDarkMode ? 'from-blue-900/20 to-cyan-900/20' : 'from-blue-50 to-cyan-50',
      page: 'objectDetection'
    },
    { 
      icon: Code, 
      title: 'Code', 
      subtitle: 'Generator',
      description: 'Intelligent code writing and optimization',
      gradient: 'from-green-500 to-emerald-500',
      bgGradient: isDarkMode ? 'from-green-900/20 to-emerald-900/20' : 'from-green-50 to-emerald-50',
      page: 'codeGenerator'
    },
    { 
      icon: Zap, 
      title: 'Task', 
      subtitle: 'Automation',
      description: 'Smart workflow automation and management',
      gradient: 'from-orange-500 to-red-500',
      bgGradient: isDarkMode ? 'from-orange-900/20 to-red-900/20' : 'from-orange-50 to-red-50',
      page: 'taskAutomation'
    },
    { 
      icon: Brain, 
      title: 'AI', 
      subtitle: 'Chat',
      description: 'Intelligent conversation assistant',
      gradient: 'from-indigo-500 to-purple-500',
      bgGradient: isDarkMode ? 'from-indigo-900/20 to-purple-900/20' : 'from-indigo-50 to-purple-50',
      page: 'chatbot'
    },
    { 
      icon: Sparkles, // or Instagram icon
      title: 'Social', 
      subtitle: 'Media',
      description: 'AI-powered social media content generation',
      gradient: 'from-pink-500 to-purple-500',
      bgGradient: isDarkMode ? 'from-pink-900/20 to-purple-900/20' : 'from-pink-50 to-purple-50',
      page: 'socialMedia'
    },
    { 
      icon: FileText, 
      title: 'Document', 
      subtitle: 'Summarizer',
      description: 'AI-powered document analysis and summarization',
      gradient: 'from-blue-500 to-indigo-500',
      bgGradient: isDarkMode ? 'from-blue-900/20 to-indigo-900/20' : 'from-blue-50 to-indigo-50',
      page: 'documentSummarizer'
    },
    {
      icon: BarChart3, 
      title: 'Data Analyst', 
      subtitle: 'Dashboard',
      description: 'AI-powered data analysis with natural language queries',
      gradient: 'from-indigo-500 to-purple-500',
      bgGradient: isDarkMode ? 'from-indigo-900/20 to-purple-900/20' : 'from-indigo-50 to-purple-50',
      page: 'dataAnalyst'
    }
  ];

  return (
    <div className={getThemeClasses(
      "min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 text-slate-900 relative overflow-hidden",
      "min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white relative overflow-hidden"
    )}>
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className={getThemeClasses(
              "absolute w-1 h-1 bg-blue-400 rounded-full opacity-30 animate-pulse",
              "absolute w-1 h-1 bg-blue-500 rounded-full opacity-20 animate-pulse"
            )}
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${3 + Math.random() * 4}s`
            }}
          />
        ))}
        
        <div 
          className={getThemeClasses(
            "absolute w-96 h-96 rounded-full opacity-20 blur-3xl bg-gradient-to-r from-blue-400 to-purple-600 animate-pulse",
            "absolute w-96 h-96 rounded-full opacity-10 blur-3xl bg-gradient-to-r from-blue-500 to-purple-700 animate-pulse"
          )}
          style={{
            left: `${mousePosition.x / (typeof window !== 'undefined' ? window.innerWidth : 1920) * 100}%`,
            top: `${mousePosition.y / (typeof window !== 'undefined' ? window.innerHeight : 1080) * 100}%`,
            transform: 'translate(-50%, -50%)',
            transition: 'all 0.3s ease-out'
          }}
        />
      </div>

      {/* Voice Popup Modal */}
      {showVoicePopup && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className={getThemeClasses(
            "bg-white/90 backdrop-blur-xl rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl border border-white/50",
            "bg-gray-800/90 backdrop-blur-xl rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-700/50"
          )}>
            {/* Fixed Header */}
            <div className={getThemeClasses(
              "sticky top-0 bg-white/90 backdrop-blur-xl rounded-t-3xl px-8 py-6 border-b border-gray-200",
              "sticky top-0 bg-gray-800/90 backdrop-blur-xl rounded-t-3xl px-8 py-6 border-b border-gray-700"
            )}>
              <div className="flex justify-between items-center">
                <h3 className={getThemeClasses("text-2xl font-bold text-slate-900", "text-2xl font-bold text-white")}>Voice Assistant</h3>
                <button
                  onClick={closeVoicePopup}
                  className={getThemeClasses(
                    "p-2 hover:bg-gray-200 rounded-xl transition-colors",
                    "p-2 hover:bg-gray-700 rounded-xl transition-colors"
                  )}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="px-8 py-6 space-y-6">
              {/* Voice Selection */}
              {availableVoices.length > 0 && (
                <div className={getThemeClasses(
                  "p-4 bg-green-50 rounded-xl border border-green-200",
                  "p-4 bg-green-900/20 rounded-xl border border-green-700/50"
                )}>
                  <label className={getThemeClasses(
                    "block text-sm font-medium text-green-900 mb-2",
                    "block text-sm font-medium text-green-400 mb-2"
                  )}>
                    <Volume2 className="w-4 h-4 inline mr-1" />
                    Voice Selection ({availableVoices.length} English voices)
                  </label>
                  <select 
                    value={preferredVoice?.name || ''}
                    onChange={(e) => {
                      const voice = availableVoices.find(v => v.name === e.target.value);
                      console.log('VOICE DEBUG: User selected:', voice?.name, voice?.lang);
                      setPreferredVoice(voice);
                      saveVoicePreferences(voice);
                    }}
                    className={getThemeClasses(
                      "w-full p-2 border border-green-300 rounded-lg text-sm",
                      "w-full p-2 border border-green-700 rounded-lg text-sm bg-gray-700 text-white"
                    )}
                  >
                    {availableVoices.map(voice => (
                      <option key={voice.name} value={voice.name}>
                        {voice.name} ({voice.lang})
                      </option>
                    ))}
                  </select>
                  <div className={getThemeClasses(
                    "text-xs text-green-600 mt-1",
                    "text-xs text-green-400 mt-1"
                  )}>
                    Current: {preferredVoice?.name || 'Default'}
                  </div>
                </div>
              )}

              {/* Conversation Display */}
              {voiceConversation.length > 0 && (
                <div className={getThemeClasses(
                  "max-h-40 overflow-y-auto bg-gray-50 rounded-xl p-4 space-y-2",
                  "max-h-40 overflow-y-auto bg-gray-700/50 rounded-xl p-4 space-y-2"
                )}>
                  {voiceConversation.slice(-4).map((msg, idx) => (
                    <div key={idx} className={`text-sm ${msg.type === 'user' ? 'text-blue-700 font-medium' : getThemeClasses('text-gray-700', 'text-gray-300')}`}>
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="font-semibold">{msg.type === 'user' ? 'You: ' : 'AI: '}</span>
                        {msg.provider && (
                          <span className="text-xs opacity-60">
                            ({msg.provider === 'web-speech' ? 'Web Speech' : msg.provider})
                          </span>
                        )}
                      </div>
                      {msg.content.substring(0, 100)}{msg.content.length > 100 ? '...' : ''}
                    </div>
                  ))}
                </div>
              )}

              {/* Voice Animation */}
              <div className="flex justify-center">
                <div className="relative">
                  {(isListening || waitingForResponse) && (
                    <>
                      <div className="absolute inset-0 w-20 h-20 rounded-full border-2 border-red-400 animate-ping opacity-20"></div>
                      <div className="absolute inset-1 w-18 h-18 rounded-full border-2 border-red-400 animate-ping opacity-30" style={{ animationDelay: '0.5s' }}></div>
                      <div className="absolute inset-2 w-16 h-16 rounded-full border-2 border-red-400 animate-ping opacity-40" style={{ animationDelay: '1s' }}></div>
                    </>
                  )}
                  
                  <div className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-500 ${
                    isListening 
                      ? 'bg-gradient-to-br from-red-500 to-pink-600 shadow-2xl shadow-red-500/50 animate-pulse' 
                      : waitingForResponse
                      ? 'bg-gradient-to-br from-yellow-500 to-orange-500 shadow-2xl shadow-yellow-500/50'
                      : 'bg-gradient-to-br from-blue-500 to-purple-600 shadow-2xl shadow-blue-500/50'
                  }`}>
                    {isListening ? (
                      <Mic className="w-8 h-8 text-white" />
                    ) : waitingForResponse ? (
                      <div className="flex space-x-1">
                        <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce"></div>
                        <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                        <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                      </div>
                    ) : (
                      <Mic className="w-8 h-8 text-white" />
                    )}
                  </div>
                </div>
              </div>

              {/* Status Text */}
              <div className="text-center">
                <p className={`text-lg font-medium transition-all duration-300 ${
                  isListening ? 'text-red-600' : waitingForResponse ? 'text-yellow-600' : getThemeClasses('text-slate-600', 'text-gray-400')
                }`}>
                  {isListening ? (
                    'Listening... (Web Speech)'
                  ) : waitingForResponse ? (
                    'AI is thinking...'
                  ) : isInConversation ? (
                    'Ready to continue conversation'
                  ) : (
                    'Ready to start conversation'
                  )}
                </p>
              </div>

              {/* Transcript Display */}
              {transcript && (
                <div className={getThemeClasses(
                  "p-4 bg-blue-50 rounded-xl border border-blue-200",
                  "p-4 bg-blue-900/20 rounded-xl border border-blue-700/50"
                )}>
                  <p className={getThemeClasses("text-sm text-gray-600 mb-1", "text-sm text-gray-400 mb-1")}>You said:</p>
                  <p className={getThemeClasses("text-slate-800", "text-white")}>{transcript}</p>
                </div>
              )}

              {/* Status indicator with stop functionality */}
              {waitingForResponse && (
                <div className="flex justify-center">
                  <button
                    onClick={stopSpeaking}
                    className="bg-yellow-100 hover:bg-yellow-200 active:bg-yellow-300 text-yellow-700 px-4 py-2 rounded-xl flex items-center space-x-2 cursor-pointer transition-colors border border-yellow-300"
                  >
                    <div className="w-3 h-3 bg-yellow-500 rounded-full animate-bounce"></div>
                    <span>AI is thinking... (tap to stop)</span>
                  </button>
                </div>
              )}
            </div>

            {/* Fixed Footer */}
            <div className={getThemeClasses(
              "sticky bottom-0 bg-white/90 backdrop-blur-xl rounded-b-3xl px-8 py-6 border-t border-gray-200",
              "sticky bottom-0 bg-gray-800/90 backdrop-blur-xl rounded-b-3xl px-8 py-6 border-t border-gray-700"
            )}>
              {/* Controls */}
              <div className="space-y-4">
                {!isInConversation ? (
                  <button
                    onClick={startContinuousConversation}
                    className="w-full px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all duration-300 flex items-center justify-center space-x-2 font-semibold"
                  >
                    <Mic className="w-5 h-5" />
                    <span>Start Conversation Mode</span>
                  </button>
                ) : (
                  <div className="space-y-3">
                    {!isListening && !waitingForResponse && (
                      <button
                        onClick={startListening}
                        className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-300 flex items-center justify-center space-x-2 font-semibold"
                      >
                        <Mic className="w-5 h-5" />
                        <span>Click to Speak</span>
                      </button>
                    )}
                    
                    {(isListening || waitingForResponse) && (
                      <div className="w-full px-6 py-3 bg-gray-400 text-white rounded-xl flex items-center justify-center space-x-2 font-semibold">
                        <Mic className="w-5 h-5" />
                        <span>{isListening ? 'Listening...' : 'Processing...'}</span>
                      </div>
                    )}
                    
                    <button
                      onClick={stopContinuousConversation}
                      className="w-full px-6 py-3 bg-gradient-to-r from-red-600 to-pink-600 text-white rounded-xl hover:from-red-700 hover:to-pink-700 transition-all duration-300 flex items-center justify-center space-x-2 font-semibold"
                    >
                      <Square className="w-5 h-5" />
                      <span>End Conversation & Save to Chat</span>
                    </button>
                  </div>
                )}

                {/* Manual Input Option */}
                {!isListening && !waitingForResponse && (
                  <form onSubmit={handleSubmit} className="space-y-3">
                    <input
                      type="text"
                      value={userMessage}
                      onChange={(e) => setUserMessage(e.target.value)}
                      placeholder="Or type your message here..."
                      className={getThemeClasses(
                        "w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-white text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300",
                        "w-full px-4 py-3 border-2 border-gray-600 rounded-xl bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
                      )}
                    />
                    
                    <button
                      type="submit"
                      disabled={!userMessage.trim()}
                      className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center space-x-2 font-semibold"
                    >
                      <Send className="w-5 h-5" />
                      <span>{isInConversation ? 'Add to Conversation' : 'Send to Chat'}</span>
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className={getThemeClasses(
        "relative border-b border-white/20 bg-white/60 backdrop-blur-xl shadow-sm",
        "relative border-b border-gray-700/20 bg-gray-800/60 backdrop-blur-xl shadow-sm"
      )}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3 group cursor-pointer" onClick={() => onNavigate('home')}>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg">
              <img 
                src="/neutex-logo.png" 
                alt="Neutex AI" 
                className="w-10 h-10 animate-pulse"
              />
            </div>
            <div>
              <h1 className={getThemeClasses(
                "text-2xl font-bold bg-gradient-to-r from-slate-900 to-blue-600 bg-clip-text text-transparent",
                "text-2xl font-bold bg-gradient-to-r from-white to-blue-400 bg-clip-text text-transparent"
              )}>
                Neutex AI
              </h1>
              <p className={getThemeClasses("text-sm text-slate-600", "text-sm text-gray-400")}>Intelligent Companion Platform</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Direct Theme Toggle Button */}
            <button 
              onClick={toggleTheme}
              className={getThemeClasses(
                "p-3 text-slate-600 hover:text-blue-600 hover:bg-white/60 rounded-xl transition-all duration-200 hover:scale-105 backdrop-blur-sm",
                "p-3 text-gray-300 hover:text-blue-400 hover:bg-gray-700/60 rounded-xl transition-all duration-200 hover:scale-105 backdrop-blur-sm"
              )}
              title={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
            >
              {isDarkMode ? (
                <Sun className="w-5 h-5" />
              ) : (
                <Moon className="w-5 h-5" />
              )}
            </button>

            <div className="relative">
              <button 
                onClick={() => setShowSettings(!showSettings)}
                className={getThemeClasses(
                  "p-3 text-slate-600 hover:text-blue-600 hover:bg-white/60 rounded-xl transition-all duration-200 hover:scale-105 backdrop-blur-sm",
                  "p-3 text-gray-300 hover:text-blue-400 hover:bg-gray-700/60 rounded-xl transition-all duration-200 hover:scale-105 backdrop-blur-sm"
                )}
              >
                <Settings className="w-5 h-5" />
              </button>

              {/* Settings Dropdown */}
              {showSettings && (
                <div className={getThemeClasses(
                  "absolute top-16 right-0 bg-white border border-gray-200 rounded-xl shadow-lg p-4 z-50 w-48",
                  "absolute top-16 right-0 bg-gray-800 border border-gray-700 rounded-xl shadow-lg p-4 z-50 w-48"
                )}>
                  <div className="space-y-2">
                    <div className={getThemeClasses(
                      "text-sm font-medium text-gray-700 pb-2 border-b border-gray-200",
                      "text-sm font-medium text-gray-200 pb-2 border-b border-gray-700"
                    )}>
                      Additional Settings
                    </div>
                    <button className={getThemeClasses(
                      "w-full text-left text-sm text-gray-600 hover:text-gray-800 py-1",
                      "w-full text-left text-sm text-gray-300 hover:text-gray-100 py-1"
                    )}>
                      Voice Settings
                    </button>
                    <button className={getThemeClasses(
                      "w-full text-left text-sm text-gray-600 hover:text-gray-800 py-1",
                      "w-full text-left text-sm text-gray-300 hover:text-gray-100 py-1"
                    )}>
                      Preferences
                    </button>
                  </div>
                </div>
              )}
            </div>
            <button className={getThemeClasses(
              "p-3 text-slate-600 hover:text-blue-600 hover:bg-white/60 rounded-xl transition-all duration-200 hover:scale-105 backdrop-blur-sm",
              "p-3 text-gray-300 hover:text-blue-400 hover:bg-gray-700/60 rounded-xl transition-all duration-200 hover:scale-105 backdrop-blur-sm"
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

      {/* Main Content */}
      <main className="relative max-w-7xl mx-auto px-6 py-20">
        {/* Hero Section */}
        <div className="text-center mb-24">
          <div className="flex justify-center mb-8">
            <div className="relative">
              <Sparkles className={getThemeClasses(
                "w-12 h-12 text-blue-500 animate-spin",
                "w-12 h-12 text-blue-400 animate-spin"
              )} style={{ animationDuration: '8s' }} />
              <div className={getThemeClasses(
                "absolute inset-0 w-12 h-12 bg-blue-400 rounded-full blur-xl opacity-30 animate-ping",
                "absolute inset-0 w-12 h-12 bg-blue-500 rounded-full blur-xl opacity-20 animate-ping"
              )} />
            </div>
          </div>
          
          <h1 className="text-6xl md:text-7xl font-bold mb-8 tracking-tight leading-tight">
            <span className={getThemeClasses(
              "bg-gradient-to-r from-slate-900 via-blue-600 to-purple-600 bg-clip-text text-transparent animate-pulse",
              "bg-gradient-to-r from-white via-blue-400 to-purple-400 bg-clip-text text-transparent animate-pulse"
            )}>
              Welcome to 
            </span>
            <br />
            <span className={getThemeClasses(
              "bg-gradient-to-r from-blue-600 via-purple-600 to-cyan-600 bg-clip-text text-transparent",
              "bg-gradient-to-r from-blue-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent"
            )}>
              Neutex AI
            </span>
          </h1>
          
          <p className={getThemeClasses(
            "text-2xl text-slate-600 max-w-3xl mx-auto leading-relaxed mb-8",
            "text-2xl text-gray-300 max-w-3xl mx-auto leading-relaxed mb-8"
          )}>
            Your intelligent companion for 
            <span className="text-blue-600 font-semibold"> productivity</span>,
            <span className="text-purple-600 font-semibold"> automation</span>, and
            <span className="text-cyan-600 font-semibold"> smart decision-making</span>
          </p>
          
          <div className={getThemeClasses(
            "flex justify-center items-center space-x-6 text-sm text-slate-500",
            "flex justify-center items-center space-x-6 text-sm text-gray-400"
          )}>
            <div className="flex items-center space-x-2">
              <Cpu className="w-4 h-4 text-blue-500" />
              <span>Advanced AI Engine</span>
            </div>
            <div className={getThemeClasses("w-1 h-1 bg-slate-400 rounded-full", "w-1 h-1 bg-gray-500 rounded-full")}></div>
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-purple-500" />
              <span>Real-time Processing</span>
            </div>
            <div className={getThemeClasses("w-1 h-1 bg-slate-400 rounded-full", "w-1 h-1 bg-gray-500 rounded-full")}></div>
            <div className="flex items-center space-x-2">
              <Zap className="w-4 h-4 text-cyan-500" />
              <span>Lightning Fast</span>
            </div>
          </div>
        </div>

        {/* Voice Interface */}
        <div className="max-w-5xl mx-auto mb-28">
          <div className="flex justify-center mb-12">
            <button
              onClick={openVoicePopup}
              className="relative w-24 h-24 rounded-full flex items-center justify-center transition-all duration-500 transform hover:scale-110 bg-gradient-to-br from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 shadow-2xl shadow-blue-500/50"
            >
              <Mic className="w-10 h-10 text-white" />
            </button>
          </div>

          <div className="text-center mb-12">
            <p className={getThemeClasses(
              "text-xl font-medium text-slate-600",
              "text-xl font-medium text-gray-300"
            )}>
              Click the microphone for voice conversation
            </p>
          </div>

          <div className="mb-16">
            <div className="flex gap-4 max-w-4xl mx-auto">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={userMessage}
                  onChange={(e) => setUserMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSubmit(e)}
                  placeholder="Ask me anything or describe what you need..."
                  className={getThemeClasses(
                    "w-full px-8 py-6 border-2 border-white/50 rounded-2xl bg-white/70 backdrop-blur-sm text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-4 focus:ring-blue-500/30 focus:border-blue-500 transition-all duration-300 text-lg shadow-lg hover:shadow-xl",
                    "w-full px-8 py-6 border-2 border-gray-600/50 rounded-2xl bg-gray-800/70 backdrop-blur-sm text-white placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-blue-500/30 focus:border-blue-500 transition-all duration-300 text-lg shadow-lg hover:shadow-xl"
                  )}
                />
                <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                  <Sparkles className="w-6 h-6 text-blue-400 animate-pulse" />
                </div>
              </div>
              <button
                onClick={(e) => { e.preventDefault(); handleSubmit(e); }}
                className="px-10 py-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl hover:from-blue-700 hover:to-purple-700 transition-all duration-300 flex items-center space-x-3 font-semibold text-lg shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                <Send className="w-6 h-6" />
                <span>Send</span>
              </button>
            </div>
          </div>
        </div>

        {/* Enhanced Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto mb-20">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group relative overflow-hidden cursor-pointer h-56"
              style={{ animationDelay: `${index * 0.1}s` }}
              onClick={() => onNavigate(feature.page)}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${feature.bgGradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
              
              <div className={getThemeClasses(
                "relative w-full h-full text-left p-6 bg-white/80 backdrop-blur-sm rounded-3xl border border-white/50 hover:border-white/80 shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 hover:scale-[1.02] flex flex-col justify-between",
                "relative w-full h-full text-left p-6 bg-gray-800/80 backdrop-blur-sm rounded-3xl border border-gray-700/50 hover:border-gray-600/80 shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 hover:scale-[1.02] flex flex-col justify-between"
              )}>
                <div className="flex items-start space-x-4 flex-1">
                  <div className="relative">
                    <div className={`w-14 h-14 bg-gradient-to-br ${feature.gradient} rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110`}>
                      <feature.icon className="w-7 h-7 text-white" />
                    </div>
                    <div className={`absolute inset-0 w-14 h-14 bg-gradient-to-br ${feature.gradient} rounded-2xl blur-xl opacity-0 group-hover:opacity-30 transition-opacity duration-300`} />
                  </div>
                  
                  <div className="flex-1">
                    <h3 className={getThemeClasses(
                      "text-xl font-bold text-slate-900 mb-2 group-hover:text-slate-800 transition-colors",
                      "text-xl font-bold text-white mb-2 group-hover:text-gray-100 transition-colors"
                    )}>
                      {feature.title}
                      {feature.subtitle && (
                        <span className={`block text-lg bg-gradient-to-r ${feature.gradient} bg-clip-text text-transparent font-semibold`}>
                          {feature.subtitle}
                        </span>
                      )}
                    </h3>
                    <p className={getThemeClasses(
                      "text-slate-600 leading-relaxed text-base group-hover:text-slate-700 transition-colors",
                      "text-gray-300 leading-relaxed text-base group-hover:text-gray-200 transition-colors"
                    )}>
                      {feature.description}
                    </p>
                  </div>
                </div>
                
                <div className="mt-4 flex items-center text-base font-semibold opacity-0 group-hover:opacity-100 transform translate-x-0 group-hover:translate-x-2 transition-all duration-300">
                  <span className={`bg-gradient-to-r ${feature.gradient} bg-clip-text text-transparent`}>
                    Explore Feature
                  </span>
                  <div className="ml-3 w-6 h-6 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white text-sm transform group-hover:translate-x-2 transition-transform duration-300">
                    →
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className={getThemeClasses(
        "relative border-t border-white/20 bg-white/60 backdrop-blur-xl mt-24",
        "relative border-t border-gray-700/20 bg-gray-800/60 backdrop-blur-xl mt-24"
      )}>
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="text-center">
            <div className="flex justify-center mb-6">
              <div className={getThemeClasses(
                "flex items-center space-x-3 text-slate-600",
                "flex items-center space-x-3 text-gray-300"
              )}>
                <img 
                  src="/neutex-logo.png" 
                  alt="Neutex AI" 
                  className="w-10 h-10"
                />
                <span className="font-semibold text-lg">Powered by Advanced AI</span>
              </div>
            </div>
            
            <p className={getThemeClasses(
              "text-slate-600 text-lg leading-relaxed",
              "text-gray-300 text-lg leading-relaxed"
            )}>
              © 2025 Neutex AI - Developed by <span className={getThemeClasses("font-semibold text-slate-800", "font-semibold text-white")}>Team Neutex</span>
            </p>
            <p className="text-blue-600 font-semibold mt-2">
              Dr. A.P.J. Abdul Kalam Technical University
            </p>
            
            <div className="mt-6 flex justify-center items-center space-x-6">
              {['Innovation', 'Excellence', 'Future'].map((value, i) => (
                <div key={i} className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full animate-pulse" style={{ animationDelay: `${i * 0.7}s` }} />
                  <span className={getThemeClasses("text-slate-600 font-medium", "text-gray-300 font-medium")}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}