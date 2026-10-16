import { useState } from 'react';
import { Search, Filter, Calendar, Tag } from 'lucide-react';

export default function SearchPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('all');

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
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field pl-10 pr-4 w-full"
            autoFocus
          />
        </div>
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
              className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">All Providers</option>
              <option value="gmail">Gmail</option>
              <option value="telegram">Telegram</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="instagram">Instagram</option>
            </select>
          </div>

          {/* Date Range Filter */}
          <div className="flex items-center space-x-2">
            <Calendar size={16} className="text-gray-600" />
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="year">This Year</option>
            </select>
          </div>

          {/* Advanced Filters */}
          <button className="btn-ghost text-sm flex items-center space-x-1">
            <Tag size={16} />
            <span>More Filters</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          {!searchQuery ? (
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
                    <span>Use quotes for exact phrases: <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">"project update"</code></span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-gray-400">•</span>
                    <span>Search by sender name or email</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-gray-400">•</span>
                    <span>Filter by date range and provider</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-gray-400">•</span>
                    <span>Search content includes message text and attachments</span>
                  </li>
                </ul>
              </div>
            </div>
          ) : (
            // Search Results
            <div>
              <div className="mb-4 text-sm text-gray-600">
                Searching for "<span className="font-medium text-gray-900">{searchQuery}</span>"...
              </div>
              
              <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                <p className="text-sm text-gray-600">No results found</p>
                <p className="text-xs text-gray-500 mt-1">Try different keywords or filters</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
