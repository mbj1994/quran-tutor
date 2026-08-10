Add-Type -AssemblyName System.Drawing
$ErrorActionPreference = 'Stop'

function New-QuranTutorIcon {
  param(
    [Parameter(Mandatory = $true)]
    [int]$Size,
    [Parameter(Mandatory = $true)]
    [string]$OutputPath
  )

  $bitmap = [System.Drawing.Bitmap]::new($Size, $Size)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

  $background = [System.Drawing.ColorTranslator]::FromHtml('#065f46')
  $pageColor = [System.Drawing.ColorTranslator]::FromHtml('#fff7db')
  $accent = [System.Drawing.ColorTranslator]::FromHtml('#fcd34d')
  $graphics.Clear($background)

  $scale = $Size / 512
  $backgroundBrush = [System.Drawing.SolidBrush]::new($background)
  $pageBrush = [System.Drawing.SolidBrush]::new($pageColor)
  $accentBrush = [System.Drawing.SolidBrush]::new($accent)
  $accentPen = [System.Drawing.Pen]::new($accent, 14 * $scale)
  $accentPen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
  $spinePen = [System.Drawing.Pen]::new($accent, 12 * $scale)
  $spinePen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $spinePen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round

  $graphics.FillEllipse($accentBrush, 163 * $scale, 81 * $scale, 116 * $scale, 116 * $scale)
  $graphics.FillEllipse($backgroundBrush, 197 * $scale, 63 * $scale, 112 * $scale, 112 * $scale)

  $leftPage = [System.Drawing.Drawing2D.GraphicsPath]::new()
  $leftPage.StartFigure()
  $leftPage.AddLine(256 * $scale, 361 * $scale, 256 * $scale, 221 * $scale)
  $leftPage.AddBezier(256 * $scale, 221 * $scale, 218 * $scale, 192 * $scale, 165 * $scale, 182 * $scale, 120 * $scale, 204 * $scale)
  $leftPage.AddLine(120 * $scale, 204 * $scale, 120 * $scale, 343 * $scale)
  $leftPage.AddBezier(120 * $scale, 343 * $scale, 168 * $scale, 325 * $scale, 219 * $scale, 333 * $scale, 256 * $scale, 361 * $scale)
  $leftPage.CloseFigure()

  $rightPage = [System.Drawing.Drawing2D.GraphicsPath]::new()
  $rightPage.StartFigure()
  $rightPage.AddLine(256 * $scale, 361 * $scale, 256 * $scale, 221 * $scale)
  $rightPage.AddBezier(256 * $scale, 221 * $scale, 294 * $scale, 192 * $scale, 347 * $scale, 182 * $scale, 392 * $scale, 204 * $scale)
  $rightPage.AddLine(392 * $scale, 204 * $scale, 392 * $scale, 343 * $scale)
  $rightPage.AddBezier(392 * $scale, 343 * $scale, 344 * $scale, 325 * $scale, 293 * $scale, 333 * $scale, 256 * $scale, 361 * $scale)
  $rightPage.CloseFigure()

  $graphics.FillPath($pageBrush, $leftPage)
  $graphics.DrawPath($accentPen, $leftPage)
  $graphics.FillPath($pageBrush, $rightPage)
  $graphics.DrawPath($accentPen, $rightPage)
  $graphics.DrawLine($spinePen, 256 * $scale, 221 * $scale, 256 * $scale, 361 * $scale)

  $outputDirectory = Split-Path -Parent $OutputPath
  [System.IO.Directory]::CreateDirectory($outputDirectory) | Out-Null
  $bitmap.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Png)

  $leftPage.Dispose()
  $rightPage.Dispose()
  $spinePen.Dispose()
  $accentPen.Dispose()
  $accentBrush.Dispose()
  $pageBrush.Dispose()
  $backgroundBrush.Dispose()
  $graphics.Dispose()
  $bitmap.Dispose()
}

$iconDirectory = Join-Path $PSScriptRoot '..\public\icons'
New-QuranTutorIcon -Size 180 -OutputPath (Join-Path $iconDirectory 'apple-touch-icon.png')
New-QuranTutorIcon -Size 192 -OutputPath (Join-Path $iconDirectory 'icon-192.png')
New-QuranTutorIcon -Size 512 -OutputPath (Join-Path $iconDirectory 'icon-512.png')
New-QuranTutorIcon -Size 512 -OutputPath (Join-Path $iconDirectory 'icon-maskable-512.png')
