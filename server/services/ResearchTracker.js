/**
 * ResearchTracker Service
 * Tracks AI research attempts, outcomes, and provides analytics
 * Designed to be easily migrated to database storage later
 */

class ResearchTracker {
  constructor() {
    // In-memory storage (can be replaced with database later)
    this.researchHistory = new Map();
    this.successMetrics = {
      totalAttempts: 0,
      successfulPricing: 0,
      failedPricing: 0,
      aiResearchTriggered: 0,
      aiResearchSuccessful: 0,
      aiResearchFailed: 0
    };
    
    // Research session tracking
    this.currentSession = null;
    this.sessionHistory = [];
    
    // Performance metrics
    this.performanceMetrics = {
      averageResponseTime: 0,
      totalResponseTime: 0,
      responseCount: 0
    };
    
    console.log('🔍 ResearchTracker initialized');
  }

  /**
   * Start a new research session
   */
  startSession(sessionId, userId = 'anonymous') {
    this.currentSession = {
      sessionId,
      userId,
      startTime: new Date(),
      researchAttempts: [],
      successfulPricings: [],
      failedPricings: [],
      aiResearchCount: 0,
      totalItems: 0
    };
    
    console.log(`🔍 Research session started: ${sessionId} for user: ${userId}`);
    return this.currentSession;
  }

  /**
   * End current research session
   */
  endSession() {
    if (!this.currentSession) return null;
    
    this.currentSession.endTime = new Date();
    this.currentSession.duration = this.currentSession.endTime - this.currentSession.startTime;
    this.currentSession.successRate = this.currentSession.successfulPricings.length / this.currentSession.totalItems;
    
    // Store session in history
    this.sessionHistory.push(this.currentSession);
    
    // Update global metrics
    this.successMetrics.totalAttempts += this.currentSession.totalItems;
    this.successMetrics.successfulPricing += this.currentSession.successfulPricings.length;
    this.successMetrics.failedPricing += this.currentSession.failedPricings.length;
    this.successMetrics.aiResearchTriggered += this.currentSession.aiResearchCount;
    
    console.log(`🔍 Research session ended: ${this.currentSession.sessionId}`);
    console.log(`   - Success Rate: ${(this.currentSession.successRate * 100).toFixed(1)}%`);
    console.log(`   - AI Research Count: ${this.currentSession.aiResearchCount}`);
    
    const session = this.currentSession;
    this.currentSession = null;
    return session;
  }

  /**
   * Track a research attempt
   */
  trackResearchAttempt(query, targetPrice = null, startTime = Date.now()) {
    const attemptId = `attempt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const attempt = {
      id: attemptId,
      query,
      targetPrice,
      startTime: new Date(startTime),
      status: 'in_progress',
      searchResults: null,
      aiResearch: null,
      finalResult: null,
      processingTime: null,
      success: false,
      matchQuality: null,
      searchStrategy: null,
      alternativeScore: null
    };
    
    // Store in global history
    this.researchHistory.set(attemptId, attempt);
    
    // Add to current session if exists
    if (this.currentSession) {
      this.currentSession.researchAttempts.push(attempt);
      this.currentSession.totalItems++;
    }
    
    console.log(`🔍 Research attempt tracked: ${attemptId} for query: "${query}"`);
    return attemptId;
  }

  /**
   * Update research attempt with search results
   */
  updateSearchResults(attemptId, searchResults) {
    const attempt = this.researchHistory.get(attemptId);
    if (!attempt) {
      console.warn(`⚠️ Attempt not found: ${attemptId}`);
      return false;
    }
    
    attempt.searchResults = searchResults;
    attempt.status = 'search_completed';
    
    // Analyze search results
    if (searchResults && searchResults.found) {
      attempt.success = true;
      attempt.matchQuality = searchResults.matchQuality || 'Unknown';
      attempt.searchStrategy = searchResults.searchStrategy || 'Direct Search';
      attempt.alternativeScore = searchResults.alternativeScore || null;
      
      // Add to session successful pricings
      if (this.currentSession) {
        this.currentSession.successfulPricings.push({
          query: attempt.query,
          price: searchResults.price,
          matchQuality: attempt.matchQuality,
          searchStrategy: attempt.searchStrategy
        });
      }
    } else {
      attempt.success = false;
      
      // Add to session failed pricings
      if (this.currentSession) {
        this.currentSession.failedPricings.push({
          query: attempt.query,
          reason: searchResults?.explanation || 'No results found',
          searchStrategy: 'Direct Search'
        });
      }
    }
    
    console.log(`🔍 Search results updated for ${attemptId}: ${attempt.success ? 'SUCCESS' : 'FAILED'}`);
    return true;
  }

  /**
   * Track AI research attempt
   */
  trackAIResearch(attemptId, aiResearchData) {
    const attempt = this.researchHistory.get(attemptId);
    if (!attempt) {
      console.warn(`⚠️ Attempt not found: ${attemptId}`);
      return false;
    }
    
    attempt.aiResearch = {
      ...aiResearchData,
      timestamp: new Date(),
      success: false
    };
    
    attempt.status = 'ai_research_in_progress';
    
    // Update session AI research count
    if (this.currentSession) {
      this.currentSession.aiResearchCount++;
    }
    
    // Update global metrics
    this.successMetrics.aiResearchTriggered++;
    
    console.log(`🔍 AI research tracked for ${attemptId}`);
    return true;
  }

  /**
   * Update AI research results
   */
  updateAIResearchResults(attemptId, aiResults, success = false) {
    const attempt = this.researchHistory.get(attemptId);
    if (!attempt || !attempt.aiResearch) {
      console.warn(`⚠️ Attempt or AI research not found: ${attemptId}`);
      return false;
    }
    
    attempt.aiResearch = {
      ...attempt.aiResearch,
      results: aiResults,
      success,
      completedAt: new Date()
    };
    
    attempt.status = success ? 'ai_research_successful' : 'ai_research_failed';
    
    // Update global metrics
    if (success) {
      this.successMetrics.aiResearchSuccessful++;
    } else {
      this.successMetrics.aiResearchFailed++;
    }
    
    console.log(`🔍 AI research results updated for ${attemptId}: ${success ? 'SUCCESS' : 'FAILED'}`);
    return true;
  }

  /**
   * Complete research attempt
   */
  completeResearchAttempt(attemptId, finalResult, endTime = Date.now()) {
    const attempt = this.researchHistory.get(attemptId);
    if (!attempt) {
      console.warn(`⚠️ Attempt not found: ${attemptId}`);
      return false;
    }
    
    attempt.finalResult = finalResult;
    attempt.status = 'completed';
    attempt.endTime = new Date(endTime);
    attempt.processingTime = endTime - attempt.startTime.getTime();
    
    // Update performance metrics
    this.performanceMetrics.totalResponseTime += attempt.processingTime;
    this.performanceMetrics.responseCount++;
    this.performanceMetrics.averageResponseTime = this.performanceMetrics.totalResponseTime / this.performanceMetrics.responseCount;
    
    console.log(`🔍 Research attempt completed: ${attemptId} in ${attempt.processingTime}ms`);
    return true;
  }

  /**
   * Get research analytics
   */
  getResearchAnalytics() {
    const totalAttempts = this.successMetrics.totalAttempts;
    const successfulPricings = this.successMetrics.successfulPricing;
    const failedPricings = this.successMetrics.failedPricing;
    const aiResearchTriggered = this.successMetrics.aiResearchTriggered;
    const aiResearchSuccessful = this.successMetrics.aiResearchSuccessful;
    
    const analytics = {
      // Success Rates
      overallSuccessRate: totalAttempts > 0 ? (successfulPricings / totalAttempts) * 100 : 0,
      aiResearchSuccessRate: aiResearchTriggered > 0 ? (aiResearchSuccessful / aiResearchTriggered) * 100 : 0,
      
      // Volume Metrics
      totalResearchAttempts: totalAttempts,
      successfulPricings,
      failedPricings,
      aiResearchTriggered,
      aiResearchSuccessful,
      
      // Performance Metrics
      averageResponseTime: this.performanceMetrics.averageResponseTime,
      totalResponseTime: this.performanceMetrics.totalResponseTime,
      
      // Session Metrics
      totalSessions: this.sessionHistory.length,
      currentSession: this.currentSession ? {
        sessionId: this.currentSession.sessionId,
        startTime: this.currentSession.startTime,
        totalItems: this.currentSession.totalItems,
        aiResearchCount: this.currentSession.aiResearchCount
      } : null
    };
    
    return analytics;
  }

  /**
   * Get detailed research history
   */
  getResearchHistory(limit = 100, filters = {}) {
    let history = Array.from(this.researchHistory.values());
    
    // Apply filters
    if (filters.status) {
      history = history.filter(attempt => attempt.status === filters.status);
    }
    
    if (filters.success !== undefined) {
      history = history.filter(attempt => attempt.success === filters.success);
    }
    
    if (filters.query) {
      history = history.filter(attempt => 
        attempt.query.toLowerCase().includes(filters.query.toLowerCase())
      );
    }
    
    // Sort by start time (newest first)
    history.sort((a, b) => b.startTime - a.startTime);
    
    // Apply limit
    if (limit > 0) {
      history = history.slice(0, limit);
    }
    
    return history;
  }

  /**
   * Get session analytics
   */
  getSessionAnalytics() {
    if (this.sessionHistory.length === 0) {
      return {
        totalSessions: 0,
        averageSuccessRate: 0,
        averageDuration: 0,
        totalItems: 0
      };
    }
    
    const totalSessions = this.sessionHistory.length;
    const totalSuccessRate = this.sessionHistory.reduce((sum, session) => sum + session.successRate, 0);
    const totalDuration = this.sessionHistory.reduce((sum, session) => sum + session.duration, 0);
    const totalItems = this.sessionHistory.reduce((sum, session) => sum + session.totalItems, 0);
    
    return {
      totalSessions,
      averageSuccessRate: (totalSuccessRate / totalSessions) * 100,
      averageDuration: totalDuration / totalSessions,
      totalItems,
      sessions: this.sessionHistory.map(session => ({
        sessionId: session.sessionId,
        userId: session.userId,
        startTime: session.startTime,
        endTime: session.endTime,
        duration: session.duration,
        totalItems: session.totalItems,
        successRate: session.successRate * 100,
        aiResearchCount: session.aiResearchCount
      }))
    };
  }

  /**
   * Get performance insights
   */
  getPerformanceInsights() {
    const analytics = this.getResearchAnalytics();
    const sessionAnalytics = this.getSessionAnalytics();
    
    const insights = {
      // Performance Trends
      responseTimeTrend: this.performanceMetrics.averageResponseTime < 5000 ? 'Excellent' : 
                        this.performanceMetrics.averageResponseTime < 10000 ? 'Good' : 'Needs Improvement',
      
      // Success Insights
      successTrend: analytics.overallSuccessRate > 80 ? 'Excellent' :
                   analytics.overallSuccessRate > 60 ? 'Good' :
                   analytics.overallSuccessRate > 40 ? 'Fair' : 'Needs Improvement',
      
      // AI Research Effectiveness
      aiResearchEffectiveness: analytics.aiResearchSuccessRate > 70 ? 'Highly Effective' :
                              analytics.aiResearchSuccessRate > 50 ? 'Effective' :
                              analytics.aiResearchSuccessRate > 30 ? 'Moderately Effective' : 'Needs Improvement',
      
      // Recommendations
      recommendations: this.generateRecommendations(analytics, sessionAnalytics)
    };
    
    return insights;
  }

  /**
   * Generate improvement recommendations
   */
  generateRecommendations(analytics, sessionAnalytics) {
    const recommendations = [];
    
    if (analytics.overallSuccessRate < 60) {
      recommendations.push({
        type: 'success_rate',
        priority: 'high',
        message: 'Overall success rate is below target. Consider improving search strategies and product matching algorithms.',
        suggestedActions: [
          'Review failed search queries for patterns',
          'Enhance product attribute extraction',
          'Optimize search term generation'
        ]
      });
    }
    
    if (analytics.aiResearchSuccessRate < 50) {
      recommendations.push({
        type: 'ai_research',
        priority: 'medium',
        message: 'AI research success rate could be improved. Consider refining AI prompts and fallback strategies.',
        suggestedActions: [
          'Analyze AI research failures',
          'Improve prompt engineering',
          'Add more fallback search strategies'
        ]
      });
    }
    
    if (this.performanceMetrics.averageResponseTime > 10000) {
      recommendations.push({
        type: 'performance',
        priority: 'medium',
        message: 'Average response time is high. Consider performance optimizations.',
        suggestedActions: [
          'Implement caching strategies',
          'Optimize search algorithms',
          'Review API rate limiting'
        ]
      });
    }
    
    if (sessionAnalytics.totalSessions > 0 && sessionAnalytics.averageSuccessRate < 60) {
      recommendations.push({
        type: 'user_experience',
        priority: 'low',
        message: 'User session success rates could be improved. Consider user onboarding and interface improvements.',
        suggestedActions: [
          'Improve user interface guidance',
          'Add search tips and examples',
          'Implement progressive disclosure of advanced features'
        ]
      });
    }
    
    return recommendations;
  }

  /**
   * Export research data (for database migration later)
   */
  exportResearchData() {
    return {
      researchHistory: Array.from(this.researchHistory.values()),
      successMetrics: this.successMetrics,
      performanceMetrics: this.performanceMetrics,
      sessionHistory: this.sessionHistory,
      exportTimestamp: new Date().toISOString()
    };
  }

  /**
   * Clear all data (for testing/reset)
   */
  clearData() {
    this.researchHistory.clear();
    this.sessionHistory = [];
    this.successMetrics = {
      totalAttempts: 0,
      successfulPricing: 0,
      failedPricing: 0,
      aiResearchTriggered: 0,
      aiResearchSuccessful: 0,
      aiResearchFailed: 0
    };
    this.performanceMetrics = {
      averageResponseTime: 0,
      totalResponseTime: 0,
      responseCount: 0
    };
    this.currentSession = null;
    
    console.log('🔍 All research data cleared');
  }
}

module.exports = ResearchTracker;
