$shell = New-Object -ComObject Shell.Application
$computer = $shell.Namespace(17)
$phone = $null
foreach ($it in $computer.Items()) {
    if ($it.Name -like "*OPPO*") { $phone = $it; break }
}

$storage = $null
foreach ($sub in $phone.GetFolder.Items()) {
    if ($sub.Name -like "*Internal*") { $storage = $sub; break }
}

$storageFolder = $storage.GetFolder
foreach ($sub in $storageFolder.Items()) {
    if ($sub.Name -in @("Pictures", "DCIM", "Download", "Documents")) {
        Write-Output ("--> " + $sub.Name + " (" + $sub.GetFolder.Items().Count + " items)")
        if ($sub.IsFolder) {
            foreach ($child in $sub.GetFolder.Items()) {
                if ($child.IsFolder) {
                    Write-Output ("    [SubDir] " + $child.Name + " (" + $child.GetFolder.Items().Count + " items)")
                }
            }
        }
    }
}
