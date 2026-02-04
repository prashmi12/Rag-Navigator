import React, { useState } from 'react';
import './AppTour.css';

interface AppTourProps {
  isOpen: boolean;
  onClose: () => void;
}

interface TourStep {
  id: string;
  title: string;
  description: string;
}

const AppTour: React.FC<AppTourProps> = ({ isOpen, onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);

  const tourSteps: TourStep[] = [
    {
      id: 'welcome',
      title: '👋 Welcome to Gemini RAG Navigator',
      description: 'Your intelligent document analysis companion. Let\'s explore the key features to help you get started!'
    },
    {
      id: 'documents',
      title: '📄 Add Documents',
      description: 'Upload and manage your documents in the Sidebar on the bottom left side of the screen. Support multiple formats (PDF, TXT, DOCX). Your documents are processed and indexed for intelligent searching and analysis.'
    },
    {
      id: 'search',
      title: '🔍 Smart Search',
      description: 'Use the Search Bar at the top center of the page (🔍 icon inside the input field) to query your documents using natural language. The AI understands context and finds relevant information across all your uploaded files.'
    },
    {
      id: 'chat',
      title: '💬 Chat & Query',
      description: 'Ask questions about your documents in the Chat Window on the right side of the screen. Get detailed answers, summaries, and insights powered by Google Gemini AI. Type your questions and see real-time responses.'
    },
    {
      id: 'analytics',
      title: '📊 Analytics Dashboard',
      description: 'View detailed document statistics, word counts, upload history, and usage patterns. Access it via the Analytics button (📊 icon) in the top-right toolbar. Monitor your document collection and track analysis activity over time.'
    },
    {
      id: 'summary',
      title: '✨ Get Summaries',
      description: 'Generate intelligent summaries of your documents by selecting them in the Sidebar and clicking the Summarize option. Perfect for quick overviews and understanding key points without reading the entire content. Summaries appear in the Chat Window.'
    },
    {
      id: 'ready',
      title: '🚀 You\'re All Set!',
      description: 'You\'re ready to start using Gemini RAG Navigator (🚀). Upload documents in the Sidebar, use the Search Bar to find information, ask questions in the Chat Window, and check Analytics for insights. Happy exploring!'
    }
  ];

  const handleNext = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onClose();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    onClose();
  };

  const handleDotClick = (index: number) => {
    setCurrentStep(index);
  };

  if (!isOpen) return null;

  const step = tourSteps[currentStep];
  const progress = ((currentStep + 1) / tourSteps.length) * 100;

  return (
    <div className="tour-overlay">
      <div className="tour-modal">
        <div className="tour-header">
          <h2>{step.title}</h2>
          <button className="tour-close" onClick={handleSkip} title="Close">
            ✕
          </button>
        </div>

        <div className="tour-content">
          <p>{step.description}</p>
        </div>

        <div className="tour-progress">
          <div className="progress-bar" style={{ width: `${progress}%` }}></div>
        </div>

        <div className="tour-dots">
          {tourSteps.map((_, index) => (
            <button
              key={index}
              className={`dot ${index === currentStep ? 'active' : ''}`}
              onClick={() => handleDotClick(index)}
              aria-label={`Go to step ${index + 1}`}
            ></button>
          ))}
        </div>

        <div className="tour-footer">
          <button
            className="tour-btn tour-btn-secondary"
            onClick={handleSkip}
          >
            Skip Tour
          </button>

          <div className="tour-nav">
            <button
              className="tour-btn tour-btn-secondary"
              onClick={handlePrevious}
              disabled={currentStep === 0}
            >
              Previous
            </button>

            <span className="tour-counter">
              {currentStep + 1} / {tourSteps.length}
            </span>

            <button
              className="tour-btn tour-btn-primary"
              onClick={handleNext}
            >
              {currentStep === tourSteps.length - 1 ? 'Finish' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppTour;
