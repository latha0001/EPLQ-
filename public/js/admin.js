function initializeLocationUpload() {
    const uploadForm = document.getElementById('uploadForm');
    const uploadBtn = document.getElementById('uploadBtn');
    if (!uploadForm) return;
    uploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(uploadForm);
        const locationData = {
            name: formData.get('locationName'),
            category: formData.get('locationCategory'),
            latitude: parseFloat(formData.get('locationLatitude')),
            longitude: parseFloat(formData.get('locationLongitude')),
            description: formData.get('locationDescription') || '',
            userId: authManager.getCurrentUser()?.uid
        };
        try {
            showLoading('Encrypting and uploading location data...');
            uploadBtn.disabled = true;
            const encryptedLocation = await encryptionManager.encryptLocation(locationData);
            const result = await firebase.addDocument('locations', encryptedLocation);
            hideLoading();
            uploadBtn.disabled = false;
            showToast('Location data encrypted and uploaded successfully!', 'success');
            uploadForm.reset();
            loadLocations();
            loadSystemStats();
            Logger.userAction('Location uploaded', { 
                locationId: result.id,
                category: locationData.category,
                name: locationData.name
            });
        } catch (error) {
            hideLoading();
            uploadBtn.disabled = false;
            showToast('Failed to upload location: ' + error.message, 'error');
        }
    });
}
async function loadLocations() {
    try {
        const locations = await firebase.getDocuments('locations');
        displayLocationsTable(locations);
        Logger.info('Locations loaded for admin view', { count: locations.length });
    } catch (error) {
        Logger.error('Failed to load locations', { error: error.message });
        showToast('Failed to load locations', 'error');
    }
}
function displayLocationsTable(locations) {
    const tableBody = document.getElementById('locationsTableBody');
    if (!tableBody) return;
    if (locations.length === 0) {
        tableBody.innerHTML = `
            <tr class="no-data">
                <td colspan="6">
                    <i class="fas fa-database"></i>
                    <p>No locations uploaded yet</p>
                </td>
            </tr>`;
        return;
    }
    const rows = locations.map(location => {
        const metadata = location.metadata || {};
        return `
            <tr>
                <td>${metadata.name || 'Unknown'}</td>
                <td>
                    <span class="category-badge">${metadata.category || 'other'}</span>
                </td>
                <td class="coordinates">
                    ${location.gridX || 'N/A'}, ${location.gridY || 'N/A'}
                </td>
                <td>${metadata.uploadDate ? new Date(metadata.uploadDate).toLocaleDateString() : 'N/A'}</td>
                <td>
                    <span class="status-badge encrypted">
                        <i class="fas fa-shield-alt"></i>
                        Encrypted
                    </span>
                </td>
                <td>
                    <button class="btn btn-secondary btn-sm" onclick="viewLocation('${location.id}')">
                        <i class="fas fa-eye"></i>
                        View
                    </button>
                </td>
            </tr>`;
    }).join('');
    tableBody.innerHTML = rows;
}
async function loadSystemStats() {
    try {
        const stats = await firebase.getSystemStats();
        updateStatsDisplay(stats);
        Logger.info('System stats loaded', stats);
    } catch (error) {
        Logger.error('Failed to load system stats', { error: error.message });
    }
}
function updateStatsDisplay(stats) {
    const elements = {
        totalLocations: document.getElementById('totalLocations'),
        activeUsers: document.getElementById('activeUsers'),
        totalQueries: document.getElementById('totalQueries')
    };
    if (elements.totalLocations) elements.totalLocations.textContent = stats.totalLocations;
    if (elements.activeUsers) elements.activeUsers.textContent = stats.activeUsers;
    if (elements.totalQueries) elements.totalQueries.textContent = stats.totalQueries;
}
function viewLocation(locationId) {
    Logger.userAction('Location view requested', { locationId });
    showToast('Location details view not implemented in demo', 'warning');
}
window.initializeLocationUpload = initializeLocationUpload;
window.loadLocations = loadLocations;
window.loadSystemStats = loadSystemStats;
window.viewLocation = viewLocation;