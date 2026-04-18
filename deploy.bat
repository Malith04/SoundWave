@echo off
echo 🚀 Deploying SoundWave...

REM Check if we're in the right directory
if not exist "client\package.json" (
    echo ❌ Error: Please run this script from the project root directory
    pause
    exit /b 1
)

REM Install dependencies
echo 📦 Installing dependencies...
cd client
call npm install

REM Build the project
echo 🔨 Building project...
call npm run build

REM Check if build was successful
if not exist "dist" (
    echo ❌ Build failed!
    pause
    exit /b 1
)

echo ✅ Build successful!
echo.
echo 🌐 Deployment options:
echo 1. Upload client\dist folder to any web hosting service
echo 2. Use Vercel: npm install -g vercel, then run: vercel
echo 3. Use Netlify: Drag and drop client\dist to netlify.com
echo 4. Use GitHub Pages, Firebase Hosting, or any static host
echo.
echo 🎉 Your SoundWave app is ready for deployment!
echo 📱 Users can install it as a PWA on their devices
echo 🔄 It works offline after the first visit

pause