$shell = New-Object -ComObject Shell.Application
$computer = $shell.Namespace(17)
$phone = $null
foreach ($it in $computer.Items()) {
    if ($it.Name -like "*OPPO*" -or $it.Name -like "*A17*") {
        $phone = $it
        break
    }
}
if ($phone) {
    Write-Output ("Phone found: " + $phone.Name + " Path: " + $phone.Path)
    Start-Process "explorer.exe" -ArgumentList "`"$($phone.Path)`""
}
