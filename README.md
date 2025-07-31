# EPLQ: Efficient Privacy-Preserving Location-Based Query System
### Project Overview
EPLQ (Efficient Privacy-Preserving Location-Based Query) is an advanced web application that provides secure, encrypted location-based services with cutting-edge privacy protection for spatial range queries and POI (Points of Interest) discovery. The system implements predicate-only encryption for inner product range queries, ensuring complete privacy preservation while maintaining efficient query performance.

### Privacy & Security
- **Predicate-Only Encryption**: First-of-its-kind encryption system for inner product range queries
- **Differential Privacy**: Advanced noise injection to protect individual location privacy
- **AES-GCM Encryption**: 256-bit encryption for all sensitive data
- **Tree-Based Spatial Indexing**: Privacy-preserving spatial data structures for optimal query performance
- **Comprehensive Logging**: Advanced logging system for security monitoring and audit trails

### Frontend
- **HTML5**: Semantic markup with accessibility features
- **CSS3**: Modern styling with CSS Grid, Flexbox, and custom properties
- **Progressive Web App**: Service worker support for offline functionality

### Backend Services
- **Firebase Authentication**: Secure user authentication and session management
- **Firestore Database**: NoSQL database for encrypted location storage
- **Firebase Hosting**: Static site hosting with global CDN

### Security Components
- **Web Crypto API**: Browser-native cryptographic operations
- **Differential Privacy**: Mathematical privacy guarantees
- **Spatial Indexing**: Privacy-preserving tree structures
- **Audit Logging**: Comprehensive security event logging

### Project Structure
```
EPLQ/
├── public/
│   ├── index.html              # Landing page
│   ├── login.html              # User authentication
│   ├── register.html           # User registration
│   ├── dashboard.html          # User dashboard
│   ├── admin.html              # Admin dashboard
│   ├── styles/
│   │   └── main.css           # Main stylesheet
│   └── js/
│       ├── firebase-config.js  # Firebase configuration
│       ├── auth.js            # Authentication module
│       ├── encryption.js      # Encryption & privacy module
│       ├── search.js          # Search & query module
│       └── logger.js          # Logging system
├── firebase.json              # Firebase configuration
├── README.md                  # Project documentation
└── .gitignore                # Git ignore rules
```

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/eplq-system.git
   cd eplq-system
   vercel Live Link : https://85-psi.vercel.app/
   ```
2. **Configure Firebase**
   - Create a new Firebase project at [Firebase Console](https://console.firebase.google.com)
   - Enable Authentication (Email/Password)
   - Enable Firestore Database
   - Update `public/js/firebase-config.js` with your Firebase configuration

3. **Deploy to Firebase Hosting**
   ```bash
   npm install -g firebase-tools
   firebase login
   firebase init hosting
   firebase deploy
   ```
4. **Local Development**
   ```bash
   firebase serve --only hosting
   ```

### Firebase Configuration
Update the Firebase configuration in `public/js/firebase-config.js`:

```javascript
const firebaseConfig = {
    apiKey: ,
    authDomain: ,
    projectId: ,
    storageBucket: ,
    messagingSenderId: ,
    appId: 
};
```
### User Roles & Functionality
### Admin Users
- **Data Upload**: Encrypt and upload location data to the system
- **System Monitoring**: View system statistics and performance metrics
- **User Management**: Monitor user activity and system usage
- **Database Management**: View and manage encrypted location database
### Regular Users
- **Privacy-Preserving Search**: Perform encrypted spatial range queries
- **Location Discovery**: Find POIs within specified circular areas
- **Performance Metrics**: View query performance and privacy indicators
- **Search History**: Access previous search results and patterns

### Authentication Module (`auth.js`)
- User registration and login
- Session management
- Role-based access control
- Security event logging

### Encryption Module (`encryption.js`)
- AES-GCM encryption implementation
- Predicate-only encryption for locations
- Differential privacy mechanisms
- Query encryption for private searches

### Search Module (`search.js`)
- Privacy-preserving spatial range queries
- Tree-based spatial indexing
- Result caching and optimization
- Search analytics and history

### Logging Module (`logger.js`)
- Comprehensive event logging
- Performance monitoring
- Security audit trails
- Error tracking and reporting

### Data Protection
- **End-to-End Encryption**: All sensitive data encrypted before storage
- **Differential Privacy**: Mathematical privacy guarantees for location data
- **Secure Key Management**: Browser-based cryptographic key handling
- **Privacy-Preserving Queries**: Search without revealing query parameters

### Manual Testing
1. **User Registration**: Test account creation with different user types
2. **Authentication**: Verify login/logout functionality
3. **Data Upload**: Test location data encryption and storage (Admin)
4. **Search Functionality**: Test privacy-preserving spatial queries (User)
5. **Performance**: Measure query response times and encryption overhead

### Security Testing
1. **Input Validation**: Test with malicious inputs and edge cases
2. **Authentication Bypass**: Verify access control enforcement
3. **Data Encryption**: Confirm all sensitive data is encrypted
4. **Privacy Protection**: Validate differential privacy implementation

### Performance Testing
1. **Load Testing**: Test with multiple concurrent users
2. **Query Performance**: Measure spatial query response times
3. **Encryption Overhead**: Assess cryptographic operation costs
4. **Mobile Performance**: Test on various mobile devices

### Configuration
### Environment Variables
- `FIREBASE_API_KEY`: Firebase API key
- `FIREBASE_PROJECT_ID`: Firebase project identifier
- `FIREBASE_AUTH_DOMAIN`: Firebase authentication domain

### Firebase Hosting
```bash
firebase deploy --only hosting
```
**EPLQ** - Protecting privacy while enabling efficient location-based services through advanced cryptographic techniques and spatial optimization.
