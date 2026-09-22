<#
.SYNOPSIS
  Reports how many icon groups an executable exposes, and the primary size.

.DESCRIPTION
  Used by the build to assert that exactly one icon group survived.

  ExtractIconEx is deliberate: LoadLibraryEx with LOAD_LIBRARY_AS_DATAFILE plus
  EnumResourceTypes silently reports zero resources for Bun-compiled binaries
  (~118 MB with a large appended payload), which produces a convincing but
  entirely false "no icon" result. ExtractIconEx goes through the shell's own
  resolution path — the same one Explorer uses to draw the file.
#>

param(
    [Parameter(Mandatory = $true)][string]$ExePath
)

$ErrorActionPreference = 'Stop'

if (-not (Test-Path -LiteralPath $ExePath)) { throw "executable not found: $ExePath" }
$ExePath = (Resolve-Path -LiteralPath $ExePath).Path

$signature = @'
[DllImport("shell32.dll", CharSet = CharSet.Unicode)]
public static extern uint ExtractIconEx(string file, int index, IntPtr[] large, IntPtr[] small, uint count);

[DllImport("user32.dll")]
public static extern bool DestroyIcon(IntPtr hIcon);
'@

$api = Add-Type -MemberDefinition $signature -Name 'IconVerify' -Namespace 'IconCheckNs' -PassThru
Add-Type -AssemblyName System.Drawing

# index -1 asks for the count of icon groups without extracting anything.
$groups = $api::ExtractIconEx($ExePath, -1, $null, $null, 0)

$large = New-Object IntPtr[] 1
$small = New-Object IntPtr[] 1
[void]$api::ExtractIconEx($ExePath, 0, $large, $small, 1)

$primary = 'none'
if ($large[0] -ne [IntPtr]::Zero) {
    $icon = [System.Drawing.Icon]::FromHandle($large[0])
    $primary = "$($icon.Width)x$($icon.Height)"
    [void]$api::DestroyIcon($large[0])
}
if ($small[0] -ne [IntPtr]::Zero) { [void]$api::DestroyIcon($small[0]) }

Write-Output "groups=$groups primary=$primary"
