Add-Type -AssemblyName System.Windows.Forms

$base64 = [Console]::In.ReadToEnd().Trim()
if ([string]::IsNullOrWhiteSpace($base64)) {
  throw 'Missing Office MathML content.'
}

$bytes = [Convert]::FromBase64String($base64)
$data = New-Object System.Windows.Forms.DataObject
$data.SetData('MathML', $false, (New-Object System.IO.MemoryStream(,$bytes)))
$data.SetData('MathML Presentation', $false, (New-Object System.IO.MemoryStream(,$bytes)))
[System.Windows.Forms.Clipboard]::SetDataObject($data, $true)
Write-Output 'OK'
