import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { makeAPICall } from '../config/api';
import { Play, Wand2, Download, RefreshCw, Moon, Sun, Trash2, Copy, ArrowLeft, ChevronLeft, Settings, User, Sparkles } from 'lucide-react';

const TextToVideo = ({ onNavigate }) => {
  const { isDarkMode, toggleTheme } = useTheme();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [inputText, setInputText] = useState('');
  const [videoGallery, setVideoGallery] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [generationTime, setGenerationTime] = useState(null);

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

  // Load saved videos on component mount
  useEffect(() => {
    const savedVideos = localStorage.getItem('neutex_video_gallery');
    if (savedVideos) {
      try {
        setVideoGallery(JSON.parse(savedVideos));
      } catch (error) {
        console.error('Error loading saved videos:', error);
      }
    }
  }, []);

  // Generate video function
  const generateVideo = async () => {
    if (!inputText.trim()) {
      setStatusMessage('Please enter a prompt for video generation');
      return;
    }

    try {
      setIsGenerating(true);
      setStatusMessage('Generating video... This may take 30-60 seconds');
      const startTime = Date.now();

          const response = await makeAPICall('/api/generate-video-ltx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt: inputText,
          type: 'text-to-video'
        })
      });

      const data = await response.json();
      const endTime = Date.now();
      const timeTaken = ((endTime - startTime) / 1000).toFixed(1);
      setGenerationTime(timeTaken);

      if (data.success) {
        console.log('Generated video data:', data);
        console.log('Video path from server:', data.videoPath);
        console.log('Full URL will be:', data.videoPath);
        
        const newVideo = {
          id: Date.now(),
          videoPath: data.videoPath, // This is now the direct Supabase URL
          prompt: inputText,
          seed: data.seed,
          provider: data.provider,
          timestamp: new Date().toISOString(),
          generationTime: timeTaken
        };

        const updatedVideos = [newVideo, ...videoGallery];
        setVideoGallery(updatedVideos);
        localStorage.setItem('neutex_video_gallery', JSON.stringify(updatedVideos));
        setStatusMessage(`Video generated successfully in ${timeTaken}s!`);
      } else {
        setStatusMessage(`Video generation failed: ${data.error}`);
      }
    } catch (error) {
      console.error('Video generation error:', error);
      setStatusMessage(`Error: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  // Clear gallery function
  const clearGallery = () => {
    setVideoGallery([]);
    localStorage.removeItem('neutex_video_gallery');
    setStatusMessage('Gallery cleared');
  };

  // Copy prompt function
  const copyPrompt = (prompt) => {
    navigator.clipboard.writeText(prompt);
    setStatusMessage('Prompt copied to clipboard');
  };

  // Sample prompts
  const samplePrompts = [
    "A cute cat walking through a sunny garden with colorful flowers blooming",
    "A robot dancing in a futuristic neon-lit city at night",
    "Ocean waves gently crashing on a sandy beach at golden hour",
    "A magical forest with glowing mushrooms and fireflies dancing",
    "A dragon flying over a medieval castle in the mountains",
    "A butterfly emerging from its cocoon in slow motion"
  ];

  return (
    <div className={getThemeClasses(
      "min-h-screen bg-gradient-to-br from-slate-50 via-pink-50 to-red-50 text-slate-900",
      "min-h-screen bg-gradient-to-br from-gray-900 via-pink-900 to-red-900 text-white"
    )}>
      {/* Header - Consistent with other pages */}
      <header className={getThemeClasses(
        "relative border-b border-white/20 bg-white/60 backdrop-blur-xl shadow-sm",
        "relative border-b border-gray-700/50 bg-gray-900/60 backdrop-blur-xl shadow-sm"
      )}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => onNavigate('home')}
              className={getThemeClasses(
                "p-2 text-slate-600 hover:text-pink-600 hover:bg-white/60 rounded-xl transition-all duration-200",
                "p-2 text-gray-300 hover:text-pink-400 hover:bg-gray-700/60 rounded-xl transition-all duration-200"
              )}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-pink-600 to-red-600 rounded-xl flex items-center justify-center shadow-lg">
                <Play className="w-7 h-7 text-white animate-pulse" />
              </div>
              <div>
                <h1 className={getThemeClasses(
                  "text-2xl font-bold bg-gradient-to-r from-slate-900 to-pink-600 bg-clip-text text-transparent",
                  "text-2xl font-bold text-white"
                )}>
                  Text to Video Generator
                </h1>
                <p className={getThemeClasses("text-sm text-slate-600", "text-sm text-gray-400")}>AI-Powered Video Creation</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Direct Theme Toggle Button */}
            <button 
              onClick={toggleTheme}
              className={getThemeClasses(
                "p-3 text-slate-600 hover:text-pink-600 hover:bg-white/60 rounded-xl transition-all duration-200 hover:scale-105 backdrop-blur-sm",
                "p-3 text-gray-300 hover:text-pink-400 hover:bg-gray-700/60 rounded-xl transition-all duration-200 hover:scale-105 backdrop-blur-sm"
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
              "p-3 text-slate-600 hover:text-pink-600 hover:bg-white/60 rounded-xl transition-all duration-200",
              "p-3 text-gray-300 hover:text-pink-400 hover:bg-gray-700/60 rounded-xl transition-all duration-200"
            )}>
              <Settings className="w-5 h-5" />
            </button>
            <button className={getThemeClasses(
              "p-3 text-slate-600 hover:text-pink-600 hover:bg-white/60 rounded-xl transition-all duration-200",
              "p-3 text-gray-300 hover:text-pink-400 hover:bg-gray-700/60 rounded-xl transition-all duration-200"
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
          
          {/* Video Generation Area */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Input Section */}
            <div className={getThemeClasses(
              "bg-white/80 backdrop-blur-sm rounded-3xl p-6 border border-white/50 shadow-lg",
              "bg-gray-800/80 backdrop-blur-sm rounded-3xl p-6 border border-gray-700/50 shadow-lg"
            )}>
              <h2 className={getThemeClasses(
                "text-2xl font-bold text-slate-900 mb-6 flex items-center space-x-2",
                "text-2xl font-bold text-white mb-6 flex items-center space-x-2"
              )}>
                <Wand2 className="w-6 h-6 text-pink-600" />
                <span>Describe Your Video</span>
              </h2>
              
              <div className="space-y-6">
                <div>
                  <label className={getThemeClasses(
                    "block text-lg font-medium text-slate-900 mb-3",
                    "block text-lg font-medium text-white mb-3"
                  )}>
                    Enter your video prompt
                  </label>
                  <textarea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Describe the video you want to generate..."
                    className={getThemeClasses(
                      "w-full h-32 px-6 py-4 border-2 border-white/50 rounded-2xl bg-white/70 backdrop-blur-sm text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-4 focus:ring-pink-500/30 focus:border-pink-500 transition-all duration-300 text-lg resize-none",
                      "w-full h-32 px-6 py-4 border-2 border-gray-600/50 rounded-2xl bg-gray-700/70 backdrop-blur-sm text-white placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-pink-500/30 focus:border-pink-500 transition-all duration-300 text-lg resize-none"
                    )}
                  />
                </div>

                {/* Sample Prompts */}
                <div>
                  <p className={getThemeClasses(
                    "text-sm font-medium text-slate-700 mb-2",
                    "text-sm font-medium text-gray-300 mb-2"
                  )}>
                    Try these sample prompts:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {samplePrompts.map((prompt, index) => (
                      <button
                        key={index}
                        onClick={() => setInputText(prompt)}
                        className={getThemeClasses(
                          "px-3 py-1 text-xs bg-pink-100 text-pink-700 rounded-full hover:bg-pink-200 transition-colors",
                          "px-3 py-1 text-xs bg-pink-900/30 text-pink-300 rounded-full hover:bg-pink-900/50 transition-colors"
                        )}
                      >
                        {prompt.length > 50 ? prompt.substring(0, 50) + '...' : prompt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Generate Button */}
                <div className="flex items-center gap-4">
                  <button
                    onClick={generateVideo}
                    disabled={isGenerating || !inputText.trim()}
                    className="w-full px-8 py-4 bg-gradient-to-r from-pink-600 to-red-600 text-white rounded-2xl hover:from-pink-700 hover:to-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center space-x-3 font-semibold text-lg shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
                  >
                    {isGenerating ? (
                      <>
                        <Sparkles className="w-6 h-6 animate-spin" />
                        <span>Generating Video...</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-6 h-6" />
                        <span>Generate Video</span>
                      </>
                    )}
                  </button>
                </div>

                {generationTime && (
                  <div className="flex justify-center">
                    <span className={getThemeClasses(
                      "text-sm text-slate-600 bg-slate-100 px-3 py-1 rounded-full",
                      "text-sm text-gray-400 bg-gray-700 px-3 py-1 rounded-full"
                    )}>
                      Last generation: {generationTime}s
                    </span>
                  </div>
                )}

                {/* Status Message */}
                {statusMessage && (
                  <div className={getThemeClasses(
                    "p-4 bg-pink-50 border border-pink-200 rounded-xl",
                    "p-4 bg-pink-900/20 border border-pink-800 rounded-xl"
                  )}>
                    <p className={getThemeClasses(
                      "text-pink-800",
                      "text-pink-300"
                    )}>
                      {statusMessage}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Settings Sidebar */}
          <div className="space-y-6">
            
            {/* Video Settings */}
            <div className={getThemeClasses(
              "bg-white/80 backdrop-blur-sm rounded-3xl p-6 border border-white/50 shadow-lg",
              "bg-gray-800/80 backdrop-blur-sm rounded-3xl p-6 border border-gray-700/50 shadow-lg"
            )}>
              <h3 className={getThemeClasses(
                "text-lg font-bold text-slate-900 mb-4 flex items-center space-x-2",
                "text-lg font-bold text-white mb-4 flex items-center space-x-2"
              )}>
                <Play className="w-5 h-5 text-pink-600" />
                <span>Video Settings</span>
              </h3>
              
              <div className="space-y-4">
                <div className={getThemeClasses(
                  "p-4 bg-pink-50 rounded-xl border border-pink-200",
                  "p-4 bg-pink-900/20 rounded-xl border border-pink-700/50"
                )}>
                  <div className={getThemeClasses("text-sm font-medium text-pink-800 mb-1", "text-sm font-medium text-pink-300 mb-1")}>Model: LTX-Video</div>
                  <div className={getThemeClasses("text-xs text-pink-600", "text-xs text-pink-400")}>Resolution: 512x704, Duration: 2 seconds</div>
                </div>
                
                <div className={getThemeClasses(
                  "p-4 bg-blue-50 rounded-xl border border-blue-200",
                  "p-4 bg-blue-900/20 rounded-xl border border-blue-700/50"
                )}>
                  <div className={getThemeClasses("text-sm font-medium text-blue-800 mb-1", "text-sm font-medium text-blue-300 mb-1")}>Provider: Hugging Face</div>
                  <div className={getThemeClasses("text-xs text-blue-600", "text-xs text-blue-400")}>Free tier with 30-60s generation time</div>
                </div>
                
                <div className={getThemeClasses(
                  "p-4 bg-green-50 rounded-xl border border-green-200",
                  "p-4 bg-green-900/20 rounded-xl border border-green-700/50"
                )}>
                  <div className={getThemeClasses("text-sm font-medium text-green-800 mb-1", "text-sm font-medium text-green-300 mb-1")}>Storage: 7 Days</div>
                  <div className={getThemeClasses("text-xs text-green-600", "text-xs text-green-400")}>Videos auto-expire after 7 days</div>
                </div>
              </div>
            </div>

            {/* Quick Tips */}
            <div className={getThemeClasses(
              "bg-white/80 backdrop-blur-sm rounded-3xl p-6 border border-white/50 shadow-lg",
              "bg-gray-800/80 backdrop-blur-sm rounded-3xl p-6 border border-gray-700/50 shadow-lg"
            )}>
              <h3 className={getThemeClasses(
                "text-lg font-bold text-slate-900 mb-4 flex items-center space-x-2",
                "text-lg font-bold text-white mb-4 flex items-center space-x-2"
              )}>
                <Sparkles className="w-5 h-5 text-red-600" />
                <span>Pro Tips</span>
              </h3>
              
              <div className="space-y-3">
                {[
                  'Be descriptive about motion and camera movement',
                  'Include lighting and atmosphere details',
                  'Mention specific objects and their actions',
                  'Keep prompts under 200 characters for best results'
                ].map((tip, index) => (
                  <div key={index} className={getThemeClasses(
                    "p-3 bg-white/70 rounded-xl text-slate-900 text-sm",
                    "p-3 bg-gray-700/70 rounded-xl text-gray-200 text-sm"
                  )}>
                    <div className="flex items-start space-x-2">
                      <div className="w-1.5 h-1.5 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                      <span>{tip}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Video Gallery */}
        {videoGallery.length > 0 && (
          <div className={getThemeClasses(
            "mt-8 bg-white/80 backdrop-blur-sm rounded-3xl p-8 border border-white/50 shadow-lg",
            "mt-8 bg-gray-800/80 backdrop-blur-sm rounded-3xl p-8 border border-gray-700/50 shadow-lg"
          )}>
            <div className="flex items-center justify-between mb-6">
              <h2 className={getThemeClasses(
                "text-2xl font-bold text-slate-900",
                "text-2xl font-bold text-white"
              )}>
                Video Gallery ({videoGallery.length})
              </h2>
              <button
                onClick={clearGallery}
                className={getThemeClasses(
                  "flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors",
                  "flex items-center gap-2 px-4 py-2 text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
                )}
              >
                <Trash2 className="w-4 h-4" />
                Clear Gallery
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {videoGallery.map((video) => (
                <div key={video.id} className={getThemeClasses(
                  "bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow",
                  "bg-gray-700 rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow"
                )}>
                  {/* Video Player */}
                  <div className="relative">
                    <video 
                      controls 
                      className="w-full h-48 object-cover bg-gray-100"
                      onError={(e) => {
                        console.error('Video failed to load:', e.target.src);
                      }}
                      poster="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4K"
                    >
                      <source src={video.videoPath} type="video/mp4" />
                      Your browser does not support the video tag.
                    </video>
                  </div>

                  {/* Video Info */}
                  <div className="p-4">
                    <p className={getThemeClasses(
                      "text-sm text-slate-800 mb-3 line-clamp-3",
                      "text-sm text-gray-200 mb-3 line-clamp-3"
                    )}>
                      {video.prompt}
                    </p>

                    <div className="flex items-center justify-between text-xs mb-3">
                      <span className={getThemeClasses(
                        "text-slate-500",
                        "text-gray-400"
                      )}>
                        {video.provider}
                      </span>
                      <span className={getThemeClasses(
                        "text-slate-500",
                        "text-gray-400"
                      )}>
                        {video.generationTime}s
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className={getThemeClasses(
                        "text-xs text-slate-500",
                        "text-xs text-gray-400"
                      )}>
                        {new Date(video.timestamp).toLocaleDateString()}
                      </span>
                      
                      <div className="flex gap-2">
                        <button
                          onClick={() => copyPrompt(video.prompt)}
                          className={getThemeClasses(
                            "p-1.5 text-slate-500 hover:text-pink-600 hover:bg-pink-50 rounded transition-colors",
                            "p-1.5 text-gray-400 hover:text-pink-400 hover:bg-pink-900/20 rounded transition-colors"
                          )}
                          title="Copy prompt"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                        
                        <a
                          href={video.videoPath}
                          download
                          className={getThemeClasses(
                            "p-1.5 text-slate-500 hover:text-green-600 hover:bg-green-50 rounded transition-colors",
                            "p-1.5 text-gray-400 hover:text-green-400 hover:bg-green-900/20 rounded transition-colors"
                          )}
                          title="Download video"
                        >
                          <Download className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {videoGallery.length === 0 && (
          <div className={getThemeClasses(
            "mt-8 text-center py-12 bg-white/50 backdrop-blur-sm rounded-2xl",
            "mt-8 text-center py-12 bg-gray-800/50 backdrop-blur-sm rounded-2xl"
          )}>
            <Play className={getThemeClasses(
              "w-16 h-16 text-gray-400 mx-auto mb-4",
              "w-16 h-16 text-gray-600 mx-auto mb-4"
            )} />
            <h3 className={getThemeClasses(
              "text-xl font-medium text-slate-900 mb-2",
              "text-xl font-medium text-white mb-2"
            )}>
              No videos generated yet
            </h3>
            <p className={getThemeClasses(
              "text-slate-600",
              "text-gray-400"
            )}>
              Enter a prompt above to generate your first video!
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

export default TextToVideo;