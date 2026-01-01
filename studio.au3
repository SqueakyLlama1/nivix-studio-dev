#NoTrayIcon
#Region ;**** Directives created by AutoIt3Wrapper_GUI ****
#AutoIt3Wrapper_Icon=favicon.ico
#AutoIt3Wrapper_Outfile_x64=studio_64x.exe
#AutoIt3Wrapper_UseX64=y
#EndRegion ;**** Directives created by AutoIt3Wrapper_GUI ****
Opt("MustDeclareVars", 1)
Opt("GUIOnEventMode", 0)

#include <GUIConstantsEx.au3>

; --- GLOBAL VARIABLES ---
Global Const $sNodeExe = "node.exe"
Global Const $sScriptFile = "runtime.js"
Global $iNodePID = 0
Global $hGUI, $iMsg
Global $sAppDir = @ScriptDir
Global $aPortsToCheck[2] = [58000, 52321]

; --- HELPER FUNCTIONS ---

; Checks if node_modules folder exists; if not, installs dependencies
Func _CheckDependencies()
    If Not FileExists($sAppDir & "\node_modules") Then
        GUICtrlSetData($hStatus, "node_modules missing. Installing dependencies...")
        GUISetState(@SW_SHOW)
        RunWait(@ComSpec & " /c cd /d " & $sAppDir & " && npm install", "", @SW_SHOW)
        GUICtrlSetData($hStatus, "Dependencies installed. Launching Studio...")
    EndIf
EndFunc

; Terminates the Node process and closes GUI
Func _TerminateNodeProcess()
    If ProcessExists($iNodePID) Then ProcessClose($iNodePID)
    GUIDelete($hGUI)
    Exit
EndFunc

; Kills Node.js processes that are using specific ports
Func _KillProcessesOnPorts()
    For $i = 0 To UBound($aPortsToCheck) - 1
        Local $sPort = $aPortsToCheck[$i]
        Local $iPID = Run(@ComSpec & " /c netstat -ano | findstr :" & $sPort, "", @SW_HIDE, 2)
        Local $sResult = ""
        While 1
            $sResult &= StdoutRead($iPID)
            If @error Then ExitLoop
        WEnd

        If $sResult <> "" Then
            Local $aLines = StringSplit($sResult, @CRLF, 1)
            For $j = 1 To $aLines[0]
                Local $sLine = StringStripWS($aLines[$j], 8)
                If $sLine <> "" Then
                    Local $aParts = StringSplit($sLine, " ", 1)
                    If $aParts[0] >= 5 Then ProcessClose($aParts[5])
                EndIf
            Next
        EndIf
    Next
EndFunc

; --- GUI SETUP ---
$hGUI = GUICreate("Nivix Studio Control", 400, 120)
GUICtrlCreateLabel("Studio Control Panel", 10, 10, 380, 20, 0x1) ; 0x1 = SS_CENTER
GUICtrlSetColor(-1, 0xFFFFFF)
GUICtrlSetBkColor(-1, 0x0078D7)

; Status label that updates dynamically
Global $hStatus = GUICtrlCreateLabel("Status: Initializing...", 10, 50, 380, 30)
GUICtrlSetColor($hStatus, 0x000000)
GUICtrlSetBkColor($hStatus, 0xCCCCCC)

GUISetState(@SW_SHOW)

; --- STARTUP CHECKS ---
_KillProcessesOnPorts() ; Ensure no Node.js process is blocking our ports
_CheckDependencies()    ; Ensure node_modules exists

; --- LAUNCH NODE SCRIPT ---
$iNodePID = Run($sNodeExe & " " & $sScriptFile, $sAppDir, @SW_HIDE)
If $iNodePID = 0 Then
    MsgBox(16, "Fatal Error", "Could not launch " & $sScriptFile)
    Exit
EndIf

GUICtrlSetData($hStatus, "Status: Studio running...")

; --- MAIN LOOP ---
While 1
    $iMsg = GUIGetMsg()
    If $iMsg = -3 Or Not ProcessExists($iNodePID) Then
        _TerminateNodeProcess()
    EndIf
    Sleep(100)
WEnd