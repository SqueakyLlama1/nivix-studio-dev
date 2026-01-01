#NoTrayIcon
#Region ;**** Directives created by AutoIt3Wrapper_GUI ****
#AutoIt3Wrapper_Icon=favicon.ico
#AutoIt3Wrapper_Outfile_x64=studio_64x.Exe
#AutoIt3Wrapper_UseX64=y
#EndRegion ;**** Directives created by AutoIt3Wrapper_GUI ****
Opt("MustDeclareVars", 1)

; --- GLOBAL VARIABLES ---
Global Const $sNodeExe = "node.exe"
Global Const $sScriptFile = "runtime.js"
Global $iNodePID = 0 ; Process ID of the running Node.js script
Global $hGUI, $iMsg ; Handles for the GUI and message loop

; --- GUI SETUP ---
$hGUI = GUICreate("Nivix Studio Control", 350, 60)
; Display the simple status message
GUICtrlCreateLabel("Studio is running. Close this window to close it.", 10, 20, 330, 20)
GUISetState(@SW_SHOW)

; --- LAUNCH NODE.JS SCRIPT ---
; Run the Node.js script and get its Process ID (PID)
; @SW_HIDE ensures no console window appears for the Node script
$iNodePID = Run($sNodeExe & " " & $sScriptFile, @ScriptDir, @SW_HIDE)
If $iNodePID = 0 Then
    MsgBox(16, "Fatal Error", "Could not launch " & $sScriptFile)
    Exit
EndIf

; --- MAIN LOOP (Waiting for Window Closure) ---
While 1
    $iMsg = GUIGetMsg()

    ; Check if: 1. User closed the window OR 2. Node.js process died unexpectedly
    If $iMsg = -3 Or Not ProcessExists($iNodePID) Then ; -3 is the standard constant for GUI_EVENT_CLOSE
        _TerminateNodeProcess()
    EndIf

    Sleep(100)
WEnd

; --- FUNCTIONS ---

Func _TerminateNodeProcess()
    ; Close the Node process using its PID
    If ProcessExists($iNodePID) Then
        ProcessClose($iNodePID)
    EndIf

    ; Clean up and exit the AutoIt control program
    GUIDelete($hGUI)
    Exit
EndFunc