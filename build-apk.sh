#!/bin/bash
# ============================================
# Mosys — Build APK Script
# ============================================
# This script sets up the Android SDK and builds
# the APK for the Mosys finance app.
# ============================================

set -e

MOSYS_DIR="$(cd "$(dirname "$0")" && pwd)"
SDK_DIR="$HOME/Android/Sdk"
CMDLINE_VERSION="13.0"

echo "🚀 Mosys APK Build Script"
echo "========================="

# ─── Step 1: Check Java ───
echo ""
echo "📋 Checking Java..."
if ! command -v java &> /dev/null; then
    echo "❌ Java not found. Install with: sudo apt install openjdk-21-jdk"
    exit 1
fi
java --version | head -1

# ─── Step 2: Setup Android SDK ───
echo ""
echo "📱 Setting up Android SDK..."

if [ ! -d "$SDK_DIR/cmdline-tools" ]; then
    echo "  Downloading Android command-line tools..."
    mkdir -p "$SDK_DIR"
    cd /tmp
    wget -q "https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip" -O cmdline-tools.zip
    unzip -qo cmdline-tools.zip
    mkdir -p "$SDK_DIR/cmdline-tools/latest"
    mv cmdline-tools/* "$SDK_DIR/cmdline-tools/latest/" 2>/dev/null || true
    rm -rf cmdline-tools cmdline-tools.zip
    echo "  ✅ Command-line tools installed"
fi

export ANDROID_HOME="$SDK_DIR"
export ANDROID_SDK_ROOT="$SDK_DIR"
export PATH="$SDK_DIR/cmdline-tools/latest/bin:$SDK_DIR/platform-tools:$PATH"

# Accept licenses
echo "  Accepting licenses..."
yes | sdkmanager --licenses > /dev/null 2>&1 || true

# Install required components
echo "  Installing SDK components (API 35)..."
sdkmanager --install \
    "platforms;android-35" \
    "build-tools;35.0.0" \
    "platform-tools" \
    2>&1 | grep -E "done|Installed"

echo "  ✅ Android SDK ready"

# ─── Step 3: Build web assets ───
echo ""
echo "🔨 Building web assets..."
cd "$MOSYS_DIR"
npm run build
echo "  ✅ Web assets built"

# ─── Step 4: Sync Capacitor ───
echo ""
echo "🔄 Syncing Capacitor..."
npx cap sync android
echo "  ✅ Capacitor synced"

# ─── Step 5: Update local.properties ───
echo "sdk.dir=$SDK_DIR" > "$MOSYS_DIR/android/local.properties"

# ─── Step 6: Build APK ───
echo ""
echo "📦 Building APK (debug)..."
cd "$MOSYS_DIR/android"
chmod +x gradlew
./gradlew assembleDebug 2>&1 | tail -5

APK_PATH="$MOSYS_DIR/android/app/build/outputs/apk/debug/app-debug.apk"

if [ -f "$APK_PATH" ]; then
    SIZE=$(du -h "$APK_PATH" | cut -f1)
    echo ""
    echo "✅ ¡APK generado exitosamente!"
    echo "📍 Ubicación: $APK_PATH"
    echo "📊 Tamaño: $SIZE"
    echo ""
    echo "Para instalar en tu dispositivo:"
    echo "  adb install $APK_PATH"
    echo ""
    echo "O copia el APK a tu teléfono y ábrelo."
    
    # Copy to project root for easy access
    cp "$APK_PATH" "$MOSYS_DIR/mosys-debug.apk"
    echo "📋 Copia en: $MOSYS_DIR/mosys-debug.apk"
else
    echo "❌ Error: APK no se generó"
    exit 1
fi
