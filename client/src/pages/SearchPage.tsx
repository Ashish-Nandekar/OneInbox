import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search, Filter, Calendar, Mail, MessageCircle, Loader2 } from 'lucide-react';
import { conversationsApi } from '../api/conversations';
import { formatRelativeTime } from '../utils/date';

export default function SearchPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('all');

  // Debounce search query
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    
    // Clear previous timeout
    const timeoutId = setTimeout(() => {
      setDebouncedQuery(value);
    }, 500);

    return () => clearTimeout(timeoutId);
  };

  // Calculate date range
  const getDateFrom = () => {
    if (dateRange === 'all') return undefined;
    
    const now = new Date();
    const from = new Date();
    
    switch (dateRange) {
      case 'today':
        from.setHours(0, 0, 0, 0);
        break;
      case 'week':
        from.setDate(now.getDate() - 7);
        break;
      case 'month':
        from.setMonth(now.getMonth() - 1);
        break;
      case 'year':
        from.setFullYear(now.getFullYear() - 1);
        break;
    }
    
    return from.toISOString();
  };

  // Search query
  const { data: searchResults, isLoading, error } = useQuery({
    queryKey: ['search', debouncedQuery, selectedProvider, dateRange],
    queryFn: () => conversationsApi.searchMessages(debouncedQuery, {
      provider: selectedProvider,
      dateFrom: getDateFrom(),
      limit: 50,
    }),
    enabled: debouncedQuery.length >= 2,
  });

  const handleResultClick = (conversationId: string) => {
    navigate(`/app/conversation/${conversationId}`);
  };

  const highlightMatch = (text: string, query: string) => {
    if (!query) return text;
    
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, i) => 
      part.toLowerCase() === query.toLowerCase() ? 
        <mark key={i} className="bg-yellow-200 font-medium">{part}</mark> : 
        part
    );
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 px-6 py-4 bg-white">
        <div className="flex items-center space-x-3 mb-4">
          <Search size={24} className="text-gray-900" />
          <h1 className="text-xl font-semibold text-gray-900">Search Messages</h1>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search across all conversations..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="input-field pl-10 pr-4 w-full"
            autoFocus
          />
          {isLoading && (
            <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 animate-spin" size={18} />
          )}
        </div>
        
        {searchQuery.length > 0 && searchQuery.length < 2 && (
          <p className="text-xs text-gray-500 mt-2">Type at least 2 characters to search</p>
        )}
      </div>

      {/* Filters */}
      <div className="border-b border-gray-200 px-6 py-3 bg-gray-50">
        <div className="flex flex-wrap gap-3">
          {/* Provider Filter */}
          <div className="flex items-center space-x-2">
            <Filter size={16} className="text-gray-600" />
            <select
              value={selectedProvider}
              onChange={(e) => setSelectedProvider(e.target.value)}
              className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Providers</option>
              <option value="gmail">Gmail</option>
              <option value="telegram">Telegram</option>
            </select>
          </div>

          {/* Date Range Filter */}
          <div className="flex items-center space-x-2">
            <Calendar size={16} className="text-gray-600" />
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="year">This Year</option>
            </select>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          {!searchQuery || searchQuery.length < 2 ? (
            // Empty State
            <div className="text-center py-16">
              <Search className="mx-auto mb-4 text-gray-400" size={64} />
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                Search your messages
              </h2>
              <p className="text-sm text-gray-600 mb-6">
                Find messages across all your connected accounts
              </p>
              
              {/* Search Tips */}
              <div className="bg-white rounded-lg border border-gray-200 p-6 text-left max-w-md mx-auto">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Search Tips:</h3>
                <ul className="text-sm text-gray-600 space-y-2">
                  <li className="flex items-start space-x-2">
                    <span className="text-gray-400">•</span>
                    <span>Search by keywords, sender names, or email addresses</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-gray-400">•</span>
                    <span>Filter by provider (Gmail or Telegram)</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-gray-400">•</span>
                    <span>Narrow results by date range</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-gray-400">•</span>
                    <span>Click on any result to open the full conversation</span>
                  </li>
                </ul>
              </div>
            </div>
          ) : isLoading ? (
            // Loading State
            <div className="text-center py-16">
              <Loader2 className="mx-auto mb-4 text-indigo-600 animate-spin" size={48} />
              <p className="text-sm text-gray-600">Searching messages...</p>
            </div>
          ) : error ? (
            // Error State
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
              <p className="text-sm text-red-800">Failed to search messages. Please try again.</p>
            </div>
          ) : searchResults && searchResults.totalResults > 0 ? (
            // Search Results
            <div>
              <div className="mb-4 text-sm text-gray-600">
                Found <span className="font-semibold text-gray-900">{searchResults.totalResults}</span> {searchResults.totalResults === 1 ? 'result' : 'results'} for "<span className="font-medium text-gray-900">{searchResults.query}</span>"
              </div>
              
              <div className="space-y-3">
                {searchResults.results.map((result) => (
                  <div
                    key={result.messageId}
                    onClick={() => handleResultClick(result.conversationId)}
                    className="bg-white border border-gray-200 rounded-lg p-4 hover:border-indigo-300 hover:shadow-sm transition-all cursor-pointer"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-2 flex-1 min-w-0">
                        <div className={`flex-shrink-0 ${result.provider === 'gmail' ? 'text-red-600' : 'text-blue-600'}`}>
                          {result.provider === 'gmail' ? <Mail size={18} /> : <MessageCircle size={18} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-semibold text-gray-900 truncate">
                            {result.conversationTitle}
                          </h3>
                          <p className="text-xs text-gray-600">
                            {result.senderName} • {formatRelativeTime(new Date(result.timestamp))}
                          </p>
                        </div>
                      </div>
                      <span className={`flex-shrink-0 text-xs px-2 py-1 rounded ${
                        result.provider === 'gmail' 
                          ? 'bg-red-50 text-red-700 border border-red-200' 
                          : 'bg-blue-50 text-blue-700 border border-blue-200'
                      }`}>
                        {result.provider === 'gmail' ? 'Gmail' : 'Telegram'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 line-clamp-2">
                      {highlightMatch(result.snippet, searchQuery)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            // No Results
            <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
              <Search className="mx-auto mb-3 text-gray-400" size={48} />
              <p className="text-sm text-gray-600 font-medium mb-1">No results found</p>
              <p className="text-xs text-gray-500">Try different keywords or adjust your filters</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
