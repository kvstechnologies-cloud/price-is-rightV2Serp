// PHASE 3C: Analytics Dashboard for Real-time Performance Monitoring
const EventEmitter = require('events');

class AnalyticsDashboard extends EventEmitter {
  constructor() {
    super();
    
    // PHASE 3C.3: Real-time Analytics Data
    this.analytics = {
      urlGeneration: {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageResponseTime: 0,
        responseTimes: [],
        retailerBreakdown: {},
        hourlyStats: {},
        dailyStats: {}
      },
      validation: {
        totalValidations: 0,
        successfulValidations: 0,
        failedValidations: 0,
        averageValidationTime: 0,
        fallbackUsage: 0,
        cacheHitRate: 0
      },
      performance: {
        cacheHits: 0,
        cacheMisses: 0,
        memoryUsage: 0,
        cpuUsage: 0,
        activeConnections: 0
      },
      errors: {
        totalErrors: 0,
        errorTypes: {},
        recentErrors: []
      },
      insights: {
        recommendations: [],
        alerts: [],
        trends: []
      }
    };
    
    // PHASE 3C.3: Real-time Monitoring
    this.monitoringInterval = null;
    this.startTime = Date.now();
    this.lastUpdate = Date.now();
    
    // Start real-time monitoring
    this.startMonitoring();
  }

  // PHASE 3C.3: Track URL Generation Metrics
  trackUrlGeneration(url, retailer, responseTime, success, error = null) {
    const timestamp = Date.now();
    const hour = new Date(timestamp).getHours();
    const day = new Date(timestamp).toDateString();
    
    // Update basic stats
    this.analytics.urlGeneration.totalRequests++;
    if (success) {
      this.analytics.urlGeneration.successfulRequests++;
    } else {
      this.analytics.urlGeneration.failedRequests++;
    }
    
    // Update response times
    this.analytics.urlGeneration.responseTimes.push(responseTime);
    if (this.analytics.urlGeneration.responseTimes.length > 1000) {
      this.analytics.urlGeneration.responseTimes.shift(); // Keep last 1000
    }
    
    // Calculate average response time
    const totalTime = this.analytics.urlGeneration.responseTimes.reduce((a, b) => a + b, 0);
    this.analytics.urlGeneration.averageResponseTime = totalTime / this.analytics.urlGeneration.responseTimes.length;
    
    // Update retailer breakdown
    if (!this.analytics.urlGeneration.retailerBreakdown[retailer]) {
      this.analytics.urlGeneration.retailerBreakdown[retailer] = {
        total: 0,
        successful: 0,
        failed: 0,
        averageTime: 0
      };
    }
    
    this.analytics.urlGeneration.retailerBreakdown[retailer].total++;
    if (success) {
      this.analytics.urlGeneration.retailerBreakdown[retailer].successful++;
    } else {
      this.analytics.urlGeneration.retailerBreakdown[retailer].failed++;
    }
    
    // Update hourly stats
    if (!this.analytics.urlGeneration.hourlyStats[hour]) {
      this.analytics.urlGeneration.hourlyStats[hour] = {
        requests: 0,
        successRate: 0,
        averageTime: 0
      };
    }
    this.analytics.urlGeneration.hourlyStats[hour].requests++;
    
    // Update daily stats
    if (!this.analytics.urlGeneration.dailyStats[day]) {
      this.analytics.urlGeneration.dailyStats[day] = {
        requests: 0,
        successRate: 0,
        averageTime: 0
      };
    }
    this.analytics.urlGeneration.dailyStats[day].requests++;
    
    // Track errors
    if (error) {
      this.trackError(error, 'url_generation');
    }
    
    // Emit real-time update
    this.emit('urlGeneration', {
      url,
      retailer,
      responseTime,
      success,
      timestamp
    });
    
    this.lastUpdate = timestamp;
  }

  // PHASE 3C.3: Track Validation Metrics
  trackValidation(url, isValid, validationTime, fallbackUsed = false) {
    this.analytics.validation.totalValidations++;
    
    if (isValid) {
      this.analytics.validation.successfulValidations++;
    } else {
      this.analytics.validation.failedValidations++;
    }
    
    if (fallbackUsed) {
      this.analytics.validation.fallbackUsage++;
    }
    
    // Update average validation time
    const currentAvg = this.analytics.validation.averageValidationTime;
    const totalValidations = this.analytics.validation.totalValidations;
    this.analytics.validation.averageValidationTime = 
      ((currentAvg * (totalValidations - 1)) + validationTime) / totalValidations;
    
    // Emit real-time update
    this.emit('validation', {
      url,
      isValid,
      validationTime,
      fallbackUsed,
      timestamp: Date.now()
    });
  }

  // PHASE 3C.3: Track Performance Metrics
  trackPerformance(cacheHits, cacheMisses, memoryUsage, cpuUsage, activeConnections) {
    this.analytics.performance.cacheHits = cacheHits;
    this.analytics.performance.cacheMisses = cacheMisses;
    this.analytics.performance.memoryUsage = memoryUsage;
    this.analytics.performance.cpuUsage = cpuUsage;
    this.analytics.performance.activeConnections = activeConnections;
    
    // Calculate cache hit rate
    const totalCacheRequests = cacheHits + cacheMisses;
    this.analytics.validation.cacheHitRate = totalCacheRequests > 0 ? 
      (cacheHits / totalCacheRequests) * 100 : 0;
    
    // Emit real-time update
    this.emit('performance', {
      cacheHits,
      cacheMisses,
      memoryUsage,
      cpuUsage,
      activeConnections,
      timestamp: Date.now()
    });
  }

  // PHASE 3C.3: Track Errors
  trackError(error, errorType) {
    this.analytics.errors.totalErrors++;
    
    if (!this.analytics.errors.errorTypes[errorType]) {
      this.analytics.errors.errorTypes[errorType] = 0;
    }
    this.analytics.errors.errorTypes[errorType]++;
    
    // Keep recent errors (last 50)
    this.analytics.errors.recentErrors.push({
      error: error.message || error,
      type: errorType,
      timestamp: Date.now()
    });
    
    if (this.analytics.errors.recentErrors.length > 50) {
      this.analytics.errors.recentErrors.shift();
    }
    
    // Emit real-time update
    this.emit('error', {
      error: error.message || error,
      type: errorType,
      timestamp: Date.now()
    });
  }

  // PHASE 3C.3: Generate Insights and Recommendations
  generateInsights() {
    const insights = [];
    const alerts = [];
    const trends = [];
    
    // PHASE 3C.3: Performance Insights
    const successRate = this.analytics.urlGeneration.totalRequests > 0 ? 
      (this.analytics.urlGeneration.successfulRequests / this.analytics.urlGeneration.totalRequests) * 100 : 0;
    
    if (successRate < 80) {
      insights.push({
        type: 'performance',
        severity: 'warning',
        message: `URL generation success rate is ${successRate.toFixed(1)}% - consider reviewing retailer detection logic`,
        recommendation: 'Review and optimize retailer detection algorithms'
      });
    }
    
    if (this.analytics.urlGeneration.averageResponseTime > 100) {
      insights.push({
        type: 'performance',
        severity: 'warning',
        message: `Average response time is ${this.analytics.urlGeneration.averageResponseTime.toFixed(2)}ms - exceeds target of 100ms`,
        recommendation: 'Implement additional caching or optimize algorithms'
      });
    }
    
    // PHASE 3C.3: Cache Performance Insights
    if (this.analytics.validation.cacheHitRate < 50) {
      insights.push({
        type: 'cache',
        severity: 'info',
        message: `Cache hit rate is ${this.analytics.validation.cacheHitRate.toFixed(1)}% - consider expanding cache size`,
        recommendation: 'Increase cache size or adjust TTL settings'
      });
    }
    
    // PHASE 3C.3: Error Rate Alerts
    const errorRate = this.analytics.errors.totalErrors / this.analytics.urlGeneration.totalRequests * 100;
    if (errorRate > 5) {
      alerts.push({
        type: 'error_rate',
        severity: 'critical',
        message: `Error rate is ${errorRate.toFixed(1)}% - investigate immediately`,
        recommendation: 'Review error logs and fix underlying issues'
      });
    }
    
    // PHASE 3C.3: Trend Analysis
    const recentRequests = Object.values(this.analytics.urlGeneration.hourlyStats)
      .slice(-24) // Last 24 hours
      .reduce((sum, hour) => sum + hour.requests, 0);
    
    if (recentRequests > 1000) {
      trends.push({
        type: 'usage',
        message: `High usage detected: ${recentRequests} requests in last 24 hours`,
        recommendation: 'Consider scaling infrastructure'
      });
    }
    
    // PHASE 3C.3: Retailer Performance Analysis
    Object.entries(this.analytics.urlGeneration.retailerBreakdown).forEach(([retailer, stats]) => {
      const retailerSuccessRate = stats.total > 0 ? (stats.successful / stats.total) * 100 : 0;
      
      if (retailerSuccessRate < 70) {
        insights.push({
          type: 'retailer',
          severity: 'warning',
          message: `${retailer} success rate is ${retailerSuccessRate.toFixed(1)}%`,
          recommendation: `Review ${retailer} URL generation logic`
        });
      }
    });
    
    this.analytics.insights.recommendations = insights;
    this.analytics.insights.alerts = alerts;
    this.analytics.insights.trends = trends;
    
    return {
      insights,
      alerts,
      trends
    };
  }

  // PHASE 3C.3: Get Comprehensive Analytics Report
  getAnalyticsReport() {
    const insights = this.generateInsights();
    const uptime = Date.now() - this.startTime;
    
    return {
      summary: {
        uptime: this.formatUptime(uptime),
        totalRequests: this.analytics.urlGeneration.totalRequests,
        successRate: this.analytics.urlGeneration.totalRequests > 0 ? 
          ((this.analytics.urlGeneration.successfulRequests / this.analytics.urlGeneration.totalRequests) * 100).toFixed(1) + '%' : '0%',
        averageResponseTime: this.analytics.urlGeneration.averageResponseTime.toFixed(2) + 'ms',
        cacheHitRate: this.analytics.validation.cacheHitRate.toFixed(1) + '%',
        errorRate: this.analytics.urlGeneration.totalRequests > 0 ? 
          ((this.analytics.errors.totalErrors / this.analytics.urlGeneration.totalRequests) * 100).toFixed(2) + '%' : '0%'
      },
      urlGeneration: this.analytics.urlGeneration,
      validation: this.analytics.validation,
      performance: this.analytics.performance,
      errors: this.analytics.errors,
      insights: insights,
      lastUpdate: new Date(this.lastUpdate).toISOString()
    };
  }

  // PHASE 3C.3: Get Real-time Dashboard Data
  getDashboardData() {
    const insights = this.generateInsights();
    
    return {
      realTime: {
        requestsPerMinute: this.calculateRequestsPerMinute(),
        activeErrors: this.analytics.errors.recentErrors.length,
        systemHealth: this.calculateSystemHealth(),
        lastActivity: new Date(this.lastUpdate).toISOString()
      },
      performance: {
        successRate: this.analytics.urlGeneration.totalRequests > 0 ? 
          ((this.analytics.urlGeneration.successfulRequests / this.analytics.urlGeneration.totalRequests) * 100).toFixed(1) : 0,
        averageResponseTime: this.analytics.urlGeneration.averageResponseTime.toFixed(2),
        cacheHitRate: this.analytics.validation.cacheHitRate.toFixed(1),
        memoryUsage: this.analytics.performance.memoryUsage
      },
      alerts: insights.alerts,
      topRetailers: this.getTopRetailers(),
      recentActivity: this.getRecentActivity()
    };
  }

  // PHASE 3C.3: Helper Methods
  calculateRequestsPerMinute() {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    const recentRequests = Object.values(this.analytics.urlGeneration.hourlyStats)
      .filter(hour => hour.requests > 0)
      .reduce((sum, hour) => sum + hour.requests, 0);
    
    return Math.round(recentRequests / 60); // Approximate per minute
  }

  calculateSystemHealth() {
    const successRate = this.analytics.urlGeneration.totalRequests > 0 ? 
      (this.analytics.urlGeneration.successfulRequests / this.analytics.urlGeneration.totalRequests) * 100 : 100;
    
    const errorRate = this.analytics.urlGeneration.totalRequests > 0 ? 
      (this.analytics.errors.totalErrors / this.analytics.urlGeneration.totalRequests) * 100 : 0;
    
    if (successRate >= 95 && errorRate <= 1) return 'excellent';
    if (successRate >= 85 && errorRate <= 3) return 'good';
    if (successRate >= 70 && errorRate <= 5) return 'fair';
    return 'poor';
  }

  getTopRetailers() {
    return Object.entries(this.analytics.urlGeneration.retailerBreakdown)
      .map(([retailer, stats]) => ({
        retailer,
        requests: stats.total,
        successRate: stats.total > 0 ? (stats.successful / stats.total) * 100 : 0
      }))
      .sort((a, b) => b.requests - a.requests)
      .slice(0, 5);
  }

  getRecentActivity() {
    return this.analytics.errors.recentErrors
      .slice(-10)
      .map(error => ({
        type: error.type,
        message: error.error,
        timestamp: new Date(error.timestamp).toISOString()
      }));
  }

  formatUptime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }

  // PHASE 3C.3: Start Real-time Monitoring
  startMonitoring() {
    this.monitoringInterval = setInterval(() => {
      this.generateInsights();
      this.emit('dashboardUpdate', this.getDashboardData());
    }, 30000); // Update every 30 seconds
  }

  // PHASE 3C.3: Stop Monitoring
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  // PHASE 3C.3: Reset Analytics
  resetAnalytics() {
    this.analytics = {
      urlGeneration: {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageResponseTime: 0,
        responseTimes: [],
        retailerBreakdown: {},
        hourlyStats: {},
        dailyStats: {}
      },
      validation: {
        totalValidations: 0,
        successfulValidations: 0,
        failedValidations: 0,
        averageValidationTime: 0,
        fallbackUsage: 0,
        cacheHitRate: 0
      },
      performance: {
        cacheHits: 0,
        cacheMisses: 0,
        memoryUsage: 0,
        cpuUsage: 0,
        activeConnections: 0
      },
      errors: {
        totalErrors: 0,
        errorTypes: {},
        recentErrors: []
      },
      insights: {
        recommendations: [],
        alerts: [],
        trends: []
      }
    };
    
    this.startTime = Date.now();
    this.lastUpdate = Date.now();
  }
}

module.exports = AnalyticsDashboard;


