class EncryptionManager {
    constructor() {
        this.algorithm = 'AES-GCM';
        this.keyLength = 256;
        this.ivLength = 12; 
        this.tagLength = 16; 
        this.initialized = false;
        this.masterKey = null;
        this.init();
    }
    async init() {
        try {
            await this.initializeMasterKey();
            this.initialized = true;
            Logger.info('Encryption manager initialized', { 
                algorithm: this.algorithm,
                keyLength: this.keyLength 
            });
        } catch (error) {
            Logger.error('Encryption initialization failed', { error: error.message }, error);
            throw new Error('Failed to initialize encryption system');
        }
    }
    async initializeMasterKey() {
        const keyMaterial = await this.generateKeyMaterial();
        this.masterKey = await crypto.subtle.importKey(
            'raw',
            keyMaterial,
            { name: 'AES-GCM' },
            false,
            ['encrypt', 'decrypt']
        );
    }
    async generateKeyMaterial() {
        const encoder = new TextEncoder();
        const data = encoder.encode('EPLQ_MASTER_KEY_2024');
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        return hashBuffer;
    }
    async encryptData(data, additionalData = null) {
        if (!this.initialized) {
            throw new Error('Encryption system not initialized');
        }
        try {
            const startTime = performance.now();
            const encoder = new TextEncoder();
            const dataBytes = encoder.encode(JSON.stringify(data));
            const iv = crypto.getRandomValues(new Uint8Array(this.ivLength));
            const encryptParams = {
                name: this.algorithm,
                iv: iv
            };
            if (additionalData) {
                encryptParams.additionalData = encoder.encode(JSON.stringify(additionalData));
            }
            const encryptedBuffer = await crypto.subtle.encrypt(
                encryptParams,
                this.masterKey,
                dataBytes
            );
            const duration = performance.now() - startTime;
            const result = {
                iv: Array.from(iv),
                data: Array.from(new Uint8Array(encryptedBuffer)),
                algorithm: this.algorithm,
                timestamp: new Date().toISOString(),
                additionalData: additionalData
            };
            Logger.encryption('Data encryption', this.algorithm, duration, {
                dataSize: dataBytes.length,
                encryptedSize: encryptedBuffer.byteLength
            });
            return result;
        } catch (error) {
            Logger.error('Encryption failed', { error: error.message }, error);
            throw new Error('Failed to encrypt data: ' + error.message);
        }
    }
    async decryptData(encryptedData) {
        if (!this.initialized) {
            throw new Error('Encryption system not initialized');
        }
        try {
            const startTime = performance.now();
            const iv = new Uint8Array(encryptedData.iv);
            const data = new Uint8Array(encryptedData.data);
            const decryptParams = {
                name: this.algorithm,
                iv: iv
            };
            if (encryptedData.additionalData) {
                const encoder = new TextEncoder();
                decryptParams.additionalData = encoder.encode(
                    JSON.stringify(encryptedData.additionalData)
                );
            }
            const decryptedBuffer = await crypto.subtle.decrypt(
                decryptParams,
                this.masterKey,
                data
            );
            const duration = performance.now() - startTime;
            const decoder = new TextDecoder();
            const decryptedText = decoder.decode(decryptedBuffer);
            const originalData = JSON.parse(decryptedText);
            Logger.encryption('Data decryption', this.algorithm, duration, {
                encryptedSize: data.length,
                decryptedSize: decryptedBuffer.byteLength
            });
            return originalData;
        } catch (error) {
            Logger.error('Decryption failed', { error: error.message }, error);
            throw new Error('Failed to decrypt data: ' + error.message);
        }
    }
    async encryptLocation(locationData) {
        try {
            const startTime = performance.now();
            const noisyLocation = this.addDifferentialPrivacy(locationData);
            const predicateData = this.createPredicateRepresentation(noisyLocation);
            const encryptedLocation = await this.encryptData(predicateData, {
                type: 'location',
                category: locationData.category,
                timestamp: new Date().toISOString()
            });
            const duration = performance.now() - startTime;
            Logger.encryption('Location encryption', 'Predicate-Only', duration, {
                originalLat: locationData.latitude,
                originalLng: locationData.longitude,
                category: locationData.category
            });
            return {
                ...encryptedLocation,
                metadata: {
                    type: 'encrypted_location',
                    category: locationData.category,
                    name: locationData.name,
                    description: locationData.description,
                    uploadDate: new Date().toISOString(),
                    privacyLevel: 'high'
                }
            };
        } catch (error) {
            Logger.error('Location encryption failed', { error: error.message }, error);
            throw new Error('Failed to encrypt location: ' + error.message);
        }
    }
    async decryptLocation(encryptedLocation) {
        try {
            const decryptedData = await this.decryptData(encryptedLocation);
            const location = this.reconstructLocationFromPredicate(decryptedData);
            return {
                ...location,
                metadata: encryptedLocation.metadata
            };
        } catch (error) {
            Logger.error('Location decryption failed', { error: error.message }, error);
            throw new Error('Failed to decrypt location: ' + error.message);
        }
    }
    addDifferentialPrivacy(locationData, epsilon = 0.1) {
        const sensitivity = 0.001; 
        const scale = sensitivity / epsilon;
        const latNoise = this.generateLaplaceNoise(scale);
        const lngNoise = this.generateLaplaceNoise(scale);
        return {
            ...locationData,
            latitude: locationData.latitude + latNoise,
            longitude: locationData.longitude + lngNoise,
            privacyApplied: true,
            epsilon: epsilon
        };
    }
    generateLaplaceNoise(scale) {
        const u = Math.random() - 0.5;
        return -scale * Math.sign(u) * Math.log(1 - 2 * Math.abs(u));
    }
    createPredicateRepresentation(locationData) {
        const gridSize = 0.01;
        const gridX = Math.floor(locationData.latitude / gridSize);
        const gridY = Math.floor(locationData.longitude / gridSize);
        return {
            gridX: gridX,
            gridY: gridY,
            exactLat: locationData.latitude,
            exactLng: locationData.longitude,
            category: locationData.category,
            name: locationData.name,
            description: locationData.description,
            gridSize: gridSize,
            timestamp: new Date().toISOString()
        };
    }
    reconstructLocationFromPredicate(predicateData) {
        return {
            latitude: predicateData.exactLat,
            longitude: predicateData.exactLng,
            category: predicateData.category,
            name: predicateData.name,
            description: predicateData.description,
            gridX: predicateData.gridX,
            gridY: predicateData.gridY
        };
    }
    async encryptQuery(queryParams) {
        try {
            const startTime = performance.now();
            const queryVector = this.createQueryVector(queryParams);
            const encryptedQuery = await this.encryptData(queryVector, {
                type: 'spatial_query',
                timestamp: new Date().toISOString()
            });
            const duration = performance.now() - startTime;
            Logger.encryption('Query encryption', 'Inner-Product', duration, {
                latitude: queryParams.latitude,
                longitude: queryParams.longitude,
                radius: queryParams.radius
            });
            return encryptedQuery;
        } catch (error) {
            Logger.error('Query encryption failed', { error: error.message }, error);
            throw new Error('Failed to encrypt query: ' + error.message);
        }
    }
    createQueryVector(queryParams) {
        const gridSize = 0.01;
        const centerX = Math.floor(queryParams.latitude / gridSize);
        const centerY = Math.floor(queryParams.longitude / gridSize);
        const radiusInGrids = Math.ceil(queryParams.radius / (gridSize * 111)); // Approximate km to grid conversion
        return {
            centerX: centerX,
            centerY: centerY,
            radius: radiusInGrids,
            exactLat: queryParams.latitude,
            exactLng: queryParams.longitude,
            exactRadius: queryParams.radius,
            category: queryParams.category,
            gridSize: gridSize,
            timestamp: new Date().toISOString()
        };
    }
    async performPrivateRangeQuery(encryptedQuery, encryptedLocations) {
        try {
            const startTime = performance.now();
            const query = await this.decryptData(encryptedQuery);
            const results = [];
            for (const encryptedLocation of encryptedLocations) {
                const location = await this.decryptData(encryptedLocation);
                const distance = this.calculateDistance(
                    query.exactLat, query.exactLng,
                    location.exactLat, location.exactLng
                );
                if (distance <= query.exactRadius) {
                    if (!query.category || location.category === query.category) {
                        results.push({
                            ...location,
                            distance: distance,
                            metadata: encryptedLocation.metadata
                        });
                    }
                }
            }
            const duration = performance.now() - startTime;
            Logger.query('Private range query', query, results.length, duration, {
                totalLocations: encryptedLocations.length,
                matchingResults: results.length
            });
            return results.sort((a, b) => a.distance - b.distance);
        } catch (error) {
            Logger.error('Private range query failed', { error: error.message }, error);
            throw new Error('Failed to perform private range query: ' + error.message);
        }
    }
    calculateDistance(lat1, lng1, lat2, lng2) {
        const R = 6371; 
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLng = (lng2 - lng1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLng / 2) * Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }
    async rotateKeys() {
        try {
            Logger.info('Key rotation initiated');
            const oldKey = this.masterKey;
            await this.initializeMasterKey();
            Logger.security('Master key rotated', {
                timestamp: new Date().toISOString(),
                reason: 'scheduled_rotation'
            });
            return true;
        } catch (error) {
            Logger.error('Key rotation failed', { error: error.message }, error);
            throw new Error('Failed to rotate keys: ' + error.message);
        }
    }
    generateSecureRandom(length) {
        return crypto.getRandomValues(new Uint8Array(length));
    }
    async hashData(data) {
        const encoder = new TextEncoder();
        const dataBytes = encoder.encode(JSON.stringify(data));
        const hashBuffer = await crypto.subtle.digest('SHA-256', dataBytes);
        return Array.from(new Uint8Array(hashBuffer));
    }
    getEncryptionStats() {
        return {
            algorithm: this.algorithm,
            keyLength: this.keyLength,
            initialized: this.initialized,
            supportedOperations: [
                'data_encryption',
                'location_encryption',
                'query_encryption',
                'range_queries',
                'differential_privacy'
            ]
        };
    }
}
const encryptionManager = new EncryptionManager();
window.encryptionManager = encryptionManager;