#!/bin/bash
set -e

# Android Manifest & Asset Injection Script
# Usage: ./inject-android-manifest.sh <bundle_id> <tenant_name> <ota_endpoint> <primary_color> <logo_path>

BUNDLE_ID="$1"
TENANT_NAME="$2"
OTA_ENDPOINT="$3"
PRIMARY_COLOR="$4"
LOGO_PATH="$5"

MANIFEST_PATH="src/HybridPlatform.Shell/Platforms/Android/AndroidManifest.xml"
COLORS_PATH="src/HybridPlatform.Shell/Platforms/Android/Resources/values/colors.xml"
STRINGS_PATH="src/HybridPlatform.Shell/Platforms/Android/Resources/values/strings.xml"
DRAWABLE_PATH="src/HybridPlatform.Shell/Platforms/Android/Resources/drawable"

echo "======================================"
echo "Android Asset Injection"
echo "======================================"
echo "Bundle ID: $BUNDLE_ID"
echo "Tenant Name: $TENANT_NAME"
echo "OTA Endpoint: $OTA_ENDPOINT"
echo "Primary Color: $PRIMARY_COLOR"
echo "Logo Path: $LOGO_PATH"
echo "======================================"

# Create directories if they don't exist
mkdir -p "$(dirname "$MANIFEST_PATH")"
mkdir -p "$(dirname "$COLORS_PATH")"
mkdir -p "$(dirname "$STRINGS_PATH")"
mkdir -p "$DRAWABLE_PATH"

# Create or update AndroidManifest.xml
cat > "$MANIFEST_PATH" << EOF
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
          package="$BUNDLE_ID"
          android:versionCode="1"
          android:versionName="1.0">
    
    <uses-sdk android:minSdkVersion="26" android:targetSdkVersion="34" />
    
    <!-- Permissions -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
    <uses-permission android:name="android.permission.USE_BIOMETRIC" />
    <uses-permission android:name="android.permission.USE_FINGERPRINT" />
    <uses-permission android:name="android.permission.CHANGE_NETWORK_STATE" />
    <uses-permission android:name="android.permission.CHANGE_WIFI_MULTICAST_STATE" />
    
    <application
        android:allowBackup="true"
        android:icon="@drawable/tenant_logo"
        android:label="$TENANT_NAME"
        android:roundIcon="@drawable/tenant_logo"
        android:supportsRtl="true"
        android:theme="@style/AppTheme"
        android:usesCleartextTraffic="false"
        android:networkSecurityConfig="@xml/network_security_config">
        
        <!-- Main Activity -->
        <activity
            android:name="com.hybridplatform.MainActivity"
            android:exported="true"
            android:launchMode="singleTop"
            android:configChanges="orientation|screenSize|keyboardHidden"
            android:theme="@style/AppTheme.Splash">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
        
        <!-- OTA Update Service -->
        <service
            android:name="com.hybridplatform.OtaUpdateService"
            android:exported="false" />
        
        <!-- Metadata -->
        <meta-data android:name="com.hybridplatform.OTA_ENDPOINT" android:value="$OTA_ENDPOINT" />
        <meta-data android:name="com.hybridplatform.TENANT_ID" android:value="$BUNDLE_ID" />
        
    </application>
    
</manifest>
EOF

echo "✓ AndroidManifest.xml created"

# Create colors.xml with tenant branding
cat > "$COLORS_PATH" << EOF
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="colorPrimary">$PRIMARY_COLOR</color>
    <color name="colorPrimaryDark">$PRIMARY_COLOR</color>
    <color name="colorAccent">$PRIMARY_COLOR</color>
    <color name="colorBackground">#FFFFFF</color>
    <color name="colorSurface">#FAFAFA</color>
    <color name="colorOnPrimary">#FFFFFF</color>
    <color name="colorOnBackground">#000000</color>
</resources>
EOF

echo "✓ colors.xml created with primary color: $PRIMARY_COLOR"

# Create strings.xml
cat > "$STRINGS_PATH" << EOF
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">$TENANT_NAME</string>
    <string name="ota_endpoint">$OTA_ENDPOINT</string>
</resources>
EOF

echo "✓ strings.xml created"

# Copy tenant logo to drawable
if [ -f "$LOGO_PATH" ]; then
    cp "$LOGO_PATH" "$DRAWABLE_PATH/tenant_logo.png"
    echo "✓ Logo copied to drawable/tenant_logo.png"
    
    # Generate additional densities using ImageMagick (if available)
    if command -v convert &> /dev/null; then
        mkdir -p "src/HybridPlatform.Shell/Platforms/Android/Resources/drawable-mdpi"
        mkdir -p "src/HybridPlatform.Shell/Platforms/Android/Resources/drawable-hdpi"
        mkdir -p "src/HybridPlatform.Shell/Platforms/Android/Resources/drawable-xhdpi"
        mkdir -p "src/HybridPlatform.Shell/Platforms/Android/Resources/drawable-xxhdpi"
        mkdir -p "src/HybridPlatform.Shell/Platforms/Android/Resources/drawable-xxxhdpi"
        
        convert "$LOGO_PATH" -resize 48x48 "src/HybridPlatform.Shell/Platforms/Android/Resources/drawable-mdpi/tenant_logo.png"
        convert "$LOGO_PATH" -resize 72x72 "src/HybridPlatform.Shell/Platforms/Android/Resources/drawable-hdpi/tenant_logo.png"
        convert "$LOGO_PATH" -resize 96x96 "src/HybridPlatform.Shell/Platforms/Android/Resources/drawable-xhdpi/tenant_logo.png"
        convert "$LOGO_PATH" -resize 144x144 "src/HybridPlatform.Shell/Platforms/Android/Resources/drawable-xxhdpi/tenant_logo.png"
        convert "$LOGO_PATH" -resize 192x192 "src/HybridPlatform.Shell/Platforms/Android/Resources/drawable-xxxhdpi/tenant_logo.png"
        
        echo "✓ Generated multi-density icons"
    fi
else
    echo "⚠ Warning: Logo file not found at $LOGO_PATH"
fi

# Create network security config for HTTPS enforcement
NETWORK_CONFIG_PATH="src/HybridPlatform.Shell/Platforms/Android/Resources/xml/network_security_config.xml"
mkdir -p "$(dirname "$NETWORK_CONFIG_PATH")"

cat > "$NETWORK_CONFIG_PATH" << EOF
<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <base-config cleartextTrafficPermitted="false">
        <trust-anchors>
            <certificates src="system" />
        </trust-anchors>
    </base-config>
    
    <!-- Allow cleartext only for OTA endpoint during development -->
    <domain-config cleartextTrafficPermitted="false">
        <domain includeSubdomains="true">$(echo "$OTA_ENDPOINT" | sed -E 's|https?://([^/]+).*|\1|')</domain>
    </domain-config>
</network-security-config>
EOF

echo "✓ Network security config created"

# Create styles.xml
STYLES_PATH="src/HybridPlatform.Shell/Platforms/Android/Resources/values/styles.xml"
cat > "$STYLES_PATH" << EOF
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <style name="AppTheme" parent="Theme.AppCompat.Light.DarkActionBar">
        <item name="colorPrimary">@color/colorPrimary</item>
        <item name="colorPrimaryDark">@color/colorPrimaryDark</item>
        <item name="colorAccent">@color/colorAccent</item>
        <item name="android:windowBackground">@color/colorBackground</item>
    </style>
    
    <style name="AppTheme.Splash" parent="AppTheme">
        <item name="android:windowBackground">@drawable/splash_screen</item>
        <item name="android:windowNoTitle">true</item>
        <item name="android:windowFullscreen">true</item>
    </style>
</resources>
EOF

echo "✓ styles.xml created"

# Create splash screen drawable
SPLASH_PATH="src/HybridPlatform.Shell/Platforms/Android/Resources/drawable/splash_screen.xml"
cat > "$SPLASH_PATH" << EOF
<?xml version="1.0" encoding="utf-8"?>
<layer-list xmlns:android="http://schemas.android.com/apk/res/android">
    <item android:drawable="@color/colorPrimary" />
    <item>
        <bitmap
            android:src="@drawable/tenant_logo"
            android:gravity="center" />
    </item>
</layer-list>
EOF

echo "✓ Splash screen created"

echo "======================================"
echo "✓ Android asset injection complete!"
echo "======================================"
