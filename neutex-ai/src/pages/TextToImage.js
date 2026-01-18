import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { makeAPICall } from '../config/api';
import { useTheme } from '../contexts/ThemeContext';
import { Image, ChevronLeft, Settings, User, Sparkles, Wand2, Download, Palette, Layers, Zap, Upload, RefreshCw, Moon, Sun } from 'lucide-react';

export default function TextToImage({ onNavigate }) {
  const { isDarkMode, toggleTheme } = useTheme();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [prompt, setPrompt] = useState('');
  const [selectedStyle, setSelectedStyle] = useState('no-style');
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [selectedModel, setSelectedModel] = useState('pollinations');
  const [outputFormat, setOutputFormat] = useState('png');
  const [referenceImage, setReferenceImage] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [generatedImage, setGeneratedImage] = useState(null);
  const [credits, setCredits] = useState(73);
  const [generationInfo, setGenerationInfo] = useState(null);
  const [negativePrompt, setNegativePrompt] = useState('');
  const [promptHistory, setPromptHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [copyMessage, setCopyMessage] = useState('');
  const [seed, setSeed] = useState('');
  const [useRandomSeed, setUseRandomSeed] = useState(true);
  const [imageGallery, setImageGallery] = useState([]);
  const [showGallery, setShowGallery] = useState(false);
  
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

  const resetComponent = () => {
    setPrompt('');
    setNegativePrompt('');
    setSeed('');
    setUseRandomSeed(true);
    setSelectedStyle('no-style');
    setAspectRatio('1:1');
    setSelectedModel('pollinations');
    setOutputFormat('png');
    setReferenceImage(null);
    setGeneratedImage(null);
    setGenerationInfo(null);
    setIsGenerating(false);
    setIsEnhancing(false);
    setShowHistory(false);
    setShowGallery(false); 
  };

  const models = [
    {
      id: 'pollinations',
      name: 'Pollinations AI',
      description: 'Fast generation, unlimited free',
      speed: 'Fast',
      quality: 'Good',
      cost: 'Free'
    },
    {
      id: 'gemini-image',
      name: 'Gemini 2.5 Flash Image',
      description: 'Google\'s latest image generation',
      speed: 'Medium',
      quality: 'Very Good',
      cost: 'Free (limited)'
    },
    {
      id: 'stable-diffusion',
      name: 'Stable Diffusion',
      description: 'Premium quality, slower generation',
      speed: 'Slow',
      quality: 'Excellent',
      cost: 'Free (via Colab)'
    }
  ];

  const styles = [
    { 
      id: 'no-style', 
      name: 'No Style', 
      thumbnail: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      description: 'Natural generation',
      serverStyle: null
    },
    { 
      id: 'photorealistic', 
      name: 'Photorealistic', 
      thumbnail: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      description: 'Camera-like realism',
      serverStyle: 'realistic'
    },
    { 
      id: 'artistic', 
      name: 'Artistic', 
      thumbnail: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
      description: 'Digital art style',
      serverStyle: 'artistic'
    },
    { 
      id: 'cartoon', 
      name: 'Cartoon', 
      thumbnail: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      description: 'Animated style',
      serverStyle: 'cartoon'
    },
    { 
      id: 'abstract', 
      name: 'Abstract', 
      thumbnail: 'linear-gradient(135deg, #d299c2 0%, #fef9d7 100%)',
      description: 'Abstract art',
      serverStyle: 'abstract'
    },
    { 
      id: 'cinematic', 
      name: 'Cinematic', 
      thumbnail: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
      description: 'Movie-like atmosphere',
      serverStyle: 'cinematic'
    },
    { 
      id: '3d-render', 
      name: '3D Render', 
      thumbnail: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
      description: 'Three-dimensional look',
      serverStyle: '3d'
    },
    { 
      id: 'oil-painting', 
      name: 'Oil Painting', 
      thumbnail: 'linear-gradient(135deg, #89f7fe 0%, #66a6ff 100%)',
      description: 'Traditional oil on canvas',
      serverStyle: 'oil-painting'
    },
    { 
      id: 'watercolor', 
      name: 'Watercolor', 
      thumbnail: 'linear-gradient(135deg, #fdbb2d 0%, #22c1c3 100%)',
      description: 'Soft watercolor effect',
      serverStyle: 'watercolor'
    }
  ];

  const aspectRatios = [
    { id: '1:1', name: 'Square', dimensions: '1024×1024', icon: '⬜' },
    { id: '16:9', name: 'Landscape', dimensions: '1024×576', icon: '🖼️' },
    { id: '9:16', name: 'Portrait', dimensions: '576×1024', icon: '📱' },
    { id: '4:3', name: 'Standard', dimensions: '1024×768', icon: '📺' }
  ];

  const outputFormats = [
    { id: 'png', name: 'PNG', description: 'High quality, transparent background support' },
    { id: 'jpeg', name: 'JPEG', description: 'Smaller file size, good for photos' },
    { id: 'webp', name: 'WebP', description: 'Modern format, best compression' }
  ];

  const handleGenerate = async () => {
    if (prompt.trim()) {
      const finalSeed = useRandomSeed ? Math.floor(Math.random() * 999999999) : (seed || Math.floor(Math.random() * 999999999));

      saveToHistory(prompt, negativePrompt, finalSeed);

      setIsGenerating(true);
      setGeneratedImage(null);
      setGenerationInfo(null);

      try {
        // Convert reference image to base64 if it exists
        let referenceImageBase64 = null;
        if (referenceImage) {
          referenceImageBase64 = await fileToBase64(referenceImage);
        }

        // Determine which endpoint to use based on selected model
        let endpoint = '/api/generate-image'; // Default Pollinations
        
        if (selectedModel === 'stable-diffusion') {
          endpoint = '/api/generate-image-sd';
        } else if (selectedModel === 'gemini-image') {
          endpoint = '/api/generate-image-gemini';
        }
        
        console.log(`Generating image with ${selectedModel} via ${endpoint}`);
        
        // Get the server-compatible style
        const selectedStyleObj = styles.find(s => s.id === selectedStyle);
        const serverStyle = selectedStyleObj?.serverStyle || selectedStyle;
        
       const response = await makeAPICall(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt.trim(),
          negativePrompt: negativePrompt.trim(),
          style: serverStyle,
          aspectRatio: aspectRatio,
          outputFormat: outputFormat,
          referenceImage: referenceImageBase64,
          seed: finalSeed
        })
      });

        
        const data = await response.json();
        
        if (response.ok) {
          setGeneratedImage(data.imageUrl);
          setCredits(prev => Math.max(0, prev - 1));
          setGenerationInfo({
            model: data.model,
            provider: data.provider,
            fallback: data.fallback,
            warning: data.warning,
            format: data.format,
            seed: finalSeed
          });
          
          // Reload gallery from database to show the new image
          setTimeout(async () => {
            try {
              const tempUserId = '00000000-0000-4000-8000-000000000000'
              const galleryResponse = await makeAPICall(`/api/gallery/all`);
              const galleryData = await galleryResponse.json();
              
              if (galleryData.success) {
                setImageGallery(galleryData.gallery);
              }
            } catch (error) {
              console.error('Failed to reload gallery:', error);
            }
          }, 1000); // Small delay to ensure backend has saved the image
          
          console.log(`Image generated successfully using ${data.model} via ${data.provider}`);
          
          if (data.fallback) {
            console.log('Used fallback provider due to primary service failure');
          }
          
          if (data.warning) {
            console.warn('Warning:', data.warning);
          }

          if (referenceImageBase64) {
            console.log('Generated with reference image');
          }
          
        } else {
          throw new Error(data.error || 'Image generation failed');
        }
        
      } catch (error) {
        console.error('Generation error:', error);
        alert(`Image generation failed: ${error.message}\n\nPlease check if your backend server is running on port 3001.`);
      }

      setIsGenerating(false);
    }
  };

  useEffect(() => {
    const savedHistory = localStorage.getItem('neutex_prompt_history');
    if (savedHistory) {
      try {
        setPromptHistory(JSON.parse(savedHistory));
      } catch (error) {
        console.error('Failed to load prompt history:', error);
      }
    }
  }, []);

  const saveToHistory = (prompt, negativePrompt = '', usedSeed = null) => {
    if (!prompt.trim()) return;
    
    const historyItem = {
      id: Date.now(),
      prompt: prompt.trim(),
      negativePrompt: negativePrompt.trim(),
      seed: usedSeed,
      timestamp: new Date().toISOString(),
      style: selectedStyle,
      aspectRatio: aspectRatio
    };
    
    const newHistory = [historyItem, ...promptHistory.filter(item => 
      item.prompt !== prompt.trim() || item.negative_prompt !== negativePrompt.trim()
    )].slice(0, 20); // Keep only last 20 items
    
    setPromptHistory(newHistory);
    localStorage.setItem('neutex_prompt_history', JSON.stringify(newHistory));
  };

  // Add this helper function
  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
    });
  };

  const handleReferenceUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setReferenceImage(file);
      console.log('Reference image selected:', file.name);
    }
  };

  const handleEnhancePrompt = async () => {
    if (!prompt.trim()) {
      alert('Please enter a prompt first');
      return;
    }

    setIsEnhancing(true);

    try {
      const response = await makeAPICall('/api/enhance-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt.trim(),
          style: selectedStyle,
          aspectRatio: aspectRatio
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setPrompt(data.enhancedPrompt);
        console.log('Prompt enhanced successfully');
      } else {
        alert('Failed to enhance prompt: ' + data.error);
      }
    } catch (error) {
      console.error('Enhancement error:', error);
      alert('Failed to enhance prompt. Check if backend server is running.');
    }
    
    setIsEnhancing(false)
  };

  const handleDownload = () => {
    if (generatedImage) {
      const link = document.createElement('a');
      
      // Handle different image URL types
      if (generatedImage.startsWith('data:')) {
        // Base64 data URL (from Stable Diffusion)
        link.href = generatedImage;
        link.download = `neutex-ai-${selectedModel}-${Date.now()}.${outputFormat}`;
      } else {
        // Regular URL (from Pollinations)
        link.href = generatedImage;
        link.download = `neutex-ai-${selectedModel}-${Date.now()}.${outputFormat}`;
        link.target = '_blank';
      }
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleCopyToClipboard = async () => {
    if (!generatedImage) return;
    
    try {
      let blob;
      
      if (generatedImage.startsWith('data:')) {
        // For base64 images, convert to blob properly
        const base64Data = generatedImage.split(',')[1];
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        blob = new Blob([byteArray], { type: 'image/png' });
      } else {
        // For URLs, fetch the image
        const response = await fetch(generatedImage);
        blob = await response.blob();
      }
      
      // Copy as ClipboardItem
      await navigator.clipboard.write([
        new ClipboardItem({
          [blob.type]: blob
        })
      ]);
      
      setCopyMessage('Image copied!');
      
      // Clear message after 2 seconds
      setTimeout(() => setCopyMessage(''), 2000);
    } catch (error) {
      console.error('Failed to copy image:', error);
      setCopyMessage('Copy failed');
      setTimeout(() => setCopyMessage(''), 2000);
    }
  };

  // Load gallery from localStorage on component mount
  useEffect(() => {
    const loadGallery = async () => {
      try {
        const tempUserId = '00000000-0000-4000-8000-000000000000' // Replace with actual user ID when auth is implemented
        
       const response = await makeAPICall('/api/gallery/all');
        const data = await response.json();
        
        if (data.success) {
          setImageGallery(data.gallery);
        }
      } catch (error) {
        console.error('Failed to load gallery from database:', error);
        // Fallback to localStorage if database fails
        const savedGallery = localStorage.getItem('neutex_image_gallery');
        if (savedGallery) {
          try {
            setImageGallery(JSON.parse(savedGallery));
          } catch (parseError) {
            console.error('Failed to parse localStorage gallery:', parseError);
          }
        }
      }
    };

    loadGallery();
  }, []);

  // Download image from gallery
  const downloadGalleryImage = (item) => {
    if (!item.image_url) {
      alert('Image no longer available.');
      return;
    }

    const link = document.createElement('a');
    link.href = item.image_url;
    link.download = `neutex-ai-${item.model}-${item.id}.${item.format || 'png'}`;
    
    if (item.image_url.startsWith('data:')) {
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Delete image from gallery
  const deleteFromGallery = async (itemId) => {
    try {
      const response = makeAPICall(`/api/gallery/${itemId}`, {
        method: 'DELETE'
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Remove from local state
        const newGallery = imageGallery.filter(item => item.id !== itemId);
        setImageGallery(newGallery);
      } else {
        alert('Failed to delete image from gallery');
      }
    } catch (error) {
      console.error('Failed to delete from database:', error);
      alert('Failed to delete image');
    }
  };

  // Clear entire gallery
// Replace your existing clearGallery function with this improved version:
const clearGallery = async () => {
  if (!window.confirm('Are you sure you want to clear all images from the gallery? This action cannot be undone.')) {
    return;
  }
  
  console.log('=== FRONTEND: Starting clear gallery ===');
  
  try {
    console.log('Sending DELETE request to /api/gallery/all');
    
    const response = await makeAPICall('/api/gallery/all', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Response status:', response.status);
    console.log('Response ok:', response.ok);
    
    // Try to get response data even if status is not ok
    let data;
    try {
      const responseText = await response.text();
      console.log('Raw response:', responseText);
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse response as JSON:', parseError);
      throw new Error(`Server returned status ${response.status} with invalid JSON response`);
    }
    
    console.log('Parsed response data:', data);
    
    if (data.success) {
      // Success - clear local state
      setImageGallery([]);
      localStorage.removeItem('neutex_image_gallery');
      console.log('Gallery cleared successfully');
      alert(`Successfully cleared ${data.deleted_count || 0} images from gallery`);
    } else {
      // Server returned structured error
      console.error('Server error:', data.error);
      console.error('Error details:', data.details);
      alert(`Failed to clear gallery: ${data.error}\n\nDetails: ${data.details || 'Check server console for more info'}`);
    }
    
  } catch (error) {
    console.error('=== FRONTEND ERROR ===');
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    console.error('Full error:', error);
    
    if (error.message.includes('fetch')) {
      alert('Failed to clear gallery: Network error. Make sure your server is running on port 3001.');
    } else {
      alert(`Failed to clear gallery: ${error.message}`);
    }
  }
};

  const getAspectRatioClasses = () => {
    switch (aspectRatio) {
      case '16:9': return 'aspect-video';
      case '9:16': return 'aspect-[9/16]';
      case '4:3': return 'aspect-[4/3]';
      default: return 'aspect-square';
    }
  };

  const fillSamplePrompt = () => {
    const samplePrompts = [
      "A futuristic city skyline at sunset with flying cars",
      "A magical forest with glowing mushrooms and fairy lights",
      "A steampunk robot playing chess in a Victorian library",
      "A serene mountain lake reflecting the aurora borealis",
      "A cyberpunk street market with neon signs and rain"
    ];
    const randomPrompt = samplePrompts[Math.floor(Math.random() * samplePrompts.length)];
    setPrompt(randomPrompt);
  };

  return (
    <div className={getThemeClasses(
      "min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-white text-slate-900",
      "min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-slate-900 text-white"
    )}>
      {/* Header */}
      <header className={getThemeClasses(
        "border-b border-white/20 bg-white/60 backdrop-blur-xl shadow-sm",
        "border-b border-gray-700/50 bg-gray-900/60 backdrop-blur-xl shadow-sm"
      )}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => onNavigate('home')}
              className={getThemeClasses(
                "p-2 hover:bg-white/60 rounded-xl transition-colors backdrop-blur-sm",
                "p-2 hover:bg-gray-700/60 rounded-xl transition-colors backdrop-blur-sm"
              )}
            >
              <ChevronLeft className={getThemeClasses("w-6 h-6 text-slate-700", "w-6 h-6 text-gray-300")} />
            </button>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
                <Image className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className={getThemeClasses("text-xl font-bold text-slate-900", "text-xl font-bold text-white")}>
                  AI Image Generation
                </h1>
                <div className="flex items-center space-x-2 text-sm text-slate-600">
                  <Sparkles className="w-3 h-3 text-purple-500" />
                  <span className={getThemeClasses("text-slate-600", "text-gray-400")}>{credits} credits</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button 
              onClick={() => setShowGallery(!showGallery)}
              className={getThemeClasses(
                "p-2 hover:bg-white/60 rounded-xl transition-colors relative",
                "p-2 hover:bg-gray-700/60 rounded-xl transition-colors relative"
              )}
              title="Gallery"
            >
              <Layers className={getThemeClasses("w-5 h-5 text-slate-600", "w-5 h-5 text-gray-300")} />
              {imageGallery.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-purple-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {imageGallery.length}
                </span>
              )}
            </button>
            <button 
              onClick={resetComponent}
              className={getThemeClasses(
                "p-2 hover:bg-white/60 rounded-xl transition-colors",
                "p-2 hover:bg-gray-700/60 rounded-xl transition-colors"
              )}
              title="Reset Form"
            >
              <RefreshCw className={getThemeClasses("w-5 h-5 text-slate-600", "w-5 h-5 text-gray-300")} />
            </button>
            
            {/* Direct Theme Toggle Button */}
            <button 
              onClick={toggleTheme}
              className={getThemeClasses(
                "p-3 text-slate-600 hover:text-purple-600 hover:bg-white/60 rounded-xl transition-all duration-200 hover:scale-105 backdrop-blur-sm",
                "p-3 text-gray-300 hover:text-purple-400 hover:bg-gray-700/60 rounded-xl transition-all duration-200 hover:scale-105 backdrop-blur-sm"
              )}
              title={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
            >
              {isDarkMode ? (
                <Sun className="w-5 h-5" />
              ) : (
                <Moon className="w-5 h-5" />
              )}
            </button>

            {/* Settings Button */}
            <button className={getThemeClasses(
              "p-3 text-slate-600 hover:text-purple-600 hover:bg-white/60 rounded-xl transition-colors backdrop-blur-sm",
              "p-3 text-gray-300 hover:text-purple-400 hover:bg-gray-700/60 rounded-xl transition-colors backdrop-blur-sm"
            )}>
              <Settings className="w-5 h-5" />
            </button>
            
            <button className={getThemeClasses(
              "p-3 text-slate-600 hover:text-purple-600 hover:bg-white/60 rounded-xl transition-colors backdrop-blur-sm",
              "p-3 text-gray-300 hover:text-purple-400 hover:bg-gray-700/60 rounded-xl transition-colors backdrop-blur-sm"
            )}>
              <User className="w-5 h-5" />
            </button>
            <div className={getThemeClasses(
              "ml-4 px-4 py-2 bg-white/40 backdrop-blur-sm rounded-lg border border-white/30",
              "ml-4 px-4 py-2 bg-gray-800/40 backdrop-blur-sm rounded-lg border border-gray-700/30"
            )}>
              <div className={getThemeClasses(
                "text-sm text-slate-700 font-medium",
                "text-sm text-gray-300 font-medium"
              )}>
                {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Configuration Sidebar */}
          <div className="lg:col-span-1">
            <div className={getThemeClasses(
              "bg-white/80 backdrop-blur-sm rounded-3xl border border-white/50 shadow-lg overflow-hidden",
              "bg-gray-800/80 backdrop-blur-sm rounded-3xl border border-gray-700/50 shadow-lg overflow-hidden"
            )}>
              <div className={getThemeClasses(
                "p-6 border-b border-gray-200/50",
                "p-6 border-b border-gray-700/50"
              )}>
                <h2 className={getThemeClasses("text-xl font-bold text-slate-900", "text-xl font-bold text-white")}>
                  Configuration
                </h2>
              </div>
              
              <div className="p-6 space-y-8 max-h-[calc(100vh-200px)] overflow-y-auto">
                
                {/* Model Selection */}
                <div>
                  <label className={getThemeClasses(
                    "block text-sm font-semibold text-slate-700 mb-3",
                    "block text-sm font-semibold text-gray-300 mb-3"
                  )}>Model</label>
                  <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className={getThemeClasses(
                      "w-full p-3 bg-white/90 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-slate-900",
                      "w-full p-3 bg-gray-700/90 border border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-white"
                    )}
                  >
                    {models.map((model) => (
                      <option key={model.id} value={model.id}>
                        {model.name} - {model.cost}
                      </option>
                    ))}
                  </select>
                  <p className={getThemeClasses("text-xs text-gray-500 mt-2", "text-xs text-gray-400 mt-2")}>
                    {models.find(m => m.id === selectedModel)?.description}
                  </p>
                </div>

                {/* Aspect Ratio & Output Format */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={getThemeClasses(
                      "block text-sm font-semibold text-slate-700 mb-3",
                      "block text-sm font-semibold text-gray-300 mb-3"
                    )}>Aspect Ratio</label>
                    <select
                      value={aspectRatio}
                      onChange={(e) => setAspectRatio(e.target.value)}
                      className={getThemeClasses(
                        "w-full p-3 bg-white/90 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-slate-900",
                        "w-full p-3 bg-gray-700/90 border border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-white"
                      )}
                    >
                      {aspectRatios.map((ratio) => (
                        <option key={ratio.id} value={ratio.id}>
                          {ratio.icon} {ratio.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className={getThemeClasses(
                      "block text-sm font-semibold text-slate-700 mb-3",
                      "block text-sm font-semibold text-gray-300 mb-3"
                    )}>Output Format</label>
                    <select
                      value={outputFormat}
                      onChange={(e) => setOutputFormat(e.target.value)}
                      className={getThemeClasses(
                        "w-full p-3 bg-white/90 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-slate-900",
                        "w-full p-3 bg-gray-700/90 border border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-white"
                      )}
                    >
                      {outputFormats.map((format) => (
                        <option key={format.id} value={format.id}>
                          {format.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Reference Image Upload */}
                <div>
                  <label className={getThemeClasses(
                    "block text-sm font-semibold text-slate-700 mb-3",
                    "block text-sm font-semibold text-gray-300 mb-3"
                  )}>Upload Image (Optional)</label>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className={getThemeClasses(
                      "w-full p-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-purple-400 cursor-pointer transition-colors bg-gray-50/50",
                      "w-full p-4 border-2 border-dashed border-gray-600 rounded-xl hover:border-purple-400 cursor-pointer transition-colors bg-gray-700/50"
                    )}
                  >
                    <div className="text-center">
                      <Upload className={getThemeClasses("w-8 h-8 mx-auto mb-2 text-gray-400", "w-8 h-8 mx-auto mb-2 text-gray-500")} />
                      {referenceImage ? (
                        <span className="text-sm text-purple-600 font-medium">{referenceImage.name}</span>
                      ) : (
                        <>
                          <span className={getThemeClasses("text-sm text-gray-600", "text-sm text-gray-300")}>Choose File</span>
                          <p className={getThemeClasses("text-xs text-gray-500 mt-1", "text-xs text-gray-400 mt-1")}>Upload an image to use as a reference</p>
                        </>
                      )}
                    </div>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleReferenceUpload}
                    className="hidden"
                  />
                </div>

                {/* Style Selection */}
                <div>
                  <label className={getThemeClasses(
                    "block text-sm font-semibold text-slate-700 mb-3",
                    "block text-sm font-semibold text-gray-300 mb-3"
                  )}>Style</label>
                  <div className="grid grid-cols-3 gap-3">
                    {styles.map((style) => (
                      <button
                        key={style.id}
                        onClick={() => setSelectedStyle(style.id)}
                        className={`relative group transition-all duration-300 ${
                          selectedStyle === style.id ? 'ring-2 ring-purple-500 ring-offset-2' : ''
                        }`}
                      >
                        <div
                          className="w-full aspect-square rounded-xl p-4 flex items-center justify-center text-white font-medium text-xs shadow-md"
                          style={{ background: style.thumbnail }}
                        >
                          <span className="text-center leading-tight drop-shadow-md">
                            {style.name}
                          </span>
                        </div>
                        {selectedStyle === style.id && (
                          <div className="absolute -top-1 -right-1 w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
                            <div className="w-2 h-2 bg-white rounded-full"></div>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                  <p className={getThemeClasses("text-xs text-gray-500 mt-2", "text-xs text-gray-400 mt-2")}>
                    Select a style to apply to your prompt
                  </p>
                </div>

                {/* Prompt Input */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className={getThemeClasses(
                      "block text-sm font-semibold text-slate-700",
                      "block text-sm font-semibold text-gray-300"
                    )}>Prompt</label>
                    <div className="flex items-center space-x-3">
                      <button 
                        onClick={fillSamplePrompt}
                        className="text-xs text-purple-600 hover:text-purple-700 font-medium"
                      >
                        Sample Prompt
                      </button>
                      <button 
                        onClick={() => setShowHistory(!showHistory)}
                        className="text-xs text-purple-600 hover:text-purple-700 font-medium flex items-center space-x-1"
                      >
                        <span>History</span>
                        <svg className={`w-4 h-4 transition-transform ${showHistory ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Enter your imagination..."
                    className={getThemeClasses(
                      "w-full h-24 p-4 border border-gray-300 rounded-xl bg-white/90 text-slate-900 placeholder-slate-500 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none",
                      "w-full h-24 p-4 border border-gray-600 rounded-xl bg-gray-700/90 text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none"
                    )}
                  />
                  
                  {/* Prompt History Dropdown */}
                  {showHistory && promptHistory.length > 0 && (
                    <div className={getThemeClasses(
                      "mt-2 max-h-40 overflow-y-auto bg-white border border-gray-200 rounded-xl shadow-lg",
                      "mt-2 max-h-40 overflow-y-auto bg-gray-800 border border-gray-600 rounded-xl shadow-lg"
                    )}>
                      {promptHistory.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => {
                            setPrompt(item.prompt);
                            setNegativePrompt(item.negative_prompt || '');
                            setSelectedStyle(item.style || 'no-style');
                            setAspectRatio(item.aspect_ratio || '1:1');
                            setShowHistory(false);
                          }}
                          className={getThemeClasses(
                            "w-full p-3 text-left hover:bg-purple-50 border-b border-gray-100 last:border-b-0 group",
                            "w-full p-3 text-left hover:bg-gray-700 border-b border-gray-600 last:border-b-0 group"
                          )}
                        >
                          <div className={getThemeClasses(
                            "text-sm text-slate-900 font-medium line-clamp-2",
                            "text-sm text-white font-medium line-clamp-2"
                          )}>{item.prompt}</div>
                          {item.negative_prompt && (
                            <div className="text-xs text-red-600 mt-1">Negative: {item.negative_prompt}</div>
                          )}
                          <div className={getThemeClasses(
                            "text-xs text-slate-500 mt-1",
                            "text-xs text-gray-400 mt-1"
                          )}>
                            {new Date(item.created_at).toLocaleDateString()} • {item.style} • {item.aspect_ratio}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Negative Prompt */}
                <div>
                  <label className={getThemeClasses(
                    "block text-sm font-semibold text-slate-700 mb-3",
                    "block text-sm font-semibold text-gray-300 mb-3"
                  )}>
                    Negative Prompt (Optional)
                  </label>
                  <textarea
                    value={negativePrompt}
                    onChange={(e) => setNegativePrompt(e.target.value)}
                    placeholder="What to avoid in the image... e.g., blurry, low quality, distorted"
                    className={getThemeClasses(
                      "w-full h-20 p-4 border border-gray-300 rounded-xl bg-white/90 text-slate-900 placeholder-slate-500 focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none",
                      "w-full h-20 p-4 border border-gray-600 rounded-xl bg-gray-700/90 text-white placeholder-gray-400 focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
                    )}
                  />
                  <p className={getThemeClasses("text-xs text-gray-500 mt-1", "text-xs text-gray-400 mt-1")}>
                    Specify elements you don't want in the generated image
                  </p>
                </div>

                {/* Seed Control */}
                <div>
                  <label className={getThemeClasses(
                    "block text-sm font-semibold text-slate-700 mb-3",
                    "block text-sm font-semibold text-gray-300 mb-3"
                  )}>
                    Seed Control (Optional)
                  </label>
                  
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="randomSeed"
                        checked={useRandomSeed}
                        onChange={(e) => setUseRandomSeed(e.target.checked)}
                        className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                      />
                      <label htmlFor="randomSeed" className={getThemeClasses("text-sm text-slate-700", "text-sm text-gray-300")}>
                        Use random seed
                      </label>
                    </div>
                    
                    {!useRandomSeed && (
                      <>
                        <input
                          type="number"
                          value={seed}
                          onChange={(e) => setSeed(e.target.value)}
                          placeholder="Enter seed number (e.g. 12345)"
                          className={getThemeClasses(
                            "w-full px-4 py-3 border border-gray-300 rounded-xl bg-white/90 text-slate-900 placeholder-slate-500 focus:ring-2 focus:ring-purple-500 focus:border-purple-500",
                            "w-full px-4 py-3 border border-gray-600 rounded-xl bg-gray-700/90 text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                          )}
                          min="0"
                          max="999999999"
                        />
                        
                        <div className="flex space-x-2">
                          <button
                            onClick={() => setSeed(Math.floor(Math.random() * 999999999))}
                            className={getThemeClasses(
                              "flex-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm text-slate-700 transition-colors",
                              "flex-1 px-3 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg text-sm text-gray-200 transition-colors"
                            )}
                          >
                            Random Seed
                          </button>
                          <button
                            onClick={() => setSeed('')}
                            className={getThemeClasses(
                              "flex-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm text-slate-700 transition-colors",
                              "flex-1 px-3 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg text-sm text-gray-200 transition-colors"
                            )}
                          >
                            Clear
                          </button>
                        </div>
                      </>
                    )}
                  
                  <p className={getThemeClasses("text-xs text-gray-500 mt-2", "text-xs text-gray-400 mt-2")}>
                    Use the same seed to reproduce identical results
                  </p>
                   </div>
                </div>

                {/* Generate Buttons */}
                <div className="flex space-x-2">
                  <button
                    onClick={handleEnhancePrompt}
                    disabled={!prompt.trim() || isEnhancing || isGenerating}
                    className="flex-1 px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center space-x-3 font-semibold shadow-lg hover:shadow-xl"
                  >
                    {isEnhancing ? (
                      <>
                        <Sparkles className="w-5 h-5 animate-spin" />
                        <span>Enhancing...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5" />
                        <span>Enhance</span>
                      </>
                    )}
                  </button>
                  
                  <button
                    onClick={handleGenerate}
                    disabled={!prompt.trim() || isGenerating || isEnhancing}
                    className="flex-1 px-6 py-4 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl hover:from-purple-700 hover:to-purple-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center space-x-3 font-semibold shadow-lg hover:shadow-xl"
                  >
                    {isGenerating ? (
                      <>
                        <Sparkles className="w-5 h-5 animate-spin" />
                        <span>Generating...</span>
                      </>
                    ) : (
                      <>
                        <Wand2 className="w-5 h-5" />
                        <span>Generate</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Preview Area */}
         <div className="lg:col-span-2">
            <div className={getThemeClasses(
              "bg-white/80 backdrop-blur-sm rounded-3xl border border-white/50 shadow-lg p-8",
              "bg-gray-800/80 backdrop-blur-sm rounded-3xl border border-gray-700/50 shadow-lg p-8"
            )}>
              <div className={`w-full ${getAspectRatioClasses()} ${getThemeClasses(
                "bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl relative overflow-hidden group border-2 border-dashed border-gray-300",
                "bg-gradient-to-br from-gray-700 to-gray-800 rounded-2xl relative overflow-hidden group border-2 border-dashed border-gray-600"
              )}`}>
                {generatedImage ? (
                  <>
                    <img
                      src={generatedImage}
                      alt="Generated artwork"
                      className="w-full h-full object-cover rounded-2xl"
                      onError={(e) => {
                        console.error('Image failed to load:', generatedImage);
                        e.target.style.display = 'none';
                      }}
                    />

                    
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                      <div className="flex space-x-3">
                        <button
                          onClick={handleCopyToClipboard}
                          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center space-x-2 font-medium shadow-lg"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          <span>Copy</span>
                        </button>
                        <button
                          onClick={handleDownload}
                          className="px-4 py-2 bg-white text-slate-900 rounded-lg hover:bg-gray-100 transition-colors flex items-center space-x-2 font-medium shadow-lg"
                        >
                          <Download className="w-4 h-4" />
                          <span>Download</span>
                        </button>
                      </div>
                    </div>
                    
                    {/* Copy Message */}
                    {copyMessage && (
                      <div className="absolute top-4 right-4 bg-green-500 text-white px-3 py-1 rounded-lg text-sm font-medium">
                        {copyMessage}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-gray-500">
                    {isGenerating ? (
                      <div className="text-center">
                        <Sparkles className="w-16 h-16 mx-auto mb-4 text-purple-500 animate-spin" />
                        <p className="text-lg font-medium text-purple-600 mb-2">Creating your image...</p>
                        <p className={getThemeClasses("text-sm text-gray-500", "text-sm text-gray-400")}>
                          Using {models.find(m => m.id === selectedModel)?.name}
                        </p>
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <Image className={getThemeClasses("w-20 h-20 mx-auto mb-4 opacity-50", "w-20 h-20 mx-auto mb-4 opacity-30 text-gray-500")} />
                        <p className={getThemeClasses("text-xl font-medium text-gray-600 mb-2", "text-xl font-medium text-gray-300 mb-2")}>Your generated image will appear here</p>
                        <p className={getThemeClasses("text-sm text-gray-500", "text-sm text-gray-400")}>Enter a description and click Generate</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Image Info */}
              {generatedImage && generationInfo && (
                <div className={getThemeClasses(
                  "mt-6 p-4 bg-purple-50 rounded-xl border border-purple-200",
                  "mt-6 p-4 bg-purple-900/30 rounded-xl border border-purple-700/50"
                )}>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                    <div>
                      <span className={getThemeClasses("text-purple-700 font-medium", "text-purple-300 font-medium")}>Model:</span>
                      <p className={getThemeClasses("text-purple-600", "text-purple-200")}>{generationInfo.model}</p>
                    </div>
                    <div>
                      <span className={getThemeClasses("text-purple-700 font-medium", "text-purple-300 font-medium")}>Provider:</span>
                      <p className={getThemeClasses("text-purple-600", "text-purple-200")}>{generationInfo.provider}</p>
                    </div>
                    <div>
                      <span className={getThemeClasses("text-purple-700 font-medium", "text-purple-300 font-medium")}>Style:</span>
                      <p className={getThemeClasses("text-purple-600", "text-purple-200")}>{styles.find(s => s.id === selectedStyle)?.name}</p>
                    </div>
                    <div>
                      <span className={getThemeClasses("text-purple-700 font-medium", "text-purple-300 font-medium")}>Ratio:</span>
                      <p className={getThemeClasses("text-purple-600", "text-purple-200")}>{aspectRatio}</p>
                    </div>
                    <div>
                      <span className={getThemeClasses("text-purple-700 font-medium", "text-purple-300 font-medium")}>Seed:</span>
                      <p className={getThemeClasses("text-purple-600", "text-purple-200")}>{generationInfo.seed}</p>
                    </div>
                  </div>
                  
                  {generationInfo.fallback && (
                    <div className="mt-3 p-2 bg-yellow-100 border border-yellow-300 rounded-lg">
                      <p className="text-yellow-700 text-xs font-medium">
                        ⚠️ Used fallback provider due to primary service unavailability
                      </p>
                    </div>
                  )}
                  
                  {generationInfo.warning && (
                    <div className="mt-3 p-2 bg-blue-100 border border-blue-300 rounded-lg">
                      <p className="text-blue-700 text-xs font-medium">
                        ℹ️ {generationInfo.warning}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

                {/* Gallery Modal */}
          {showGallery && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className={getThemeClasses(
                "bg-white rounded-3xl max-w-6xl w-full max-h-[90vh] overflow-hidden",
                "bg-gray-900 rounded-3xl max-w-6xl w-full max-h-[90vh] overflow-hidden"
              )}>
                {/* Gallery Header */}
                <div className={getThemeClasses(
                  "p-6 border-b border-gray-200 flex justify-between items-center",
                  "p-6 border-b border-gray-700 flex justify-between items-center"
                )}>
                  <div>
                    <h2 className={getThemeClasses("text-2xl font-bold text-slate-900", "text-2xl font-bold text-white")}>Image Gallery</h2>
                    <p className={getThemeClasses("text-sm text-gray-600", "text-sm text-gray-400")}>{imageGallery.length} images saved</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {imageGallery.length > 0 && (
                      <button
                        onClick={clearGallery}
                        className={getThemeClasses(
                          "px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm",
                          "px-4 py-2 text-red-400 hover:bg-red-900/30 rounded-lg transition-colors text-sm"
                        )}
                      >
                        Clear All
                      </button>
                    )}
                    <button
                      onClick={() => setShowGallery(false)}
                      className={getThemeClasses(
                        "p-2 hover:bg-gray-100 rounded-lg transition-colors",
                        "p-2 hover:bg-gray-700 rounded-lg transition-colors"
                      )}
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
                
                {/* Gallery Content */}
                <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                  {imageGallery.length === 0 ? (
                    <div className="text-center py-12">
                      <Layers className={getThemeClasses("w-16 h-16 mx-auto mb-4 text-gray-400", "w-16 h-16 mx-auto mb-4 text-gray-500")} />
                      <p className={getThemeClasses("text-xl font-medium text-gray-600 mb-2", "text-xl font-medium text-gray-300 mb-2")}>No images yet</p>
                      <p className={getThemeClasses("text-gray-500", "text-gray-400")}>Generated images will appear here</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {imageGallery.map((item) => (
                        <div key={item.id} className={getThemeClasses(
                          "bg-gray-50 rounded-xl overflow-hidden group hover:shadow-lg transition-shadow",
                          "bg-gray-800 rounded-xl overflow-hidden group hover:shadow-lg transition-shadow"
                        )}>
                          <div className="aspect-square relative">
                            <img
                              src={item.image_url}
                              alt="Generated artwork"
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.target.style.display = 'none';
                              }}
                            />
                            
                            {/* Hover overlay */}
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => downloadGalleryImage(item)}
                                  className="p-2 bg-white text-gray-900 rounded-lg hover:bg-gray-100 transition-colors"
                                  title="Download"
                                >
                                  <Download className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => {
                                    setPrompt(item.prompt);
                                    setNegativePrompt(item.negative_prompt|| '');
                                    setSelectedStyle(item.style);
                                    setAspectRatio(item.aspect_ratio);
                                    if (item.seed) {
                                      setSeed(item.seed.toString());
                                      setUseRandomSeed(false);
                                    }
                                    setShowGallery(false);
                                  }}
                                  className="p-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
                                  title="Use Settings"
                                >
                                  <Wand2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => deleteFromGallery(item.id)}
                                  className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                                  title="Delete"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                          </div>
                          
                          {/* Image info */}
                          <div className="p-3">
                            <p className={getThemeClasses(
                              "text-sm font-medium text-gray-900 line-clamp-2 mb-1",
                              "text-sm font-medium text-white line-clamp-2 mb-1"
                            )}>
                              {item.prompt}
                            </p>
                            <div className={getThemeClasses(
                              "flex justify-between items-center text-xs text-gray-500",
                              "flex justify-between items-center text-xs text-gray-400"
                            )}>
                              <span>{item.style}</span>
                              <span>{new Date(item.created_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
    </div>
  );
}