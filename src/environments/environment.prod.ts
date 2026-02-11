export const environment = {
  production: true,
  firebaseConfig: {
    apiKey: process.env['NG_APP_FIREBASE_API_KEY'] || '',
    authDomain: process.env['NG_APP_FIREBASE_AUTH_DOMAIN'] || '',
    projectId: process.env['NG_APP_FIREBASE_PROJECT_ID'] || '',
    storageBucket: process.env['NG_APP_FIREBASE_STORAGE_BUCKET'] || '',
    messagingSenderId: process.env['NG_APP_FIREBASE_MESSAGING_SENDER_ID'] || '',
    appId: process.env['NG_APP_FIREBASE_APP_ID'] || '',
    measurementId: process.env['NG_APP_FIREBASE_MEASUREMENT_ID'] || ''
  },
  backendApiUrl: process.env['NG_APP_BACKEND_API_URL'] || '',
  fastApiUrl: process.env['NG_APP_FAST_API_URL'] || '',
  mapTilerApiKey: process.env['NG_APP_MAPTILER_API_KEY'] || ''
};