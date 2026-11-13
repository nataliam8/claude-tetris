param(
    [string]$Ciudad = 'Popayán',
    [string]$Pais = '',
    [ValidateRange(1, 16)][int]$Dias = 3,
    [switch]$Json
)

$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$codigos = @{
    0 = 'Despejado'; 1 = 'Mayormente despejado'; 2 = 'Parcialmente nublado'; 3 = 'Nublado'
    45 = 'Niebla'; 48 = 'Niebla con escarcha'
    51 = 'Llovizna ligera'; 53 = 'Llovizna moderada'; 55 = 'Llovizna intensa'
    56 = 'Llovizna helada ligera'; 57 = 'Llovizna helada intensa'
    61 = 'Lluvia ligera'; 63 = 'Lluvia moderada'; 65 = 'Lluvia intensa'
    66 = 'Lluvia helada ligera'; 67 = 'Lluvia helada intensa'
    71 = 'Nevada ligera'; 73 = 'Nevada moderada'; 75 = 'Nevada intensa'; 77 = 'Granizo fino'
    80 = 'Chubascos ligeros'; 81 = 'Chubascos moderados'; 82 = 'Chubascos violentos'
    85 = 'Chubascos de nieve ligeros'; 86 = 'Chubascos de nieve intensos'
    95 = 'Tormenta'; 96 = 'Tormenta con granizo ligero'; 99 = 'Tormenta con granizo intenso'
}
function Get-Condicion([int]$c) { if ($codigos.ContainsKey($c)) { $codigos[$c] } else { "Código $c" } }

# Por defecto: Popayán, Colombia
if (-not $PSBoundParameters.ContainsKey('Ciudad') -and -not $Pais) { $Pais = 'CO' }

# 1. Geocodificación
$geoUrl = 'https://geocoding-api.open-meteo.com/v1/search?count=1&language=es&format=json&name=' + [uri]::EscapeDataString($Ciudad)
if ($Pais) { $geoUrl += '&countryCode=' + $Pais.ToUpper() }
$geo = Invoke-RestMethod -Uri $geoUrl -UseBasicParsing
if (-not $geo.results) {
    Write-Output "No se encontró la ciudad '$Ciudad'."
    exit 1
}
$lugar = $geo.results[0]
$lat = [string]::Format([Globalization.CultureInfo]::InvariantCulture, '{0}', $lugar.latitude)
$lon = [string]::Format([Globalization.CultureInfo]::InvariantCulture, '{0}', $lugar.longitude)

# 2. Pronóstico
$wxUrl = "https://api.open-meteo.com/v1/forecast?latitude=$lat&longitude=$lon&timezone=auto&forecast_days=$Dias" +
    '&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,precipitation' +
    '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,uv_index_max'
$wx = Invoke-RestMethod -Uri $wxUrl -UseBasicParsing

if ($Json) {
    [pscustomobject]@{ lugar = $lugar; clima = $wx } | ConvertTo-Json -Depth 6
    exit 0
}

$c = $wx.current
$nombre = (@($lugar.name, $lugar.admin1, $lugar.country) | Where-Object { $_ }) -join ', '
Write-Output "Clima en $nombre (hora local: $($c.time))"
Write-Output "  Condición:         $(Get-Condicion $c.weather_code)"
Write-Output "  Temperatura:       $($c.temperature_2m) °C (sensación $($c.apparent_temperature) °C)"
Write-Output "  Humedad:           $($c.relative_humidity_2m) %"
Write-Output "  Viento:            $($c.wind_speed_10m) km/h"
Write-Output "  Precipitación:     $($c.precipitation) mm"
Write-Output ''
Write-Output "Pronóstico ($Dias días):"
$d = $wx.daily
for ($i = 0; $i -lt $d.time.Count; $i++) {
    Write-Output ("  {0}: {1}, máx {2} °C / mín {3} °C, lluvia {4} %, UV {5}" -f `
        $d.time[$i], (Get-Condicion $d.weather_code[$i]), $d.temperature_2m_max[$i],
        $d.temperature_2m_min[$i], $d.precipitation_probability_max[$i], $d.uv_index_max[$i])
}
