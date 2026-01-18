import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { makeAPICall } from '../config/api';
import { 
  ChevronLeft, Settings, User, Camera, Type, Sparkles, 
  Copy, Download, RefreshCw, Moon, Sun, Instagram, 
  Linkedin, Twitter, Facebook, Image as ImageIcon, Wand2
} from 'lucide-react';

const SocialMediaGenerator = ({ onNavigate }) => {
  const { isDarkMode, toggleTheme } = useTheme();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeTab, setActiveTab] = useState('text');
  const [textPrompt, setTextPrompt] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [additionalContext, setAdditionalContext] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState('Instagram');
  const [captionLength, setCaptionLength] = useState('medium'); // New state
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [generatedContent, setGeneratedContent] = useState({
    caption: '',
    emojis: '',
    hashtags: ''
  });
  const [generatedImage, setGeneratedImage] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');

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

  // Platform options with icons
  const platforms = [
    { id: 'Instagram', name: 'Instagram', icon: Instagram, color: 'from-pink-500 to-orange-500' },
    { id: 'LinkedIn', name: 'LinkedIn', icon: Linkedin, color: 'from-blue-600 to-blue-700' },
    { id: 'Twitter', name: 'Twitter', icon: Twitter, color: 'from-blue-400 to-blue-500' },
    { id: 'Facebook', name: 'Facebook', icon: Facebook, color: 'from-blue-600 to-blue-800' },
    { id: 'TikTok', name: 'TikTok', color: 'from-red-500 to-black' },
    { id: 'YouTube', name: 'YouTube', color: 'from-red-600 to-red-700' }
  ];

  // Caption length options
  const captionLengthOptions = [
    { id: 'short', name: 'Short', description: '1-2 sentences, concise and punchy' },
    { id: 'medium', name: 'Medium', description: '2-4 sentences, balanced length' },
    { id: 'long', name: 'Long', description: '4-6 sentences, detailed and engaging' }
  ];

  // Handle image upload
  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setSelectedImage(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Generate AI image based on caption
  const generateImageFromCaption = async () => {
    if (!generatedContent.caption) {
      setStatusMessage('Please generate content first to create an image');
      return;
    }

    try {
      setIsGeneratingImage(true);
      setStatusMessage('Generating image from your caption...');

      // Create image prompt from caption
      const imagePrompt = `Social media post image: ${generatedContent.caption}. High quality, professional, engaging, suitable for ${selectedPlatform}`;

        const response = await makeAPICall('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: imagePrompt,
          style: 'realistic',
          aspectRatio: selectedPlatform === 'Instagram' ? '1:1' : '16:9',
          outputFormat: 'png'
        })
      });

      const data = await response.json();

      if (response.ok) {
        setGeneratedImage(data.imageUrl);
        setStatusMessage('Image generated successfully!');
      } else {
        setStatusMessage(`Image generation failed: ${data.error}`);
      }
    } catch (error) {
      console.error('Error generating image:', error);
      setStatusMessage(`Image generation error: ${error.message}`);
    } finally {
      setIsGeneratingImage(false);
    }
  };

  // Generate content function
  const generateContent = async () => {
    if (activeTab === 'text' && !textPrompt.trim()) {
      setStatusMessage('Please enter a text prompt');
      return;
    }
    
    if (activeTab === 'image' && !selectedImage) {
      setStatusMessage('Please upload an image');
      return;
    }

    try {
      setIsGenerating(true);
      setStatusMessage('Generating social media content...');

      const requestBody = {
        prompt: activeTab === 'text' ? textPrompt : '',
        image: activeTab === 'image' ? selectedImage : null,
        platform: selectedPlatform,
        additionalContext: additionalContext,
        captionLength: captionLength // Add caption length
      };

     const response = await makeAPICall('/api/generate-social-content', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

      const data = await response.json();

      if (data.success) {
        setGeneratedContent({
          caption: data.caption || '',
          emojis: data.emojis || '',
          hashtags: data.hashtags || ''
        });
        setStatusMessage('Content generated successfully!');
        
        // Auto-generate image after content is created
        if (data.caption) {
          setTimeout(() => generateImageFromCaption(), 1000);
        }
      } else {
        setStatusMessage(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error generating content:', error);
      setStatusMessage(`Error: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  // Copy to clipboard function
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setStatusMessage('Copied to clipboard!');
  };

  // Copy full post
  const copyFullPost = () => {
    const fullPost = `${generatedContent.caption}\n\n${generatedContent.emojis}\n\n${generatedContent.hashtags}`;
    navigator.clipboard.writeText(fullPost);
    setStatusMessage('Full post copied to clipboard!');
  };

  // Download just the generated image
  const downloadImage = () => {
    if (!generatedImage) return;
    
    const link = document.createElement('a');
    link.download = `ai_generated_image_${Date.now()}.png`;
    link.href = generatedImage;
    link.click();
    setStatusMessage('Image downloaded successfully!');
  };

  // Download post as image
  const downloadPost = () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Set canvas size based on platform
    const aspectRatio = selectedPlatform === 'Instagram' ? 1 : (selectedPlatform === 'Twitter' ? 16/9 : 4/3);
    canvas.width = 800;
    canvas.height = aspectRatio === 1 ? 800 : (aspectRatio === 16/9 ? 450 : 600);
    
    // Background
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, isDarkMode ? '#1f2937' : '#f8fafc');
    gradient.addColorStop(1, isDarkMode ? '#374151' : '#e2e8f0');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Platform header
    ctx.fillStyle = isDarkMode ? '#ffffff' : '#1e293b';
    ctx.font = 'bold 24px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${selectedPlatform} Post`, canvas.width / 2, 40);
    
    let yPosition = 80;
    
    // Add generated image if available
    if (generatedImage) {
      const img = new Image();
      img.onload = () => {
        const imageHeight = 200;
        const imageWidth = (img.width / img.height) * imageHeight;
        const imageX = (canvas.width - imageWidth) / 2;
        
        ctx.drawImage(img, imageX, yPosition, imageWidth, imageHeight);
        yPosition += imageHeight + 30;
        
        drawTextContent();
      };
      img.src = generatedImage;
    } else {
      drawTextContent();
    }
    
    function drawTextContent() {
      const margin = 40;
      const maxWidth = canvas.width - (margin * 2);
      
      // Caption
      if (generatedContent.caption) {
        ctx.fillStyle = isDarkMode ? '#ffffff' : '#1e293b';
        ctx.font = '18px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
        ctx.textAlign = 'left';
        
        const captionLines = wrapText(ctx, generatedContent.caption, maxWidth);
        captionLines.forEach((line, index) => {
          ctx.fillText(line, margin, yPosition + (index * 25));
        });
        yPosition += captionLines.length * 25 + 20;
      }
      
      // Emojis
      if (generatedContent.emojis) {
        ctx.font = '24px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
        ctx.fillText(generatedContent.emojis, margin, yPosition);
        yPosition += 40;
      }
      
      // Hashtags
      if (generatedContent.hashtags) {
        ctx.fillStyle = isDarkMode ? '#60a5fa' : '#3b82f6';
        ctx.font = '16px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
        
        const hashtagLines = wrapText(ctx, generatedContent.hashtags, maxWidth);
        hashtagLines.forEach((line, index) => {
          ctx.fillText(line, margin, yPosition + (index * 22));
        });
        yPosition += hashtagLines.length * 22 + 20;
      }
      
      // Footer
      ctx.fillStyle = isDarkMode ? '#9ca3af' : '#6b7280';
      ctx.font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Generated by Neutex AI', canvas.width / 2, canvas.height - 20);
      
      // Download
      const link = document.createElement('a');
      link.download = `${selectedPlatform}_post_${Date.now()}.png`;
      link.href = canvas.toDataURL();
      link.click();
      
      setStatusMessage('Post downloaded successfully!');
    }
    
    function wrapText(context, text, maxWidth) {
      const words = text.split(' ');
      const lines = [];
      let currentLine = words[0];
      
      for (let i = 1; i < words.length; i++) {
        const word = words[i];
        const width = context.measureText(currentLine + ' ' + word).width;
        if (width < maxWidth) {
          currentLine += ' ' + word;
        } else {
          lines.push(currentLine);
          currentLine = word;
        }
      }
      lines.push(currentLine);
      return lines;
    }
  };

  return (
    <div className={getThemeClasses(
      "min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 text-slate-900",
      "min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-indigo-900 text-white"
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
                "p-2 text-slate-600 hover:text-purple-600 hover:bg-white/60 rounded-xl transition-all duration-200",
                "p-2 text-gray-300 hover:text-purple-400 hover:bg-gray-700/60 rounded-xl transition-all duration-200"
              )}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <Sparkles className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className={getThemeClasses(
                  "text-2xl font-bold bg-gradient-to-r from-slate-900 to-purple-600 bg-clip-text text-transparent",
                  "text-2xl font-bold text-white"
                )}>
                  Social Media Generator
                </h1>
                <p className={getThemeClasses("text-sm text-slate-600", "text-sm text-gray-400")}>
                  AI-Powered Content & Image Creation
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button 
              onClick={toggleTheme}
              className={getThemeClasses(
                "p-3 text-slate-600 hover:text-purple-600 hover:bg-white/60 rounded-xl transition-all duration-200",
                "p-3 text-gray-300 hover:text-purple-400 hover:bg-gray-700/60 rounded-xl transition-all duration-200"
              )}
            >
              {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <button className={getThemeClasses(
              "p-3 text-slate-600 hover:text-purple-600 hover:bg-white/60 rounded-xl transition-all duration-200",
              "p-3 text-gray-300 hover:text-purple-400 hover:bg-gray-700/60 rounded-xl transition-all duration-200"
            )}>
              <Settings className="w-5 h-5" />
            </button>
            <button className={getThemeClasses(
              "p-3 text-slate-600 hover:text-purple-600 hover:bg-white/60 rounded-xl transition-all duration-200",
              "p-3 text-gray-300 hover:text-purple-400 hover:bg-gray-700/60 rounded-xl transition-all duration-200"
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
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          
          {/* Input Section */}
          <div className="xl:col-span-2 space-y-6">
            
            {/* Input Type Tabs */}
            <div className={getThemeClasses(
              "bg-white/80 backdrop-blur-sm rounded-3xl p-6 border border-white/50 shadow-lg",
              "bg-gray-800/80 backdrop-blur-sm rounded-3xl p-6 border border-gray-700/50 shadow-lg"
            )}>
              <div className="flex space-x-2 mb-6">
                <button
                  onClick={() => setActiveTab('text')}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition-all ${
                    activeTab === 'text' 
                      ? 'bg-purple-600 text-white shadow-lg' 
                      : getThemeClasses(
                          'bg-white/60 text-slate-600 hover:bg-white/80',
                          'bg-gray-700/60 text-gray-300 hover:bg-gray-700/80'
                        )
                  }`}
                >
                  <Type className="w-4 h-4" />
                  <span>Text Prompt</span>
                </button>
                <button
                  onClick={() => setActiveTab('image')}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition-all ${
                    activeTab === 'image' 
                      ? 'bg-purple-600 text-white shadow-lg' 
                      : getThemeClasses(
                          'bg-white/60 text-slate-600 hover:bg-white/80',
                          'bg-gray-700/60 text-gray-300 hover:bg-gray-700/80'
                        )
                  }`}
                >
                  <Camera className="w-4 h-4" />
                  <span>Image Upload</span>
                </button>
              </div>

              {/* Text Input Tab */}
              {activeTab === 'text' && (
                <div className="space-y-4">
                  <h3 className={getThemeClasses(
                    "text-xl font-bold text-slate-900",
                    "text-xl font-bold text-white"
                  )}>
                    Generate from Text Prompt
                  </h3>
                  <textarea
                    value={textPrompt}
                    onChange={(e) => setTextPrompt(e.target.value)}
                    placeholder="Enter a keyword, theme, or describe what you want to post about..."
                    className={getThemeClasses(
                      "w-full h-32 px-4 py-3 border-2 border-white/50 rounded-xl bg-white/70 text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-4 focus:ring-purple-500/30 focus:border-purple-500 transition-all",
                      "w-full h-32 px-4 py-3 border-2 border-gray-600/50 rounded-xl bg-gray-700/70 text-white placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-purple-500/30 focus:border-purple-500 transition-all"
                    )}
                  />
                </div>
              )}

              {/* Image Input Tab */}
              {activeTab === 'image' && (
                <div className="space-y-4">
                  <h3 className={getThemeClasses(
                    "text-xl font-bold text-slate-900",
                    "text-xl font-bold text-white"
                  )}>
                    Generate from Image
                  </h3>
                  
                  <div className={getThemeClasses(
                    "border-2 border-dashed border-white/50 rounded-xl p-8 text-center bg-white/30 hover:bg-white/40 transition-all",
                    "border-2 border-dashed border-gray-600/50 rounded-xl p-8 text-center bg-gray-700/30 hover:bg-gray-700/40 transition-all"
                  )}>
                    {selectedImage ? (
                      <div className="space-y-4">
                        <img 
                          src={selectedImage} 
                          alt="Uploaded" 
                          className="max-h-64 mx-auto rounded-lg shadow-lg"
                        />
                        <button
                          onClick={() => setSelectedImage(null)}
                          className="text-red-500 hover:text-red-600 text-sm"
                        >
                          Remove Image
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <Camera className={getThemeClasses(
                          "w-12 h-12 text-slate-400 mx-auto",
                          "w-12 h-12 text-gray-500 mx-auto"
                        )} />
                        <p className={getThemeClasses(
                          "text-slate-600",
                          "text-gray-400"
                        )}>
                          Click to upload an image or drag and drop
                        </p>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                          id="image-upload"
                        />
                        <label
                          htmlFor="image-upload"
                          className="inline-block px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors cursor-pointer"
                        >
                          Upload Image
                        </label>
                      </div>
                    )}
                  </div>

                  <textarea
                    value={additionalContext}
                    onChange={(e) => setAdditionalContext(e.target.value)}
                    placeholder="Additional context (optional)..."
                    className={getThemeClasses(
                      "w-full h-24 px-4 py-3 border-2 border-white/50 rounded-xl bg-white/70 text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-4 focus:ring-purple-500/30 focus:border-purple-500 transition-all",
                      "w-full h-24 px-4 py-3 border-2 border-gray-600/50 rounded-xl bg-gray-700/70 text-white placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-purple-500/30 focus:border-purple-500 transition-all"
                    )}
                  />
                </div>
              )}
            </div>

            {/* Platform Selection */}
            <div className={getThemeClasses(
              "bg-white/80 backdrop-blur-sm rounded-3xl p-6 border border-white/50 shadow-lg",
              "bg-gray-800/80 backdrop-blur-sm rounded-3xl p-6 border border-gray-700/50 shadow-lg"
            )}>
              <h3 className={getThemeClasses(
                "text-xl font-bold text-slate-900 mb-4",
                "text-xl font-bold text-white mb-4"
              )}>
                Choose Platform
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {platforms.map((platform) => {
                  const IconComponent = platform.icon;
                  return (
                    <button
                      key={platform.id}
                      onClick={() => setSelectedPlatform(platform.id)}
                      className={`p-4 rounded-xl border-2 transition-all flex items-center justify-center space-x-2 ${
                        selectedPlatform === platform.id
                          ? `bg-gradient-to-r ${platform.color} text-white border-white/30 shadow-lg scale-105`
                          : getThemeClasses(
                              'bg-white/60 border-white/50 text-slate-600 hover:bg-white/80',
                              'bg-gray-700/60 border-gray-600/50 text-gray-300 hover:bg-gray-700/80'
                            )
                      }`}
                    >
                      {IconComponent && <IconComponent className="w-5 h-5" />}
                      <span className="font-medium">{platform.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Caption Length Selection */}
            <div className={getThemeClasses(
              "bg-white/80 backdrop-blur-sm rounded-3xl p-6 border border-white/50 shadow-lg",
              "bg-gray-800/80 backdrop-blur-sm rounded-3xl p-6 border border-gray-700/50 shadow-lg"
            )}>
              <h3 className={getThemeClasses(
                "text-xl font-bold text-slate-900 mb-4",
                "text-xl font-bold text-white mb-4"
              )}>
                Caption Length
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {captionLengthOptions.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => setCaptionLength(option.id)}
                    className={`p-4 rounded-xl border-2 transition-all text-left ${
                      captionLength === option.id
                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-white/30 shadow-lg scale-105'
                        : getThemeClasses(
                            'bg-white/60 border-white/50 text-slate-600 hover:bg-white/80',
                            'bg-gray-700/60 border-gray-600/50 text-gray-300 hover:bg-gray-700/80'
                          )
                    }`}
                  >
                    <div className="font-semibold">{option.name}</div>
                    <div className="text-sm opacity-80 mt-1">{option.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Generate Button */}
            <button
              onClick={generateContent}
              disabled={isGenerating}
              className="w-full px-8 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-2xl hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center space-x-3 font-semibold text-lg shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-6 h-6 animate-spin" />
                  <span>Generating Content...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-6 h-6" />
                  <span>Generate Content</span>
                </>
              )}
            </button>
          </div>

          {/* Output Section */}
          <div className="space-y-6">
            <h3 className={getThemeClasses(
              "text-xl font-bold text-slate-900",
              "text-xl font-bold text-white"
            )}>
              Generated Post Preview
            </h3>

            {/* Generated Image */}
            {(generatedImage || isGeneratingImage) && (
              <div className={getThemeClasses(
                "bg-white/80 backdrop-blur-sm rounded-3xl p-6 border border-white/50 shadow-lg",
                "bg-gray-800/80 backdrop-blur-sm rounded-3xl p-6 border border-gray-700/50 shadow-lg"
              )}>
                <div className="flex items-center justify-between mb-3">
                  <h4 className={getThemeClasses(
                    "font-semibold text-slate-900",
                    "font-semibold text-white"
                  )}>
                    AI Generated Image
                  </h4>
                  <button
                    onClick={generateImageFromCaption}
                    disabled={isGeneratingImage || !generatedContent.caption}
                    className={getThemeClasses(
                      "p-2 text-slate-500 hover:text-purple-600 rounded-lg transition-colors disabled:opacity-50",
                      "p-2 text-gray-400 hover:text-purple-400 rounded-lg transition-colors disabled:opacity-50"
                    )}
                  >
                    <Wand2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="min-h-[200px] bg-gray-100 dark:bg-gray-700 rounded-xl flex items-center justify-center relative group">
                  {isGeneratingImage ? (
                    <div className="text-center">
                      <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-purple-600" />
                      <p className="text-sm text-gray-600 dark:text-gray-400">Generating image...</p>
                    </div>
                  ) : generatedImage ? (
                    <div className="relative w-full">
                      <img 
                        src={generatedImage} 
                        alt="Generated post" 
                        className="max-w-full h-auto rounded-lg shadow-lg mx-auto"
                      />
                      {/* Hover overlay with download button */}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg flex items-center justify-center">
                        <button
                          onClick={downloadImage}
                          className="px-4 py-2 bg-white/90 text-gray-900 rounded-lg hover:bg-white transition-colors duration-200 flex items-center space-x-2 font-medium shadow-lg"
                        >
                          <Download className="w-4 h-4" />
                          <span>Download Image</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center text-gray-500">
                      <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Generate content first to create image</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Caption Output */}
            <div className={getThemeClasses(
              "bg-white/80 backdrop-blur-sm rounded-3xl p-6 border border-white/50 shadow-lg",
              "bg-gray-800/80 backdrop-blur-sm rounded-3xl p-6 border border-gray-700/50 shadow-lg"
            )}>
              <div className="flex items-center justify-between mb-3">
                <h4 className={getThemeClasses(
                  "font-semibold text-slate-900",
                  "font-semibold text-white"
                )}>
                  Caption ({captionLength})
                </h4>
                {generatedContent.caption && (
                  <button
                    onClick={() => copyToClipboard(generatedContent.caption)}
                    className={getThemeClasses(
                      "p-2 text-slate-500 hover:text-purple-600 rounded-lg transition-colors",
                      "p-2 text-gray-400 hover:text-purple-400 rounded-lg transition-colors"
                    )}
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                )}
              </div>
              <div className={getThemeClasses(
                "min-h-[100px] p-4 bg-white/60 rounded-xl border border-white/50 text-slate-800",
                "min-h-[100px] p-4 bg-gray-700/60 rounded-xl border border-gray-600/50 text-gray-200"
              )}>
                {generatedContent.caption || 'Your generated caption will appear here...'}
              </div>
            </div>

            {/* Emojis Output */}
            <div className={getThemeClasses(
              "bg-white/80 backdrop-blur-sm rounded-3xl p-6 border border-white/50 shadow-lg",
              "bg-gray-800/80 backdrop-blur-sm rounded-3xl p-6 border border-gray-700/50 shadow-lg"
            )}>
              <div className="flex items-center justify-between mb-3">
                <h4 className={getThemeClasses(
                  "font-semibold text-slate-900",
                  "font-semibold text-white"
                )}>
                  Emojis
                </h4>
                {generatedContent.emojis && (
                  <button
                    onClick={() => copyToClipboard(generatedContent.emojis)}
                    className={getThemeClasses(
                      "p-2 text-slate-500 hover:text-purple-600 rounded-lg transition-colors",
                      "p-2 text-gray-400 hover:text-purple-400 rounded-lg transition-colors"
                    )}
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                )}
              </div>
              <div className={getThemeClasses(
                "min-h-[60px] p-4 bg-white/60 rounded-xl border border-white/50 text-slate-800 text-2xl",
                "min-h-[60px] p-4 bg-gray-700/60 rounded-xl border border-gray-600/50 text-gray-200 text-2xl"
              )}>
                {generatedContent.emojis || 'Emojis will appear here...'}
              </div>
            </div>

            {/* Hashtags Output */}
            <div className={getThemeClasses(
              "bg-white/80 backdrop-blur-sm rounded-3xl p-6 border border-white/50 shadow-lg",
              "bg-gray-800/80 backdrop-blur-sm rounded-3xl p-6 border border-gray-700/50 shadow-lg"
            )}>
              <div className="flex items-center justify-between mb-3">
                <h4 className={getThemeClasses(
                  "font-semibold text-slate-900",
                  "font-semibold text-white"
                )}>
                  Hashtags
                </h4>
                {generatedContent.hashtags && (
                  <button
                    onClick={() => copyToClipboard(generatedContent.hashtags)}
                    className={getThemeClasses(
                      "p-2 text-slate-500 hover:text-purple-600 rounded-lg transition-colors",
                      "p-2 text-gray-400 hover:text-purple-400 rounded-lg transition-colors"
                    )}
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                )}
              </div>
              <div className={getThemeClasses(
                "min-h-[80px] p-4 bg-white/60 rounded-xl border border-white/50 text-slate-800",
                "min-h-[80px] p-4 bg-gray-700/60 rounded-xl border border-gray-600/50 text-gray-200"
              )}>
                {generatedContent.hashtags || 'Hashtags will appear here...'}
              </div>
            </div>

            {/* Action Buttons */}
            {(generatedContent.caption || generatedContent.emojis || generatedContent.hashtags) && (
              <div className="space-y-3">
                <button
                  onClick={copyFullPost}
                  className="w-full px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all duration-300 flex items-center justify-center space-x-2 font-semibold"
                >
                  <Copy className="w-5 h-5" />
                  <span>Copy Full Post</span>
                </button>
                
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={generateImageFromCaption}
                    disabled={isGeneratingImage}
                    className="px-4 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl hover:from-blue-700 hover:to-cyan-700 disabled:opacity-50 transition-all duration-300 flex items-center justify-center space-x-2 font-semibold"
                  >
                    {isGeneratingImage ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Wand2 className="w-4 h-4" />
                    )}
                    <span>{isGeneratingImage ? 'Generating...' : 'Generate Image'}</span>
                  </button>
                  
                  <button
                    onClick={downloadPost}
                    className="px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all duration-300 flex items-center justify-center space-x-2 font-semibold"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download</span>
                  </button>
                </div>
              </div>
            )}

            {/* Status Message */}
            {statusMessage && (
              <div className={getThemeClasses(
                "p-4 bg-purple-50 border border-purple-200 rounded-xl",
                "p-4 bg-purple-900/20 border border-purple-800 rounded-xl"
              )}>
                <p className={getThemeClasses(
                  "text-purple-800",
                  "text-purple-300"
                )}>
                  {statusMessage}
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default SocialMediaGenerator;