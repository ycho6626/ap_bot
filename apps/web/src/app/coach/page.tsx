'use client';

import { useState, useEffect, useRef } from 'react';
import { Send, Calculator, BookOpen } from 'lucide-react';
import { coach, type CoachResponse } from '@/lib/api.bridge';
import { formatExamVariant, formatTrustScore } from '@/lib/utils';
import { examVariantStorage } from '@/lib/storage';
import type { ExamVariant } from '@ap/shared/types';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import { TrustMeter } from '@/components/TrustMeter';
import { CitationsSidebar } from '@/components/CitationsSidebar';
import { ExamVariantSelector } from '@/components/ExamVariantSelector';
import { MathMarkdownRenderer } from '@/components/MarkdownRenderer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import toast from 'react-hot-toast';
import { reportError } from '@/lib/logging';

interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  verified?: boolean;
  trustScore?: number;
  sources?: CoachResponse['sources'];
  suggestions?: string[] | undefined;
}

export default function CoachPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [examVariant, setExamVariant] = useState<ExamVariant>('calc_ab');
  const [showCitations, setShowCitations] = useState(false);
  // const [sessionId] = useState(() => sessionStorage.getSessionId());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Load saved exam variant from localStorage
  useEffect(() => {
    const savedVariant = examVariantStorage.get();
    setExamVariant(savedVariant);
  }, []);

  // Save exam variant to localStorage when changed
  useEffect(() => {
    examVariantStorage.set(examVariant);
  }, [examVariant]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input on mount for non-touch devices to avoid popping mobile keyboard
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const prefersCoarsePointer =
      typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
    if (prefersCoarsePointer) return;

    inputRef.current?.focus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userTimestamp = Date.now();

    const userMessage: ChatMessage = {
      id: `user_${userTimestamp}`,
      type: 'user',
      content: input.trim(),
      timestamp: new Date(userTimestamp),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await coach(input.trim(), examVariant);

      const assistantTimestamp = Date.now();

      const assistantMessage: ChatMessage = {
        id: `assistant_${assistantTimestamp}`,
        type: 'assistant',
        content: response.answer,
        timestamp: new Date(assistantTimestamp),
        verified: response.verified,
        trustScore: response.trustScore,
        sources: response.sources,
        suggestions: response.suggestions,
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      reportError('Error asking coach:', error);
      toast.error('Failed to get answer. Please try again.');

      const errorTimestamp = Date.now();

      const errorMessage: ChatMessage = {
        id: `error_${errorTimestamp}`,
        type: 'assistant',
        content:
          'I apologize, but I encountered an error while processing your question. Please try again or rephrase your question.',
        timestamp: new Date(errorTimestamp),
        verified: false,
        trustScore: 0,
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSubmit(e);
    }
  };

  const clearChat = () => {
    setMessages([]);
    toast.success('Chat cleared');
  };

  const getLatestSources = () => {
    const lastAssistantMessage = [...messages]
      .reverse()
      .find(m => m.type === 'assistant' && m.sources);
    return lastAssistantMessage?.sources ?? [];
  };

  const getLatestSuggestions = () => {
    const lastAssistantMessage = [...messages]
      .reverse()
      .find(m => m.type === 'assistant' && m.suggestions);
    return lastAssistantMessage?.suggestions ?? [];
  };

  return (
    <div className='min-h-screen bg-gray-50'>
      {/* Header */}
      <header className='bg-white shadow-sm border-b'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='flex justify-between items-center py-4'>
            <div className='flex items-center space-x-4'>
              <Calculator className='h-8 w-8 text-primary-600' />
              <div>
                <h1 className='text-xl font-bold text-gray-900'>AP Calculus Coach</h1>
                <p className='text-sm text-gray-600'>{formatExamVariant(examVariant)}</p>
              </div>
            </div>
            <div className='flex items-center space-x-4'>
              <ExamVariantSelector value={examVariant} onChange={setExamVariant} />
              <Button
                variant='outline'
                size='sm'
                onClick={clearChat}
                disabled={messages.length === 0}
              >
                Clear Chat
              </Button>
              <Button
                variant='outline'
                size='sm'
                onClick={() => setShowCitations(!showCitations)}
                disabled={getLatestSources().length === 0}
              >
                <BookOpen className='h-4 w-4 mr-2' />
                Citations
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6'>
        <div className='flex gap-6 h-[calc(100vh-200px)]'>
          {/* Main Chat Area */}
          <div className='flex-1 flex flex-col'>
            {/* Messages */}
            <div className='flex-1 overflow-y-auto space-y-4 mb-4'>
              {messages.length === 0 && (
                <Card className='text-center py-12'>
                  <CardContent>
                    <Calculator className='h-12 w-12 text-gray-400 mx-auto mb-4' />
                    <CardTitle className='text-lg mb-2'>Welcome to AP Calculus Coach</CardTitle>
                    <CardDescription className='mb-6'>
                      Ask me any AP Calculus {formatExamVariant(examVariant)} question and I&apos;ll
                      provide verified answers with step-by-step solutions.
                    </CardDescription>
                    <div className='space-y-2 text-sm text-gray-500'>
                      <p>Try asking:</p>
                      <ul className='space-y-1'>
                        <li>• &quot;Find the derivative of x² + 3x + 2&quot;</li>
                        <li>• &quot;Evaluate the integral of sin(x) from 0 to π&quot;</li>
                        <li>• &quot;What is the limit as x approaches 0 of (sin x)/x?&quot;</li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              )}

              {messages.map(message => (
                <div
                  key={message.id}
                  className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-3xl ${
                      message.type === 'user' ? 'chat-user' : 'chat-assistant'
                    }`}
                  >
                    <div className='flex items-start space-x-3'>
                      {message.type === 'assistant' && (
                        <div className='flex-shrink-0'>
                          <div className='w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center'>
                            <Calculator className='h-4 w-4 text-primary-600' />
                          </div>
                        </div>
                      )}
                      <div className='flex-1 min-w-0'>
                        <div className='flex items-center space-x-2 mb-2'>
                          <span className='text-sm font-medium text-gray-900'>
                            {message.type === 'user' ? 'You' : 'AP Calculus Coach'}
                          </span>
                          <span className='text-xs text-gray-500'>
                            {message.timestamp.toLocaleTimeString()}
                          </span>
                          {message.type === 'assistant' && message.verified !== undefined && (
                            <VerifiedBadge verified={message.verified} />
                          )}
                        </div>

                        <MathMarkdownRenderer content={message.content} />

                        {message.type === 'assistant' && message.trustScore !== undefined && (
                          <div className='mt-3'>
                            <div className='flex items-center space-x-2 mb-1'>
                              <span className='text-xs text-gray-600'>Confidence:</span>
                              <span className='text-xs font-medium'>
                                {formatTrustScore(message.trustScore)}
                              </span>
                            </div>
                            <TrustMeter score={message.trustScore} />
                          </div>
                        )}

                        {message.type === 'assistant' &&
                          message.suggestions &&
                          message.suggestions.length > 0 && (
                            <div className='mt-3'>
                              <p className='text-xs text-gray-600 mb-2'>Suggestions:</p>
                              <ul className='space-y-1'>
                                {message.suggestions.map((suggestion, index) => (
                                  <li key={index} className='text-xs text-gray-700'>
                                    • {suggestion}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className='flex justify-start'>
                  <div className='chat-assistant max-w-3xl'>
                    <div className='flex items-center space-x-3'>
                      <div className='w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center'>
                        <Calculator className='h-4 w-4 text-primary-600' />
                      </div>
                      <div className='flex items-center space-x-2'>
                        <div className='animate-pulse flex space-x-1'>
                          <div className='w-2 h-2 bg-gray-400 rounded-full'></div>
                          <div className='w-2 h-2 bg-gray-400 rounded-full'></div>
                          <div className='w-2 h-2 bg-gray-400 rounded-full'></div>
                        </div>
                        <span className='text-sm text-gray-600'>Thinking...</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Form */}
            <form onSubmit={e => void handleSubmit(e)} className='flex space-x-4'>
              <div className='flex-1'>
                <Textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={`Ask a ${formatExamVariant(examVariant)} question...`}
                  className='resize-none'
                  rows={3}
                  maxLength={2000}
                  disabled={isLoading}
                />
                <div className='flex justify-between items-center mt-2'>
                  <span className='text-xs text-gray-500' data-testid='char-count'>
                    {input.length}/2000
                  </span>
                  <div className='text-xs text-gray-500'>
                    Press Enter to send, Shift+Enter for new line
                  </div>
                </div>
              </div>
              <Button
                type='submit'
                disabled={!input.trim() || isLoading}
                className='px-6 py-3 self-end'
              >
                <Send className='h-4 w-4' />
              </Button>
            </form>
          </div>

          {/* Citations Sidebar */}
          {showCitations && (
            <CitationsSidebar
              sources={getLatestSources()}
              suggestions={getLatestSuggestions()}
              onClose={() => setShowCitations(false)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
