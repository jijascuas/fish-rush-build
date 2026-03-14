
Add-Type -AssemblyName System.Drawing

$sourceImage = [System.Drawing.Image]::FromFile((Resolve-Path "resources\icon.png"))

$sizes = @(
    @{ density = "mipmap-mdpi";    size = 48 },
    @{ density = "mipmap-hdpi";    size = 72 },
    @{ density = "mipmap-xhdpi";   size = 96 },
    @{ density = "mipmap-xxhdpi";  size = 144 },
    @{ density = "mipmap-xxxhdpi"; size = 192 }
)

$foregroundSizes = @(
    @{ density = "mipmap-mdpi";    size = 108 },
    @{ density = "mipmap-hdpi";    size = 162 },
    @{ density = "mipmap-xhdpi";   size = 216 },
    @{ density = "mipmap-xxhdpi";  size = 324 },
    @{ density = "mipmap-xxxhdpi"; size = 432 }
)

function ResizeImage($srcImg, $targetPath, $size) {
    $bmp = New-Object System.Drawing.Bitmap($size, $size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.DrawImage($srcImg, 0, 0, $size, $size)
    $g.Dispose()
    $dir = Split-Path $targetPath -Parent
    if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
    $bmp.Save($targetPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Write-Host "  Generated: $targetPath ($size x $size)"
}

$resBase = "android\app\src\main\res"

Write-Host "`n--- Generating ic_launcher.png (legacy icon) ---"
foreach ($s in $sizes) {
    ResizeImage $sourceImage "$resBase\$($s.density)\ic_launcher.png" $s.size
    ResizeImage $sourceImage "$resBase\$($s.density)\ic_launcher_round.png" $s.size
}

Write-Host "`n--- Generating ic_launcher_foreground.png (adaptive icon) ---"
foreach ($s in $foregroundSizes) {
    ResizeImage $sourceImage "$resBase\$($s.density)\ic_launcher_foreground.png" $s.size
}

Write-Host "`n--- Generating ic_launcher_background.png (solid color background) ---"
foreach ($s in $sizes) {
    # Create a solid ocean blue background for adaptive icon
    $bmp = New-Object System.Drawing.Bitmap($s.size, $s.size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.Clear([System.Drawing.Color]::FromArgb(255, 10, 61, 98))
    $g.Dispose()
    $path = "$resBase\$($s.density)\ic_launcher_background.png"
    $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Write-Host "  Generated: $path ($($s.size) x $($s.size))"
}

$sourceImage.Dispose()
Write-Host "`nDone! All icons generated."
