// Complete ChatBot.js with proper UI alignment and file handling
import React, { useState, useRef, useEffect } from 'react';
import { makeAPICall } from '../config/api';
import { Send, Plus, Settings, MessageSquare, Trash2, RefreshCw, Square, ChevronLeft, Menu, User, Bot, Paperclip, X, Image } from 'lucide-react';

const ChatBot = ({ onNavigate }) => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'assistant',
      content: 'Hello! I\'m Neutex AI, your intelligent companion for productivity, automation, and smart decision-making. How can I help you today?',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [chatHistory, setChatHistory] = useState([
    { id: 1, title: 'Welcome Chat', date: new Date(), active: true }
  ]);
  
  const [selectedFile, setSelectedFile] = useState(null);
  const [inputHistory, setInputHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [showFilePreview, setShowFilePreview] = useState(false);
  
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Check for voice messages from homepage
  useEffect(() => {
  // Handle regular text messages from homepage (NO speech synthesis)
  const textMessage = localStorage.getItem('textMessage');
  if (textMessage) {
    localStorage.removeItem('textMessage');
    setInput(textMessage);
    setTimeout(() => {
      handleTextFromHomepage(textMessage); // Use the new function
    }, 500);
  }

  // Handle voice messages (WITH speech synthesis)
  const voiceMessage = localStorage.getItem('voiceMessage');
  if (voiceMessage) {
    localStorage.removeItem('voiceMessage');
    setInput(voiceMessage);
    setTimeout(() => {
      handleVoiceSend(voiceMessage); // Use voice send with speech synthesis
    }, 500);
  }
  
  const voiceConversation = localStorage.getItem('voiceConversation');
  if (voiceConversation) {
    try {
      const conversation = JSON.parse(voiceConversation);
      localStorage.removeItem('voiceConversation');
      
      setMessages(prev => [
        ...prev.slice(0, 1),
        ...conversation.map((msg, index) => ({
          ...msg,
          id: Date.now() + index
        }))
      ]);
      
      if (conversation.length > 0) {
        const firstUserMessage = conversation.find(msg => msg.type === 'user');
        if (firstUserMessage) {
          const chatTitle = firstUserMessage.content.substring(0, 30) + 
                           (firstUserMessage.content.length > 30 ? '...' : '');
          
          setChatHistory(prev => [
            { 
              id: Date.now(), 
              title: `Voice: ${chatTitle}`, 
              date: new Date(), 
              active: true 
            },
            ...prev.map(chat => ({ ...chat, active: false }))
          ]);
        }
      }
    } catch (error) {
      console.error('Error parsing voice conversation:', error);
    }
  }
}, []);

  // Handle file uploads
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert('File size must be less than 10MB');
        return;
      }
      
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'text/plain', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        alert('Supported file types: Images (JPEG, PNG, GIF, WebP), Text files, PDF');
        return;
      }
      
      setSelectedFile(file);
      setShowFilePreview(true);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    setShowFilePreview(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getFilePreview = () => {
    if (!selectedFile) return null;
    if (selectedFile.type.startsWith('image/')) {
      return URL.createObjectURL(selectedFile);
    }
    return null;
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatMessage = (content) => {
    let formatted = content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code class="bg-gray-700 px-1 py-0.5 rounded text-sm">$1</code>');
    
    formatted = formatted.replace(/```(\w+)?\n([\s\S]*?)```/g, 
      '<pre class="bg-gray-800 p-4 rounded-lg overflow-x-auto my-4"><code class="text-green-400">$2</code></pre>');
    
    formatted = formatted.replace(/^\- (.+)$/gm, '<li class="ml-4">• $1</li>');
    
    return formatted;
  };

  const handleVoiceSend = async (message) => {
    if (!message.trim()) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: message,
      timestamp: new Date(),
      isVoice: true
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsGenerating(true);

    try {
      const response = await makeAPICall('/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: message,
    conversationHistory: messages.slice(-10)
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
        setMessages(prev => [...prev, assistantMessage]);
        
        if ('speechSynthesis' in window) {
          const utterance = new SpeechSynthesisUtterance(data.response);
          utterance.rate = 0.9;
          utterance.pitch = 1;
          utterance.volume = 0.8;
          window.speechSynthesis.speak(utterance);
        }
      } else {
        throw new Error(data.error || 'Failed to get response');
      }
    } catch (error) {
      const errorMessage = {
        id: Date.now() + 1,
        type: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    }

    setIsGenerating(false);
  };

  const handleTextFromHomepage = async (message) => {
  if (!message.trim()) return;

  const userMessage = {
    id: Date.now(),
    type: 'user',
    content: message,
    timestamp: new Date()
  };

  setMessages(prev => [...prev, userMessage]);
  setInput('');
  setIsGenerating(true);

  try {
    const response = await makeAPICall('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: message,
        conversationHistory: [] // Start with empty history since it's from homepage
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
      setMessages(prev => [...prev, assistantMessage]);
      
      // NO speech synthesis for text messages from homepage
      
    } else {
      throw new Error(data.error || 'Failed to get response');
    }
  } catch (error) {
    console.error('Chat error:', error);
    const errorMessage = {
      id: Date.now() + 1,
      type: 'assistant',
      content: 'Sorry, I encountered an error. Please try again.',
      timestamp: new Date()
    };
    setMessages(prev => [...prev, errorMessage]);
  }

  setIsGenerating(false);
};

  // Handle send with proper request format
  const handleSend = async () => {
    if ((!input.trim() && !selectedFile) || isGenerating) return;

    if (input.trim()) {
      setInputHistory(prev => {
        const newHistory = [input.trim(), ...prev.filter(item => item !== input.trim())];
        return newHistory.slice(0, 50);
      });
      setHistoryIndex(-1);
    }

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: input || '[File attached]',
      timestamp: new Date(),
      file: selectedFile ? {
        name: selectedFile.name,
        type: selectedFile.type,
        size: selectedFile.size
      } : null
    };

    setMessages(prev => [...prev, userMessage]);
    
    const currentInput = input;
    const currentFile = selectedFile;
    
    setInput('');
    setSelectedFile(null);
    setShowFilePreview(false);
    setIsGenerating(true);

    try {
      let response;
      
      if (currentFile) {
        // Use FormData for file uploads
        const formData = new FormData();
        formData.append('message', currentInput);
        formData.append('conversationHistory', JSON.stringify(messages.slice(-10)));
        formData.append('file', currentFile);

        const response = await makeAPICall('/api/chat', {
  method: 'POST',
  body: formData // No Content-Type header for FormData
});
      } else {
        // Use JSON for text-only messages
       const response = await makeAPICall('/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: currentInput,
    conversationHistory: messages.slice(-10)
  })
});
      }

      const data = await response.json();

      if (response.ok) {
        const assistantMessage = {
          id: Date.now() + 1,
          type: 'assistant',
          content: data.response,
          model: data.model,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        throw new Error(data.error || 'Failed to get response');
      }
    } catch (error) {
      const errorMessage = {
        id: Date.now() + 1,
        type: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    }

    setIsGenerating(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    } else if (e.key === 'ArrowUp' && e.ctrlKey) {
      e.preventDefault();
      if (inputHistory.length > 0 && historyIndex < inputHistory.length - 1) {
        const newIndex = historyIndex + 1;
        setHistoryIndex(newIndex);
        setInput(inputHistory[newIndex]);
      }
    } else if (e.key === 'ArrowDown' && e.ctrlKey) {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setInput(inputHistory[newIndex]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setInput('');
      }
    }
  };

  const clearChat = () => {
    setMessages([{
      id: 1,
      type: 'assistant',
      content: 'Chat cleared. How can I help you?',
      timestamp: new Date()
    }]);
  };

  const stopGenerating = () => {
    setIsGenerating(false);
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  };

  const regenerateResponse = () => {
    if (messages.length > 1) {
      const lastUserMessage = messages.filter(m => m.type === 'user').pop();
      if (lastUserMessage) {
        setMessages(prev => prev.filter(m => m.id !== messages[messages.length - 1].id));
        setInput(lastUserMessage.content === '[File attached]' ? '' : lastUserMessage.content);
        setTimeout(() => handleSend(), 100);
      }
    }
  };

  const newChat = () => {
    const newChatId = Date.now();
    setChatHistory(prev => [
      { id: newChatId, title: 'New Chat', date: new Date(), active: true },
      ...prev.map(chat => ({ ...chat, active: false }))
    ]);
    clearChat();
    setSelectedFile(null);
    setShowFilePreview(false);
    setInput('');
  };

  const switchToChat = (chatId) => {
    setChatHistory(prev => 
      prev.map(chat => ({
        ...chat,
        active: chat.id === chatId
      }))
    );
    clearChat();
  };

  return (
    <div className="flex h-screen bg-gray-900 text-white relative">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-64' : 'w-0'} transition-all duration-300 bg-gray-800 border-r border-gray-700 overflow-hidden flex flex-col`}>
        <div className="p-4">
          <button
            onClick={newChat}
            className="w-full flex items-center space-x-3 px-4 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>New Chat</span>
          </button>
        </div>

        <div className="px-4 pb-4 flex-1 overflow-y-auto">
          <h3 className="text-sm font-medium text-gray-400 mb-3">Recent Chats</h3>
          <div className="space-y-2">
            {chatHistory.map((chat) => (
              <div
                key={chat.id}
                onClick={() => switchToChat(chat.id)}
                className={`flex items-center space-x-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                  chat.active ? 'bg-gray-700' : 'hover:bg-gray-700'
                }`}
              >
                <MessageSquare className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{chat.title}</p>
                  <p className="text-xs text-gray-500">{chat.date.toLocaleDateString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Settings button positioned properly */}
        <div className="p-4 border-t border-gray-700">
          <button className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-gray-700 rounded-lg transition-colors">
            <Settings className="w-4 h-4" />
            <span>Settings</span>
          </button>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col relative">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700 bg-gray-900 relative z-10">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-semibold">Neutex AI Chat</h1>
          </div>
          
          <div className="flex items-center space-x-2">
            {isGenerating && (
              <button
                onClick={stopGenerating}
                className="flex items-center space-x-2 px-3 py-1.5 bg-red-600 hover:bg-red-700 rounded-lg text-sm transition-colors"
              >
                <Square className="w-3 h-3" />
                <span>Stop</span>
              </button>
            )}
            <button
              onClick={regenerateResponse}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              title="Regenerate Response"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={clearChat}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              title="Clear Chat"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => onNavigate('home')}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              title="Back to Home"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex items-start space-x-3 max-w-3xl ${message.type === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                  message.type === 'user' 
                    ? 'bg-blue-600' 
                    : 'bg-green-600'
                }`}>
                  {message.type === 'user' ? (
                    <User className="w-4 h-4" />
                  ) : (
                    <Bot className="w-4 h-4" />
                  )}
                </div>
                <div className={`px-4 py-3 rounded-2xl ${
                  message.type === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-100'
                }`}>
                  {message.file && (
                    <div className="mb-2 p-2 bg-black/20 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <Paperclip className="w-4 h-4" />
                        <span className="text-sm">{message.file.name}</span>
                        <span className="text-xs opacity-60">({formatFileSize(message.file.size)})</span>
                      </div>
                    </div>
                  )}
                  
                  <div 
                    className="text-sm leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: formatMessage(message.content) }}
                  />
                  {message.isVoice && (
                    <div className="text-xs text-blue-300 mt-1">
                      🎤 Voice message
                    </div>
                  )}
                  {message.model && (
                    <div className="text-xs text-gray-400 mt-2">
                      Model: {message.model}
                    </div>
                  )}
                  <div className="text-xs text-gray-400 mt-1">
                    {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            </div>
          ))}
          
          {isGenerating && (
            <div className="flex justify-start">
              <div className="flex items-start space-x-3 max-w-3xl">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-600 flex items-center justify-center">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="px-4 py-3 bg-gray-700 rounded-2xl">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* File Preview positioned properly */}
        {showFilePreview && selectedFile && (
          <div className="mx-4 mb-2">
            <div className="bg-gray-800 border border-gray-600 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {selectedFile.type.startsWith('image/') ? (
                    <div className="flex items-center space-x-3">
                      <img 
                        src={getFilePreview()} 
                        alt="Preview" 
                        className="w-12 h-12 object-cover rounded"
                      />
                      <div>
                        <p className="text-sm font-medium">{selectedFile.name}</p>
                        <p className="text-xs text-gray-400">{formatFileSize(selectedFile.size)}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-gray-700 rounded flex items-center justify-center">
                        <Paperclip className="w-6 h-6 text-gray-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{selectedFile.name}</p>
                        <p className="text-xs text-gray-400">{formatFileSize(selectedFile.size)}</p>
                      </div>
                    </div>
                  )}
                </div>
                <button
                  onClick={removeFile}
                  className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Input Area with proper alignment */}
        <div className="p-4 border-t border-gray-700 bg-gray-900 relative z-10">
          <div className="flex items-end space-x-2">
            {/* File Upload Button - Properly aligned */}
            <div className="flex-shrink-0">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-3 text-gray-400 hover:text-white hover:bg-gray-700 rounded-2xl transition-colors flex items-center justify-center"
                style={{ height: '48px', width: '48px' }} // Fixed size to match textarea minimum height
                title="Attach file"
              >
                <Paperclip className="w-5 h-5" />
              </button>
            </div>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.txt,.pdf"
              onChange={handleFileUpload}
              className="hidden"
            />
            
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Ask me anything or describe what you need..."
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-2xl text-white placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows="1"
                style={{
                  minHeight: '48px',
                  maxHeight: '200px'
                }}
                disabled={isGenerating}
              />
            </div>
            
            <button
              onClick={handleSend}
              disabled={(!input.trim() && !selectedFile) || isGenerating}
              className="p-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-2xl transition-colors flex items-center justify-center self-start"
              style={{ height: '48px', width: '48px', marginTop: '-4px' }} // Fixed size and move up slightly
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
          
          <div className="text-xs text-gray-500 mt-2 text-center">
            Press Enter to send, Shift+Enter for new line • Ctrl+↑/↓ for input history
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatBot;