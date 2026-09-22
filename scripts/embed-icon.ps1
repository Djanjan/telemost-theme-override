<#
.SYNOPSIS
  Replaces every icon resource in a compiled executable with a single group
  built from the supplied .ico file.

.DESCRIPTION
  `bun build --compile --windows-icon` ADDS an icon group rather than replacing
  Bun's own, leaving two RT_GROUP_ICON resources in the output. Windows then
  picks the group with the lowest resource ID for shortcuts and the taskbar,
  which is not guaranteed to be ours.

  This script uses BeginUpdateResource/UpdateResource/EndUpdateResource with
  bDeleteExistingResources = TRUE, so the executable ends up with exactly one
  icon group containing every size from the source .ico.

  Verified against Telemost's own icon layout: 9 PNG-compressed RGBA images
  from 16x16 to 256x256.
#>

param(
    [Parameter(Mandatory = $true)][string]$ExePath,
    [Parameter(Mandatory = $true)][string]$IcoPath
)

$ErrorActionPreference = 'Stop'

if (-not (Test-Path -LiteralPath $ExePath)) { throw "executable not found: $ExePath" }
if (-not (Test-Path -LiteralPath $IcoPath)) { throw "icon not found: $IcoPath" }

$ExePath = (Resolve-Path -LiteralPath $ExePath).Path
$IcoPath = (Resolve-Path -LiteralPath $IcoPath).Path

$signature = @'
[DllImport("kernel32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
public static extern IntPtr BeginUpdateResource(string pFileName, bool bDeleteExistingResources);

[DllImport("kernel32.dll", SetLastError = true)]
public static extern bool UpdateResource(IntPtr hUpdate, IntPtr lpType, IntPtr lpName,
                                         ushort wLanguage, byte[] lpData, uint cb);

[DllImport("kernel32.dll", SetLastError = true)]
public static extern bool EndUpdateResource(IntPtr hUpdate, bool fDiscard);

[DllImport("kernel32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
public static extern IntPtr LoadLibraryEx(string lpFileName, IntPtr hFile, uint dwFlags);

[DllImport("kernel32.dll", SetLastError = true)]
public static extern bool FreeLibrary(IntPtr hModule);

[DllImport("kernel32.dll", SetLastError = true)]
public static extern IntPtr FindResource(IntPtr hModule, IntPtr lpName, IntPtr lpType);

[DllImport("kernel32.dll", SetLastError = true)]
public static extern IntPtr LoadResource(IntPtr hModule, IntPtr hResInfo);

[DllImport("kernel32.dll")]
public static extern IntPtr LockResource(IntPtr hResData);

[DllImport("kernel32.dll", SetLastError = true)]
public static extern uint SizeofResource(IntPtr hModule, IntPtr hResInfo);
'@

$api = Add-Type -MemberDefinition $signature -Name 'ResUpdate' -Namespace 'IconEmbed' -PassThru

# Deleting every existing resource also removes the VERSIONINFO block Bun
# wrote, which is what Explorer shows under Properties > Details. Read it back
# first so it can be restored alongside the new icon.
$RT_VERSION = [IntPtr]16
$versionBlob = $null

$LOAD_LIBRARY_AS_IMAGE_RESOURCE = 0x00000020
$LOAD_LIBRARY_AS_DATAFILE = 0x00000002
$module = $api::LoadLibraryEx($ExePath, [IntPtr]::Zero,
                              $LOAD_LIBRARY_AS_IMAGE_RESOURCE -bor $LOAD_LIBRARY_AS_DATAFILE)

if ($module -ne [IntPtr]::Zero) {
    try {
        $res = $api::FindResource($module, [IntPtr]1, $RT_VERSION)
        if ($res -ne [IntPtr]::Zero) {
            $size = $api::SizeofResource($module, $res)
            $data = $api::LockResource($api::LoadResource($module, $res))
            if ($data -ne [IntPtr]::Zero -and $size -gt 0) {
                $versionBlob = New-Object byte[] $size
                [Runtime.InteropServices.Marshal]::Copy($data, $versionBlob, 0, [int]$size)
            }
        }
    } finally {
        [void]$api::FreeLibrary($module)
    }
}

$RT_ICON = [IntPtr]3
$RT_GROUP_ICON = [IntPtr]14
$LANG_NEUTRAL = 0

$ico = [System.IO.File]::ReadAllBytes($IcoPath)
if ($ico.Length -lt 6) { throw 'icon file is truncated' }

$imageCount = [BitConverter]::ToUInt16($ico, 4)
if ($imageCount -eq 0) { throw 'icon file contains no images' }

# RT_GROUP_ICON uses a 14-byte directory entry (resource id) where the file
# format uses 16 bytes (offset + size). Rebuild the directory accordingly.
$groupSize = 6 + ($imageCount * 14)
$group = New-Object byte[] $groupSize
[Array]::Copy($ico, 0, $group, 0, 6)

$images = New-Object 'System.Collections.Generic.List[byte[]]'

for ($i = 0; $i -lt $imageCount; $i++) {
    $src = 6 + ($i * 16)
    $dst = 6 + ($i * 14)

    # width, height, colorCount, reserved, planes(2), bitCount(2), bytes(4)
    [Array]::Copy($ico, $src, $group, $dst, 12)

    $size = [BitConverter]::ToUInt32($ico, $src + 8)
    $offset = [BitConverter]::ToUInt32($ico, $src + 12)

    if ($offset + $size -gt $ico.Length) { throw "icon entry $i is out of bounds" }

    $resourceId = [uint16]($i + 1)
    [Array]::Copy([BitConverter]::GetBytes($resourceId), 0, $group, $dst + 12, 2)

    $image = New-Object byte[] $size
    [Array]::Copy($ico, $offset, $image, 0, $size)
    $images.Add($image)
}

# bDeleteExistingResources = $true wipes Bun's icon group along with everything
# else in the resource section; the VERSIONINFO Bun writes is recreated by the
# caller if needed.
$handle = $api::BeginUpdateResource($ExePath, $true)
if ($handle -eq [IntPtr]::Zero) {
    throw "BeginUpdateResource failed (error $([Runtime.InteropServices.Marshal]::GetLastWin32Error()))"
}

try {
    for ($i = 0; $i -lt $images.Count; $i++) {
        $ok = $api::UpdateResource($handle, $RT_ICON, [IntPtr]([uint16]($i + 1)), $LANG_NEUTRAL,
                                   $images[$i], [uint32]$images[$i].Length)
        if (-not $ok) {
            throw "UpdateResource(RT_ICON #$($i + 1)) failed (error $([Runtime.InteropServices.Marshal]::GetLastWin32Error()))"
        }
    }

    $ok = $api::UpdateResource($handle, $RT_GROUP_ICON, [IntPtr]1, $LANG_NEUTRAL, $group, [uint32]$group.Length)
    if (-not $ok) {
        throw "UpdateResource(RT_GROUP_ICON) failed (error $([Runtime.InteropServices.Marshal]::GetLastWin32Error()))"
    }

    # Put the version metadata back; it was wiped along with everything else.
    if ($null -ne $versionBlob) {
        # VERSIONINFO is language-tagged; 1033 (en-US) is what Bun emits and what
        # Explorer falls back to. Writing it as neutral leaves the fields blank.
        $ok = $api::UpdateResource($handle, $RT_VERSION, [IntPtr]1, 1033, $versionBlob, [uint32]$versionBlob.Length)
        if (-not $ok) {
            throw "UpdateResource(RT_VERSION) failed (error $([Runtime.InteropServices.Marshal]::GetLastWin32Error()))"
        }
    }
} catch {
    [void]$api::EndUpdateResource($handle, $true)  # discard
    throw
}

if (-not $api::EndUpdateResource($handle, $false)) {
    throw "EndUpdateResource failed (error $([Runtime.InteropServices.Marshal]::GetLastWin32Error()))"
}

$versionNote = if ($null -ne $versionBlob) { ", version metadata preserved" } else { ", no version metadata found" }
Write-Output "embedded $imageCount icon image(s) as a single group into $(Split-Path $ExePath -Leaf)$versionNote"
