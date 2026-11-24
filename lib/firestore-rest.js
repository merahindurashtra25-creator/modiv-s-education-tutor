/**
 * Modiv's Education - Firestore REST Fallback Client
 * 
 * Provides resilient, credential-free read access to public Firestore collections
 * (/tutors, /leads, /students, /blogs) via the official Google Cloud Firestore REST API.
 * 
 * When backend Service Account credentials (FIREBASE_SERVICE_ACCOUNT_KEY) are not yet
 * configured in Vercel environment variables, this fallback ensures that GET API requests
 * successfully fetch and return live Firestore data rather than returning empty arrays.
 */

const https = require('https');

function decodeFirestoreValue(val) {
  if (!val || typeof val !== 'object') return val;
  if ('stringValue' in val) return val.stringValue;
  if ('integerValue' in val) return Number(val.integerValue);
  if ('doubleValue' in val) return Number(val.doubleValue);
  if ('booleanValue' in val) return Boolean(val.booleanValue);
  if ('timestampValue' in val) return val.timestampValue;
  if ('nullValue' in val) return null;
  if ('mapValue' in val) {
    const res = {};
    const f = (val.mapValue && val.mapValue.fields) ? val.mapValue.fields : {};
    for (const k of Object.keys(f)) {
      res[k] = decodeFirestoreValue(f[k]);
    }
    return res;
  }
  if ('arrayValue' in val) {
    const arr = (val.arrayValue && val.arrayValue.values) || [];
    return arr.map(decodeFirestoreValue);
  }
  return val;
}

function decodeFirestoreDoc(doc) {
  if (!doc) return null;
  const id = doc.name ? doc.name.split('/').pop() : '';
  const obj = { id };
  if (doc.fields) {
    for (const k of Object.keys(doc.fields)) {
      obj[k] = decodeFirestoreValue(doc.fields[k]);
    }
  }
  return obj;
}

function httpsGetJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'Accept': 'application/json' }, timeout: 8000 }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error('Invalid JSON from Firestore REST API: ' + e.message));
          }
        } else {
          try {
            const errJson = JSON.parse(data);
            const msg = (errJson && errJson.error && errJson.error.message) || `HTTP ${res.statusCode}`;
            reject(new Error(msg));
          } catch (e) {
            reject(new Error(`HTTP ${res.statusCode} from Firestore REST API`));
          }
        }
      });
    }).on('error', reject).on('timeout', function() {
      this.destroy();
      reject(new Error('Firestore REST API request timed out'));
    });
  });
}

async function restFetchCollection(collectionName, { limit = 100 } = {}) {
  const projectId = process.env.FIREBASE_PROJECT_ID || 'modivs-education';
  const apiKey = process.env.FIREBASE_API_KEY || 'AIzaSyB2I8iFDkcUZJBDBwkALHNeoIR3a9k-fcY';

  const pageSize = Math.min(Math.max(Number(limit) || 50, 1), 300);
  const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents/${encodeURIComponent(collectionName)}?key=${encodeURIComponent(apiKey)}&pageSize=${pageSize}`;

  try {
    const data = await httpsGetJson(url);
    if (!data || !Array.isArray(data.documents)) return [];
    return data.documents.map(decodeFirestoreDoc).filter(Boolean);
  } catch (err) {
    console.warn(`[firestore-rest] Notice fetching ${collectionName}:`, err.message);
    return [];
  }
}

async function restFetchDocument(collectionName, docId) {
  if (!docId) return null;
  const projectId = process.env.FIREBASE_PROJECT_ID || 'modivs-education';
  const apiKey = process.env.FIREBASE_API_KEY || 'AIzaSyB2I8iFDkcUZJBDBwkALHNeoIR3a9k-fcY';

  const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents/${encodeURIComponent(collectionName)}/${encodeURIComponent(docId)}?key=${encodeURIComponent(apiKey)}`;

  try {
    const doc = await httpsGetJson(url);
    return decodeFirestoreDoc(doc);
  } catch (err) {
    return null;
  }
}

module.exports = {
  decodeFirestoreValue,
  decodeFirestoreDoc,
  restFetchCollection,
  restFetchDocument
};
