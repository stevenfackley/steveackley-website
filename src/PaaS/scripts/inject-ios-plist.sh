#!/bin/bash
set -e

# iOS Info.plist & Asset Injection Script
# Usage: ./inject-ios-plist.sh <bundle_id> <tenant_name> <ota_endpoint> <primary_color> <logo_path>

BUNDLE_ID="$1"
TENANT_NAME="$2"
OTA_ENDPOINT="$3"
PRIMARY_COLOR="$4"
LOGO_PATH="$5"

PLIST_PATH="src/HybridPlatform.Shell/Platforms/iOS/Info.plist"
ASSETS_PATH="src/HybridPlatform.Shell/Platforms/iOS/Assets.xcassets"
APPICON_PATH="$ASSETS_PATH/AppIcon.appiconset"

echo "======================================"
echo "iOS Asset Injection"
echo "======================================"
echo "Bundle ID: $BUNDLE_ID"
echo "Tenant Name: $TENANT_NAME"
echo "OTA Endpoint: $OTA_ENDPOINT"
echo "Primary Color: $PRIMARY_COLOR"
echo "Logo Path: $LOGO_PATH"
echo "======================================"

# Create directories if they don't exist
mkdir -p "$(dirname "$PLIST_PATH")"
mkdir -p "$APPICON_PATH"

# Create or update Info.plist
cat > "$PLIST_PATH" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <!-- Bundle Configuration -->
    <key>CFBundleIdentifier</key>
    <string>$BUNDLE_ID</string>
    
    <key>CFBundleName</key>
    <string>$TENANT_NAME</string>
    
    <key>CFBundleDisplayName</key>
    <string>$TENANT_NAME</string>
    
    <key>CFBundleVersion</key>
    <string>1.0</string>
    
    <key>CFBundleShortVersionString</key>
    <string>1.0</string>
    
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    
    <key>CFBundleSignature</key>
    <string>????</string>
    
    <key>CFBundleExecutable</key>
    <string>HybridPlatform.Shell</string>
    
    <!-- Device Capabilities -->
    <key>LSRequiresIPhoneOS</key>
    <true/>
    
    <key>UIRequiredDeviceCapabilities</key>
    <array>
        <string>arm64</string>
    </array>
    
    <!-- Supported Platforms -->
    <key>UIDeviceFamily</key>
    <array>
        <integer>1</integer> <!-- iPhone -->
        <integer>2</integer> <!-- iPad -->
    </array>
    
    <!-- Supported Interface Orientations (iPhone) -->
    <key>UISupportedInterfaceOrientations</key>
    <array>
        <string>UIInterfaceOrientationPortrait</string>
        <string>UIInterfaceOrientationLandscapeLeft</string>
        <string>UIInterfaceOrientationLandscapeRight</string>
    </array>
    
    <!-- Supported Interface Orientations (iPad) -->
    <key>UISupportedInterfaceOrientations~ipad</key>
    <array>
        <string>UIInterfaceOrientationPortrait</string>
        <string>UIInterfaceOrientationPortraitUpsideDown</string>
        <string>UIInterfaceOrientationLandscapeLeft</string>
        <string>UIInterfaceOrientationLandscapeRight</string>
    </array>
    
    <!-- UI Configuration -->
    <key>UILaunchStoryboardName</key>
    <string>LaunchScreen</string>
    
    <key>UIMainStoryboardFile</key>
    <string>Main</string>
    
    <key>UIUserInterfaceStyle</key>
    <string>Light</string>
    
    <!-- Tenant Branding -->
    <key>UIUserInterfaceAccentColor</key>
    <string>$PRIMARY_COLOR</string>
    
    <!-- App Transport Security -->
    <key>NSAppTransportSecurity</key>
    <dict>
        <key>NSAllowsArbitraryLoads</key>
        <false/>
        <key>NSExceptionDomains</key>
        <dict>
            <key>$(echo "$OTA_ENDPOINT" | sed -E 's|https?://([^/]+).*|\1|')</key>
            <dict>
                <key>NSIncludesSubdomains</key>
                <true/>
                <key>NSTemporaryExceptionAllowsInsecureHTTPLoads</key>
                <false/>
                <key>NSTemporaryExceptionMinimumTLSVersion</key>
                <string>TLSv1.3</string>
            </dict>
        </dict>
    </dict>
    
    <!-- Privacy Permissions -->
    <key>NSFaceIDUsageDescription</key>
    <string>$TENANT_NAME uses Face ID to securely access your encrypted data.</string>
    
    <key>NSCameraUsageDescription</key>
    <string>$TENANT_NAME needs camera access for document scanning.</string>
    
    <key>NSPhotoLibraryUsageDescription</key>
    <string>$TENANT_NAME needs photo library access to attach images.</string>
    
    <key>NSLocalNetworkUsageDescription</key>
    <string>$TENANT_NAME uses local network for peer-to-peer synchronization.</string>
    
    <key>NSBonjourServices</key>
    <array>
        <string>_hybridplatform._tcp</string>
        <string>_hybridplatform._udp</string>
    </array>
    
    <!-- Custom URL Scheme -->
    <key>CFBundleURLTypes</key>
    <array>
        <dict>
            <key>CFBundleURLName</key>
            <string>$BUNDLE_ID</string>
            <key>CFBundleURLSchemes</key>
            <array>
                <string>$(echo "$BUNDLE_ID" | sed 's/\./-/g')</string>
            </array>
        </dict>
    </array>
    
    <!-- Custom Configuration -->
    <key>HybridPlatformOTAEndpoint</key>
    <string>$OTA_ENDPOINT</string>
    
    <key>HybridPlatformTenantID</key>
    <string>$BUNDLE_ID</string>
    
    <!-- Background Modes -->
    <key>UIBackgroundModes</key>
    <array>
        <string>fetch</string>
        <string>remote-notification</string>
    </array>
    
    <!-- Status Bar -->
    <key>UIStatusBarStyle</key>
    <string>UIStatusBarStyleDefault</string>
    
    <key>UIViewControllerBasedStatusBarAppearance</key>
    <false/>
    
</dict>
</plist>
EOF

echo "✓ Info.plist created"

# Validate plist syntax (macOS only)
if command -v plutil &> /dev/null; then
    plutil -lint "$PLIST_PATH"
    echo "✓ Info.plist validated successfully"
fi

# Copy and process tenant logo for iOS app icon
if [ -f "$LOGO_PATH" ]; then
    echo "Processing app icons..."
    
    # Create Contents.json for AppIcon
    cat > "$APPICON_PATH/Contents.json" << EOF
{
  "images" : [
    {
      "filename" : "icon-20@2x.png",
      "idiom" : "iphone",
      "scale" : "2x",
      "size" : "20x20"
    },
    {
      "filename" : "icon-20@3x.png",
      "idiom" : "iphone",
      "scale" : "3x",
      "size" : "20x20"
    },
    {
      "filename" : "icon-29@2x.png",
      "idiom" : "iphone",
      "scale" : "2x",
      "size" : "29x29"
    },
    {
      "filename" : "icon-29@3x.png",
      "idiom" : "iphone",
      "scale" : "3x",
      "size" : "29x29"
    },
    {
      "filename" : "icon-40@2x.png",
      "idiom" : "iphone",
      "scale" : "2x",
      "size" : "40x40"
    },
    {
      "filename" : "icon-40@3x.png",
      "idiom" : "iphone",
      "scale" : "3x",
      "size" : "40x40"
    },
    {
      "filename" : "icon-60@2x.png",
      "idiom" : "iphone",
      "scale" : "2x",
      "size" : "60x60"
    },
    {
      "filename" : "icon-60@3x.png",
      "idiom" : "iphone",
      "scale" : "3x",
      "size" : "60x60"
    },
    {
      "filename" : "icon-20.png",
      "idiom" : "ipad",
      "scale" : "1x",
      "size" : "20x20"
    },
    {
      "filename" : "icon-20@2x-ipad.png",
      "idiom" : "ipad",
      "scale" : "2x",
      "size" : "20x20"
    },
    {
      "filename" : "icon-29.png",
      "idiom" : "ipad",
      "scale" : "1x",
      "size" : "29x29"
    },
    {
      "filename" : "icon-29@2x-ipad.png",
      "idiom" : "ipad",
      "scale" : "2x",
      "size" : "29x29"
    },
    {
      "filename" : "icon-40.png",
      "idiom" : "ipad",
      "scale" : "1x",
      "size" : "40x40"
    },
    {
      "filename" : "icon-40@2x-ipad.png",
      "idiom" : "ipad",
      "scale" : "2x",
      "size" : "40x40"
    },
    {
      "filename" : "icon-76.png",
      "idiom" : "ipad",
      "scale" : "1x",
      "size" : "76x76"
    },
    {
      "filename" : "icon-76@2x.png",
      "idiom" : "ipad",
      "scale" : "2x",
      "size" : "76x76"
    },
    {
      "filename" : "icon-83.5@2x.png",
      "idiom" : "ipad",
      "scale" : "2x",
      "size" : "83.5x83.5"
    },
    {
      "filename" : "icon-1024.png",
      "idiom" : "ios-marketing",
      "scale" : "1x",
      "size" : "1024x1024"
    }
  ],
  "info" : {
    "author" : "xcode",
    "version" : 1
  }
}
EOF
    
    # Generate app icons using sips (macOS) or ImageMagick
    if command -v sips &> /dev/null; then
        echo "Using sips to generate app icons..."
        sips -z 40 40 "$LOGO_PATH" --out "$APPICON_PATH/icon-20@2x.png" > /dev/null 2>&1
        sips -z 60 60 "$LOGO_PATH" --out "$APPICON_PATH/icon-20@3x.png" > /dev/null 2>&1
        sips -z 58 58 "$LOGO_PATH" --out "$APPICON_PATH/icon-29@2x.png" > /dev/null 2>&1
        sips -z 87 87 "$LOGO_PATH" --out "$APPICON_PATH/icon-29@3x.png" > /dev/null 2>&1
        sips -z 80 80 "$LOGO_PATH" --out "$APPICON_PATH/icon-40@2x.png" > /dev/null 2>&1
        sips -z 120 120 "$LOGO_PATH" --out "$APPICON_PATH/icon-40@3x.png" > /dev/null 2>&1
        sips -z 120 120 "$LOGO_PATH" --out "$APPICON_PATH/icon-60@2x.png" > /dev/null 2>&1
        sips -z 180 180 "$LOGO_PATH" --out "$APPICON_PATH/icon-60@3x.png" > /dev/null 2>&1
        sips -z 20 20 "$LOGO_PATH" --out "$APPICON_PATH/icon-20.png" > /dev/null 2>&1
        sips -z 40 40 "$LOGO_PATH" --out "$APPICON_PATH/icon-20@2x-ipad.png" > /dev/null 2>&1
        sips -z 29 29 "$LOGO_PATH" --out "$APPICON_PATH/icon-29.png" > /dev/null 2>&1
        sips -z 58 58 "$LOGO_PATH" --out "$APPICON_PATH/icon-29@2x-ipad.png" > /dev/null 2>&1
        sips -z 40 40 "$LOGO_PATH" --out "$APPICON_PATH/icon-40.png" > /dev/null 2>&1
        sips -z 80 80 "$LOGO_PATH" --out "$APPICON_PATH/icon-40@2x-ipad.png" > /dev/null 2>&1
        sips -z 76 76 "$LOGO_PATH" --out "$APPICON_PATH/icon-76.png" > /dev/null 2>&1
        sips -z 152 152 "$LOGO_PATH" --out "$APPICON_PATH/icon-76@2x.png" > /dev/null 2>&1
        sips -z 167 167 "$LOGO_PATH" --out "$APPICON_PATH/icon-83.5@2x.png" > /dev/null 2>&1
        sips -z 1024 1024 "$LOGO_PATH" --out "$APPICON_PATH/icon-1024.png" > /dev/null 2>&1
        echo "✓ Generated all app icon sizes with sips"
    elif command -v convert &> /dev/null; then
        echo "Using ImageMagick to generate app icons..."
        convert "$LOGO_PATH" -resize 40x40 "$APPICON_PATH/icon-20@2x.png"
        convert "$LOGO_PATH" -resize 60x60 "$APPICON_PATH/icon-20@3x.png"
        convert "$LOGO_PATH" -resize 58x58 "$APPICON_PATH/icon-29@2x.png"
        convert "$LOGO_PATH" -resize 87x87 "$APPICON_PATH/icon-29@3x.png"
        convert "$LOGO_PATH" -resize 80x80 "$APPICON_PATH/icon-40@2x.png"
        convert "$LOGO_PATH" -resize 120x120 "$APPICON_PATH/icon-40@3x.png"
        convert "$LOGO_PATH" -resize 120x120 "$APPICON_PATH/icon-60@2x.png"
        convert "$LOGO_PATH" -resize 180x180 "$APPICON_PATH/icon-60@3x.png"
        convert "$LOGO_PATH" -resize 20x20 "$APPICON_PATH/icon-20.png"
        convert "$LOGO_PATH" -resize 40x40 "$APPICON_PATH/icon-20@2x-ipad.png"
        convert "$LOGO_PATH" -resize 29x29 "$APPICON_PATH/icon-29.png"
        convert "$LOGO_PATH" -resize 58x58 "$APPICON_PATH/icon-29@2x-ipad.png"
        convert "$LOGO_PATH" -resize 40x40 "$APPICON_PATH/icon-40.png"
        convert "$LOGO_PATH" -resize 80x80 "$APPICON_PATH/icon-40@2x-ipad.png"
        convert "$LOGO_PATH" -resize 76x76 "$APPICON_PATH/icon-76.png"
        convert "$LOGO_PATH" -resize 152x152 "$APPICON_PATH/icon-76@2x.png"
        convert "$LOGO_PATH" -resize 167x167 "$APPICON_PATH/icon-83.5@2x.png"
        convert "$LOGO_PATH" -resize 1024x1024 "$APPICON_PATH/icon-1024.png"
        echo "✓ Generated all app icon sizes with ImageMagick"
    else
        # Fallback: Just copy the original logo
        cp "$LOGO_PATH" "$APPICON_PATH/icon-1024.png"
        echo "⚠ Warning: Neither sips nor ImageMagick found. Only copied original logo."
    fi
else
    echo "⚠ Warning: Logo file not found at $LOGO_PATH"
fi

# Create LaunchScreen.storyboard
LAUNCHSCREEN_PATH="src/HybridPlatform.Shell/Platforms/iOS/LaunchScreen.storyboard"
cat > "$LAUNCHSCREEN_PATH" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<document type="com.apple.InterfaceBuilder3.CocoaTouch.Storyboard.XIB" version="3.0" toolsVersion="21701" targetRuntime="iOS.CocoaTouch" propertyAccessControl="none" useAutolayout="YES" launchScreen="YES" useTraitCollections="YES" useSafeAreas="YES" colorMatched="YES" initialViewController="01J-lp-oVM">
    <device id="retina6_12" orientation="portrait" appearance="light"/>
    <dependencies>
        <deployment identifier="iOS"/>
        <plugIn identifier="com.apple.InterfaceBuilder.IBCocoaTouchPlugin" version="21678"/>
        <capability name="Safe area layout guides" minToolsVersion="9.0"/>
        <capability name="documents saved in the Xcode 8 format" minToolsVersion="8.0"/>
    </dependencies>
    <scenes>
        <scene sceneID="EHf-IW-A2E">
            <objects>
                <viewController id="01J-lp-oVM" sceneMemberID="viewController">
                    <view key="view" contentMode="scaleToFill" id="Ze5-6b-2t3">
                        <rect key="frame" x="0.0" y="0.0" width="393" height="852"/>
                        <autoresizingMask key="autoresizingMask" widthSizable="YES" heightSizable="YES"/>
                        <subviews>
                            <imageView clipsSubviews="YES" userInteractionEnabled="NO" contentMode="scaleAspectFit" horizontalHuggingPriority="251" verticalHuggingPriority="251" image="icon-1024" translatesAutoresizingMaskIntoConstraints="NO" id="tWc-Dq-wcI">
                                <rect key="frame" x="96.666666666666686" y="326" width="200" height="200"/>
                                <constraints>
                                    <constraint firstAttribute="width" constant="200" id="Gfx-LZ-h1y"/>
                                    <constraint firstAttribute="height" constant="200" id="Mzt-8Y-bBD"/>
                                </constraints>
                            </imageView>
                            <label opaque="NO" userInteractionEnabled="NO" contentMode="left" horizontalHuggingPriority="251" verticalHuggingPriority="251" text="$TENANT_NAME" textAlignment="center" lineBreakMode="tailTruncation" baselineAdjustment="alignBaselines" adjustsFontSizeToFit="NO" translatesAutoresizingMaskIntoConstraints="NO" id="GJd-Yh-RWb">
                                <rect key="frame" x="20" y="546" width="353" height="28.666666666666686"/>
                                <fontDescription key="fontDescription" type="boldSystem" pointSize="24"/>
                                <color key="textColor" red="0.0" green="0.0" blue="0.0" alpha="1" colorSpace="custom" customColorSpace="sRGB"/>
                                <nil key="highlightedColor"/>
                            </label>
                        </subviews>
                        <viewLayoutGuide key="safeArea" id="Bcu-3y-fUS"/>
                        <color key="backgroundColor" red="1" green="1" blue="1" alpha="1" colorSpace="custom" customColorSpace="sRGB"/>
                        <constraints>
                            <constraint firstItem="tWc-Dq-wcI" firstAttribute="centerX" secondItem="Ze5-6b-2t3" secondAttribute="centerX" id="8Pb-cD-eBT"/>
                            <constraint firstItem="GJd-Yh-RWb" firstAttribute="top" secondItem="tWc-Dq-wcI" secondAttribute="bottom" constant="20" id="MfL-LD-aTy"/>
                            <constraint firstItem="Bcu-3y-fUS" firstAttribute="trailing" secondItem="GJd-Yh-RWb" secondAttribute="trailing" constant="20" id="OhZ-hN-F1C"/>
                            <constraint firstItem="tWc-Dq-wcI" firstAttribute="centerY" secondItem="Ze5-6b-2t3" secondAttribute="centerY" id="Shq-dd-wGC"/>
                            <constraint firstItem="GJd-Yh-RWb" firstAttribute="leading" secondItem="Bcu-3y-fUS" secondAttribute="leading" constant="20" id="wCy-5R-pNI"/>
                        </constraints>
                    </view>
                </viewController>
                <placeholder placeholderIdentifier="IBFirstResponder" id="iYj-Kq-Ea1" userLabel="First Responder" sceneMemberID="firstResponder"/>
            </objects>
            <point key="canvasLocation" x="53" y="375"/>
        </scene>
    </scenes>
    <resources>
        <image name="icon-1024" width="1024" height="1024"/>
    </resources>
</document>
EOF

echo "✓ LaunchScreen.storyboard created"

echo "======================================"
echo "✓ iOS asset injection complete!"
echo "======================================"
