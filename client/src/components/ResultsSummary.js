/**
 * ResultsSummary Component
 * Displays summary statistics for pricing results
 * Never shows N/A - always displays meaningful numbers
 */
export class ResultsSummary {
    constructor(container) {
        this.container = container;
        this.currentStats = null;
    }

    /**
     * Display summary statistics from the always show price pipeline
     * @param {Array} results - Array of pricing results
     * @param {Object} options - Display options (processingTime, etc.)
     */
    displaySummary(results, options = {}) {
        console.log('🔍 ResultsSummary: Displaying summary for results:', results);
        
        if (!Array.isArray(results)) {
            console.error('❌ Invalid results format - expected array');
            return;
        }

        // Calculate statistics
        const stats = this.calculateStatistics(results, options);
        this.currentStats = stats;
        
        // Create the summary HTML
        const summaryHTML = this.createSummaryHTML(stats);
        
        // Update container
        this.container.innerHTML = summaryHTML;
        
        console.log('✅ ResultsSummary: Summary displayed successfully');
    }

    /**
     * Calculate comprehensive statistics from results
     */
    calculateStatistics(results, options = {}) {
        const totalItems = results.length;
        
        // Count by pricing tier (never count as "not found")
        const tierCounts = {
            SERP: 0,
            FALLBACK: 0,
            AGGREGATED: 0,
            BASELINE: 0,
            NONE: 0
        };

        // Count by status
        const statusCounts = {
            FOUND: 0,
            ESTIMATED: 0,
            MANUAL_NEEDED: 0
        };

        // Price statistics
        let totalValue = 0;
        let priceCount = 0;
        const prices = [];

        results.forEach(item => {
            // Count pricing tiers
            const tier = item.pricingTier || 'NONE';
            if (tierCounts.hasOwnProperty(tier)) {
                tierCounts[tier]++;
            } else {
                tierCounts.NONE++;
            }

            // Count statuses
            const status = item.status || 'ESTIMATED';
            if (statusCounts.hasOwnProperty(status)) {
                statusCounts[status]++;
            } else {
                statusCounts.ESTIMATED++;
            }

            // Collect prices (always have a price due to baseline system)
            const price = parseFloat(item.adjustedPrice);
            if (!isNaN(price) && price > 0) {
                totalValue += price;
                priceCount++;
                prices.push(price);
            }
        });

        // Calculate success metrics
        // "Found Prices" = all items that have pricing (should be 100% due to baseline)
        const foundPrices = tierCounts.SERP + tierCounts.FALLBACK + tierCounts.AGGREGATED + tierCounts.BASELINE;
        
        // Success rate = items with exact/similar matches (SERP + FALLBACK)
        const exactMatches = tierCounts.SERP + tierCounts.FALLBACK;
        const successRate = totalItems > 0 ? Math.round((exactMatches / totalItems) * 100) : 0;

        // Price statistics
        const averagePrice = priceCount > 0 ? totalValue / priceCount : 0;
        const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
        const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;

        // Processing time
        const processingTime = options.processingTime || 0;
        const processingTimeDisplay = this.formatProcessingTime(processingTime);

        return {
            totalItems,
            foundPrices,
            successRate,
            exactMatches,
            estimatedItems: tierCounts.AGGREGATED + tierCounts.BASELINE,
            manualReviewItems: statusCounts.MANUAL_NEEDED,
            tierCounts,
            statusCounts,
            totalValue,
            averagePrice,
            minPrice,
            maxPrice,
            processingTime,
            processingTimeDisplay
        };
    }

    /**
     * Create summary HTML with statistics cards
     */
    createSummaryHTML(stats) {
        return `
            <div class="results-summary-container">
                <!-- Primary Statistics -->
                <div class="summary-stats-grid">
                    <div class="summary-card total">
                        <div class="stat-icon">📋</div>
                        <div class="summary-card-content">
                            <div class="summary-card-value">${stats.totalItems}</div>
                            <div class="summary-card-label">Total Items</div>
                        </div>
                    </div>
                    <div class="summary-card found">
                        <div class="stat-icon" style="background: #ecfdf5; color: var(--green);">✔</div>
                        <div class="summary-card-content">
                            <div class="summary-card-value">${stats.foundPrices}</div>
                            <div class="summary-card-label">Found Prices</div>
                        </div>
                    </div>
                    <div class="summary-card success">
                        <div class="stat-icon" style="background: #ecfdf5; color: var(--green);">📈</div>
                        <div class="summary-card-content">
                            <div class="summary-card-value">${stats.successRate}%</div>
                            <div class="summary-card-label">Success Rate</div>
                        </div>
                    </div>
                    <div class="summary-card time">
                        <div class="stat-icon" style="background: #fef3c7; color: var(--amber);">⏱</div>
                        <div class="summary-card-content">
                            <div class="summary-card-value">${stats.processingTimeDisplay}</div>
                            <div class="summary-card-label">Processing Time</div>
                        </div>
                    </div>
                </div>

                <!-- Pricing Tier Breakdown -->
                <div class="pricing-tier-breakdown">
                    <h3>Pricing Method Breakdown</h3>
                    <div class="tier-stats-grid">
                        <div class="tier-stat-card tier-green">
                            <div class="tier-badge tier-green">
                                <i class="fas fa-check-circle"></i>
                                <span>Exact Match</span>
                            </div>
                            <div class="tier-count">${stats.tierCounts.SERP}</div>
                            <div class="tier-description">Direct product matches from retailers</div>
                        </div>
                        <div class="tier-stat-card tier-blue">
                            <div class="tier-badge tier-blue">
                                <i class="fas fa-search"></i>
                                <span>Web Search</span>
                            </div>
                            <div class="tier-count">${stats.tierCounts.FALLBACK}</div>
                            <div class="tier-description">Found via web search fallback</div>
                        </div>
                        <div class="tier-stat-card tier-violet">
                            <div class="tier-badge tier-violet">
                                <i class="fas fa-chart-line"></i>
                                <span>Market Average</span>
                            </div>
                            <div class="tier-count">${stats.tierCounts.AGGREGATED}</div>
                            <div class="tier-description">Estimated from market data</div>
                        </div>
                        <div class="tier-stat-card tier-gray">
                            <div class="tier-badge tier-gray">
                                <i class="fas fa-layer-group"></i>
                                <span>Category Baseline</span>
                            </div>
                            <div class="tier-count">${stats.tierCounts.BASELINE}</div>
                            <div class="tier-description">Category-based estimates</div>
                        </div>
                    </div>
                </div>

                <!-- Price Analysis -->
                ${stats.totalValue > 0 ? `
                <div class="price-analysis">
                    <h3>Price Analysis</h3>
                    <div class="price-stats-grid">
                        <div class="price-stat-card">
                            <div class="price-stat-label">Total Value</div>
                            <div class="price-stat-value">$${stats.totalValue.toFixed(2)}</div>
                        </div>
                        <div class="price-stat-card">
                            <div class="price-stat-label">Average Price</div>
                            <div class="price-stat-value">$${stats.averagePrice.toFixed(2)}</div>
                        </div>
                        <div class="price-stat-card">
                            <div class="price-stat-label">Price Range</div>
                            <div class="price-stat-value">$${stats.minPrice.toFixed(2)} - $${stats.maxPrice.toFixed(2)}</div>
                        </div>
                    </div>
                </div>
                ` : ''}

                <!-- Quality Indicators -->
                <div class="quality-indicators">
                    <h3>Quality Indicators</h3>
                    <div class="quality-grid">
                        <div class="quality-item">
                            <div class="quality-label">Exact Matches</div>
                            <div class="quality-value">${stats.exactMatches} items</div>
                            <div class="quality-bar">
                                <div class="quality-fill" style="width: ${(stats.exactMatches / stats.totalItems) * 100}%; background: var(--green);"></div>
                            </div>
                        </div>
                        <div class="quality-item">
                            <div class="quality-label">Estimated Items</div>
                            <div class="quality-value">${stats.estimatedItems} items</div>
                            <div class="quality-bar">
                                <div class="quality-fill" style="width: ${(stats.estimatedItems / stats.totalItems) * 100}%; background: var(--violet);"></div>
                            </div>
                        </div>
                        ${stats.manualReviewItems > 0 ? `
                        <div class="quality-item">
                            <div class="quality-label">Manual Review</div>
                            <div class="quality-value">${stats.manualReviewItems} items</div>
                            <div class="quality-bar">
                                <div class="quality-fill" style="width: ${(stats.manualReviewItems / stats.totalItems) * 100}%; background: var(--amber);"></div>
                            </div>
                        </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Format processing time for display
     */
    formatProcessingTime(timeMs) {
        if (!timeMs || timeMs <= 0) return '0s';
        
        const seconds = Math.round(timeMs / 1000);
        
        if (seconds < 60) {
            return `${seconds}s`;
        } else {
            const minutes = Math.floor(seconds / 60);
            const remainingSeconds = seconds % 60;
            return `${minutes}m ${remainingSeconds}s`;
        }
    }

    /**
     * Update summary with new results
     */
    updateSummary(results, options = {}) {
        this.displaySummary(results, options);
    }

    /**
     * Get current statistics
     */
    getCurrentStats() {
        return this.currentStats;
    }

    /**
     * Clear summary
     */
    clear() {
        this.currentStats = null;
        this.container.innerHTML = '';
    }
}
