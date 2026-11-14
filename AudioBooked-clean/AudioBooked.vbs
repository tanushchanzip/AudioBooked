Set oShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
strDir = fso.GetParentFolderName(WScript.ScriptFullName)
oShell.CurrentDirectory = strDir

strPython = strDir & "\venv\Scripts\pythonw.exe"
strApp = strDir & "\app_desktop.py"

oShell.Run """" & strPython & """ """ & strApp & """", 0, False
