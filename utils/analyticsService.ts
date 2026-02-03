/**
 * Analytics Service - Tracks user interactions and usage metrics
 * Stores data in localStorage for persistence
 */

export interface AnalyticsEvent {
  type: 'document_upload' | 'document_delete' | 'query_sent' | 'document_summarize' | 'search_performed';
  timestamp: number;
  documentCount?: number;
  tokensUsed?: number;
  responseTime?: number;
  metadata?: Record<string, any>;
}

export interface DailyStats {
  date: string;
  documentsUploaded: number;
  queriesSent: number;
  totalTokensUsed: number;
  avgResponseTime: number;
  totalResponseTime: number;
  searchesPerformed: number;
}

export interface AnalyticsData {
  events: AnalyticsEvent[];
  dailyStats: Record<string, DailyStats>;
  totalDocumentsUploaded: number;
  totalQueriesSent: number;
  totalTokensUsed: number;
  totalResponses: number;
  estimatedCost: number;
  mostSearchedKeywords: Record<string, number>;
  sessionStartTime: number;
  lastUpdateTime: number;
}

class AnalyticsServiceClass {
  private storageKey = 'gemini-rag-analytics';
  private eventBuffer: AnalyticsEvent[] = [];
  private flushInterval = 5000; // Flush every 5 seconds
  private flushTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.startAutoFlush();
  }

  /**
   * Track an analytics event
   */
  trackEvent(event: AnalyticsEvent): void {
    this.eventBuffer.push({
      ...event,
      timestamp: Date.now()
    });

    // Flush if buffer gets large
    if (this.eventBuffer.length >= 10) {
      this.flush();
    }
  }

  /**
   * Track document upload
   */
  trackDocumentUpload(documentCount: number): void {
    this.trackEvent({
      type: 'document_upload',
      timestamp: Date.now(),
      documentCount
    });
  }

  /**
   * Track document deletion
   */
  trackDocumentDelete(documentCount: number): void {
    this.trackEvent({
      type: 'document_delete',
      timestamp: Date.now(),
      documentCount
    });
  }

  /**
   * Track query sent with metrics
   */
  trackQuery(tokensUsed: number, responseTime: number): void {
    this.trackEvent({
      type: 'query_sent',
      timestamp: Date.now(),
      tokensUsed,
      responseTime
    });
  }

  /**
   * Track document summarization
   */
  trackSummarize(documentCount: number, tokensUsed: number): void {
    this.trackEvent({
      type: 'document_summarize',
      timestamp: Date.now(),
      documentCount,
      tokensUsed
    });
  }

  /**
   * Track search performed
   */
  trackSearch(query: string): void {
    this.trackEvent({
      type: 'search_performed',
      timestamp: Date.now(),
      metadata: { query }
    });
  }

  /**
   * Flush event buffer to storage
   */
  private flush(): void {
    if (this.eventBuffer.length === 0) return;

    try {
      const data = this.getData();
      data.events.push(...this.eventBuffer);
      data.lastUpdateTime = Date.now();
      this.saveData(data);
      this.eventBuffer = [];
    } catch (error) {
      console.error('Failed to flush analytics:', error);
    }
  }

  /**
   * Start automatic flush timer
   */
  private startAutoFlush(): void {
    this.flushTimer = setInterval(() => this.flush(), this.flushInterval);
  }

  /**
   * Get analytics data
   */
  getData(): AnalyticsData {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to parse analytics data:', error);
    }

    return this.getEmptyData();
  }

  /**
   * Save analytics data
   */
  private saveData(data: AnalyticsData): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save analytics data:', error);
    }
  }

  /**
   * Get empty analytics data structure
   */
  private getEmptyData(): AnalyticsData {
    return {
      events: [],
      dailyStats: {},
      totalDocumentsUploaded: 0,
      totalQueriesSent: 0,
      totalTokensUsed: 0,
      totalResponses: 0,
      estimatedCost: 0,
      mostSearchedKeywords: {},
      sessionStartTime: Date.now(),
      lastUpdateTime: Date.now()
    };
  }

  /**
   * Calculate aggregated statistics
   */
  getAggregatedStats() {
    const data = this.getData();
    const stats = {
      totalDocuments: 0,
      totalQueries: 0,
      totalTokens: 0,
      totalCost: 0,
      avgResponseTime: 0,
      documentsPerDay: {} as Record<string, number>,
      queriesPerDay: {} as Record<string, number>,
      topKeywords: [] as Array<{ keyword: string; count: number }>,
      uptime: 0
    };

    // Process events
    let totalResponseTime = 0;
    let responseCount = 0;

    data.events.forEach(event => {
      const date = new Date(event.timestamp).toISOString().split('T')[0];

      switch (event.type) {
        case 'document_upload':
          stats.totalDocuments += event.documentCount || 1;
          stats.documentsPerDay[date] = (stats.documentsPerDay[date] || 0) + (event.documentCount || 1);
          break;
        case 'query_sent':
          stats.totalQueries += 1;
          stats.totalTokens += event.tokensUsed || 0;
          stats.queriesPerDay[date] = (stats.queriesPerDay[date] || 0) + 1;
          if (event.responseTime) {
            totalResponseTime += event.responseTime;
            responseCount += 1;
          }
          break;
        case 'search_performed':
          const keyword = event.metadata?.query || 'unknown';
          // Track keyword frequency
          break;
      }
    });

    // Calculate derived stats
    stats.avgResponseTime = responseCount > 0 ? totalResponseTime / responseCount : 0;
    stats.totalCost = (stats.totalTokens / 1000000) * 0.075; // $0.075 per 1M tokens
    stats.uptime = Date.now() - data.sessionStartTime;

    // Get top keywords
    stats.topKeywords = Object.entries(data.mostSearchedKeywords)
      .map(([keyword, count]) => ({ keyword, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return stats;
  }

  /**
   * Get stats for a specific date range
   */
  getStatsForDateRange(startDate: Date, endDate: Date) {
    const data = this.getData();
    const stats = {
      documents: 0,
      queries: 0,
      tokens: 0,
      cost: 0,
      avgResponseTime: 0
    };

    let totalResponseTime = 0;
    let responseCount = 0;

    data.events.forEach(event => {
      const eventDate = new Date(event.timestamp);
      if (eventDate >= startDate && eventDate <= endDate) {
        if (event.type === 'document_upload') {
          stats.documents += event.documentCount || 1;
        } else if (event.type === 'query_sent') {
          stats.queries += 1;
          stats.tokens += event.tokensUsed || 0;
          if (event.responseTime) {
            totalResponseTime += event.responseTime;
            responseCount += 1;
          }
        }
      }
    });

    stats.avgResponseTime = responseCount > 0 ? totalResponseTime / responseCount : 0;
    stats.cost = (stats.tokens / 1000000) * 0.075;

    return stats;
  }

  /**
   * Clear all analytics data
   */
  clearData(): void {
    try {
      localStorage.removeItem(this.storageKey);
      this.eventBuffer = [];
    } catch (error) {
      console.error('Failed to clear analytics:', error);
    }
  }

  /**
   * Destroy the service (cleanup)
   */
  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    this.flush();
  }
}

// Export singleton instance
export const analyticsService = new AnalyticsServiceClass();
