param(
    [Parameter(Mandatory=$true)]
    [string]$BundleId,
    
    [Parameter(Mandatory=$true)]
    [string]$TenantName,
    
    [Parameter(Mandatory=$true)]
    [string]$OtaEndpoint,
    
    [Parameter(Mandatory=$true)]
    [string]$PrimaryColor,
    
    [Parameter(Mandatory=$true)]
    [string]$LogoPath
)

# Windows Package.appxmanifest & Asset Injection Script
# Usage: .\inject-windows-appx.ps1 -BundleId <id> -TenantName <name> -OtaEndpoint <url> -PrimaryColor <color> -LogoPath <path>

$ErrorActionPreference = "Stop"

$ManifestPath = "src\HybridPlatform.Shell\Platforms\Windows\Package.appxmanifest"
$AssetsPath = "src\HybridPlatform.Shell\Platforms\Windows\Assets"

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Windows Asset Injection" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Bundle ID: $BundleId"
Write-Host "Tenant Name: $TenantName"
Write-Host "OTA Endpoint: $OtaEndpoint"
Write-Host "Primary Color: $PrimaryColor"
Write-Host "Logo Path: $LogoPath"
Write-Host "======================================" -ForegroundColor Cyan

# Create directories if they don't exist
New-Item -ItemType Directory -Force -Path (Split-Path $ManifestPath) | Out-Null
New-Item -ItemType Directory -Force -Path $AssetsPath | Out-Null

# Parse bundle ID for publisher (simple hash-based approach)
$Publisher = "CN=HybridPlatform"

# Create Package.appxmanifest
$ManifestContent = @"
<?xml version="1.0" encoding="utf-8"?>
<Package xmlns="http://schemas.microsoft.com/appx/manifest/foundation/windows10"
         xmlns:mp="http://schemas.microsoft.com/appx/2014/phone/manifest"
         xmlns:uap="http://schemas.microsoft.com/appx/manifest/uap/windows10"
         xmlns:rescap="http://schemas.microsoft.com/appx/manifest/foundation/windows10/restrictedcapabilities"
         IgnorableNamespaces="uap mp rescap">
  
  <Identity Name="$BundleId"
            Publisher="$Publisher"
            Version="1.0.0.0" />
  
  <mp:PhoneIdentity PhoneProductId="$([guid]::NewGuid())" PhonePublisherId="00000000-0000-0000-0000-000000000000"/>
  
  <Properties>
    <DisplayName>$TenantName</DisplayName>
    <PublisherDisplayName>HybridPlatform</PublisherDisplayName>
    <Logo>Assets\StoreLogo.png</Logo>
  </Properties>
  
  <Dependencies>
    <TargetDeviceFamily Name="Windows.Universal" MinVersion="10.0.19041.0" MaxVersionTested="10.0.22621.0" />
  </Dependencies>
  
  <Resources>
    <Resource Language="x-generate"/>
  </Resources>
  
  <Applications>
    <Application Id="App"
                 Executable="`$targetnametoken`$.exe"
                 EntryPoint="`$targetentrypoint`$">
      <uap:VisualElements
        DisplayName="$TenantName"
        Square150x150Logo="Assets\Square150x150Logo.png"
        Square44x44Logo="Assets\Square44x44Logo.png"
        Description="$TenantName - Enterprise Hybrid Platform"
        BackgroundColor="$PrimaryColor">
        <uap:DefaultTile Wide310x150Logo="Assets\Wide310x150Logo.png" 
                         Square71x71Logo="Assets\SmallTile.png"
                         Square310x310Logo="Assets\LargeTile.png">
          <uap:ShowNameOnTiles>
            <uap:ShowOn Tile="square150x150Logo"/>
            <uap:ShowOn Tile="wide310x150Logo"/>
            <uap:ShowOn Tile="square310x310Logo"/>
          </uap:ShowNameOnTiles>
        </uap:DefaultTile>
        <uap:SplashScreen Image="Assets\SplashScreen.png" BackgroundColor="$PrimaryColor"/>
      </uap:VisualElements>
      
      <Extensions>
        <!-- Protocol Handler -->
        <uap:Extension Category="windows.protocol">
          <uap:Protocol Name="$($BundleId.Replace('.', '-'))">
            <uap:DisplayName>$TenantName</uap:DisplayName>
          </uap:Protocol>
        </uap:Extension>
        
        <!-- Background Tasks -->
        <Extension Category="windows.backgroundTasks" EntryPoint="HybridPlatform.Shell.BackgroundTask">
          <BackgroundTasks>
            <Task Type="timer"/>
            <Task Type="systemEvent"/>
          </BackgroundTasks>
        </Extension>
      </Extensions>
    </Application>
  </Applications>
  
  <Capabilities>
    <Capability Name="internetClient" />
    <Capability Name="internetClientServer" />
    <Capability Name="privateNetworkClientServer" />
    <uap:Capability Name="removableStorage" />
    <rescap:Capability Name="broadFileSystemAccess" />
  </Capabilities>
  
  <!-- Custom Properties -->
  <Extensions>
    <Extension Category="windows.activatableClass.inProcessServer">
      <InProcessServer>
        <Path>HybridPlatform.Shell.dll</Path>
        <ActivatableClass ActivatableClassId="HybridPlatform.Shell.OtaConfiguration" ThreadingModel="both">
          <ActivatableClassAttribute Name="OtaEndpoint" Value="$OtaEndpoint"/>
          <ActivatableClassAttribute Name="TenantId" Value="$BundleId"/>
        </ActivatableClass>
      </InProcessServer>
    </Extension>
  </Extensions>
  
</Package>
"@

Set-Content -Path $ManifestPath -Value $ManifestContent -Encoding UTF8
Write-Host "✓ Package.appxmanifest created" -ForegroundColor Green

# Validate XML
try {
    [xml]$xml = Get-Content $ManifestPath
    Write-Host "✓ Package.appxmanifest validated successfully" -ForegroundColor Green
} catch {
    Write-Host "⚠ Warning: Package.appxmanifest XML validation failed: $_" -ForegroundColor Yellow
}

# Copy and resize tenant logo for Windows assets
if (Test-Path $LogoPath) {
    Write-Host "Processing Windows assets..." -ForegroundColor Cyan
    
    # Asset sizes for Windows
    $AssetSizes = @{
        "Square44x44Logo.png" = 44
        "Square44x44Logo.scale-200.png" = 88
        "Square71x71Logo.png" = 71
        "Square71x71Logo.scale-200.png" = 142
        "Square150x150Logo.png" = 150
        "Square150x150Logo.scale-200.png" = 300
        "Square310x310Logo.png" = 310
        "Square310x310Logo.scale-200.png" = 620
        "Wide310x150Logo.png" = @{Width=310; Height=150}
        "Wide310x150Logo.scale-200.png" = @{Width=620; Height=300}
        "SplashScreen.png" = @{Width=620; Height=300}
        "SplashScreen.scale-200.png" = @{Width=1240; Height=600}
        "StoreLogo.png" = 50
        "StoreLogo.scale-200.png" = 100
    }
    
    # Check if Windows has built-in image resizing capabilities
    # For production use, consider using ImageMagick or a .NET library
    
    # Simple copy for now (ideally should resize)
    foreach ($asset in $AssetSizes.Keys) {
        $targetPath = Join-Path $AssetsPath $asset
        Copy-Item -Path $LogoPath -Destination $targetPath -Force
    }
    
    Write-Host "✓ Logo copied to Windows assets (manual resize recommended)" -ForegroundColor Green
    
    # If .NET System.Drawing is available, try to resize
    try {
        Add-Type -AssemblyName System.Drawing
        
        $sourceImage = [System.Drawing.Image]::FromFile((Resolve-Path $LogoPath))
        
        foreach ($assetName in $AssetSizes.Keys) {
            $size = $AssetSizes[$assetName]
            $targetPath = Join-Path $AssetsPath $assetName
            
            if ($size -is [hashtable]) {
                # Wide/Splash assets
                $width = $size.Width
                $height = $size.Height
            } else {
                # Square assets
                $width = $size
                $height = $size
            }
            
            $bitmap = New-Object System.Drawing.Bitmap($width, $height)
            $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
            $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
            $graphics.DrawImage($sourceImage, 0, 0, $width, $height)
            
            $bitmap.Save($targetPath, [System.Drawing.Imaging.ImageFormat]::Png)
            $bitmap.Dispose()
            $graphics.Dispose()
        }
        
        $sourceImage.Dispose()
        Write-Host "✓ Generated all Windows asset sizes" -ForegroundColor Green
    } catch {
        Write-Host "⚠ Warning: Could not resize images automatically: $_" -ForegroundColor Yellow
        Write-Host "  Assets copied but may need manual resizing" -ForegroundColor Yellow
    }
} else {
    Write-Host "⚠ Warning: Logo file not found at $LogoPath" -ForegroundColor Yellow
}

# Create app configuration file
$ConfigPath = "src\HybridPlatform.Shell\Platforms\Windows\app.config"
$ConfigContent = @"
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <appSettings>
    <add key="TenantId" value="$BundleId" />
    <add key="TenantName" value="$TenantName" />
    <add key="OtaEndpoint" value="$OtaEndpoint" />
    <add key="PrimaryColor" value="$PrimaryColor" />
  </appSettings>
  
  <runtime>
    <assemblyBinding xmlns="urn:schemas-microsoft-com:asm.v1">
      <probing privatePath="lib" />
    </assemblyBinding>
  </runtime>
  
  <system.net>
    <settings>
      <servicePointManager expect100Continue="false" />
    </settings>
  </system.net>
</configuration>
"@

Set-Content -Path $ConfigPath -Value $ConfigContent -Encoding UTF8
Write-Host "✓ app.config created" -ForegroundColor Green

# Create priconfig.xml for resource configuration
$PriConfigPath = "src\HybridPlatform.Shell\Platforms\Windows\priconfig.xml"
$PriConfigContent = @"
<?xml version="1.0" encoding="utf-8"?>
<resources targetOsVersion="10.0.0" majorVersion="1">
  <packaging>
    <autoResourcePackage qualifier="Language"/>
    <autoResourcePackage qualifier="Scale"/>
    <autoResourcePackage qualifier="DXFeatureLevel"/>
  </packaging>
  <index root="\" startIndexAt="\">
    <default>
      <qualifier name="Language" value="en-US"/>
      <qualifier name="Contrast" value="standard"/>
      <qualifier name="Scale" value="200"/>
      <qualifier name="HomeRegion" value="001"/>
      <qualifier name="TargetSize" value="256"/>
      <qualifier name="LayoutDirection" value="LTR"/>
      <qualifier name="DXFeatureLevel" value="DX9"/>
      <qualifier name="Configuration" value=""/>
      <qualifier name="AlternateForm" value=""/>
    </default>
    <indexer-config type="folder" foldernameAsQualifier="true" filenameAsQualifier="true" qualifierDelimiter="."/>
    <indexer-config type="resw" convertDotsToSlashes="true" initialPath=""/>
    <indexer-config type="resjson" initialPath=""/>
    <indexer-config type="PRI"/>
  </index>
</resources>
"@

Set-Content -Path $PriConfigPath -Value $PriConfigContent -Encoding UTF8
Write-Host "✓ priconfig.xml created" -ForegroundColor Green

# Create resource strings file
$ResourcesPath = "src\HybridPlatform.Shell\Platforms\Windows\Strings\en-US"
New-Item -ItemType Directory -Force -Path $ResourcesPath | Out-Null

$ResourceFilePath = Join-Path $ResourcesPath "Resources.resw"
$ResourceContent = @"
<?xml version="1.0" encoding="utf-8"?>
<root>
  <xsd:schema id="root" xmlns="" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:msdata="urn:schemas-microsoft-com:xml-msdata">
    <xsd:import namespace="http://www.w3.org/XML/1998/namespace" />
    <xsd:element name="root" msdata:IsDataSet="true">
      <xsd:complexType>
        <xsd:choice maxOccurs="unbounded">
          <xsd:element name="metadata">
            <xsd:complexType>
              <xsd:sequence>
                <xsd:element name="value" type="xsd:string" minOccurs="0" />
              </xsd:sequence>
              <xsd:attribute name="name" use="required" type="xsd:string" />
              <xsd:attribute name="type" type="xsd:string" />
              <xsd:attribute name="mimetype" type="xsd:string" />
              <xsd:attribute ref="xml:space" />
            </xsd:complexType>
          </xsd:element>
          <xsd:element name="assembly">
            <xsd:complexType>
              <xsd:attribute name="alias" type="xsd:string" />
              <xsd:attribute name="name" type="xsd:string" />
            </xsd:complexType>
          </xsd:element>
          <xsd:element name="data">
            <xsd:complexType>
              <xsd:sequence>
                <xsd:element name="value" type="xsd:string" minOccurs="0" msdata:Ordinal="1" />
                <xsd:element name="comment" type="xsd:string" minOccurs="0" msdata:Ordinal="2" />
              </xsd:sequence>
              <xsd:attribute name="name" type="xsd:string" use="required" msdata:Ordinal="1" />
              <xsd:attribute name="type" type="xsd:string" msdata:Ordinal="3" />
              <xsd:attribute name="mimetype" type="xsd:string" msdata:Ordinal="4" />
              <xsd:attribute ref="xml:space" />
            </xsd:complexType>
          </xsd:element>
          <xsd:element name="resheader">
            <xsd:complexType>
              <xsd:sequence>
                <xsd:element name="value" type="xsd:string" minOccurs="0" msdata:Ordinal="1" />
              </xsd:sequence>
              <xsd:attribute name="name" type="xsd:string" use="required" />
            </xsd:complexType>
          </xsd:element>
        </xsd:choice>
      </xsd:complexType>
    </xsd:element>
  </xsd:schema>
  <resheader name="resmimetype">
    <value>text/microsoft-resx</value>
  </resheader>
  <resheader name="version">
    <value>2.0</value>
  </resheader>
  <resheader name="reader">
    <value>System.Resources.ResXResourceReader, System.Windows.Forms, Version=4.0.0.0, Culture=neutral, PublicKeyToken=b77a5c561934e089</value>
  </resheader>
  <resheader name="writer">
    <value>System.Resources.ResXResourceWriter, System.Windows.Forms, Version=4.0.0.0, Culture=neutral, PublicKeyToken=b77a5c561934e089</value>
  </resheader>
  <data name="AppDisplayName" xml:space="preserve">
    <value>$TenantName</value>
  </data>
  <data name="AppDescription" xml:space="preserve">
    <value>$TenantName - Enterprise Hybrid Platform</value>
  </data>
  <data name="OtaEndpoint" xml:space="preserve">
    <value>$OtaEndpoint</value>
  </data>
</root>
"@

Set-Content -Path $ResourceFilePath -Value $ResourceContent -Encoding UTF8
Write-Host "✓ Resources.resw created" -ForegroundColor Green

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "✓ Windows asset injection complete!" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Cyan
