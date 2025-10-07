/**
 * ProcessingResultsTable Component
 * Displays pricing results with tier badges and never shows N/A
 * Supports the new "always show price" pipeline
 */
export class ProcessingResultsTable {
    constructor(container) {
        this.container = container;
        this.currentResults = [];
        this.filteredResults = [];
        this.currentPage = 1;
        this.pageSize = 10;
        this.sortColumn = null;
        this.sortDirection = 'asc';
        // FIXED: Add page size options to prevent cutting
        this.pageSizeOptions = [10, 25, 50, 100];
        // Filter state
        this.searchTerm = '';
        this.columnFilters = {
            status: '',
            source: '',
            depCat: ''
        };
    }

    /**
     * FIXED: Debug pagination rendering to identify issues
     */
    debugPaginationRendering() {
        console.log('🔍 Debugging pagination rendering...');
        try {
            const container = this.container;
            const paginationElements = container.querySelectorAll('.enhanced-pagination');
            
            console.log('📄 Pagination elements found:', paginationElements.length);
            
            if (paginationElements.length > 0) {
                paginationElements.forEach((pagination, index) => {
                    console.log(`📄 Pagination ${index + 1}:`, {
                        display: pagination.style.display,
                        visibility: pagination.style.visibility,
                        opacity: pagination.style.opacity,
                        position: pagination.style.position,
                        zIndex: pagination.style.zIndex,
                        marginTop: pagination.style.marginTop,
                        marginBottom: pagination.style.marginBottom,
                        height: pagination.style.height,
                        minHeight: pagination.style.minHeight,
                        overflow: pagination.style.overflow,
                        computedDisplay: window.getComputedStyle(pagination).display,
                        computedVisibility: window.getComputedStyle(pagination).visibility,
                        computedOpacity: window.getComputedStyle(pagination).opacity
                    });
                    
                    // Check if pagination is actually visible
                    const rect = pagination.getBoundingClientRect();
                    console.log(`📄 Pagination ${index + 1} bounding rect:`, {
                        top: rect.top,
                        left: rect.left,
                        width: rect.width,
                        height: rect.height,
                        visible: rect.width > 0 && rect.height > 0
                    });
                });
            } else {
                console.log('⚠️ No pagination elements found in container');
                console.log('📄 Container HTML:', container.innerHTML.substring(0, 1000));
            }
        } catch (error) {
            console.warn('⚠️ Error debugging pagination rendering:', error);
        }
    }

    /**
     * Debug method to log current state
     */
    debugState() {
        console.log('🔍 ProcessingResultsTable Debug State:', {
            totalResults: this.currentResults.length,
            filteredResults: this.filteredResults.length,
            currentPage: this.currentPage,
            pageSize: this.pageSize,
            totalPages: Math.ceil(this.filteredResults.length / this.pageSize),
            startIndex: (this.currentPage - 1) * this.pageSize,
            endIndex: Math.min((this.currentPage - 1) * this.pageSize + this.pageSize, this.filteredResults.length),
            hasPagination: this.filteredResults.length > this.pageSize,
            searchTerm: this.searchTerm,
            columnFilters: this.columnFilters,
            container: this.container,
            containerHTML: this.container.innerHTML.substring(0, 500) + '...'
        });
    }

    /**
     * Display results from the always show price pipeline
     * @param {Array} results - Array of pricing results
     * @param {Object} options - Display options
     */
    displayResults(results, options = {}) {
        console.log('🔍 ProcessingResultsTable: Displaying results:', results);
        
        if (!Array.isArray(results)) {
            console.error('❌ Invalid results format - expected array');
            return;
        }

        this.currentResults = results;
        this.currentPage = 1;
        
        // Apply filters to get filtered results
        this.applyFilters();
        
        // Create the table HTML
        const tableHTML = this.createTableHTML();
        
        // Update container
        this.container.innerHTML = tableHTML;
        
        // Bind event listeners
        this.bindEvents();
        
        // FIXED: Debug pagination state
        this.debugState();
        
        // FIXED: Ensure proper container height
        this.adjustContainerHeight();
        
        // FIXED: Additional pagination debugging
        setTimeout(() => {
            this.debugPaginationRendering();
        }, 100);
        
        console.log('✅ ProcessingResultsTable: Results displayed successfully');
    }

    /**
     * Apply filters to current results
     */
    applyFilters() {
        this.filteredResults = this.currentResults.filter(item => {
            // Apply search term filter
            if (this.searchTerm) {
                const searchLower = this.searchTerm.toLowerCase();
                const description = (item.description || item.title || item.facts?.title || '').toLowerCase();
                const source = this.getDisplaySource(item).toLowerCase();
                const status = this.getDisplayStatus(item).toLowerCase();
                
                if (!description.includes(searchLower) && 
                    !source.includes(searchLower) && 
                    !status.includes(searchLower)) {
                    return false;
                }
            }
            
            // Apply column filters
            if (this.columnFilters.status) {
                const status = this.getDisplayStatus(item).toLowerCase();
                if (!status.includes(this.columnFilters.status.toLowerCase())) {
                    return false;
                }
            }
            
            if (this.columnFilters.source) {
                const source = this.getDisplaySource(item).toLowerCase();
                if (!source.includes(this.columnFilters.source.toLowerCase())) {
                    return false;
                }
            }
            
            if (this.columnFilters.depCat) {
                const depCat = (item.depCat || item['Dep. Cat'] || '').toLowerCase();
                if (!depCat.includes(this.columnFilters.depCat.toLowerCase())) {
                    return false;
                }
            }
            
            return true;
        });
        
        console.log(`🔍 Applied filters: ${this.currentResults.length} -> ${this.filteredResults.length} results`);
    }

    /**
     * Get unique values for column filter dropdowns
     */
    getUniqueColumnValues(column) {
        const values = new Set();
        this.currentResults.forEach(item => {
            let value = '';
            switch (column) {
                case 'status':
                    value = this.getDisplayStatus(item);
                    break;
                case 'source':
                    value = this.getDisplaySource(item);
                    break;
                case 'depCat':
                    value = item.depCat || item['Dep. Cat'] || '';
                    break;
            }
            if (value && value !== 'N/A') {
                values.add(value);
            }
        });
        return Array.from(values).sort();
    }

    /**
     * Create filter HTML
     */
    createFilterHTML() {
        const statusOptions = this.getUniqueColumnValues('status');
        const sourceOptions = this.getUniqueColumnValues('source');
        const depCatOptions = this.getUniqueColumnValues('depCat');
        
        return `
            <div class="table-filters">
                <div class="filter-row">
                    <div class="filter-group">
                        <label for="search-filter">Search:</label>
                        <input type="text" id="search-filter" class="filter-input" 
                               placeholder="Search items..." value="${this.searchTerm}">
                    </div>
                    <div class="filter-group">
                        <label for="status-filter">Status:</label>
                        <select id="status-filter" class="filter-select">
                            <option value="">All Statuses</option>
                            ${statusOptions.map(option => 
                                `<option value="${option}" ${this.columnFilters.status === option ? 'selected' : ''}>${option}</option>`
                            ).join('')}
                        </select>
                    </div>
                    <div class="filter-group">
                        <label for="source-filter">Source:</label>
                        <select id="source-filter" class="filter-select">
                            <option value="">All Sources</option>
                            ${sourceOptions.map(option => 
                                `<option value="${option}" ${this.columnFilters.source === option ? 'selected' : ''}>${option}</option>`
                            ).join('')}
                        </select>
                    </div>
                    <div class="filter-group">
                        <label for="depcat-filter">Dep. Cat:</label>
                        <select id="depcat-filter" class="filter-select">
                            <option value="">All Categories</option>
                            ${depCatOptions.map(option => 
                                `<option value="${option}" ${this.columnFilters.depCat === option ? 'selected' : ''}>${option}</option>`
                            ).join('')}
                        </select>
                    </div>
                    <div class="filter-group">
                        <button id="clear-filters" class="clear-filters-btn">
                            <i class="fas fa-times"></i> Clear Filters
                        </button>
                    </div>
                </div>
                <div class="filter-results-info">
                    Showing ${this.filteredResults.length} of ${this.currentResults.length} items
                </div>
            </div>
        `;
    }

    createTableHTML() {
        const startIndex = (this.currentPage - 1) * this.pageSize;
        const endIndex = startIndex + this.pageSize;
        const pageData = this.filteredResults.slice(startIndex, endIndex);
        const totalPages = Math.ceil(this.filteredResults.length / this.pageSize);

        let html = `
            <div class="processing-results-table-container">
                ${this.createFilterHTML()}
                <div class="table-wrapper">
                    <table class="processing-results-table">
                        <thead>
                            <tr>
                                <th class="sortable" data-column="itemNumber">
                                    Item # 
                                    <span class="sort-icon">${this.getSortIcon('itemNumber')}</span>
                                </th>
                                <th class="sortable td-desc" data-column="description">
                                    Description 
                                    <span class="sort-icon">${this.getSortIcon('description')}</span>
                                </th>
                                <th data-column="status">Status</th>
                                <th data-column="source">Replacement Source</th>
                                <th class="sortable td-num" data-column="adjustedPrice">
                                    Replacement Price 
                                    <span class="sort-icon">${this.getSortIcon('adjustedPrice')}</span>
                                </th>
                                <th class="sortable td-num" data-column="quantity">
                                    Quantity 
                                    <span class="sort-icon">${this.getSortIcon('quantity')}</span>
                                </th>
                                <th data-column="depCat">Dep. Cat</th>
                                <th class="td-num" data-column="depPercent">Dep Percent</th>
                                <th class="td-num" data-column="depAmount">Dep Amount</th>
                                <th class="td-num" data-column="totalPrice">Total Replacement Price</th>
                                <th data-column="url">URL</th>
                            </tr>
                        </thead>
                        <tbody>
        `;

        pageData.forEach((item, index) => {
            const itemNumber = startIndex + index + 1;
            html += this.createRowHTML(item, itemNumber);
        });

        html += `
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        // Add pagination if needed
        if (totalPages > 1) {
            console.log(`📄 Adding pagination for ${totalPages} pages`);
            const paginationHTML = this.createPaginationHTML(totalPages);
            console.log('📄 Pagination HTML:', paginationHTML);
            html += paginationHTML;
        } else {
            console.log(`📄 No pagination needed - only ${totalPages} page(s)`);
        }
        
        console.log('📄 Final table HTML length:', html.length);
        return html;
    }

    createRowHTML(item, itemNumber) {
        // Extract data from the always show price pipeline result
        const description = item.description || item.title || item.facts?.title || 'Unknown Item';
        const status = this.getDisplayStatus(item);
        const source = this.getDisplaySource(item);
        const adjustedPrice = this.formatPrice(item.adjustedPrice);
        const depCat = item.depCat || item['Dep. Cat'] || '';
        const depPercent = item.depPercent || item['Dep Percent'] || '';
        const depAmount = this.formatPriceAllowZero(item.depAmount);
        
        // Calculate total price: (replacement price * quantity) - (dep amount * quantity)
        const quantity = item.quantity || item.QTY || 1;
        const replacementPrice = parseFloat(item.adjustedPrice) || 0;
        const depAmountValue = parseFloat(item.depAmount) || 0;
        const calculatedTotal = (replacementPrice * quantity) - (depAmountValue * quantity);
        const totalPrice = this.formatPrice(calculatedTotal);
        const url = item.url || '';
        // Determine pricing tier based on backend data and status
        console.log('🔍 ProcessingResultsTable - createRowHTML - item:', item);
        console.log('🔍 ProcessingResultsTable - createRowHTML - status:', status);
        console.log('🔍 ProcessingResultsTable - createRowHTML - item.pricingTier:', item.pricingTier);
        
        let pricingTier = item.pricingTier;
        if (!pricingTier) {
            if (status === 'FOUND' || status === 'Found') {
                pricingTier = 'MARKET_NEW'; // Backend found market price
            } else if (status === 'NO_MARKET_PRICE' || status === 'No Market Price') {
                pricingTier = 'UNAVAILABLE';
            } else {
                pricingTier = 'NONE';
            }
        }
        
        console.log('🔍 ProcessingResultsTable - createRowHTML - final pricingTier:', pricingTier);
        const confidence = item.confidence || 0;

        // Get pricing tier badge
        const tierBadge = this.getPricingTierBadge(pricingTier, confidence);
        
        // Get status class for styling
        const statusClass = this.getStatusClass(status);

        return `
            <tr>
                <td>${itemNumber}</td>
                <td class="td-desc" title="${this.escapeHtml(description)}">
                    ${this.escapeHtml(description)}
                </td>
                <td>
                    <span class="status-badge ${statusClass}">${status}</span>
                    ${tierBadge}
                </td>
                <td>${this.escapeHtml(source)}</td>
                <td class="td-num price-cell">
                    ${adjustedPrice}
                </td>
                <td class="td-num">${quantity}</td>
                <td>${this.escapeHtml(depCat)}</td>
                <td class="td-num">${depPercent}</td>
                <td class="td-num price-cell">${depAmount}</td>
                <td class="td-num price-cell">${totalPrice}</td>
                <td>
                    ${url ? `<a href="${url}" target="_blank" class="url-link">
                        <i class="fas fa-external-link-alt"></i>
                        View
                    </a>` : '<span class="no-url">N/A</span>'}
                </td>
            </tr>
        `;
    }

    /**
     * Get display status - never returns N/A
     */
    getDisplayStatus(item) {
        // For image processing results, prioritize the backend-provided fields
        if (item['Search Status'] || item.Status || item.status) {
            const searchStatus = item['Search Status'] || item.Status || item.status;
            if (searchStatus && searchStatus !== 'Unknown') {
                return searchStatus;
            }
        }
        
        const status = item.status;
        
        switch (status) {
            case 'FOUND':
                return 'Found';
            case 'ESTIMATED':
                return 'Estimated';
            case 'MANUAL_NEEDED':
                return 'Manual Review';
            default:
                return 'Processed'; // Never return N/A
        }
    }

    /**
     * Get display source - never returns N/A
     */
    getDisplaySource(item) {
        // For image processing results, prioritize the backend-provided fields
        if (item['Source'] || item.Source || item.source) {
            const source = item['Source'] || item.Source || item.source;
            if (source && source !== 'N/A' && source !== 'No trusted source found') {
                return this.cleanSourceName(source);
            }
        }
        
        // Prefer explicit replacementSource > source; if missing, derive from URL
        let source = item.replacementSource || item.source || item.Source;
        if ((!source || source === 'N/A') && (item.URL || item.url)) {
            try {
                const raw = item.URL || item.url;
                const url = new URL(raw.startsWith('http') ? raw : `https://${raw}`);
                const host = url.hostname.replace(/^www\./, '').toLowerCase();
                // Map common hosts to retailer names
                const hostMap = {
                    'walmart.com': 'Walmart', 'amazon.com': 'Amazon', 'homedepot.com': 'Home Depot',
                    'lowes.com': 'Lowes', 'target.com': 'Target', 'bestbuy.com': 'Best Buy',
                    'wayfair.com': 'Wayfair', 'staples.com': 'Staples', 'officedepot.com': 'Office Depot'
                };
                source = hostMap[host] || host.charAt(0).toUpperCase() + host.slice(1);
            } catch (e) {
                // ignore parse errors
            }
        }
        
        if (!source || source === 'N/A') {
            // Use pricing tier to determine source display
            switch (item.pricingTier) {
                case 'SERP':
                    return 'Market Search';
                case 'FALLBACK':
                    return 'Web Search';
                case 'AGGREGATED':
                    return 'Market Average';
                case 'BASELINE':
                    return 'Category Baseline';
                default:
                    return 'Processing Complete';
            }
        }
        
        // Clean up domain names
        return this.cleanSourceName(source);
    }

    /**
     * Clean up source names for display
     */
    cleanSourceName(source) {
        if (!source || source === 'N/A' || source === 'No trusted source found') return 'N/A';
        
        // Remove protocol and www
        let cleaned = source.replace(/^https?:\/\//, '').replace(/^www\./, '');
        
        // Extract domain name
        cleaned = cleaned.split('/')[0];
        
        // Capitalize first letter
        return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
    }

    /**
     * Get pricing tier badge with color coding
     * SERP (green), FALLBACK (blue), AGGREGATED (violet), BASELINE (gray)
     */
    getPricingTierBadge(pricingTier, confidence) {
        const tierConfig = {
            'SERP': { 
                label: 'Exact Match', 
                color: 'green',
                icon: 'fa-check-circle'
            },
            'MARKET_NEW': { 
                label: 'Exact Match', 
                color: 'green',
                icon: 'fa-check-circle'
            },
            'FALLBACK': { 
                label: 'Web Search', 
                color: 'blue',
                icon: 'fa-search'
            },
            'AGGREGATED': { 
                label: 'Market Average', 
                color: 'violet',
                icon: 'fa-chart-line'
            },
            // Hide explicit Category Baseline label from UI
            'BASELINE': { 
                label: 'Category Baseline', 
                color: 'gray',
                icon: 'fa-calculator'
            },
            'UNAVAILABLE': { 
                label: 'No Market Price', 
                color: 'orange',
                icon: 'fa-exclamation-triangle'
            },
            'NONE': { 
                label: 'Processing Complete', 
                color: 'gray',
                icon: 'fa-calculator'
            }
        };

        const config = tierConfig[pricingTier] || tierConfig['NONE'];
        const confidencePercent = Math.round(confidence * 100);

        return `
            <div class="pricing-tier-badge tier-${config.color}" title="Confidence: ${confidencePercent}%">
                <i class="fas ${config.icon}"></i>
                <span>${config.label}</span>
            </div>
        `;
    }

    /**
     * Format price - never returns N/A, always shows a numeric value
     */
    formatPrice(price) {
        if (typeof price === 'number' && !isNaN(price) && price > 0) {
            return `$${price.toFixed(2)}`;
        }
        
        if (typeof price === 'string') {
            // Try to extract numeric value
            const numericPrice = parseFloat(price.replace(/[$,]/g, ''));
            if (!isNaN(numericPrice) && numericPrice > 0) {
                return `$${numericPrice.toFixed(2)}`;
            }
        }
        
        // Never return fake prices - return empty if no valid price
        return '';
    }

    /**
     * Format price but allow 0 to display as $0.00 (for depreciation amount)
     */
    formatPriceAllowZero(price) {
        if (typeof price === 'number' && !isNaN(price)) {
            return `$${price.toFixed(2)}`;
        }
        if (typeof price === 'string') {
            const numericPrice = parseFloat(price.replace(/[$,]/g, ''));
            if (!isNaN(numericPrice)) {
                return `$${numericPrice.toFixed(2)}`;
            }
        }
        return '';
    }

    // REMOVED: formatConditionAdjustment function - no more condition adjustments

    /**
     * Get status class for styling
     */
    getStatusClass(status) {
        switch (status.toLowerCase()) {
            case 'found':
                return 'status-found';
            case 'estimated':
                return 'status-estimated';
            case 'manual review':
                return 'status-manual';
            default:
                return 'status-processed';
        }
    }

    /**
     * Create pagination HTML
     */
    createPaginationHTML(totalPages) {
        const hasPrev = this.currentPage > 1;
        const hasNext = this.currentPage < totalPages;
        const startIndex = (this.currentPage - 1) * this.pageSize;
        const endIndex = Math.min(startIndex + this.pageSize, this.filteredResults.length);

        console.log(`📄 Creating pagination HTML:`, {
            currentPage: this.currentPage,
            totalPages,
            hasPrev,
            hasNext,
            startIndex,
            endIndex,
            totalResults: this.currentResults.length
        });

        return `
            <div class="enhanced-pagination">
                <div class="pagination-left">
                    <button class="page-btn ${!hasPrev ? 'disabled' : ''}" data-page="${this.currentPage - 1}" ${!hasPrev ? 'disabled' : ''}>
                        <i class="fas fa-chevron-left"></i> Previous
                    </button>
                    <span class="page-info">Showing ${startIndex + 1}-${endIndex} of ${this.filteredResults.length} items (Page ${this.currentPage} of ${totalPages})</span>
                    <button class="page-btn ${!hasNext ? 'disabled' : ''}" data-page="${this.currentPage + 1}" ${!hasNext ? 'disabled' : ''}>
                        Next <i class="fas fa-chevron-right"></i>
                    </button>
                </div>
                <div class="pagination-right">
                    <label for="page-size-selector">Show:</label>
                    <select id="page-size-selector" class="page-size-selector">
                        ${this.pageSizeOptions.map(size => 
                            `<option value="${size}" ${size === this.pageSize ? 'selected' : ''}>${size}</option>`
                        ).join('')}
                    </select>
                    <span>per page</span>
                </div>
            </div>
        `;
    }

    /**
     * Get sort icon for column headers
     */
    getSortIcon(column) {
        if (this.sortColumn !== column) {
            return '<i class="fas fa-sort"></i>';
        }
        
        return this.sortDirection === 'asc' ? 
            '<i class="fas fa-sort-up"></i>' : 
            '<i class="fas fa-sort-down"></i>';
    }

    /**
     * Bind event listeners
     */
    bindEvents() {
        // Sorting
        const sortableHeaders = this.container.querySelectorAll('.sortable');
        sortableHeaders.forEach(header => {
            header.addEventListener('click', () => {
                const column = header.dataset.column;
                this.sortTable(column);
            });
        });

        // Pagination - improved event binding
        const paginationButtons = this.container.querySelectorAll('.page-btn:not(.disabled)');
        paginationButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                // Get page from button or its parent
                let page = parseInt(button.dataset.page);
                if (!page || isNaN(page)) {
                    // Try to get from clicked element if it's an icon
                    const parentButton = e.target.closest('.page-btn');
                    if (parentButton) {
                        page = parseInt(parentButton.dataset.page);
                    }
                }
                
                if (page && !isNaN(page) && page !== this.currentPage && !button.disabled) {
                    console.log(`📄 Changing to page ${page}`);
                    this.changePage(page);
                }
            });
        });

        // FIXED: Add page size selector event binding
        const pageSizeSelector = this.container.querySelector('#page-size-selector');
        if (pageSizeSelector) {
            console.log('✅ Found page size selector, binding events');
            pageSizeSelector.addEventListener('change', (e) => {
                const newPageSize = parseInt(e.target.value);
                if (newPageSize && newPageSize !== this.pageSize) {
                    console.log(`📄 Changing page size from ${this.pageSize} to ${newPageSize}`);
                    this.changePageSize(newPageSize);
                }
            });
        } else {
            console.log('⚠️ Page size selector not found');
        }

        // Filter event bindings
        this.bindFilterEvents();
    }

    /**
     * Bind filter event listeners
     */
    bindFilterEvents() {
        // Search filter
        const searchFilter = this.container.querySelector('#search-filter');
        if (searchFilter) {
            searchFilter.addEventListener('input', (e) => {
                this.searchTerm = e.target.value;
                this.applyFiltersAndRefresh();
            });
        }

        // Column filters
        const statusFilter = this.container.querySelector('#status-filter');
        if (statusFilter) {
            statusFilter.addEventListener('change', (e) => {
                this.columnFilters.status = e.target.value;
                this.applyFiltersAndRefresh();
            });
        }

        const sourceFilter = this.container.querySelector('#source-filter');
        if (sourceFilter) {
            sourceFilter.addEventListener('change', (e) => {
                this.columnFilters.source = e.target.value;
                this.applyFiltersAndRefresh();
            });
        }

        const depCatFilter = this.container.querySelector('#depcat-filter');
        if (depCatFilter) {
            depCatFilter.addEventListener('change', (e) => {
                this.columnFilters.depCat = e.target.value;
                this.applyFiltersAndRefresh();
            });
        }

        // Clear filters button
        const clearFiltersBtn = this.container.querySelector('#clear-filters');
        if (clearFiltersBtn) {
            clearFiltersBtn.addEventListener('click', () => {
                this.clearFilters();
            });
        }
    }

    /**
     * Apply filters and refresh the table
     */
    applyFiltersAndRefresh() {
        this.currentPage = 1; // Reset to first page
        this.applyFilters();
        
        // Re-render the table
        const tableHTML = this.createTableHTML();
        this.container.innerHTML = tableHTML;
        this.bindEvents();
        this.adjustContainerHeight();
    }

    /**
     * Clear all filters
     */
    clearFilters() {
        this.searchTerm = '';
        this.columnFilters = {
            status: '',
            source: '',
            depCat: ''
        };
        this.applyFiltersAndRefresh();
    }

    /**
     * Get sort value for a column
     */
    getSortValue(item, column) {
        switch (column) {
            case 'itemNumber':
                return item.itemNumber || 0;
            case 'description':
                return item.description || item.title || item.facts?.title || '';
            case 'adjustedPrice':
                return parseFloat(item.adjustedPrice) || 0;
            case 'quantity':
                return item.quantity || item.QTY || 1;
            default:
                return '';
        }
    }

    /**
     * Change page size - FIXED: Allow users to choose how many records to show
     */
    changePageSize(newPageSize) {
        if (!this.pageSizeOptions.includes(newPageSize)) {
            console.log(`❌ Invalid page size ${newPageSize}, valid options:`, this.pageSizeOptions);
            return;
        }

        console.log(`📄 Changing page size from ${this.pageSize} to ${newPageSize}`);
        this.pageSize = newPageSize;
        this.currentPage = 1; // Reset to first page
        
        // FIXED: Ensure container has proper height for new page size
        this.adjustContainerHeight();
        
        // Re-render the table with new page size
        try {
            const tableHTML = this.createTableHTML();
            this.container.innerHTML = tableHTML;
            
            // Re-bind events for the new content
            this.bindEvents();
            
            // Scroll to top of table to show new page content
            this.container.scrollIntoView({ behavior: 'smooth', block: 'start' });
            
            console.log(`✅ Page size changed to ${newPageSize} successfully`);
        } catch (error) {
            console.error(`❌ Error changing page size: ${error.message}`);
            // Fallback: try to re-display all results
            this.displayResults(this.currentResults);
        }
    }

    /**
     * FIXED: Adjust container height based on page size and results
     */
    adjustContainerHeight() {
        try {
            const container = this.container.closest('.processing-results-table-container, .enhanced-results-table-container');
            if (container) {
                const estimatedHeight = Math.max(600, (this.pageSize * 60) + 200); // 60px per row + 200px for headers/pagination
                container.style.minHeight = `${estimatedHeight}px`;
                container.style.height = 'auto';
                container.style.overflow = 'visible';
                console.log(`✅ Adjusted container height to ${estimatedHeight}px for page size ${this.pageSize}`);
            }
        } catch (error) {
            console.warn('⚠️ Error adjusting container height:', error);
        }
    }

    /**
     * Change page - FIXED: Better pagination handling
     */
    changePage(page) {
        const totalPages = Math.ceil(this.filteredResults.length / this.pageSize);
        if (page < 1 || page > totalPages) {
            console.log(`❌ Invalid page ${page}, valid range: 1-${totalPages}`);
            return;
        }

        console.log(`📄 Changing from page ${this.currentPage} to page ${page}`);
        this.currentPage = page;
        
        // FIXED: Use a more robust re-rendering approach
        try {
            // Re-render the table with new page data
            const tableHTML = this.createTableHTML();
            this.container.innerHTML = tableHTML;
            
            // Re-bind events for the new content
            this.bindEvents();
            
            // Scroll to top of table to show new page content
            this.container.scrollIntoView({ behavior: 'smooth', block: 'start' });
            
            console.log(`✅ Page changed to ${page} successfully`);
        } catch (error) {
            console.error(`❌ Error changing page: ${error.message}`);
            // Fallback: try to re-display all results
            this.displayResults(this.currentResults);
        }
    }

    /**
     * Sort table by column
     */
    sortTable(column) {
        if (this.sortColumn === column) {
            this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortColumn = column;
            this.sortDirection = 'asc';
        }

        // Sort the filtered results
        this.filteredResults.sort((a, b) => {
            let aVal = this.getSortValue(a, column);
            let bVal = this.getSortValue(b, column);

            if (aVal === null || aVal === undefined) aVal = '';
            if (bVal === null || bVal === undefined) bVal = '';

            if (typeof aVal === 'string') aVal = aVal.toLowerCase();
            if (typeof bVal === 'string') bVal = bVal.toLowerCase();

            if (aVal < bVal) return this.sortDirection === 'asc' ? -1 : 1;
            if (aVal > bVal) return this.sortDirection === 'asc' ? 1 : -1;
            return 0;
        });

        // Re-render the table - DON'T call displayResults as it resets currentPage
        const tableHTML = this.createTableHTML();
        this.container.innerHTML = tableHTML;
        this.bindEvents();
    }

    /**
     * Escape HTML for safe display
     */
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Get current results for export
     */
    getCurrentResults() {
        return this.filteredResults;
    }

    /**
     * Clear all results
     */
    clear() {
        this.currentResults = [];
        this.filteredResults = [];
        this.currentPage = 1;
        this.searchTerm = '';
        this.columnFilters = {
            status: '',
            source: '',
            depCat: ''
        };
        this.container.innerHTML = '';
    }
}
