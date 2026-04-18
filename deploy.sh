#!/bin/bash

# SoundWave Deployment Script
echo "🚀 Deploying SoundWave..."

# Check if we're in the right directory
if [ ! -f "client/package.json" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
cd client
npm install

# Build the project
echo "🔨 Building project..."
npm run build

# Check if build was successful
if [ ! -d "dist" ]; then
    echo "❌ Build failed!"
    exit 1
fi

echo "✅ Build successful!"

# Deploy options
echo ""
echo "🌐 Choose deployment option:"
echo "1. Vercel (Recommended)"
echo "2. Netlify"
echo "3. Manual (just build)"
echo ""
read -p "Enter your choice (1-3): " choice

case $choice in
    1)
        echo "🚀 Deploying to Vercel..."
        if command -v vercel &> /dev/null; then
            cd ..
            vercel --prod
        else
            echo "❌ Vercel CLI not installed. Install with: npm install -g vercel"
            echo "📋 Manual steps:"
            echo "1. Install Vercel CLI: npm install -g vercel"
            echo "2. Run: vercel"
            echo "3. Follow the prompts"
        fi
        ;;
    2)
        echo "🚀 Deploying to Netlify..."
        if command -v netlify &> /dev/null; then
            netlify deploy --prod --dir=dist
        else
            echo "❌ Netlify CLI not installed. Install with: npm install -g netlify-cli"
            echo "📋 Manual steps:"
            echo "1. Go to https://netlify.com"
            echo "2. Drag and drop the 'client/dist' folder"
            echo "3. Your app will be live instantly!"
        fi
        ;;
    3)
        echo "✅ Build complete! Files are in client/dist/"
        echo "📋 Manual deployment options:"
        echo "• Upload client/dist/ to any web hosting service"
        echo "• Use GitHub Pages, Firebase Hosting, or any static host"
        ;;
    *)
        echo "❌ Invalid choice"
        exit 1
        ;;
esac

echo ""
echo "🎉 Deployment complete!"
echo "📱 Your SoundWave app is now accessible from anywhere!"
echo "💡 Users can install it as a PWA on their devices"
echo "🔄 It works offline after the first visit"