!include "MUI2.nsh"

!define VERSION "0.2.0"
!define INSTDIR_SUB "Nivix Studio\${VERSION}"

Name "Nivix Studio ${VERSION}"
OutFile "studio_${VERSION}_win64.exe"
InstallDir "$LOCALAPPDATA\${INSTDIR_SUB}"

Page Directory
Page InstFiles

Var WantShortcut
Var WantRun

;--------------------------------
; Check for Node.js
Function CheckNode
  ; Try to get node version
  nsExec::ExecToStack 'cmd /c node -v'
  Pop $0
  ; If $0 is empty, node is not installed
  StrCmp $0 "" NodeNotFound NodeOK
NodeNotFound:
  MessageBox MB_ICONSTOP "Node.js is required. Please install Node.js and re-run the installer."
  Abort
NodeOK:
FunctionEnd

;--------------------------------
; Installation section
Section "Install"
  Call CheckNode

  SetOutPath "$INSTDIR"
  SetOverwrite on
  File /r "${VERSION}\*.*"

  ; Write the uninstaller
  WriteUninstaller "$INSTDIR\Uninstall.exe"

  ; Create Desktop shortcut
  MessageBox MB_YESNO "Create desktop shortcut?" IDYES doDesk IDNO skipDesk
doDesk:
  CreateShortcut "$DESKTOP\Nivix Studio.lnk" "$INSTDIR\studio_64x.exe" "$INSTDIR\favicon.ico"
  StrCpy $WantShortcut "1"
skipDesk:

  ; Create Start Menu shortcut
  CreateDirectory "$SMPROGRAMS\Nivix Studio"
  CreateShortcut "$SMPROGRAMS\Nivix Studio\Nivix Studio.lnk" "$INSTDIR\studio_64x.exe" "$INSTDIR\favicon.ico"
  CreateShortcut "$SMPROGRAMS\Nivix Studio\Uninstall Nivix Studio.lnk" "$INSTDIR\Uninstall.exe"

  ; Register in Apps & Features
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\Nivix Studio" "DisplayName" "Nivix Studio"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\Nivix Studio" "UninstallString" "$INSTDIR\Uninstall.exe"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\Nivix Studio" "DisplayIcon" "$INSTDIR\studio_64x.exe"

SectionEnd

;--------------------------------
; Run After Install
Section "Run After Install"
  MessageBox MB_YESNO "Run Nivix Studio now?" IDYES doRun IDNO skipRun
doRun:
  Exec '"$INSTDIR\studio_64x.exe"'
skipRun:
SectionEnd

;--------------------------------
; Uninstaller
Section "Uninstall"
  ; Delete all installed files
  RMDir /r "$INSTDIR"

  ; Remove desktop shortcut
  Delete "$DESKTOP\Nivix Studio.lnk"

  ; Remove Start Menu shortcuts
  Delete "$SMPROGRAMS\Nivix Studio\Nivix Studio.lnk"
  Delete "$SMPROGRAMS\Nivix Studio\Uninstall Nivix Studio.lnk"
  RMDir "$SMPROGRAMS\Nivix Studio"

  ; Remove registry entries
  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\Nivix Studio"
SectionEnd
