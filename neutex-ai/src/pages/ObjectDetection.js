import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { makeAPICall } from '../config/api';
import { 
  Camera, 
  Upload, 
  Play, 
  Pause, 
  Square, 
  Download, 
  Settings, 
  User, 
  Brain, 
  Eye, 
  Zap, 
  Target, 
  Sparkles,
  ChevronLeft,
  RotateCcw,
  Maximize,
  Filter,
  BarChart3,
  FileVideo,
  Cpu,
  Activity,
  Moon,
  Sun
} from 'lucide-react';

export default function ObjectDetection({ onNavigate }) {
  const { isDarkMode, toggleTheme } = useTheme();
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [detectionResults, setDetectionResults] = useState([]);
  const [aiSmartMode, setAiSmartMode] = useState(true);
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.5);
  const [selectedModel, setSelectedModel] = useState('person-c4ikq/1');
  const [processingStatus, setProcessingStatus] = useState('idle');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [detectionInterval, setDetectionInterval] = useState(null);
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

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

  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (detectionInterval) {
        clearInterval(detectionInterval);
      }
    };
  }, [detectionInterval]);

  // Helper function to convert file to base64
  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
    });
  };

  // Main detection function that calls Roboflow API
const handleDetection = async (imageSource) => {
  if (processingStatus === 'processing') return;
  
  setProcessingStatus('processing');
  
  try {
    let imageData;
    
    if (imageSource === 'camera' && videoRef.current && isLiveMode) {
      // Camera detection
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = videoRef.current.videoWidth || 640;
      canvas.height = videoRef.current.videoHeight || 480;
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      imageData = canvas.toDataURL('image/jpeg', 0.8);
      
    } else if ((imageSource === 'file' || !imageSource) && uploadedFile) {
      // File detection - this is what's missing!
      imageData = await fileToBase64(uploadedFile);
      console.log('Using uploaded file for detection');
      
    } else {
      throw new Error('No valid image source available');
    }

    console.log('Sending to Roboflow API with model:', selectedModel);
    console.log('Image data length:', imageData.length);
    
   const response = await makeAPICall('/api/detect-objects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageData,
        model: selectedModel,
        confidenceThreshold
      })
    });

    const data = await response.json();
    
    if (response.ok) {
      setDetectionResults(data.detections || []);
      setProcessingStatus('completed');
      console.log('Detection completed:', data.detections?.length || 0, 'objects found');
    } else {
      throw new Error(data.error || 'Detection failed');
    }

  } catch (error) {
    console.error('Detection error:', error);
    setProcessingStatus('idle');
    alert('Detection failed: ' + error.message);
  }
};

  const toggleLiveMode = async () => {
    if (!isLiveMode) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            width: { ideal: 1280 },
            height: { ideal: 720 }
          } 
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          
          // Wait for video to load metadata
          videoRef.current.onloadedmetadata = () => {
            console.log('Video dimensions:', videoRef.current.videoWidth, 'x', videoRef.current.videoHeight);
          };
        }
        
        setIsLiveMode(true);
        setProcessingStatus('streaming');
        console.log('Camera activated successfully');
        
      } catch (error) {
        console.error('Error accessing camera:', error);
        alert('Cannot access camera. Please check permissions and ensure camera is available.');
      }
    } else {
      // Stop camera
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = videoRef.current.srcObject.getTracks();
        tracks.forEach(track => track.stop());
        videoRef.current.srcObject = null;
      }
      
      // Stop any ongoing detection
      if (detectionInterval) {
        clearInterval(detectionInterval);
        setDetectionInterval(null);
      }
      
      setIsLiveMode(false);
      setIsRecording(false);
      setProcessingStatus('idle');
      setDetectionResults([]);
      console.log('Camera deactivated');
    }
  };

  const toggleRecording = () => {
    if (!isRecording) {
      // Start continuous detection
      setIsRecording(true);
      setProcessingStatus('recording');
      
      // Run initial detection
      handleDetection('camera');
      
      // Set up interval for continuous detection (every 2 seconds)
      const interval = setInterval(() => {
        if (videoRef.current && videoRef.current.readyState >= 2) {
          handleDetection('camera');
        }
      }, 2000);
      
      setDetectionInterval(interval);
      console.log('Started continuous detection');
      
    } else {
      // Stop continuous detection
      setIsRecording(false);
      setProcessingStatus('streaming');
      
      if (detectionInterval) {
        clearInterval(detectionInterval);
        setDetectionInterval(null);
      }
      
      console.log('Stopped continuous detection');
    }
  };

const handleFileUpload = async (event) => {
  const file = event.target.files[0];
  if (file) {
    console.log('File selected:', file.name);
    setDetectionResults([]);
    setUploadedFile(file);
    
    // Don't rely on state, use the file directly
    try {
      setProcessingStatus('processing');
      const imageData = await fileToBase64(file);
      
      const response = await fetch('http://localhost:3001/api/detect-objects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageData,
          model: selectedModel,
          confidenceThreshold
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        setDetectionResults(data.detections || []);
        setProcessingStatus('completed');
        console.log('Detection completed:', data.detections?.length || 0, 'objects found');
      } else {
        throw new Error(data.error || 'Detection failed');
      }
    } catch (error) {
      console.error('Detection error:', error);
      setProcessingStatus('idle');
      alert('Detection failed: ' + error.message);
    }
  }
};

  const exportResults = () => {
    const data = {
      timestamp: new Date().toISOString(),
      model: selectedModel,
      confidence_threshold: confidenceThreshold,
      total_objects: detectionResults.length,
      results: detectionResults.map(result => ({
        object: result.object,
        confidence: result.confidence,
        bbox: result.bbox
      }))
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `neutex-detection-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    console.log('Detection results exported');
  };

  const resetSettings = () => {
    setConfidenceThreshold(0.5);
    setSelectedModel('coco');
    setDetectionResults([]);
    console.log('Settings reset to defaults');
  };

  const optimizeSettings = () => {
    // Auto-optimize based on current results
    if (detectionResults.length === 0) {
      setConfidenceThreshold(0.3); // Lower threshold for more detections
    } else if (detectionResults.length > 10) {
      setConfidenceThreshold(0.7); // Higher threshold for fewer, more confident detections
    }
    console.log('Settings optimized automatically');
  };

  // Available Roboflow models
  const models = [
  { id: 'person-c4ikq/1', name: 'Person Detection', description: 'Detects people in images (YOLOv11)' },
  { id: 'coco', name: 'General Objects', description: 'Multiple object types (fallback)' }
];

  return (
    <div className={getThemeClasses(
      "min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 text-slate-900 relative overflow-hidden",
      "min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 text-white relative overflow-hidden"
    )}>
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(15)].map((_, i) => (
          <div
            key={i}
            className={getThemeClasses(
              "absolute w-1 h-1 bg-blue-400 rounded-full opacity-30 animate-pulse",
              "absolute w-1 h-1 bg-blue-300 rounded-full opacity-40 animate-pulse"
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
            "absolute w-96 h-96 rounded-full opacity-10 blur-3xl bg-gradient-to-r from-blue-400 to-purple-600 animate-pulse",
            "absolute w-96 h-96 rounded-full opacity-20 blur-3xl bg-gradient-to-r from-blue-400 to-purple-600 animate-pulse"
          )}
          style={{
            left: `${mousePosition.x / (typeof window !== 'undefined' ? window.innerWidth : 1920) * 100}%`,
            top: `${mousePosition.y / (typeof window !== 'undefined' ? window.innerHeight : 1080) * 100}%`,
            transform: 'translate(-50%, -50%)',
            transition: 'all 0.3s ease-out'
          }}
        />
      </div>

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
            <div className="flex items-center space-x-3 group">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <Eye className="w-7 h-7 text-white animate-pulse" />
              </div>
              <div>
                <h1 className={getThemeClasses(
                  "text-2xl font-bold bg-gradient-to-r from-slate-900 to-blue-600 bg-clip-text text-transparent",
                  "text-2xl font-bold text-white"
                )}>
                  Object Detection
                </h1>
                <p className={getThemeClasses("text-sm text-slate-600", "text-sm text-gray-400")}>Advanced Computer Vision AI</p>
              </div>
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
          
          {/* Main Detection Area */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Control Panel */}
            <div className={getThemeClasses(
              "bg-white/80 backdrop-blur-sm rounded-3xl p-6 border border-white/50 shadow-lg",
              "bg-gray-800/80 backdrop-blur-sm rounded-3xl p-6 border border-gray-700/50 shadow-lg"
            )}>
              <div className="flex items-center justify-between mb-6">
                <h2 className={getThemeClasses(
                  "text-2xl font-bold text-slate-900 flex items-center space-x-2",
                  "text-2xl font-bold text-white flex items-center space-x-2"
                )}>
                  <Target className="w-6 h-6 text-blue-600" />
                  <span>Detection Controls</span>
                </h2>
                
                <div className="flex items-center space-x-2">
                  <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                    processingStatus === 'idle' ? getThemeClasses('bg-gray-100 text-gray-600', 'bg-gray-700 text-gray-300') :
                    processingStatus === 'streaming' ? 'bg-blue-100 text-blue-600' :
                    processingStatus === 'recording' ? 'bg-red-100 text-red-600' :
                    processingStatus === 'processing' ? 'bg-yellow-100 text-yellow-600' :
                    'bg-green-100 text-green-600'
                  }`}>
                    <div className="flex items-center space-x-1">
                      <Activity className="w-3 h-3" />
                      <span className="capitalize">{processingStatus}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Live Detection */}
                <button
                  onClick={toggleLiveMode}
                  disabled={processingStatus === 'processing'}
                  className={`p-6 rounded-2xl border-2 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed ${
                    isLiveMode
                      ? getThemeClasses(
                          'bg-gradient-to-br from-green-50 to-emerald-50 border-green-300 shadow-lg',
                          'bg-gradient-to-br from-green-900/30 to-emerald-900/30 border-green-600 shadow-lg'
                        )
                      : getThemeClasses(
                          'bg-white/70 border-white/50 hover:border-blue-300 hover:shadow-lg',
                          'bg-gray-700/70 border-gray-600/50 hover:border-blue-500 hover:shadow-lg'
                        )
                  }`}
                >
                  <div className="flex items-center space-x-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      isLiveMode ? 'bg-gradient-to-br from-green-500 to-emerald-500' : 'bg-gradient-to-br from-blue-500 to-purple-500'
                    }`}>
                      <Camera className="w-6 h-6 text-white" />
                    </div>
                    <div className="text-left">
                      <h3 className={getThemeClasses("font-semibold text-slate-900", "font-semibold text-white")}>Live Detection</h3>
                      <p className={getThemeClasses("text-sm text-slate-600", "text-sm text-gray-300")}>Real-time camera feed</p>
                    </div>
                  </div>
                  {isLiveMode && (
                    <div className="mt-4 flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-sm text-green-600 font-medium">Camera Active</span>
                    </div>
                  )}
                </button>

                {/* File Upload */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={processingStatus === 'processing'}
                  className={getThemeClasses(
                    "p-6 rounded-2xl border-2 bg-white/70 border-white/50 hover:border-purple-300 hover:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed",
                    "p-6 rounded-2xl border-2 bg-gray-700/70 border-gray-600/50 hover:border-purple-500 hover:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  )}
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-purple-500 to-pink-500">
                      <Upload className="w-6 h-6 text-white" />
                    </div>
                    <div className="text-left">
                      <h3 className={getThemeClasses("font-semibold text-slate-900", "font-semibold text-white")}>Upload Media</h3>
                      <p className={getThemeClasses("text-sm text-slate-600", "text-sm text-gray-300")}>Images & Videos</p>
                    </div>
                  </div>
                  {uploadedFile && (
                    <div className="mt-4 flex items-center space-x-2">
                      <FileVideo className="w-4 h-4 text-purple-600" />
                      <span className="text-sm text-purple-600 font-medium truncate">{uploadedFile.name}</span>
                    </div>
                  )}
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>

              {/* Recording Controls */}
              {isLiveMode && (
                <div className="mt-6 flex items-center justify-center space-x-4">
                  <button
                    onClick={toggleRecording}
                    disabled={processingStatus === 'processing'}
                    className={`flex items-center space-x-2 px-6 py-3 rounded-xl font-medium transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed ${
                      isRecording
                        ? 'bg-red-500 hover:bg-red-600 text-white shadow-lg'
                        : 'bg-blue-500 hover:bg-blue-600 text-white shadow-lg'
                    }`}
                  >
                    {isRecording ? <Square className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                    <span>{isRecording ? 'Stop Detection' : 'Start Detection'}</span>
                  </button>
                  
                  <button 
                    onClick={() => handleDetection('camera')}
                    disabled={processingStatus === 'processing' || isRecording}
                    className="flex items-center space-x-2 px-4 py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-medium transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Eye className="w-4 h-4" />
                    <span>Single Shot</span>
                  </button>
                  
                  <button className={getThemeClasses(
                    "p-3 bg-white/70 hover:bg-white/90 rounded-xl text-slate-600 hover:text-slate-900 transition-all duration-200",
                    "p-3 bg-gray-700/70 hover:bg-gray-600/90 rounded-xl text-gray-300 hover:text-white transition-all duration-200"
                  )}>
                    <Maximize className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>

            {/* Detection Display */}
            <div className={getThemeClasses(
              "bg-white/80 backdrop-blur-sm rounded-3xl p-6 border border-white/50 shadow-lg",
              "bg-gray-800/80 backdrop-blur-sm rounded-3xl p-6 border border-gray-700/50 shadow-lg"
            )}>
              <div className={getThemeClasses(
                "aspect-video bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl relative overflow-hidden",
                "aspect-video bg-gradient-to-br from-gray-700 to-gray-800 rounded-2xl relative overflow-hidden"
              )}>
                {isLiveMode ? (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover rounded-2xl"
                  />
                ) : uploadedFile ? (
                  <div className="w-full h-full flex items-center justify-center">
                    {uploadedFile.type.startsWith('image') ? (
                      <img
                        src={URL.createObjectURL(uploadedFile)}
                        alt="Uploaded content"
                        className="max-w-full max-h-full object-contain rounded-2xl"
                      />
                    ) : (
                      <video
                        src={URL.createObjectURL(uploadedFile)}
                        controls
                        className="max-w-full max-h-full object-contain rounded-2xl"
                      />
                    )}
                  </div>
                ) : (
                  <div className={getThemeClasses(
                    "w-full h-full flex flex-col items-center justify-center text-slate-500",
                    "w-full h-full flex flex-col items-center justify-center text-gray-400"
                  )}>
                    <Eye className="w-16 h-16 mb-4 opacity-50" />
                    <p className="text-lg font-medium">No input source selected</p>
                    <p className="text-sm">Start live detection or upload media</p>
                  </div>
                )}

                {/* Detection Overlays */}
                {detectionResults.map((detection) => (
                  <div
                    key={detection.id}
                    className="absolute border-2 border-red-500 rounded pointer-events-none"
                    style={{
                      left: `${detection.bbox[0]}px`,
                      top: `${detection.bbox[1]}px`,
                      width: `${detection.bbox[2]}px`,
                      height: `${detection.bbox[3]}px`,
                    }}
                  >
                    <div className="absolute -top-8 left-0 bg-red-500 text-white px-2 py-1 rounded text-sm font-medium whitespace-nowrap">
                      {detection.object} ({(detection.confidence * 100).toFixed(0)}%)
                    </div>
                  </div>
                ))}

                {processingStatus === 'processing' && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-2xl">
                    <div className="text-center text-white">
                      <Cpu className="w-12 h-12 mx-auto mb-4 animate-spin" />
                      <p className="text-lg font-medium">Processing with Roboflow AI...</p>
                      <p className="text-sm opacity-75">Model: {selectedModel}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            
            {/* AI Smart Mode */}
            <div className={getThemeClasses(
              "bg-white/80 backdrop-blur-sm rounded-3xl p-6 border border-white/50 shadow-lg",
              "bg-gray-800/80 backdrop-blur-sm rounded-3xl p-6 border border-gray-700/50 shadow-lg"
            )}>
              <div className="flex items-center justify-between mb-4">
                <h3 className={getThemeClasses(
                  "text-lg font-bold text-slate-900 flex items-center space-x-2",
                  "text-lg font-bold text-white flex items-center space-x-2"
                )}>
                  <Brain className="w-5 h-5 text-purple-600" />
                  <span>AI Smart Mode</span>
                </h3>
                <button
                  onClick={() => setAiSmartMode(!aiSmartMode)}
                  className={`relative w-12 h-6 rounded-full transition-all duration-300 ${
                    aiSmartMode ? 'bg-green-500' : getThemeClasses('bg-gray-300', 'bg-gray-600')
                  }`}
                >
                  <div className={`absolute w-5 h-5 bg-white rounded-full top-0.5 transition-all duration-300 ${
                    aiSmartMode ? 'left-6' : 'left-0.5'
                  }`} />
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className={getThemeClasses("text-slate-600", "text-gray-300")}>Auto-optimization</span>
                  <span className="text-green-600 font-medium">{aiSmartMode ? 'Enabled' : 'Disabled'}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className={getThemeClasses("text-slate-600", "text-gray-300")}>Smart filtering</span>
                  <span className="text-blue-600 font-medium">Active</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className={getThemeClasses("text-slate-600", "text-gray-300")}>Real-time learning</span>
                  <span className="text-purple-600 font-medium">Learning</span>
                </div>
              </div>
            </div>

            {/* Model Selection */}
            <div className={getThemeClasses(
              "bg-white/80 backdrop-blur-sm rounded-3xl p-6 border border-white/50 shadow-lg",
              "bg-gray-800/80 backdrop-blur-sm rounded-3xl p-6 border border-gray-700/50 shadow-lg"
            )}>
              <h3 className={getThemeClasses(
                "text-lg font-bold text-slate-900 mb-4 flex items-center space-x-2",
                "text-lg font-bold text-white mb-4 flex items-center space-x-2"
              )}>
                <Cpu className="w-5 h-5 text-blue-600" />
                <span>AI Model</span>
              </h3>
              
              <div className="space-y-3">
                {models.map((model) => (
                  <button
                    key={model.id}
                    onClick={() => setSelectedModel(model.id)}
                    disabled={processingStatus === 'processing' || isRecording}
                    className={`w-full p-3 rounded-xl text-left transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed ${
                      selectedModel === model.id
                        ? 'bg-blue-500 text-white shadow-lg'
                        : getThemeClasses(
                            'bg-white/70 hover:bg-white/90 text-slate-900',
                            'bg-gray-700/70 hover:bg-gray-600/90 text-gray-200'
                          )
                    }`}
                  >
                    <div className="font-medium">{model.name}</div>
                    <div className={`text-sm ${selectedModel === model.id ? 'text-blue-100' : getThemeClasses('text-slate-600', 'text-gray-400')}`}>
                      {model.description}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Settings */}
            <div className={getThemeClasses(
              "bg-white/80 backdrop-blur-sm rounded-3xl p-6 border border-white/50 shadow-lg",
              "bg-gray-800/80 backdrop-blur-sm rounded-3xl p-6 border border-gray-700/50 shadow-lg"
            )}>
              <h3 className={getThemeClasses(
                "text-lg font-bold text-slate-900 mb-4 flex items-center space-x-2",
                "text-lg font-bold text-white mb-4 flex items-center space-x-2"
              )}>
                <Filter className="w-5 h-5 text-orange-600" />
                <span>Detection Settings</span>
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className={getThemeClasses(
                    "block text-sm font-medium text-slate-700 mb-2",
                    "block text-sm font-medium text-gray-200 mb-2"
                  )}>
                    Confidence Threshold: {(confidenceThreshold * 100).toFixed(0)}%
                  </label>
                  <input
                    type="range"
                    min="0.1"
                    max="1"
                    step="0.05"
                    value={confidenceThreshold}
                    onChange={(e) => setConfidenceThreshold(parseFloat(e.target.value))}
                    disabled={processingStatus === 'processing'}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider disabled:opacity-50"
                  />
                  <div className={getThemeClasses(
                    "flex justify-between text-xs text-slate-500 mt-1",
                    "flex justify-between text-xs text-gray-400 mt-1"
                  )}>
                    <span>More detections</span>
                    <span>Higher confidence</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={resetSettings}
                    disabled={processingStatus === 'processing'}
                    className={getThemeClasses(
                      "p-3 bg-white/70 hover:bg-white/90 rounded-xl text-center transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed",
                      "p-3 bg-gray-700/70 hover:bg-gray-600/90 rounded-xl text-center transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    )}
                  >
                    <RotateCcw className={getThemeClasses("w-5 h-5 mx-auto mb-1 text-slate-600", "w-5 h-5 mx-auto mb-1 text-gray-300")} />
                    <span className={getThemeClasses("text-sm font-medium text-slate-700", "text-sm font-medium text-gray-200")}>Reset</span>
                  </button>
                  <button 
                    onClick={optimizeSettings}
                    disabled={processingStatus === 'processing'}
                    className={getThemeClasses(
                      "p-3 bg-white/70 hover:bg-white/90 rounded-xl text-center transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed",
                      "p-3 bg-gray-700/70 hover:bg-gray-600/90 rounded-xl text-center transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    )}
                  >
                    <Sparkles className={getThemeClasses("w-5 h-5 mx-auto mb-1 text-slate-600", "w-5 h-5 mx-auto mb-1 text-gray-300")} />
                    <span className={getThemeClasses("text-sm font-medium text-slate-700", "text-sm font-medium text-gray-200")}>Optimize</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Results Panel */}
            {detectionResults.length > 0 && (
              <div className={getThemeClasses(
                "bg-white/80 backdrop-blur-sm rounded-3xl p-6 border border-white/50 shadow-lg",
                "bg-gray-800/80 backdrop-blur-sm rounded-3xl p-6 border border-gray-700/50 shadow-lg"
              )}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className={getThemeClasses(
                    "text-lg font-bold text-slate-900 flex items-center space-x-2",
                    "text-lg font-bold text-white flex items-center space-x-2"
                  )}>
                    <BarChart3 className="w-5 h-5 text-green-600" />
                    <span>Detection Results</span>
                  </h3>
                  <span className={getThemeClasses(
                    "text-sm text-slate-600 bg-slate-100 px-2 py-1 rounded-full",
                    "text-sm text-gray-300 bg-gray-700 px-2 py-1 rounded-full"
                  )}>
                    {detectionResults.length} objects
                  </span>
                </div>
                
                <div className="space-y-3 mb-4 max-h-40 overflow-y-auto">
                  {detectionResults.map((result) => (
                    <div key={result.id} className={getThemeClasses(
                      "flex items-center justify-between p-3 bg-white/70 rounded-xl",
                      "flex items-center justify-between p-3 bg-gray-700/70 rounded-xl"
                    )}>
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${result.color}`} />
                        <span className={getThemeClasses("font-medium text-slate-900", "font-medium text-white")}>{result.object}</span>
                      </div>
                      <span className={getThemeClasses("text-sm text-slate-600 font-medium", "text-sm text-gray-300 font-medium")}>
                        {(result.confidence * 100).toFixed(1)}%
                      </span>
                    </div>
                  ))}
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={exportResults}
                    className="flex items-center justify-center space-x-2 p-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl transition-all duration-300"
                  >
                    <Download className="w-4 h-4" />
                    <span className="text-sm font-medium">Export</span>
                  </button>
                  <button 
                    onClick={() => handleDetection(isLiveMode ? 'camera' : 'file')}
                    disabled={processingStatus === 'processing' || (!isLiveMode && !uploadedFile)}
                    className="flex items-center justify-center space-x-2 p-3 bg-green-500 hover:bg-green-600 text-white rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span className="text-sm font-medium">Retry</span>
                  </button>
                </div>
              </div>
            )}

            {/* API Status */}
            <div className={getThemeClasses(
              "bg-white/80 backdrop-blur-sm rounded-3xl p-6 border border-white/50 shadow-lg",
              "bg-gray-800/80 backdrop-blur-sm rounded-3xl p-6 border border-gray-700/50 shadow-lg"
            )}>
              <h3 className={getThemeClasses(
                "text-lg font-bold text-slate-900 mb-4 flex items-center space-x-2",
                "text-lg font-bold text-white mb-4 flex items-center space-x-2"
              )}>
                <Zap className="w-5 h-5 text-green-600" />
                <span>API Status</span>
              </h3>
              
              <div className="space-y-3">
                <div className={getThemeClasses(
                  "flex items-center justify-between p-3 bg-green-50 rounded-xl border border-green-200",
                  "flex items-center justify-between p-3 bg-green-900/30 rounded-xl border border-green-700/50"
                )}>
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                    <span className={getThemeClasses("font-medium text-green-800", "font-medium text-green-200")}>Roboflow API</span>
                  </div>
                  <span className={getThemeClasses("text-sm text-green-600 font-medium", "text-sm text-green-300 font-medium")}>Connected</span>
                </div>
                
                <div className={getThemeClasses("text-xs text-slate-500 space-y-1", "text-xs text-gray-400 space-y-1")}>
                  <div>Model: {selectedModel}</div>
                  <div>Confidence: {(confidenceThreshold * 100).toFixed(0)}%</div>
                  <div>Status: {processingStatus}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}