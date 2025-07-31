// Advanced Search Module for EPLQ
class SearchManager {
    constructor() {
        this.searchHistory = [];
        this.cachedResults = new Map();
        this.maxCacheSize = 100;
        this.treeIndex = null;
        this.init();
    }
    init() {
        this.initializeSpatialIndex();
        Logger.info('Search manager initialized');
    }

    initializeSpatialIndex() {
        this.treeIndex = {
            root: null,
            depth: 0,
            nodeCount: 0
        };
        Logger.info('Spatial tree index initialized');
    }
    async performPrivacyPreservingSearch(queryParams) {
        try {
            Logger.userAction('Privacy-preserving search initiated', {
                latitude: queryParams.latitude,
                longitude: queryParams.longitude,
                radius: queryParams.radius,
                category: queryParams.category
            });
            const searchStartTime = performance.now();
            this.validateQueryParameters(queryParams);
            const cacheKey = this.generateCacheKey(queryParams);
            if (this.cachedResults.has(cacheKey)) {
                const cachedResult = this.cachedResults.get(cacheKey);
                Logger.info('Search result served from cache', { cacheKey });
                return cachedResult;
            }
            const encryptionStartTime = performance.now();
            const encryptedQuery = await encryptionManager.encryptQuery(queryParams);
            const encryptionDuration = performance.now() - encryptionStartTime;
            const locations = await this.loadEncryptedLocations();
            const queryStartTime = performance.now();
            const results = await encryptionManager.performPrivateRangeQuery(
                encryptedQuery, 
                locations
            );
            const queryDuration = performance.now() - queryStartTime;
            const optimizedResults = await this.applyTreeIndexOptimization(results, queryParams);
            const finalResults = this.postProcessResults(optimizedResults, queryParams);
            const totalDuration = performance.now() - searchStartTime;
            this.cacheResults(cacheKey, finalResults);
            const metrics = {
                queryTime: queryDuration,
                encryptionTime: encryptionDuration,
                totalTime: totalDuration,
                resultsCount: finalResults.length,
                locationsScanned: locations.length
            };
            Logger.query('Privacy-preserving search completed', queryParams, finalResults.length, totalDuration, metrics);
            this.addToSearchHistory(queryParams, metrics);
            return {
                results: finalResults,
                metrics: {
                    queryTime: `${queryDuration.toFixed(1)}ms`,
                    encryptionTime: `${encryptionDuration.toFixed(1)}ms`,
                    totalTime: `${totalDuration.toFixed(1)}ms`,
                    resultsCount: finalResults.length.toString()
                },
                privacy: {
                    encrypted: true,
                    differentialPrivacy: true,
                    treeIndexed: true,
                    level: 'high'
                }
            };
        } catch (error) {
            Logger.error('Privacy-preserving search failed', {
                queryParams,
                error: error.message
            }, error);
            throw new Error('Search failed: ' + error.message);
        }
    }
    validateQueryParameters(params) {
        const errors = [];
        if (!params.latitude || isNaN(params.latitude) || 
            params.latitude < -90 || params.latitude > 90) {
            errors.push('Invalid latitude. Must be between -90 and 90.');
        }
        if (!params.longitude || isNaN(params.longitude) || 
            params.longitude < -180 || params.longitude > 180) {
            errors.push('Invalid longitude. Must be between -180 and 180.');
        }
        if (!params.radius || isNaN(params.radius) || 
            params.radius <= 0 || params.radius > 50) {
            errors.push('Invalid radius. Must be between 0.1 and 50 km.');
        }
        if (params.category && !this.isValidCategory(params.category)) {
            errors.push('Invalid category specified.');
        }
        if (errors.length > 0) {
            Logger.warn('Query validation failed', { errors, params });
            throw new Error(errors.join(' '));
        }
    }
    isValidCategory(category) {
        const validCategories = ['restaurant', 'hospital', 'school', 'park', 'shopping', 'other'];
        return validCategories.includes(category);
    }
    async loadEncryptedLocations() {
        try {
            const locations = await firebase.getDocuments('locations');
            Logger.info('Encrypted locations loaded', { count: locations.length });
            return locations;
        } catch (error) {
            Logger.error('Failed to load encrypted locations', { error: error.message }, error);
            return this.getSampleEncryptedLocations();
        }
    }
    getSampleEncryptedLocations() {
        const sampleLocations = [
            {
                id: 'loc_1',
                name: 'Central Hospital',
                category: 'hospital',
                latitude: 40.7829,
                longitude: -73.9654,
                description: 'Main emergency hospital',
                uploadDate: '2024-01-15'
            },
            {
                id: 'loc_2',
                name: 'City Park',
                category: 'park',
                latitude: 40.7690,
                longitude: -73.9781,
                description: 'Large public park',
                uploadDate: '2024-01-14'
            },
            {
                id: 'loc_3',
                name: 'Tech University',
                category: 'school',
                latitude: 40.7606,
                longitude: -73.9675,
                description: 'Leading technology university',
                uploadDate: '2024-01-13'
            },
            {
                id: 'loc_4',
                name: 'Downtown Restaurant',
                category: 'restaurant',
                latitude: 40.7614,
                longitude: -73.9776,
                description: 'Fine dining restaurant',
                uploadDate: '2024-01-12'
            },
            {
                id: 'loc_5',
                name: 'Shopping Center',
                category: 'shopping',
                latitude: 40.7505,
                longitude: -73.9934,
                description: 'Large shopping mall',
                uploadDate: '2024-01-11'
            }
        ];
        return Promise.all(sampleLocations.map(async (location) => {
            return await encryptionManager.encryptLocation(location);
        }));
    }
    async applyTreeIndexOptimization(results, queryParams) {
        try {
            const startTime = performance.now();
            const spatialTree = this.buildSpatialTree(results);
            const optimizedResults = this.pruneWithSpatialTree(spatialTree, queryParams);
            const duration = performance.now() - startTime;
            Logger.performance('Tree index optimization', duration, {
                originalCount: results.length,
                optimizedCount: optimizedResults.length,
                pruningRatio: ((results.length - optimizedResults.length) / results.length * 100).toFixed(1) + '%'
            });
            return optimizedResults;
        } catch (error) {
            Logger.warn('Tree optimization failed, using original results', { error: error.message });
            return results;
        }
    }
    buildSpatialTree(locations) {
        const tree = {
            bounds: this.calculateBounds(locations),
            locations: locations,
            children: [],
            depth: 0
        };
        if (locations.length > 10) {
            const { left, right } = this.splitLocations(locations);
            if (left.length > 0) {
                tree.children.push(this.buildSpatialTree(left));
            }
            if (right.length > 0) {
                tree.children.push(this.buildSpatialTree(right));
            }
        }
        return tree;
    }
    calculateBounds(locations) {
        if (locations.length === 0) return null;
        let minLat = locations[0].latitude;
        let maxLat = locations[0].latitude;
        let minLng = locations[0].longitude;
        let maxLng = locations[0].longitude;
        for (const location of locations) {
            minLat = Math.min(minLat, location.latitude);
            maxLat = Math.max(maxLat, location.latitude);
            minLng = Math.min(minLng, location.longitude);
            maxLng = Math.max(maxLng, location.longitude);
        }
        return { minLat, maxLat, minLng, maxLng };
    }
    splitLocations(locations) {
        const sorted = locations.sort((a, b) => a.longitude - b.longitude);
        const mid = Math.floor(sorted.length / 2);
        return {
            left: sorted.slice(0, mid),
            right: sorted.slice(mid)
        };
    }
    pruneWithSpatialTree(tree, queryParams) {
        if (!this.circleIntersectsBounds(queryParams, tree.bounds)) {
            return [];
        }
        let results = [];
        if (tree.children.length === 0) {
            results = tree.locations.filter(location => {
                const distance = this.calculateDistance(
                    queryParams.latitude, queryParams.longitude,
                    location.latitude, location.longitude
                );
                return distance <= queryParams.radius;
            });
        } else {
            for (const child of tree.children) {
                results = results.concat(this.pruneWithSpatialTree(child, queryParams));
            }
        }
        return results;
    }
    circleIntersectsBounds(query, bounds) {
        if (!bounds) return false;
        const closestX = Math.max(bounds.minLng, Math.min(query.longitude, bounds.maxLng));
        const closestY = Math.max(bounds.minLat, Math.min(query.latitude, bounds.maxLat));
        const distance = this.calculateDistance(
            query.latitude, query.longitude,
            closestY, closestX
        );
        return distance <= query.radius;
    }
    calculateDistance(lat1, lng1, lat2, lng2) {
        const R = 6371; // Earth's radius in km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLng = (lng2 - lng1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLng / 2) * Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }
    postProcessResults(results, queryParams) {
        const sortedResults = results.sort((a, b) => a.distance - b.distance);
        let filteredResults = sortedResults;
        if (queryParams.category) {
            filteredResults = sortedResults.filter(result => 
                result.category === queryParams.category
            );
        }
        const maxResults = 50;
        const limitedResults = filteredResults.slice(0, maxResults);
        return limitedResults.map((result, index) => ({
            ...result,
            rank: index + 1,
            privacyProtected: true,
            encrypted: true
        }));
    }
    generateCacheKey(queryParams) {
        const key = `${queryParams.latitude.toFixed(4)}_${queryParams.longitude.toFixed(4)}_${queryParams.radius}_${queryParams.category || 'all'}`;
        return btoa(key); // Base64 encode for safe storage
    }
    cacheResults(key, results) {
        if (this.cachedResults.size >= this.maxCacheSize) {
            const firstKey = this.cachedResults.keys().next().value;
            this.cachedResults.delete(firstKey);
        }
        this.cachedResults.set(key, {
            results: results,
            timestamp: Date.now(),
            ttl: 5 * 60 * 1000 
        });
        Logger.debug('Search results cached', { key, resultCount: results.length });
    }
    addToSearchHistory(queryParams, metrics) {
        const historyEntry = {
            id: `search_${Date.now()}`,
            timestamp: new Date().toISOString(),
            query: queryParams,
            metrics: metrics,
            userId: authManager.getCurrentUser()?.uid
        };
        this.searchHistory.unshift(historyEntry);
        if (this.searchHistory.length > 100) {
            this.searchHistory = this.searchHistory.slice(0, 100);
        }
        try {
            localStorage.setItem('eplq_search_history', JSON.stringify(this.searchHistory));
        } catch (error) {
            Logger.warn('Failed to store search history', { error: error.message });
        }
        Logger.info('Search added to history', { searchId: historyEntry.id });
    }
    getSearchHistory(limit = 10) {
        return this.searchHistory.slice(0, limit);
    }
    getSearchAnalytics() {
        const analytics = {
            totalSearches: this.searchHistory.length,
            averageQueryTime: 0,
            averageResults: 0,
            popularCategories: {},
            searchPatterns: {}
        };
        if (this.searchHistory.length > 0) {
            let totalQueryTime = 0;
            let totalResults = 0;
            this.searchHistory.forEach(search => {
                totalQueryTime += search.metrics.queryTime || 0;
                totalResults += search.metrics.resultsCount || 0;
                const category = search.query.category || 'all';
                analytics.popularCategories[category] = (analytics.popularCategories[category] || 0) + 1;
            });
            analytics.averageQueryTime = totalQueryTime / this.searchHistory.length;
            analytics.averageResults = totalResults / this.searchHistory.length;
        }
        return analytics;
    }
    clearCache() {
        this.cachedResults.clear();
        Logger.info('Search cache cleared');
    }
    clearHistory() {
        this.searchHistory = [];
        localStorage.removeItem('eplq_search_history');
        Logger.info('Search history cleared');
    }
}
const searchManager = new SearchManager();
function initializeSearchForm() {
    const searchForm = document.getElementById('searchForm');
    const searchBtn = document.getElementById('searchBtn');
    const searchResults = document.getElementById('searchResults');
    if (!searchForm) return;
    searchForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(searchForm);
        const queryParams = {
            latitude: parseFloat(formData.get('latitude')),
            longitude: parseFloat(formData.get('longitude')),
            radius: parseFloat(formData.get('radius')),
            category: formData.get('category') || undefined
        };
        try {
            showLoading('Processing secure query...');
            searchBtn.disabled = true;
            const searchResult = await searchManager.performPrivacyPreservingSearch(queryParams);
            hideLoading();
            searchBtn.disabled = false;
            updateMetricsDisplay(searchResult.metrics);
            displaySearchResults(searchResult.results);
            showToast(`Found ${searchResult.results.length} locations with privacy protection`, 'success');
        } catch (error) {
            hideLoading();
            searchBtn.disabled = false;
            showToast('Search failed: ' + error.message, 'error');
        }
    });
}
function updateMetricsDisplay(metrics) {
    const elements = {
        queryTime: document.getElementById('queryTime'),
        encryptionTime: document.getElementById('encryptionTime'),
        resultsCount: document.getElementById('resultsCount')
    };
    if (elements.queryTime) elements.queryTime.textContent = metrics.queryTime;
    if (elements.encryptionTime) elements.encryptionTime.textContent = metrics.encryptionTime;
    if (elements.resultsCount) elements.resultsCount.textContent = metrics.resultsCount;
}
function displaySearchResults(results) {
    const searchResults = document.getElementById('searchResults');
    if (!searchResults) return;
    if (results.length === 0) {
        searchResults.innerHTML = `
            <div class="no-results">
                <i class="fas fa-search"></i>
                <p>No locations found matching your criteria</p>
            </div>
        `;
        return;
    }
    const resultsHTML = `
        <div class="results-grid">
            ${results.map(result => `
                <div class="result-card">
                    <div class="result-header">
                        <div>
                            <h4 class="result-title">${result.name}</h4>
                            <span class="result-category">${result.category}</span>
                        </div>
                    </div>
                    <p class="result-distance">Distance: ${result.distance.toFixed(2)} km</p>
                    ${result.description ? `<p class="result-description">${result.description}</p>` : ''}
                    <div class="privacy-indicators">
                        <div class="privacy-badge success">
                            <i class="fas fa-shield-alt"></i>
                            Encrypted
                        </div>
                        <div class="privacy-badge primary">
                            <i class="fas fa-user-secret"></i>
                            Private
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>`;
    searchResults.innerHTML = resultsHTML;
}
document.addEventListener('DOMContentLoaded', function() {
    if (window.location.pathname.includes('dashboard.html')) {
        initializeSearchForm();
    }
});
window.searchManager = searchManager;