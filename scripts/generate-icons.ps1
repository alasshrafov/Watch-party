Add-Type -AssemblyName System.Drawing

function Draw-OneCouchIcon([int]$size, [string]$outputPath) {
    $bmp = New-Object System.Drawing.Bitmap($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

    # Background: Solid Deep Obsidian Black
    $bgBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 9, 10, 15))
    $g.FillRectangle($bgBrush, 0, 0, $size, $size)

    $s = [float]($size / 512.0)

    # Squircle border (Luxury Rounded Rect)
    $rectSize = [float](472.0 * $s)
    $rectPos = [float](20.0 * $s)
    $radius = [float](110.0 * $s)
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $path.AddArc($rectPos, $rectPos, [float]($radius * 2), [float]($radius * 2), [float]180, [float]90)
    $path.AddArc([float]($rectPos + $rectSize - $radius * 2), $rectPos, [float]($radius * 2), [float]($radius * 2), [float]270, [float]90)
    $path.AddArc([float]($rectPos + $rectSize - $radius * 2), [float]($rectPos + $rectSize - $radius * 2), [float]($radius * 2), [float]($radius * 2), [float]0, [float]90)
    $path.AddArc($rectPos, [float]($rectPos + $rectSize - $radius * 2), [float]($radius * 2), [float]($radius * 2), [float]90, [float]90)
    $path.CloseFigure()

    $cardBg = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 14, 16, 24))
    $g.FillPath($cardBg, $path)

    # Gold rim border
    $goldPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 212, 175, 55), [float][Math]::Max(4.0 * $s, 2.0))
    $g.DrawPath($goldPen, $path)

    # Screen 1 (Cyan/Blue Left Screen)
    $s1Pen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 56, 189, 248), [float][Math]::Max(8.0 * $s, 3.0))
    $s1Brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 15, 23, 42))
    $g.FillRectangle($s1Brush, [float](90.0 * $s), [float](96.0 * $s), [float](200.0 * $s), [float](134.0 * $s))
    $g.DrawRectangle($s1Pen, [float](90.0 * $s), [float](96.0 * $s), [float](200.0 * $s), [float](134.0 * $s))

    # Screen 1 Play Triangle
    $s1TriBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 56, 189, 248))
    $pt1_1 = New-Object System.Drawing.PointF([float](170.0 * $s), [float](143.0 * $s))
    $pt1_2 = New-Object System.Drawing.PointF([float](170.0 * $s), [float](183.0 * $s))
    $pt1_3 = New-Object System.Drawing.PointF([float](205.0 * $s), [float](163.0 * $s))
    [System.Drawing.PointF[]]$s1Points = @($pt1_1, $pt1_2, $pt1_3)
    $g.FillPolygon($s1TriBrush, $s1Points)

    # Screen 2 (Crimson/Red Right Screen)
    $s2Pen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 229, 9, 20), [float][Math]::Max(8.0 * $s, 3.0))
    $s2Brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 26, 12, 18))
    $g.FillRectangle($s2Brush, [float](216.0 * $s), [float](134.0 * $s), [float](206.0 * $s), [float](138.0 * $s))
    $g.DrawRectangle($s2Pen, [float](216.0 * $s), [float](134.0 * $s), [float](206.0 * $s), [float](138.0 * $s))

    # Screen 2 Play Triangle
    $s2TriBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 229, 9, 20))
    $pt2_1 = New-Object System.Drawing.PointF([float](300.0 * $s), [float](183.0 * $s))
    $pt2_2 = New-Object System.Drawing.PointF([float](300.0 * $s), [float](223.0 * $s))
    $pt2_3 = New-Object System.Drawing.PointF([float](335.0 * $s), [float](203.0 * $s))
    [System.Drawing.PointF[]]$s2Points = @($pt2_1, $pt2_2, $pt2_3)
    $g.FillPolygon($s2TriBrush, $s2Points)

    # Couch Backrest (Crimson Red Cushion)
    $couchBackBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 220, 20, 40))
    $g.FillRectangle($couchBackBrush, [float](120.0 * $s), [float](260.0 * $s), [float](272.0 * $s), [float](65.0 * $s))

    # Couch Main Seat & Armrests
    $couchBodyBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 24, 27, 40))
    $couchBodyPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 212, 175, 55), [float][Math]::Max(7.0 * $s, 2.5))
    $g.FillRectangle($couchBodyBrush, [float](84.0 * $s), [float](308.0 * $s), [float](344.0 * $s), [float](78.0 * $s))
    $g.DrawRectangle($couchBodyPen, [float](84.0 * $s), [float](308.0 * $s), [float](344.0 * $s), [float](78.0 * $s))

    # Couch Divider
    $divPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 10, 12, 18), [float][Math]::Max(5.0 * $s, 2.0))
    $g.DrawLine($divPen, [float](256.0 * $s), [float](260.0 * $s), [float](256.0 * $s), [float](386.0 * $s))

    # Brand Title: ONECOUCH
    $fontFamily = [System.Drawing.FontFamily]::GenericSansSerif
    try {
        $fontFamily = New-Object System.Drawing.FontFamily("Arial")
    } catch {}
    $font = New-Object System.Drawing.Font($fontFamily, [float](26.0 * $s), [System.Drawing.FontStyle]::Bold)
    $textBrushWhite = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
    $format = New-Object System.Drawing.StringFormat
    $format.Alignment = [System.Drawing.StringAlignment]::Center
    $format.LineAlignment = [System.Drawing.StringAlignment]::Center

    $g.DrawString("ONECOUCH", $font, $textBrushWhite, [float](256.0 * $s), [float](426.0 * $s), $format)

    # Gold subtitle line: TWO SCREENS. ONE COUCH.
    $subFont = New-Object System.Drawing.Font($fontFamily, [float](11.5 * $s), [System.Drawing.FontStyle]::Bold)
    $subBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 212, 175, 55))
    $g.DrawString("TWO SCREENS. ONE COUCH.", $subFont, $subBrush, [float](256.0 * $s), [float](458.0 * $s), $format)

    $g.Dispose()
    $bmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Write-Output "Successfully generated $outputPath"
}

Draw-OneCouchIcon 512 "c:\Users\veli\Desktop\Watch-party\assets\icon-512.png"
Draw-OneCouchIcon 192 "c:\Users\veli\Desktop\Watch-party\assets\icon-192.png"
Draw-OneCouchIcon 512 "c:\Users\veli\Desktop\Watch-party\assets\icon-512-hd.png"
Draw-OneCouchIcon 192 "c:\Users\veli\Desktop\Watch-party\assets\icon-192-hd.png"
Draw-OneCouchIcon 512 "c:\Users\veli\Desktop\Watch-party\assets\logo.png"
