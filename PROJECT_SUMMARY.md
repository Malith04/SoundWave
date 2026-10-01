# SoundWave — Full Project Summary

## What It Is
A full-stack music streaming web app (Spotify-inspired) with a separate admin dashboard.
Works on both desktop and mobile as a PWA (Progressive Web App).

---

## Tech Stack

### Frontend (client)
| Technology | Version | Purpose |
|---|---|---|
| React | 18.2.0 | UI framework |
| Vite | 5.1.0 | Build tool & dev server |
| Tailwind CSS | 3.4.0 | All styling & responsive design |
| React Router | v6.21.0 | Client-side routing |
| Howler.js | 2.2.4 | Audio engine (playback, volume, speed) |
| Lucide React | 0.303.0 | All icons |
| React Hot Toast | 2.4.1 | Notifications & keyboard shortcut toasts |
| Web Audio API | (browser native) | EQ, bass boost, spatial audio processing |

### Backend / Database
| Service | Purpose |
|---|---|
| Firebase Auth | Login, signup, password reset |
| Firebase Firestore | Users, songs, playlists (NoSQL) |
| Firebase Storage | Profile picture uploads |

### External APIs
| API | Purpose |
|---|---|
| iTunes API | Song search + 30s previews |
| Jamendo API | Full-length free/open-license tracks |
| YouTube Data API v3 | Music video playback in expanded player |
| lrclib.net | Synced lyrics (LRC format) |
| lyrics.ovh | Plain lyrics fallback |
| allorigins.win / corsproxy.io | CORS proxy fallbacks for API requests |

---

## Project Structure

```
SoundWave/
├── client/                  # Main user-facing app
│   ├── public/
│   │   ├── manifest.json    # PWA manifest
│   │   ├── sw.js            # Service worker
│   │   └── offline.html     # Offline fallback page
│   └── src/
│       ├── components/
│       │   ├── AppLayout.jsx       # Root layout (sidebar + main + player)
│       │   ├── Sidebar.jsx         # Navigation sidebar
│       │   ├── Player.jsx          # Mini bar + expanded full-screen player
│       │   ├── SongCard.jsx        # Grid song card
│       │   ├── SongRow.jsx         # List song row
│       │   ├── SongModal.jsx       # Song detail/add-to-playlist modal
│       │   ├── SectionRow.jsx      # Horizontal scroll section
│       │   ├── MoodSelector.jsx    # Mood-based recommendation UI
│       │   └── InstallPrompt.jsx   # PWA install banner
│       ├── context/
│       │   ├── PlayerContext.jsx        # Global playback state
│       │   ├── AuthContext.jsx          # Auth + user profile state
│       │   └── AudioSettingsContext.jsx # EQ, themes, all settings state
│       ├── hooks/
│       │   └── useKeyboardShortcuts.js  # Keyboard controls
│       ├── pages/
│       │   ├── HomePage.jsx
│       │   ├── SearchPage.jsx
│       │   ├── LibraryPage.jsx
│       │   ├── PlaylistPage.jsx
│       │   ├── GenrePage.jsx
│       │   ├── ProfilePage.jsx
│       │   ├── SettingsPage.jsx
│       │   ├── LoginPage.jsx
│       │   ├── SignupPage.jsx
│       │   └── ForgotPasswordPage.jsx
│       └── services/
│           ├── firebase.js              # Firebase init
│           ├── musicApi.js              # iTunes + Jamendo + YouTube
│           ├── songService.js           # Firestore song CRUD
│           ├── userService.js           # Firestore user CRUD
│           ├── playlistService.js       # Firestore playlist CRUD
│           └── recommendationService.js # AI-style recommendation engine
│
├── admin-dashboard/         # Separate admin app
│   └── src/
│       ├── pages/
│       │   ├── DashboardPage.jsx   # Stats overview
│       │   ├── SongsPage.jsx       # Song management
│       │   ├── UsersPage.jsx       # User management
│       │   ├── AnalyticsPage.jsx   # Charts (Recharts)
│       │   └── LoginPage.jsx
│       └── components/
│           ├── Layout.jsx
│           └── UploadSongModal.jsx
│
├── firebase/
│   ├── firestore.rules      # Firestore security rules
│   └── storage.rules        # Storage security rules
│
├── PROJECT_SUMMARY.md       # This file
├── README.md
├── SETUP.md
├── DEPLOYMENT.md
├── vercel.json              # Vercel deployment config
└── deploy.sh / deploy.bat   # Deploy scripts
```

---

## Client App — Pages & Features

### Auth
- Login with email/password
- Signup with name + email + password
- Forgot password (Firebase email reset)
- Protected routes — redirect to login if not authenticated

### Home Page
- Trending songs section
- New releases section
- Recently played (if logged in)
- Daily mood mixes (energetic, chill, focus, romantic, happy)
- Mood selector with AI-style recommendations

### Search Page
- Live search across iTunes + Jamendo simultaneously
- Results split by source (iTunes previews vs Jamendo full tracks)
- Genre browsing grid (Pop, Rock, Hip-Hop, Jazz, Electronic, Classical, etc.)

### Library Page
- Liked / favorited songs list
- Recently played history

### Playlist Page
- View playlist songs
- Play all / shuffle
- Add/remove songs
- Drag-to-reorder songs
- Rename / delete playlist

### Genre Page
- Songs filtered by genre
- Pulls from both iTunes and Jamendo

### Profile Page
- Avatar display
- Display name, bio, member since
- Links to settings

---

## Player — Full Feature List

### Mini Player Bar (always visible at bottom)
- Album art thumbnail (click to open expanded player)
- Song title + artist
- Like / unlike button
- Previous, play/pause, next controls
- Seek bar with current time + duration
- Shuffle toggle
- Repeat toggle (none / all / one)
- Volume control + mute
- Queue panel toggle
- Lyrics panel toggle
- Sleep timer toggle
- Audio bars animation when playing
- "Up next" preview toast (shows when ≤15s remaining)
- Blurred album art background

### Expanded Player (full screen)
- Blurred + saturated album art background
- Floating particles animation (toggleable)
- Audio / Video mode toggle
  - Audio: large album art with glow effect
  - Video: YouTube music video embed (auto-searched)
- Song title, artist, album
- Like button
- Source badge (Full Track / 30s Preview)
- Seek bar with timestamps
- Shuffle, previous, play/pause, next, repeat controls
- Volume slider
- Lyrics panel (slide-up sheet)
  - Live synced scrolling lyrics (lrclib.net)
  - Plain lyrics fallback (lyrics.ovh)
- Queue panel (slide-up sheet)
  - Full queue list, current song highlighted
- Slide-up animation on open

### Mobile Mini Player
- Seek bar strip at top edge
- Compact single-row controls
- Tap album art to open expanded player

---

## Settings Page — All Features

### Audio Tab
- 10-band Equalizer (32Hz – 16kHz vertical sliders)
- EQ presets: Flat, Bass, Treble, Vocal, Electronic, Rock, Jazz, Classical, Podcast
- Sound profiles (quick-apply cards)
- Spatial Audio toggle + stereo width slider (0x – 2x)
- Bass Boost slider (0 – 12 dB)
- Audio Normalization toggle
- Mono Audio toggle

### Playback Tab
- Playback Speed slider (0.5x – 2.0x)
- Crossfade slider (0 – 12 seconds)
- Gapless Playback toggle
- Autoplay toggle
- Smart Shuffle toggle
- Streaming Quality selector (Auto / Low / Normal / High / Very High)
- Loud Volume Level toggle
- Remember Queue on Restart toggle
- Show Recently Played toggle

### Display Tab
- Theme selector (Dark / AMOLED Black / Light)
- Accent Color picker (Green / Blue / Red / Purple / Amber)
- Animated Album Art toggle
- Background Particles toggle
- Show Song Credits toggle
- Canvas / Animated Covers toggle
- Full-Screen Lyrics by Default toggle
- Show Daily Mixes toggle
- Show New Releases toggle

### Privacy Tab
- Private Session toggle
- Share Listening Activity toggle
- Clear Search History button
- Clear Recently Played button
- Collect Usage Data toggle

### Account Tab
- Profile picture upload (Firebase Storage)
- Edit display name, bio, gender, country, language
- Subscription info card + Upgrade button
- Change email
- Change password
- Sign out
- Delete account (with "DELETE" confirmation input)

---

## Admin Dashboard — Features

Built as a completely separate Vite + React app.

| Feature | Details |
|---|---|
| Auth | Firebase Auth, admin-only login |
| Dashboard | Total songs, users, play counts |
| Songs page | View all songs, upload new, delete |
| Users page | View all registered users |
| Analytics | Charts via Recharts library |
| File upload | react-dropzone for audio/image files |

---

## Recommendation Engine

Custom-built scoring system in `recommendationService.js`:

- Extracts user's top genres from recently played + favorites
- Extracts top artists from listening history
- Analyzes time-of-day → maps to mood (morning=energetic, night=ambient, etc.)
- Scores candidate songs by genre match weight + artist match weight + mood match
- Generates "Discover Weekly" style playlists
- Generates mood-based playlists on demand
- Falls back through multiple search queries if primary fails

---

## Keyboard Shortcuts

| Key | Action |
|---|---|
| Space | Play / Pause |
| ← / → | Seek ±10 seconds |
| Shift + ← / → | Previous / Next track |
| ↑ / ↓ | Volume ±10% |
| M | Mute / Unmute |
| S | Toggle Shuffle |
| R | Cycle Repeat mode |
| 1–9, 0 | Seek to 10%–100% |

---

## PWA (Progressive Web App)

- `manifest.json` — app name, icons, theme color, display mode
- `sw.js` — service worker for offline caching
- `offline.html` — shown when network is unavailable
- Installable on Android and iOS home screen
- `InstallPrompt.jsx` — in-app install banner

---

## Key Architecture Decisions

| Decision | Approach |
|---|---|
| Audio engine | Howler.js wraps HTML5 Audio, handles cross-browser quirks |
| EQ / effects | Web Audio API nodes chained to Howler's masterGain |
| Song data flow | Fetched live from iTunes/Jamendo → upserted to Firestore on play |
| Layout | Flex column: top bar → (sidebar + main) → player. Player is always `shrink-0`, never scrollable |
| Mobile sidebar | Fixed overlay, `top: 49px` (below header), `bottom: 0`, bottom items always pinned |
| Themes | CSS variables on `:root`, swapped via `data-theme` attribute on `<html>` |
| Accent color | `--brand` CSS variable updated live via JS from settings |
| CORS handling | Direct API first, then allorigins.win, then corsproxy.io as fallbacks |
| State management | React Context only (no Redux) — PlayerContext, AuthContext, AudioSettingsContext |

---

## Deployment

| Target | Method |
|---|---|
| Client (GitHub Pages) | `npm run deploy` → `gh-pages -d dist` |
| Client (Vercel) | `vercel.json` config present |
| Admin dashboard | Separate `vite build` |
| Firebase project | `spotify-music-app-b8966` |
| Node requirement | >= 18.0.0 |

---

*SoundWave — built with React, Firebase, Howler.js, Tailwind CSS*
