export const environment = {
  production: false,
  firebaseConfig: {
    apiKey: process.env['NG_APP_FIREBASE_API_KEY'] || 'AIzaSyA8u5HYbzrlFm12sNtGTiyzLxwZ2kcS1_o',
    authDomain: process.env['NG_APP_FIREBASE_AUTH_DOMAIN'] || 'projectroomaroo.firebaseapp.com',
    projectId: process.env['NG_APP_FIREBASE_PROJECT_ID'] || 'projectroomaroo',
    storageBucket: process.env['NG_APP_FIREBASE_STORAGE_BUCKET'] || 'projectroomaroo.firebasestorage.app',
    messagingSenderId: process.env['NG_APP_FIREBASE_MESSAGING_SENDER_ID'] || '782979223053',
    appId: process.env['NG_APP_FIREBASE_APP_ID'] || '1:782979223053:web:0ed401a937a53890158f44',
    measurementId: process.env['NG_APP_FIREBASE_MEASUREMENT_ID'] || 'G-X6MZ8F81G1'
  },
  backendApiUrl: process.env['NG_APP_BACKEND_API_URL'] || 'http://localhost:3000/api',
  fastApiUrl: process.env['NG_APP_FAST_API_URL'] || 'http://localhost:8000',
  mapTilerApiKey: process.env['NG_APP_MAPTILER_API_KEY'] || 'Gpwk2Mpi9cl8hUkVrf6f'
};