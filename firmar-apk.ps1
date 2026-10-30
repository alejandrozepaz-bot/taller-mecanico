# Firma el APK que compiló GitHub con la llave que vive SOLO en esta PC (carpeta firma\),
# lo copia al Escritorio y lo sube a la versión (Release) de GitHub.
# Uso:  powershell -ExecutionPolicy Bypass -File firmar-apk.ps1 [-Etiqueta v1.0.0]
param([string]$Etiqueta)
$ErrorActionPreference = "Stop"
$raiz = $PSScriptRoot
$herr = "C:\Users\aleja\android-toolchain"
$gh = "$herr\gh\bin\gh.exe"
$env:JAVA_HOME = (Get-ChildItem $herr -Directory -Filter "jdk-*" | Select-Object -First 1).FullName
$apksigner = (Get-ChildItem "$herr\sdk\build-tools" -Recurse -Filter apksigner.bat | Sort-Object FullName | Select-Object -Last 1).FullName
$llave = "$raiz\firma\taller-mecanico.jks"
if (-not (Test-Path $llave)) { throw "No encontré la llave $llave" }
$clave = ((Get-Content "$raiz\firma\LEEME-CLAVE.txt" -TotalCount 1) -split ': ')[1].Trim()

Set-Location $raiz
if (-not $Etiqueta) { $Etiqueta = (git describe --tags --abbrev=0).Trim() }
Write-Host "Versión: $Etiqueta"

$corrida = (& $gh run list --workflow compilar.yml --branch $Etiqueta --status success --limit 1 --json databaseId | ConvertFrom-Json)
if (-not $corrida) { throw "Todavía no hay una compilación exitosa para $Etiqueta" }
$tmp = Join-Path $env:TEMP "taller-apk-$Etiqueta"
Remove-Item $tmp -Recurse -Force -ErrorAction SilentlyContinue
& $gh run download $corrida[0].databaseId --name android-sin-firmar --dir $tmp
if ($LASTEXITCODE) { throw "No se pudo descargar el APK" }

$salida = Join-Path $tmp "Taller-Mecanico.apk"
& $apksigner sign --ks $llave --ks-key-alias taller --ks-pass "pass:$clave" --out $salida (Join-Path $tmp "Taller-Mecanico-sin-firmar.apk")
if ($LASTEXITCODE) { throw "Falló la firma" }
& $apksigner verify $salida
if ($LASTEXITCODE) { throw "La firma no se pudo verificar" }

Copy-Item $salida "$env:USERPROFILE\Desktop\Taller-Mecanico.apk" -Force
& $gh release upload $Etiqueta $salida --clobber
Write-Host "Listo: APK firmado en el Escritorio y subido a la versión $Etiqueta"
