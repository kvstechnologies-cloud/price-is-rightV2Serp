// Performance Optimizer for Insurance Pricing System
const os = require('os');

class PerformanceOptimizer {
  constructor() {
    this.smartCache = new SmartCache();
    this.processingStartTime = null;
    this.processingEndTime = null;
    this.totalItems = 0;
    this.processedItems = 0;
    this.cacheHits = 0;
    this.cacheMisses = 0;
    this.batchStartTime = null;
    this.lastProgressUpdate = null;
  }

  // JSON Preprocessing Pipeline
  preprocessCSVToJSON(csvData) {
    console.log('🚀 Starting JSON preprocessing pipeline...');
    
    const startTime = Date.now();
    const optimizedItems = csvData.map((item, index) => {
      const description = this.extractDescription(item);
      const category = this.detectCategory(description);
      const priority = this.calculatePriority(item, category);
      const estimatedPrice = this.getEstimatedPrice(description, category);
      const searchKeywords = this.extractKeywords(description);
      
      return {
        id: index + 1,
        originalData: item,
        description,
        category,
        priority,
        estimatedPrice,
        searchKeywords,
        processingStatus: 'pending',
        processingTime: 0
      };
    });

    const processingTime = Date.now() - startTime;
    console.log(`✅ JSON preprocessing completed in ${processingTime}ms`);
    console.log(`📊 Processed ${optimizedItems.length} items`);
    
    return {
      metadata: {
        totalItems: optimizedItems.length,
        categories: this.getCategoryDistribution(optimizedItems),
        estimatedProcessingTime: this.estimateProcessingTime(optimizedItems),
        preprocessingTime: processingTime
      },
      items: optimizedItems
    };
  }

  // Category Detection
  detectCategory(description) {
    const desc = description.toLowerCase();
    
    if (desc.includes('chair') || desc.includes('stool')) return 'furniture';
    if (desc.includes('table') || desc.includes('desk')) return 'furniture';
    if (desc.includes('light') || desc.includes('lamp')) return 'lighting';
    if (desc.includes('mixer') || desc.includes('blender')) return 'appliances';
    if (desc.includes('pot') || desc.includes('pan')) return 'kitchenware';
    if (desc.includes('storage') || desc.includes('container')) return 'storage';
    if (desc.includes('heater') || desc.includes('cooler')) return 'climate';
    if (desc.includes('mailbox') || desc.includes('holder')) return 'outdoor';
    
    return 'general';
  }

  // Priority Calculation
  calculatePriority(item, category) {
    let priority = 1; // Base priority
    
    // Higher priority for expensive items
    if (item.costToReplace) {
      const cost = parseFloat(item.costToReplace);
      if (cost > 100) priority += 2;
      else if (cost > 50) priority += 1;
    }
    
    // Higher priority for specific categories
    const highPriorityCategories = ['appliances', 'furniture'];
    if (highPriorityCategories.includes(category)) {
      priority += 1;
    }
    
    // Higher priority for items with brand names
    if (item.brand && item.brand.toLowerCase() !== 'no brand') {
      priority += 1;
    }
    
    return Math.min(priority, 5); // Max priority of 5
  }

  // Price Estimation
  getEstimatedPrice(description, category) {
    const desc = description.toLowerCase();
    
    // Enhanced price estimates by category
    const estimates = {
      furniture: { base: 80, range: [40, 200] },
      lighting: { base: 30, range: [15, 100] },
      appliances: { base: 150, range: [80, 400] },
      kitchenware: { base: 25, range: [10, 80] },
      storage: { base: 20, range: [8, 60] },
      climate: { base: 60, range: [30, 150] },
      outdoor: { base: 50, range: [25, 120] },
      general: { base: 35, range: [15, 100] }
    };
    
    const categoryEstimate = estimates[category] || estimates.general;
    
    // Adjust based on description keywords
    if (desc.includes('premium') || desc.includes('deluxe')) {
      return categoryEstimate.base * 1.5;
    }
    
    if (desc.includes('basic') || desc.includes('simple')) {
      return categoryEstimate.base * 0.7;
    }
    
    return categoryEstimate.base;
  }

  // Keyword Extraction
  extractKeywords(description) {
    const words = description.toLowerCase().split(/\s+/);
    const stopWords = ['the', 'and', 'or', 'with', 'for', 'in', 'on', 'at', 'to', 'a', 'an'];
    
    return words
      .filter(word => word.length > 2 && !stopWords.includes(word))
      .slice(0, 5); // Top 5 keywords
  }

  // Batch Processing
  async processBatch(items, batchSize = 5, processor) {
    const batches = this.chunk(items, batchSize);
    const results = [];
    
    console.log(`🔄 Processing ${items.length} items in ${batches.length} batches of ${batchSize}`);
    
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      console.log(`📦 Processing batch ${i + 1}/${batches.length} (${batch.length} items)`);
      
      const batchPromises = batch.map(item => processor(item));
      const batchResults = await Promise.all(batchPromises);
      
      results.push(...batchResults);
      
      // Small delay between batches to prevent rate limiting
      if (i < batches.length - 1) {
        await this.delay(100);
      }
    }
    
    return results;
  }

  // Utility Methods
  chunk(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  extractDescription(item) {
    return item.description || item.itemDescription || item.desc || 'Unknown item';
  }

  getCategoryDistribution(items) {
    const distribution = {};
    items.forEach(item => {
      distribution[item.category] = (distribution[item.category] || 0) + 1;
    });
    return distribution;
  }

  estimateProcessingTime(items) {
    const avgTimePerItem = 3; // seconds
    const totalSeconds = items.length * avgTimePerItem;
    const minutes = Math.ceil(totalSeconds / 60);
    return `${minutes} minutes`;
  }

  // Performance Monitoring
  startProcessing(totalItems) {
    this.processingStartTime = Date.now();
    this.totalItems = totalItems;
    this.processedItems = 0;
    this.cacheHits = 0;
    this.cacheMisses = 0;
    this.batchStartTime = Date.now();
    this.lastProgressUpdate = Date.now();
    
    console.log(`🚀 Starting processing of ${totalItems} items at ${new Date(this.processingStartTime).toISOString()}`);
  }

  updateProgress(processedItems, cacheHits = 0, cacheMisses = 0) {
    this.processedItems = processedItems;
    this.cacheHits += cacheHits;
    this.cacheMisses += cacheMisses;
    
    const now = Date.now();
    const elapsedMs = now - this.processingStartTime;
    const elapsedSeconds = Math.floor(elapsedMs / 1000);
    const elapsedMinutes = Math.floor(elapsedSeconds / 60);
    
    // Update every 5 seconds or when processing completes
    if (now - this.lastProgressUpdate > 5000 || processedItems >= this.totalItems) {
      const progress = ((processedItems / this.totalItems) * 100).toFixed(1);
      const rate = processedItems > 0 ? (processedItems / (elapsedSeconds / 60)).toFixed(2) : 0;
      
      console.log(`📊 Progress: ${processedItems}/${this.totalItems} (${progress}%) - ${elapsedMinutes}m ${elapsedSeconds % 60}s elapsed - ${rate} items/min`);
      this.lastProgressUpdate = now;
    }
  }

  getProgressStats() {
    if (!this.processingStartTime) return null;
    
    const now = Date.now();
    const elapsedMs = now - this.processingStartTime;
    const elapsedSeconds = Math.floor(elapsedMs / 1000);
    const elapsedMinutes = Math.floor(elapsedSeconds / 60);
    
    return {
      totalItems: this.totalItems,
      processedItems: this.processedItems,
      progress: ((this.processedItems / this.totalItems) * 100).toFixed(1),
      elapsedMs,
      elapsedSeconds,
      elapsedMinutes,
      rate: this.processedItems > 0 ? (this.processedItems / (elapsedSeconds / 60)).toFixed(2) : 0,
      cacheHits: this.cacheHits,
      cacheMisses: this.cacheMisses,
      cacheHitRate: this.cacheHits + this.cacheMisses > 0 ? 
        ((this.cacheHits / (this.cacheHits + this.cacheMisses)) * 100).toFixed(1) : 0
    };
  }

  finishProcessing() {
    this.processingEndTime = Date.now();
    const totalTimeMs = this.processingEndTime - this.processingStartTime;
    const totalTimeSeconds = Math.floor(totalTimeMs / 1000);
    const totalTimeMinutes = Math.floor(totalTimeSeconds / 60);
    
    console.log(`🏁 Processing completed in ${totalTimeMinutes}m ${totalTimeSeconds % 60}s (${totalTimeMs}ms total)`);
    
    return {
      totalTimeMs,
      totalTimeSeconds,
      totalTimeMinutes,
      itemsPerSecond: this.processedItems / (totalTimeSeconds || 1),
      itemsPerMinute: this.processedItems / (totalTimeMinutes || 1)
    };
  }

  estimateTimeRemaining() {
    const { totalItems, processedItems, averageProcessingTime } = this.processingStats;
    const remainingItems = totalItems - processedItems;
    const remainingTime = remainingItems * averageProcessingTime;
    
    if (remainingTime < 60000) {
      return `${Math.round(remainingTime / 1000)} seconds`;
    } else {
      return `${Math.round(remainingTime / 60000)} minutes`;
    }
  }
}

// Smart Cache Implementation
class SmartCache {
  constructor(maxSize = 1000, ttl = 3600000) { // 1 hour TTL
    this.cache = new Map();
    this.maxSize = maxSize;
    this.ttl = ttl;
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0
    };
  }

  set(key, value) {
    if (this.cache.size >= this.maxSize) {
      this.evictOldest();
    }
    
    this.cache.set(key, {
      value,
      timestamp: Date.now()
    });
  }

  get(key) {
    const item = this.cache.get(key);
    
    if (!item) {
      this.stats.misses++;
      return null;
    }
    
    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }
    
    this.stats.hits++;
    return item.value;
  }

  evictOldest() {
    let oldestKey = null;
    let oldestTime = Date.now();
    
    for (const [key, item] of this.cache.entries()) {
      if (item.timestamp < oldestTime) {
        oldestTime = item.timestamp;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.stats.evictions++;
    }
  }

  getStats() {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? Math.round((this.stats.hits / total) * 100) : 0;
    
    return {
      hitRate: `${hitRate}%`,
      hits: this.stats.hits,
      misses: this.stats.misses,
      evictions: this.stats.evictions,
      size: this.cache.size,
      maxSize: this.maxSize
    };
  }

  clear() {
    this.cache.clear();
    this.stats = { hits: 0, misses: 0, evictions: 0 };
  }
}

module.exports = { PerformanceOptimizer, SmartCache };
