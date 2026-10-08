$shell = New-Object -ComObject Shell.Application
$computer = $shell.Namespace(17)

$phone = $null
foreach ($item in $computer.Items()) {
    if ($item.Name -like "*OPPO*") { $phone = $item; break }
}

$storage = $null
foreach ($sub in $phone.GetFolder.Items()) {
    if ($sub.Name -like "*Internal*") { $storage = $sub; break }
}

$storageFolder = $storage.GetFolder

function Inspect-Folder($fItem, $depth = 0) {
    $indent = "  " * $depth
    Write-Output ($indent + "[DIR] " + $fItem.Name)
    if ($fItem.IsFolder) {
        $subFolder = $fItem.GetFolder
        $imgCount = 0
        foreach ($it in $subFolder.Items()) {
            if ($it.IsFolder) {
                if ($depth -lt 2) {
                    Inspect-Folder $it ($depth + 1)
                }
            } else {
                $ext = [System.IO.Path]::GetExtension($it.Name).ToLower()
                if ($ext -in @(".jpg", ".jpeg", ".png", ".webp")) {
                    $imgCount++
                }
            }
        }
        if ($imgCount -gt 0) {
            Write-Output ($indent + "  --> Images in " + $fItem.Name + ": " + $imgCount)
        }
    }
}

foreach ($target in @("DCIM", "Pictures", "Download")) {
    foreach ($item in $storageFolder.Items()) {
        if ($item.Name -eq $target) {
            Inspect-Folder $item 0
        }
    }
}
