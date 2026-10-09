# open_google_drive_sync.ps1
# Opens Google Drive (instruasia@gmail.com) in Chrome and opens the clean Videos & Photos folder in Explorer
$driveUrl = "https://drive.google.com/drive/u/0/my-drive"
$folderPath = "C:\Users\NUNES\Desktop\Google Drive (instruasia@gmail.com)"

Start-Process "chrome.exe" -ArgumentList $driveUrl
Start-Process "explorer.exe" -ArgumentList "`"$folderPath`""
Write-Host "Opened Google Drive in Chrome and Clean Media folder in Explorer."
