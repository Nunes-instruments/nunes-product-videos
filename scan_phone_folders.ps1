$shell = New-Object -ComObject Shell.Application
$computer = $shell.Namespace(17)

$phone = $null
foreach ($item in $computer.Items()) {
    if ($item.Name -like "*OPPO*" -or $item.Name -like "*A17*" -or $item.Name -like "*Phone*") {
        $phone = $item
        break
    }
}

if (-not $phone) {
    Write-Output "Phone not found."
    exit
}

Write-Output ("Found phone: " + $phone.Name)
$phoneFolder = $phone.GetFolder
$storage = $null
foreach ($sub in $phoneFolder.Items()) {
    Write-Output ("Storage item: " + $sub.Name)
    if ($sub.Name -like "*Internal*" -or $sub.Name -like "*storage*") {
        $storage = $sub
    }
}

if (-not $storage) {
    Write-Output "Storage not found."
    exit
}

$storageFolder = $storage.GetFolder
Write-Output "--- Storage Directories ---"
foreach ($dir in $storageFolder.Items()) {
    if ($dir.IsFolder) {
        Write-Output ("Folder: " + $dir.Name)
    }
}
