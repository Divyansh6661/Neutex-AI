import React, { useState } from 'react';
import { ThemeProvider } from './contexts/ThemeContext';
import Homepage from './pages/Homepage';
import ObjectDetection from './pages/ObjectDetection';
import TextToImage from './pages/TextToImage';
import CodeGenerator from './pages/CodeGenerator';
import TaskAutomation from './pages/TaskAutomation';
import TextToVideo from './pages/TextToVideo';
import SocialMediaGenerator from './pages/SocialMediaGenerator';
import DocumentSummarizer from './pages/DocumentSummarizer';
import ChatBot from './components/ChatBot';
import DataAnalystDashboard from './pages/DataAnalystDashboard';


function App() {
  const [currentPage, setCurrentPage] = useState('home');
    
  const handleNavigate = (page) => {
    setCurrentPage(page);
  };
 
  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <Homepage onNavigate={handleNavigate} />;
      case 'objectDetection':
        return <ObjectDetection onNavigate={handleNavigate} />;
      case 'textToImage':
        return <TextToImage onNavigate={handleNavigate} />;
      case 'textToVideo':  // Add this case
        return <TextToVideo onNavigate={handleNavigate} />;
      case 'codeGenerator':
        return <CodeGenerator onNavigate={handleNavigate} />;
      case 'taskAutomation':
        return <TaskAutomation onNavigate={handleNavigate} />;
      case 'chatbot':
        return <ChatBot onNavigate={handleNavigate} />;
      case 'socialMedia':
        return <SocialMediaGenerator onNavigate={handleNavigate} />;
      case 'documentSummarizer':
        return <DocumentSummarizer onNavigate={handleNavigate} />;
      case 'dataAnalyst':
        return <DataAnalystDashboard onNavigate={handleNavigate} />;
      default:
        return <Homepage onNavigate={handleNavigate} />;
    }
  };
 
  return (
    <ThemeProvider>
      <div className="App">
        {renderPage()}
      </div>
    </ThemeProvider>
  );
}

export default App;