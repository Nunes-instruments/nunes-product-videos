$targetLocal = "C:\Users\NUNES\Desktop\Phone_Product_Photos_Raw"
if (-not (Test-Path $targetLocal)) {
    New-Item -ItemType Directory -Path $targetLocal | Out-Null
}

$shell = New-Object -ComObject Shell.Application
$computer = $shell.Namespace(17)

$phone = $null
foreach ($item in $computer.Items()) {
    if ($item.Name -like "*OPPO*") { $phone = $item; break }
}

if (-not $phone) {
    Write-Output "Phone not found!"
    exit
}

$storage = $null
foreach ($sub in $phone.GetFolder.Items()) {
    if ($sub.Name -like "*Internal*") { $storage = $sub; break }
}

$dcim = $null
$pictures = $null
foreach ($sub in $storage.GetFolder.Items()) {
    if ($sub.Name -eq "DCIM") { $dcim = $sub }
    if ($sub.Name -eq "Pictures") { $pictures = $sub }
}

Write-Output "Accessing DCIM..."
$cameraFolder = $null
if ($dcim) {
    foreach ($item in $dcim.GetFolder.Items()) {
        if ($item.Name -eq "Camera") {
            $cameraFolder = $item.GetFolder
            break
        }
    }
}

$destFolder = $shell.Namespace($targetLocal)

$count = 0
if ($cameraFolder) {
    $items = $cameraFolder.Items()
    Write-Output ("Total items in Camera: " + $items.Count)
    
    # We want to check and copy images
    foreach ($f in $items) {
        $ext = [System.IO.Path]::GetExtension($f.Name).ToLower()
        if ($ext -in @(".jpg", ".jpeg", ".png", ".webp")) {
            $count++
            Write-Output ("Found: " + $f.Name)
            if ($count -le 30) {
                # Copy first 30 images for rapid inspection
                $destFolder.CopyHere($f, 16) # 16 = Respond with Yes to All
            }
        }
    }
}

Write-Output ("Total photos scanned in Camera: " + $count)
