$shell = New-Object -ComObject Shell.Application
$computer = $shell.Namespace(17)
Write-Output "--- This PC Devices ---"
foreach ($item in $computer.Items()) {
    Write-Output ("Device: " + $item.Name + " | Path: " + $item.Path)
    if ($item.IsFolder) {
        $folder = $item.GetFolder
        if ($folder) {
            foreach ($sub in $folder.Items()) {
                Write-Output ("  SubFolder: " + $sub.Name + " | Path: " + $sub.Path)
            }
        }
    }
}

Write-Output "--- E:\ Drive contents ---"
Get-ChildItem -Path E:\ -ErrorAction SilentlyContinue | Select-Object -Property Name, FullName
