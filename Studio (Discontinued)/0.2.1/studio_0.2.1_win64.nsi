!include "MUI2.nsh"

!define VERSION "0.2.1"
!define INSTDIR_SUB "Nivix Studio\${VERSION}"

Name "Nivix Studio ${VERSION}"
OutFile "studio_${VERSION}_win64.exe"
InstallDir "$LOCALAPPDATA\${INSTDIR_SUB}"

Page Directory
Page InstFiles

Var WantShortcut
Var WantRun

Function CheckNode
  nsExec::ExecToStack 'cmd /c node -v'
  Pop $0
  StrCmp $0 "" NodeNotFound NodeOK
NodeNotFound:
  MessageBox MB_ICONSTOP "Node.js is required. Please install Node.js and re-run the installer."
  Abort
NodeOK:
FunctionEnd

Section "Install"
  Call CheckNode

  SetOutPath "$INSTDIR"
  SetOverwrite on
  File /r "${VERSION}\*.*"

  WriteUninstaller "$INSTDIR\Uninstall.exe"

  MessageBox MB_YESNO "Create desktop shortcut?" IDYES createDesk IDNO deleteDesk
createDesk:
  CreateShortcut "$DESKTOP\Nivix Studio.lnk" "$INSTDIR\studio_64x.exe" "$INSTDIR\favicon.ico"
  StrCpy $WantShortcut "1"
  Goto deskDone
deleteDesk:
  Delete "$DESKTOP\Nivix Studio.lnk"
  StrCpy $WantShortcut "0"
deskDone:

  CreateDirectory "$SMPROGRAMS\Nivix Studio"
  CreateShortcut "$SMPROGRAMS\Nivix Studio\Nivix Studio.lnk" "$INSTDIR\studio_64x.exe" "$INSTDIR\favicon.ico"
  CreateShortcut "$SMPROGRAMS\Nivix Studio\Uninstall Nivix Studio.lnk" "$INSTDIR\Uninstall.exe"

  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\Nivix Studio"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\Nivix Studio" "DisplayName" "Nivix Studio ${VERSION}"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\Nivix Studio" "UninstallString" "$INSTDIR\Uninstall.exe"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\Nivix Studio" "DisplayIcon" "$INSTDIR\studio_64x.exe"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\Nivix Studio" "InstallLocation" "$INSTDIR"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\Nivix Studio" "DisplayVersion" "${VERSION}"
SectionEnd

Section "Run After Install"
  MessageBox MB_YESNO "Run Nivix Studio now?" IDYES doRun IDNO skipRun
doRun:
  Exec '"$INSTDIR\studio_64x.exe"'
skipRun:
SectionEnd

Section "Uninstall"
  RMDir /r "$INSTDIR"

  Delete "$DESKTOP\Nivix Studio.lnk"

  Delete "$SMPROGRAMS\Nivix Studio\Nivix Studio.lnk"
  Delete "$SMPROGRAMS\Nivix Studio\Uninstall Nivix Studio.lnk"
  RMDir "$SMPROGRAMS\Nivix Studio"

  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\Nivix Studio"
SectionEnd