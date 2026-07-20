param(
  [string]$SourceBaseName = "Routy-aikon"
)

$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$pictureDir = Join-Path $root "picture"
$source = Get-ChildItem -LiteralPath $pictureDir -File |
  Where-Object { $_.BaseName -eq $SourceBaseName } |
  Select-Object -First 1

if (-not $source) {
  throw "Source image not found: picture/$SourceBaseName.*"
}

$iconsDir = Join-Path $root "public\icons"
New-Item -ItemType Directory -Force -Path $iconsDir | Out-Null

function New-Bitmap($size) {
  $bitmap = New-Object System.Drawing.Bitmap($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $bitmap.SetResolution(144, 144)
  return $bitmap
}

function Get-TrimBounds([System.Drawing.Bitmap]$bitmap) {
  $threshold = 244
  $minX = $bitmap.Width
  $minY = $bitmap.Height
  $maxX = 0
  $maxY = 0

  for ($y = 0; $y -lt $bitmap.Height; $y++) {
    for ($x = 0; $x -lt $bitmap.Width; $x++) {
      $pixel = $bitmap.GetPixel($x, $y)
      $isOuterWhite = $pixel.A -lt 8 -or ($pixel.R -ge $threshold -and $pixel.G -ge $threshold -and $pixel.B -ge $threshold)
      if (-not $isOuterWhite) {
        if ($x -lt $minX) { $minX = $x }
        if ($y -lt $minY) { $minY = $y }
        if ($x -gt $maxX) { $maxX = $x }
        if ($y -gt $maxY) { $maxY = $y }
      }
    }
  }

  if ($maxX -le $minX -or $maxY -le $minY) {
    return New-Object System.Drawing.Rectangle(0, 0, $bitmap.Width, $bitmap.Height)
  }

  [int]$pad = [Math]::Round([Math]::Max($bitmap.Width, $bitmap.Height) * 0.01)
  [int]$left = [Math]::Max(0, $minX - $pad)
  [int]$top = [Math]::Max(0, $minY - $pad)
  [int]$right = [Math]::Min($bitmap.Width - 1, $maxX + $pad)
  [int]$bottom = [Math]::Min($bitmap.Height - 1, $maxY + $pad)
  return [System.Drawing.Rectangle]::new($left, $top, $right - $left + 1, $bottom - $top + 1)
}

function Remove-EdgeWhite([System.Drawing.Bitmap]$bitmap) {
  $threshold = 244
  $output = New-Object System.Drawing.Bitmap($bitmap.Width, $bitmap.Height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $graphics = [System.Drawing.Graphics]::FromImage($output)
  $graphics.DrawImage($bitmap, 0, 0, $bitmap.Width, $bitmap.Height)
  $graphics.Dispose()

  $visited = New-Object 'bool[,]' $bitmap.Width, $bitmap.Height
  $queue = New-Object System.Collections.Generic.Queue[System.Drawing.Point]

  function Test-EdgeWhite([System.Drawing.Color]$pixel) {
    return $pixel.A -lt 8 -or ($pixel.R -ge $threshold -and $pixel.G -ge $threshold -and $pixel.B -ge $threshold)
  }

  for ($x = 0; $x -lt $bitmap.Width; $x++) {
    $queue.Enqueue([System.Drawing.Point]::new($x, 0))
    $queue.Enqueue([System.Drawing.Point]::new($x, $bitmap.Height - 1))
  }
  for ($y = 0; $y -lt $bitmap.Height; $y++) {
    $queue.Enqueue([System.Drawing.Point]::new(0, $y))
    $queue.Enqueue([System.Drawing.Point]::new($bitmap.Width - 1, $y))
  }

  while ($queue.Count -gt 0) {
    $point = $queue.Dequeue()
    if ($point.X -lt 0 -or $point.X -ge $bitmap.Width -or $point.Y -lt 0 -or $point.Y -ge $bitmap.Height) {
      continue
    }
    if ($visited[$point.X, $point.Y]) {
      continue
    }
    $visited[$point.X, $point.Y] = $true

    $pixel = $output.GetPixel($point.X, $point.Y)
    if (-not (Test-EdgeWhite $pixel)) {
      continue
    }

    $output.SetPixel($point.X, $point.Y, [System.Drawing.Color]::Transparent)
    $queue.Enqueue([System.Drawing.Point]::new($point.X + 1, $point.Y))
    $queue.Enqueue([System.Drawing.Point]::new($point.X - 1, $point.Y))
    $queue.Enqueue([System.Drawing.Point]::new($point.X, $point.Y + 1))
    $queue.Enqueue([System.Drawing.Point]::new($point.X, $point.Y - 1))
  }

  return $output
}

function Save-Icon([System.Drawing.Bitmap]$sourceBitmap, [System.Drawing.Rectangle]$trimBounds, [string]$path, [int]$size, [double]$contentScale) {
  $canvas = New-Bitmap $size
  $graphics = [System.Drawing.Graphics]::FromImage($canvas)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

  $rect = New-Object System.Drawing.Rectangle(0, 0, $size, $size)
  $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    $rect,
    [System.Drawing.Color]::FromArgb(255, 178, 224, 18),
    [System.Drawing.Color]::FromArgb(255, 0, 151, 92),
    [System.Drawing.Drawing2D.LinearGradientMode]::ForwardDiagonal
  )
  $graphics.FillRectangle($brush, $rect)

  $targetSize = [Math]::Round($size * $contentScale)
  $x = [Math]::Round(($size - $targetSize) / 2)
  $y = [Math]::Round(($size - $targetSize) / 2)
  $targetRect = New-Object System.Drawing.Rectangle($x, $y, $targetSize, $targetSize)
  $graphics.DrawImage($sourceBitmap, $targetRect, $trimBounds, [System.Drawing.GraphicsUnit]::Pixel)

  $canvas.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)

  $brush.Dispose()
  $graphics.Dispose()
  $canvas.Dispose()
}

$sourceImage = [System.Drawing.Image]::FromFile($source.FullName)
$sourceBitmap = New-Object System.Drawing.Bitmap($sourceImage)
$processedBitmap = Remove-EdgeWhite $sourceBitmap
$trimBounds = Get-TrimBounds $processedBitmap

Save-Icon $processedBitmap $trimBounds (Join-Path $iconsDir "icon-192x192.png") 192 0.96
Save-Icon $processedBitmap $trimBounds (Join-Path $iconsDir "icon-512x512.png") 512 0.96
Save-Icon $processedBitmap $trimBounds (Join-Path $root "public\apple-touch-icon.png") 180 0.94
Save-Icon $processedBitmap $trimBounds (Join-Path $iconsDir "icon-maskable-192x192.png") 192 0.78
Save-Icon $processedBitmap $trimBounds (Join-Path $iconsDir "icon-maskable-512x512.png") 512 0.78
Save-Icon $processedBitmap $trimBounds (Join-Path $root "public\favicon-32x32.png") 32 0.96

$processedBitmap.Dispose()
$sourceBitmap.Dispose()
$sourceImage.Dispose()

Write-Output "Generated PWA icons from $($source.FullName)"
Write-Output "Trim bounds: x=$($trimBounds.X), y=$($trimBounds.Y), width=$($trimBounds.Width), height=$($trimBounds.Height)"
