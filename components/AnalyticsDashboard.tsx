import React, { useState, useEffect } from 'react';
import { analyticsService } from '../utils/analyticsService';
import { Lang, translations } from '../utils/i18n';

interface AnalyticsDashboardProps {
  lang: Lang;
  isOpen: boolean;
  onClose: () => void;
}

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ lang, isOpen, onClose }) => {
  const [stats, setStats] = useState(analyticsService.getAggregatedStats());

  useEffect(() => {
    if (isOpen) {
      const interval = setInterval(() => {
        setStats(analyticsService.getAggregatedStats());
      }, 2000); // Update every 2 seconds

      return () => clearInterval(interval);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Format bytes to human readable
  const formatTokens = (tokens: number) => {
    if (tokens >= 1000000) return (tokens / 1000000).toFixed(2) + 'M';
    if (tokens >= 1000) return (tokens / 1000).toFixed(2) + 'K';
    return tokens.toString();
  };

  // Format time
  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 rounded-2xl border border-slate-700 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-slate-800/80 backdrop-blur border-b border-slate-700 p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600/20 rounded-lg">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 text-blue-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white">Analytics Dashboard</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors text-slate-400 hover:text-slate-200"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Main Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Documents */}
            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
              <p className="text-slate-400 text-sm font-medium mb-2">📄 Documents</p>
              <p className="text-3xl font-bold text-white">{stats.totalDocuments}</p>
              <p className="text-xs text-slate-500 mt-1">uploaded</p>
            </div>

            {/* Queries */}
            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
              <p className="text-slate-400 text-sm font-medium mb-2">💬 Queries</p>
              <p className="text-3xl font-bold text-white">{stats.totalQueries}</p>
              <p className="text-xs text-slate-500 mt-1">sent</p>
            </div>

            {/* Tokens */}
            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
              <p className="text-slate-400 text-sm font-medium mb-2">🔤 Tokens</p>
              <p className="text-3xl font-bold text-white">{formatTokens(stats.totalTokens)}</p>
              <p className="text-xs text-slate-500 mt-1">processed</p>
            </div>

            {/* Cost */}
            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
              <p className="text-slate-400 text-sm font-medium mb-2">💰 Cost</p>
              <p className="text-3xl font-bold text-green-400">${stats.totalCost.toFixed(2)}</p>
              <p className="text-xs text-slate-500 mt-1">estimated</p>
            </div>
          </div>

          {/* Additional Stats */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Response Time */}
            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
              <p className="text-slate-300 font-semibold mb-3">⚡ Performance</p>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-400">Avg Response Time</span>
                  <span className="text-lg font-bold text-blue-400">
                    {stats.avgResponseTime.toFixed(2)}s
                  </span>
                </div>
                <div className="w-full bg-slate-700 rounded h-2">
                  <div
                    className="bg-blue-500 h-2 rounded transition-all"
                    style={{
                      width: `${Math.min((stats.avgResponseTime / 5) * 100, 100)}%`
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Session Duration */}
            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
              <p className="text-slate-300 font-semibold mb-3">⏱️ Session</p>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-400">Active Time</span>
                  <span className="text-lg font-bold text-purple-400">
                    {formatTime(stats.uptime)}
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Started: {new Date(stats.uptime > 86400000 ? Date.now() - stats.uptime : stats.uptime).toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {/* Documents by Day Chart */}
          <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
            <p className="text-slate-300 font-semibold mb-3">📈 Documents Per Day</p>
            <div className="space-y-2">
              {Object.entries(stats.documentsPerDay)
                .slice(-7)
                .map(([date, count]: [string, number]) => {
                  const maxCount = Math.max(...Object.values(stats.documentsPerDay).filter(v => typeof v === 'number').map(v => v as number));
                  return (
                    <div key={date} className="flex items-center gap-3">
                      <span className="text-xs text-slate-400 w-12">{date}</span>
                      <div className="flex-1 flex items-center gap-2">
                        <div className="flex-1 h-6 bg-slate-700 rounded">
                          <div
                            className="h-6 bg-emerald-500/70 rounded transition-all"
                            style={{
                              width: `${
                                maxCount > 0 ? ((count as number) / maxCount) * 100 : 0
                              }%`
                            }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-slate-300 w-8 text-right">{count}</span>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Queries by Day Chart */}
          <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
            <p className="text-slate-300 font-semibold mb-3">💬 Queries Per Day</p>
            <div className="space-y-2">
              {Object.entries(stats.queriesPerDay)
                .slice(-7)
                .map(([date, count]: [string, number]) => {
                  const maxCount = Math.max(...Object.values(stats.queriesPerDay).filter(v => typeof v === 'number').map(v => v as number));
                  return (
                    <div key={date} className="flex items-center gap-3">
                      <span className="text-xs text-slate-400 w-12">{date}</span>
                      <div className="flex-1 flex items-center gap-2">
                        <div className="flex-1 h-6 bg-slate-700 rounded">
                          <div
                            className="h-6 bg-blue-500/70 rounded transition-all"
                            style={{
                              width: `${
                                maxCount > 0 ? ((count as number) / maxCount) * 100 : 0
                              }%`
                            }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-slate-300 w-8 text-right">{count}</span>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Top Keywords */}
          {stats.topKeywords.length > 0 && (
            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
              <p className="text-slate-300 font-semibold mb-3">🔍 Top Searches</p>
              <div className="flex flex-wrap gap-2">
                {stats.topKeywords.map(({ keyword, count }) => (
                  <div
                    key={keyword}
                    className="px-3 py-1 bg-slate-700/50 rounded-full text-xs text-slate-300 border border-slate-600"
                  >
                    {keyword}
                    <span className="ml-1 text-slate-500">({count})</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer Info */}
          <div className="bg-slate-800/30 rounded-lg p-4 border border-slate-700/50">
            <div className="text-xs text-slate-400 space-y-1">
              <div>💡 Cost calculated at $0.075 per 1M input tokens</div>
              <div>📊 Data stored locally in browser (localStorage)</div>
              <div>🔄 Updates automatically every 2 seconds</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
