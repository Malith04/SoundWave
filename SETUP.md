# SoundWave — Setup Guide

## Project Structure

```
music-streaming-web/
├── client/          ← React music streaming web app (user-facing)
└── admin-dashboard/ ← React admin dashboard
```

Both apps share the same Firebase project.

---

## 1. Firebase Project Setup

1. Go to https://console.firebase.google.com → create a new project
2. Enable **Authentication** → Sign-in methods:
   - Email/Password ✅
   - Google ✅ (optional)
3. Enable **Firestore Database** (production mode)
4. Enable **Firebase Storage**
5. Go to Project Settings → Add a **Web app**
6. Copy the config object into:
   - `client/src/services/firebase.js`
   - `admin-dashboard/src/services/firebase.js`

---

## 2. Firestore Collections

```
users/{uid}
  name, email, profilePicUrl, favoriteSongs[], recentlyPlayed[], createdAt

songs/{id}
  title, artist, album, genre, coverUrl, audioUrl, duration, playCount, createdAt

playlists/{id}
  name, ownerId, songIds[], createdAt
```

---

## 3. Deploy Security Rules

```bash
npm install -g firebase-tools
firebase login
firebase init firestore storage
# Copy rules from firebase/ folder
firebase deploy --only firestore:rules,storage
```

---

## 4. Run the Client App

```bash
cd client
npm install
npm run dev        # → http://localhost:3000
```

## 5. Run the Admin Dashboard

```bash
cd admin-dashboard
npm install
npm run dev        # → http://localhost:5173
```

---

## 6. Admin Access

In `admin-dashboard/src/context/AuthContext.jsx`, add your admin email:

```js
const ADMIN_EMAILS = ['your-admin@email.com']
```

Create that user in Firebase Auth console (or sign up normally, then add to the list).

---

## 7. Deploy to Firebase Hosting

```bash
# Client
cd client && npm run build
firebase init hosting   # public dir: dist, SPA: yes
firebase deploy --only hosting

# Admin (separate hosting site)
cd admin-dashboard && npm run build
```

---

## 8. Adding Songs (via Admin Dashboard)

1. Log into the admin dashboard
2. Go to Songs → Upload Song
3. Fill in title, artist, album, genre
4. Drop the audio file (.mp3) and cover image
5. Hit Upload — files go to Firebase Storage, metadata to Firestore
6. Songs appear in the client app immediately
