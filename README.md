# 🎵 SoundWave - AI-Powered Music Streaming Platform

A modern, responsive music streaming platform with AI recommendations, mood detection, and offline capabilities. Built with React, Firebase, and PWA technologies.

![SoundWave Demo](https://img.shields.io/badge/Status-Ready%20for%20Deployment-brightgreen)
![PWA Ready](https://img.shields.io/badge/PWA-Ready-blue)
![Mobile Optimized](https://img.shields.io/badge/Mobile-Optimized-orange)

## ✨ Features

### 🎶 **Music Streaming**
- Multiple music sources (iTunes, Jamendo)
- High-quality audio playback
- Full-length tracks and 30s previews
- YouTube video integration

### 🤖 **AI-Powered Recommendations**
- Personalized music suggestions
- Mood-based playlists (6 different moods)
- Time-of-day recommendations
- User listening pattern analysis

### 📱 **Progressive Web App (PWA)**
- Install as native app on any device
- Works offline after first visit
- Background music caching
- Push notifications support

### 🎨 **Modern UI/UX**
- Mobile-responsive design
- Dark theme with customizable colors
- Smooth animations and transitions
- Touch-optimized controls

### 🔧 **Advanced Features**
- Sleep timer with visual countdown
- Keyboard shortcuts
- Crossfade and audio effects
- Lyrics display with sync
- Queue management
- Playlist creation

## 🚀 Quick Start

### Local Development

1. **Clone the repository**:
   ```bash
   git clone https://github.com/yourusername/soundwave.git
   cd soundwave
   ```

2. **Install dependencies**:
   ```bash
   cd client
   npm install
   ```

3. **Start development server**:
   ```bash
   npm run dev
   ```

4. **Access the app**:
   - Desktop: `http://localhost:3001`
   - Mobile: `http://your-ip:3001` (replace with your IP)

### 🌐 Deploy to Cloud (Recommended)

#### Option 1: Vercel (Free & Fast)
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy from project root
vercel

# Follow prompts:
# - Directory: ./client
# - Build command: npm run build
# - Output directory: dist
```

#### Option 2: Netlify
```bash
# Build the project
cd client && npm run build

# Go to netlify.com and drag/drop the 'dist' folder
```

#### Option 3: Use Deploy Script
```bash
# Windows
deploy.bat

# Linux/Mac
./deploy.sh
```

## 📱 Mobile Installation

Once deployed, users can install SoundWave as a native app:

### Android:
1. Visit your deployed URL in Chrome
2. Tap the install prompt or menu → "Add to Home screen"

### iOS:
1. Visit your deployed URL in Safari
2. Tap Share button (⬆️) → "Add to Home Screen"

## 🔧 Configuration

### Environment Variables (Optional)

Create `client/.env` for additional features:

```env
# YouTube API for video features
VITE_YT_API_KEY=your_youtube_api_key

# Firebase for authentication (if needed)
VITE_FIREBASE_API_KEY=your_firebase_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
```

### Firebase Setup (Optional)

1. Create a Firebase project
2. Enable Authentication and Firestore
3. Add your config to `.env`

## 🎵 Music Sources

SoundWave integrates with multiple music APIs:

- **iTunes Store**: 30-second high-quality previews
- **Jamendo**: Full-length Creative Commons music
- **Offline Library**: Demo tracks for offline use
- **CORS Proxies**: Fallbacks for mobile networks

## 🔄 Offline Features

- **Music Caching**: Played songs are cached automatically
- **Offline Playback**: Listen to cached music without internet
- **PWA Installation**: Works like a native app
- **Background Sync**: Data syncs when connection returns
- **Offline Library**: Demo music available when APIs fail

## 🎨 Customization

### Themes
- Default dark theme with green accent
- Customizable brand colors
- AMOLED black theme option
- Light theme support

### Audio Settings
- Crossfade between tracks
- Playback speed control
- Volume normalization
- Audio effects

## 📊 Browser Support

- ✅ Chrome/Chromium (recommended)
- ✅ Safari (iOS/macOS)
- ✅ Firefox
- ✅ Samsung Internet
- ✅ Edge

## 🛠️ Development

### Project Structure
```
soundwave/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # UI components
│   │   ├── pages/         # Route pages
│   │   ├── services/      # API services
│   │   ├── context/       # React contexts
│   │   └── hooks/         # Custom hooks
│   ├── public/            # Static assets
│   └── dist/              # Build output
├── firebase/              # Firebase config
├── vercel.json           # Vercel deployment config
└── deploy.sh/bat         # Deployment scripts
```

### Key Technologies
- **Frontend**: React 18, Vite, Tailwind CSS
- **State Management**: React Context
- **Audio**: Web Audio API, Media Session API
- **PWA**: Service Workers, Web App Manifest
- **Deployment**: Vercel, Netlify, Static hosting

## 🐛 Troubleshooting

### Common Issues

**Music not playing on mobile?**
- Check internet connection
- Try different network (mobile data vs WiFi)
- Use offline demo music for testing

**PWA not installing?**
- Ensure HTTPS (automatic on Vercel/Netlify)
- Check if service worker is registered
- Try different browser

**APIs not working?**
- App includes CORS proxy fallbacks
- Offline music library available
- All features work without external APIs

### Debug Tools

Open browser console and run:
```javascript
// Test API connectivity
window.testAPIConnectivity()

// Test music search
window.testMusicAPI('rock')

// Test mood recommendations
window.testMoodRecommendations('happy')
```

## 📈 Performance

- **First Load**: ~900KB (gzipped: ~230KB)
- **Subsequent Loads**: Instant (cached)
- **Offline**: Full functionality
- **Mobile**: Optimized for touch devices

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

MIT License - feel free to use for personal or commercial projects.

## 🎉 Deployment Success!

Once deployed, your SoundWave app will be:
- 🌍 **Accessible worldwide**
- 📱 **Installable as native app**
- 🔄 **Working offline**
- 🎵 **Streaming music from multiple sources**
- 🤖 **Providing AI recommendations**

**Share your deployed URL and enjoy music streaming from anywhere!** 🎶

---

Made with ❤️ for music lovers everywhere