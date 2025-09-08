import { X, ExternalLink, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Source {
  type: 'canonical' | 'retrieval' | 'generated';
  id: string;
  title: string;
  snippet: string;
  score: number;
}

interface CitationsSidebarProps {
  sources: Source[];
  suggestions?: string[];
  onClose: () => void;
  className?: string;
}

export function CitationsSidebar({ 
  sources, 
  suggestions = [], 
  onClose, 
  className 
}: CitationsSidebarProps) {
  const getSourceTypeColor = (type: Source['type']) => {
    switch (type) {
      case 'canonical':
        return 'bg-success-100 text-success-800';
      case 'retrieval':
        return 'bg-primary-100 text-primary-800';
      case 'generated':
        return 'bg-warning-100 text-warning-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getSourceTypeLabel = (type: Source['type']) => {
    switch (type) {
      case 'canonical':
        return 'Canonical Solution';
      case 'retrieval':
        return 'Knowledge Base';
      case 'generated':
        return 'Generated';
      default:
        return 'Unknown';
    }
  };

  return (
    <div className={cn('w-80 bg-white border border-gray-200 rounded-lg shadow-lg', className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <BookOpen className="h-5 w-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">Sources & Citations</h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-100 rounded-md transition-colors"
          aria-label="Close citations sidebar"
        >
          <X className="h-4 w-4 text-gray-500" />
        </button>
      </div>

      {/* Content */}
      <div className="p-4 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
        {/* Sources */}
        {sources.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-3">Sources Used</h4>
            <div className="space-y-3">
              {sources.map((source, index) => (
                <div
                  key={`${source.id}-${index}`}
                  className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <span
                      className={cn(
                        'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
                        getSourceTypeColor(source.type)
                      )}
                    >
                      {getSourceTypeLabel(source.type)}
                    </span>
                    <span className="text-xs text-gray-500">
                      {Math.round(source.score * 100)}% match
                    </span>
                  </div>
                  
                  <h5 className="text-sm font-medium text-gray-900 mb-2 line-clamp-2">
                    {source.title}
                  </h5>
                  
                  <p className="text-xs text-gray-600 mb-3 line-clamp-3">
                    {source.snippet}
                  </p>
                  
                  <button
                    onClick={() => {
                      // TODO: Implement source viewing
                      console.log('View source:', source.id);
                    }}
                    className="inline-flex items-center text-xs text-primary-600 hover:text-primary-700 transition-colors"
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    View Source
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Suggestions */}
        {suggestions.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-3">Suggestions</h4>
            <div className="space-y-2">
              {suggestions.map((suggestion, index) => (
                <div
                  key={index}
                  className="flex items-start space-x-2 p-2 bg-gray-50 rounded-md"
                >
                  <div className="w-1.5 h-1.5 bg-primary-500 rounded-full mt-2 flex-shrink-0" />
                  <p className="text-sm text-gray-700">{suggestion}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {sources.length === 0 && suggestions.length === 0 && (
          <div className="text-center py-8">
            <BookOpen className="h-8 w-8 text-gray-400 mx-auto mb-3" />
            <p className="text-sm text-gray-500">
              No sources or suggestions available for this response.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
