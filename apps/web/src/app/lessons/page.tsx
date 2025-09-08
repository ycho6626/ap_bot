'use client';

import { useState, useEffect } from 'react';
import { Search, BookOpen, Clock, Tag } from 'lucide-react';
import { apiClient, type KbSearchRequest } from '@/lib/api';
import { formatExamVariant, storage, CONSTANTS, debounce } from '@/lib/utils';
import type { ExamVariant } from '@ap/shared/types';
import { KaTeXRenderer } from '@/components/KaTeXRenderer';
import { ExamVariantSelector } from '@/components/ExamVariantSelector';
import toast from 'react-hot-toast';

interface LessonDocument {
  id: string;
  content: string;
  subject: string;
  exam_variant: string | null;
  partition: string;
  topic: string | null;
  subtopic: string | null;
  created_at: string;
  updated_at: string;
}

interface SearchResult {
  document: LessonDocument;
  score: number;
  snippet: string;
  provenance: {
    source: string;
    partition: string;
    topic: string | null;
    subtopic: string | null;
  };
}

export default function LessonsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [examVariant, setExamVariant] = useState<ExamVariant>('calc_ab');
  const [selectedDocument, setSelectedDocument] = useState<LessonDocument | null>(null);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);

  // Load saved exam variant from localStorage
  useEffect(() => {
    const savedVariant = storage.get<ExamVariant>('exam_variant', 'calc_ab');
    setExamVariant(savedVariant);
  }, []);

  // Save exam variant to localStorage when changed
  useEffect(() => {
    storage.set('exam_variant', examVariant);
  }, [examVariant]);

  // Load search history from localStorage
  useEffect(() => {
    const history = storage.get<string[]>('search_history', []);
    setSearchHistory(history);
  }, []);

  // Debounced search function
  const debouncedSearch = debounce(async (query: string) => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    try {
      const request: KbSearchRequest = {
        subject: 'calc',
        examVariant,
        query: query.trim(),
        limit: CONSTANTS.DEFAULT_SEARCH_LIMIT,
        minScore: 0.1,
      };

      const response = await apiClient.searchKnowledgeBase(request);
      setResults(response.results);

      // Add to search history
      if (query.trim() && !searchHistory.includes(query.trim())) {
        const newHistory = [query.trim(), ...searchHistory.slice(0, 9)]; // Keep last 10
        setSearchHistory(newHistory);
        storage.set('search_history', newHistory);
      }
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Failed to search lessons. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, 300);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    debouncedSearch(query);
  };

  const handleDocumentClick = async (documentId: string) => {
    try {
      const response = await apiClient.getDocument(documentId);
      setSelectedDocument(response.document);
    } catch (error) {
      console.error('Error fetching document:', error);
      toast.error('Failed to load document. Please try again.');
    }
  };

  const getPartitionColor = (partition: string) => {
    switch (partition) {
      case 'public_kb':
        return 'bg-blue-100 text-blue-800';
      case 'paraphrased_kb':
        return 'bg-green-100 text-green-800';
      case 'private_kb':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPartitionLabel = (partition: string) => {
    switch (partition) {
      case 'public_kb':
        return 'Public';
      case 'paraphrased_kb':
        return 'Premium';
      case 'private_kb':
        return 'Private';
      default:
        return 'Unknown';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <BookOpen className="h-8 w-8 text-primary-600" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">AP Calculus Lessons</h1>
                <p className="text-sm text-gray-600">{formatExamVariant(examVariant)} Knowledge Base</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <ExamVariantSelector
                value={examVariant}
                onChange={setExamVariant}
              />
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex gap-6">
          {/* Search Sidebar */}
          <div className="w-80 flex-shrink-0">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Search Lessons</h2>
              
              {/* Search Input */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder={`Search ${formatExamVariant(examVariant)} lessons...`}
                  className="input pl-10"
                  maxLength={CONSTANTS.MAX_QUERY_LENGTH}
                />
              </div>

              {/* Search History */}
              {searchHistory.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Recent Searches</h3>
                  <div className="space-y-1">
                    {searchHistory.slice(0, 5).map((query, index) => (
                      <button
                        key={index}
                        onClick={() => handleSearch(query)}
                        className="block w-full text-left text-sm text-gray-600 hover:text-primary-600 hover:bg-gray-50 px-2 py-1 rounded transition-colors"
                      >
                        {query}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Search Results */}
              {isLoading && (
                <div className="text-center py-4">
                  <div className="animate-pulse flex space-x-1 justify-center">
                    <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                  </div>
                  <p className="text-sm text-gray-500 mt-2">Searching...</p>
                </div>
              )}

              {!isLoading && results.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-3">
                    {results.length} result{results.length !== 1 ? 's' : ''} found
                  </h3>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {results.map((result, index) => (
                      <div
                        key={`${result.document.id}-${index}`}
                        className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => handleDocumentClick(result.document.id)}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPartitionColor(result.document.partition)}`}
                          >
                            {getPartitionLabel(result.document.partition)}
                          </span>
                          <span className="text-xs text-gray-500">
                            {Math.round(result.score * 100)}% match
                          </span>
                        </div>
                        
                        {result.document.topic && (
                          <div className="flex items-center text-xs text-gray-600 mb-1">
                            <Tag className="h-3 w-3 mr-1" />
                            {result.document.topic}
                            {result.document.subtopic && ` • ${result.document.subtopic}`}
                          </div>
                        )}
                        
                        <p className="text-sm text-gray-700 line-clamp-3 mb-2">
                          {result.snippet}
                        </p>
                        
                        <div className="flex items-center text-xs text-gray-500">
                          <Clock className="h-3 w-3 mr-1" />
                          {new Date(result.document.updated_at).toLocaleDateString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!isLoading && searchQuery && results.length === 0 && (
                <div className="text-center py-8">
                  <BookOpen className="h-8 w-8 text-gray-400 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">No lessons found for your search.</p>
                </div>
              )}
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {selectedDocument ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                {/* Document Header */}
                <div className="border-b border-gray-200 p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900 mb-2">
                        {selectedDocument.topic || 'Lesson Document'}
                      </h2>
                      {selectedDocument.subtopic && (
                        <p className="text-sm text-gray-600">{selectedDocument.subtopic}</p>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPartitionColor(selectedDocument.partition)}`}
                      >
                        {getPartitionLabel(selectedDocument.partition)}
                      </span>
                      <button
                        onClick={() => setSelectedDocument(null)}
                        className="btn btn-outline text-sm"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex items-center text-sm text-gray-500 space-x-4">
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-1" />
                      Updated {new Date(selectedDocument.updated_at).toLocaleDateString()}
                    </div>
                    {selectedDocument.exam_variant && (
                      <div className="flex items-center">
                        <Tag className="h-4 w-4 mr-1" />
                        {formatExamVariant(selectedDocument.exam_variant as ExamVariant)}
                      </div>
                    )}
                  </div>
                </div>

                {/* Document Content */}
                <div className="p-6">
                  <div className="prose prose-lg max-w-none">
                    <KaTeXRenderer content={selectedDocument.content} displayMode={true} />
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Welcome to AP Calculus Lessons</h3>
                <p className="text-gray-600 mb-6">
                  Search our knowledge base to find detailed lessons, examples, and explanations for AP Calculus {formatExamVariant(examVariant)}.
                </p>
                <div className="space-y-2 text-sm text-gray-500">
                  <p>Try searching for:</p>
                  <ul className="space-y-1">
                    <li>• "derivatives"</li>
                    <li>• "integration techniques"</li>
                    <li>• "limits and continuity"</li>
                    <li>• "applications of derivatives"</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
