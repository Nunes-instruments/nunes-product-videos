# open_google_drive_sync.ps1
# Opens Google Drive (instruasia@gmail.com) in Chrome and opens the clean Videos & Photos folder in Explorer
$photosUrl = "https://drive.google.com/drive/folders/1uGjQkCgdCgiqsE-1Ri_aNC4-X2FSlA43?usp=drive_link"
$videosUrl = "https://drive.google.com/drive/folders/1-vhkY7WfIHVwRlFarYooSwooWwnBWf94?usp=drive_link"

Start-Process "chrome.exe" -ArgumentList $photosUrl
Start-Process "chrome.exe" -ArgumentList $videosUrl

Write-Host "Opened Google Drive in Chrome and Clean Media folder in Explorer."
