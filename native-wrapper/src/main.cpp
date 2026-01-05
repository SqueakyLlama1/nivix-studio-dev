// --------------------
// Standard C++ Headers
// --------------------
#include <iostream>
#include <fstream>
#include <string>
#include <filesystem>
#include <thread>
#include <chrono>
#include <cstdlib>   // system(), exit()

// --------------------
// Local Source Headers
// --------------------
#include "webview/webview.h"

// --------------------
// OS-specific Headers
// --------------------
#ifdef _WIN32
#pragma comment(lib, "Ws2_32.lib")
#define WIN32_LEAN_AND_MEAN
#include <windows.h>
#include <winsock2.h>
#include <ws2tcpip.h>
#include <shellapi.h>
#include <shlobj.h>
#include <tlhelp32.h> // for process enumeration
#else
#include <sys/types.h>
#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>
#include <netdb.h>
#include <unistd.h>
#include <errno.h>
#include <sys/wait.h>
#include <signal.h>
#include <cstring>
#endif

// --------------------
// Namespace shortcuts
// --------------------
namespace fs = std::filesystem;

// --------------------
// Utility Functions
// --------------------
std::string getLocalIP() {
    #ifdef _WIN32
    WSADATA wsaData;
    WSAStartup(MAKEWORD(2,2), &wsaData);
    
    char hostname[256];
    gethostname(hostname, sizeof(hostname));
    
    addrinfo hints = {};
    hints.ai_family = AF_INET;
    addrinfo* info = nullptr;
    getaddrinfo(hostname, nullptr, &hints, &info);
    
    std::string ip = "127.0.0.1";
    if(info) {
        sockaddr_in* addr = reinterpret_cast<sockaddr_in*>(info->ai_addr);
        char ipBuffer[INET_ADDRSTRLEN] = {};
        InetNtopA(AF_INET, &addr->sin_addr, ipBuffer, INET_ADDRSTRLEN);
        ip = ipBuffer;
        freeaddrinfo(info);
    }
    
    WSACleanup();
    return ip;
    #else
    char hostname[256];
    if(gethostname(hostname, sizeof(hostname)) != 0) return "127.0.0.1";
    
    addrinfo hints = {};
    hints.ai_family = AF_INET;
    addrinfo* info = nullptr;
    if(getaddrinfo(hostname, nullptr, &hints, &info) != 0) return "127.0.0.1";
    
    std::string ip = "127.0.0.1";
    if(info) {
        sockaddr_in* addr = reinterpret_cast<sockaddr_in*>(info->ai_addr);
        ip = inet_ntoa(addr->sin_addr);
        freeaddrinfo(info);
    }
    return ip;
    #endif
}

bool isNodeInstalled() {
    #ifdef _WIN32
    STARTUPINFOW si{sizeof(si)};
    PROCESS_INFORMATION pi;
    wchar_t cmd[] = L"node -v";
    if (!CreateProcessW(NULL, cmd, NULL, NULL, FALSE, CREATE_NO_WINDOW, NULL, NULL, &si, &pi))
    return false;
    
    WaitForSingleObject(pi.hProcess, INFINITE);
    DWORD exitCode;
    GetExitCodeProcess(pi.hProcess, &exitCode);
    CloseHandle(pi.hProcess);
    CloseHandle(pi.hThread);
    return exitCode == 0;
    #else
    return system("node -v > /dev/null 2>&1") == 0;
    #endif
}

bool checkInternet() {
    #ifdef _WIN32
    return system("ping -n 1 -w 15000 google.com > nul") == 0;
    #else
    return system("ping -c 1 -W 15 google.com > /dev/null") == 0;
    #endif
}

void showMessage(const std::string& msg) {
    #ifdef _WIN32
    MessageBoxA(NULL, msg.c_str(), "Nivix Studio", MB_OK | MB_ICONERROR);
    #else
    std::cerr << msg << std::endl;
    #endif
}

// --------------------
// Kill Existing Processes
// --------------------
#ifdef _WIN32
void killProcessByName(const std::wstring& processName) {
    HANDLE hSnap = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0);
    if(hSnap == INVALID_HANDLE_VALUE) return;
    
    PROCESSENTRY32W pe{};
    pe.dwSize = sizeof(pe);
    
    if(Process32FirstW(hSnap, &pe)) {
        do {
            if(_wcsicmp(pe.szExeFile, processName.c_str()) == 0) {
                HANDLE hProcess = OpenProcess(PROCESS_TERMINATE, FALSE, pe.th32ProcessID);
                if(hProcess) {
                    TerminateProcess(hProcess, 0);
                    CloseHandle(hProcess);
                }
            }
        } while(Process32NextW(hSnap, &pe));
    }
    CloseHandle(hSnap);
}
#else
void killProcessByName(const char* name) {
    std::string cmd = "pkill -f ";
    cmd += name;
    system(cmd.c_str());
}
#endif

// --------------------
// Process Helpers (Linux)
// --------------------
#ifndef _WIN32
pid_t launchProcess(const char* path, char* const argv[]) {
    pid_t pid = fork();
    if(pid < 0) {
        perror("fork failed");
        return -1;
    }
    if(pid == 0) {
        execvp(path, argv);
        perror("execvp failed");
        exit(1);
    }
    return pid;
}
#endif

// --------------------
// Main Launcher
// --------------------
int main() {
    // --- Node.js check ---
    if(!isNodeInstalled()) {
        showMessage("Node.js is not installed. Please install Node.js to continue.");
        return 1;
    }
    
    // --- node_modules check ---
    fs::path nodeModules = fs::current_path() / "node_modules";
    while(!fs::exists(nodeModules)) {
        if(!checkInternet()) {
            showMessage("Node modules are missing. Check your WiFi connection.");
            return 1;
        }
        std::cout << "Installing node_modules..." << std::endl;
        if(system("npm install") != 0) {
            std::cerr << "npm install failed, retrying..." << std::endl;
            std::this_thread::sleep_for(std::chrono::seconds(2));
            continue;
        }
        std::this_thread::sleep_for(std::chrono::seconds(1));
    }
    
    // --- Kill old processes (Node/WebView) ---
    #ifdef _WIN32
    killProcessByName(L"node.exe");
    #else
    killProcessByName("node");
    #endif
    
    // --- Local IP and URL ---
    std::string localIP = getLocalIP();
    std::string frontendURL = "http://" + localIP + ":58000/front/index.html";
    
    #ifdef _WIN32
    // --- Windows Node Processes ---
    STARTUPINFOW siB{sizeof(siB)}, siF{sizeof(siF)};
    PROCESS_INFORMATION piB, piF;
    
    std::wstring wsBackend = L"node runtime.js";
    std::wstring wsFrontend = L"node fronthost.js";
    
    if(!CreateProcessW(NULL, &wsBackend[0], NULL, NULL, FALSE, CREATE_NO_WINDOW, NULL, NULL, &siB, &piB)) {
        showMessage("Failed to start backend Node.js process.");
        return 1;
    }
    if(!CreateProcessW(NULL, &wsFrontend[0], NULL, NULL, FALSE, CREATE_NO_WINDOW, NULL, NULL, &siF, &piF)) {
        TerminateProcess(piB.hProcess, 1);
        showMessage("Failed to start frontend Node.js process.");
        return 1;
    }
    
    std::this_thread::sleep_for(std::chrono::seconds(2));
    
    try {
        webview::webview w(true, nullptr);
        w.set_title("Nivix Studio");
        w.set_size(1280, 720, WEBVIEW_HINT_NONE); // Windows: leave as is
        w.navigate(frontendURL);
        w.run();
    } catch(const std::exception& e) {
        showMessage(std::string("Failed to launch WebView: ") + e.what());
    }
    
    TerminateProcess(piF.hProcess, 0);
    TerminateProcess(piB.hProcess, 0);
    CloseHandle(piF.hProcess); CloseHandle(piF.hThread);
    CloseHandle(piB.hProcess); CloseHandle(piB.hThread);
    
    #else
    // --- Linux Node Processes ---
    char* backendArgs[] = { (char*)"node", (char*)"runtime.js", nullptr };
    char* frontendArgs[] = { (char*)"node", (char*)"fronthost.js", nullptr };
    
    pid_t pidB = launchProcess("node", backendArgs);
    if(pidB < 0) return 1;
    
    pid_t pidF = launchProcess("node", frontendArgs);
    if(pidF < 0) {
        kill(pidB, SIGTERM);
        return 1;
    }
    
    std::this_thread::sleep_for(std::chrono::seconds(2));
    
    try {
        // Create WebView
        webview::webview w(true, nullptr);
        w.set_title("Nivix Studio");
        
        // --- Get usable screen area ---
        // Get usable work area
        GdkDisplay* display = gdk_display_get_default();
        GdkMonitor* monitor = gdk_display_get_primary_monitor(display);
        GdkRectangle workarea;
        gdk_monitor_get_workarea(monitor, &workarea);

        w.set_title("Nivix Studio");
        w.set_size(workarea.width, workarea.height, WEBVIEW_HINT_NONE);
        
        // Navigate and run
        w.navigate(frontendURL);
        w.run();
    } catch(const std::exception& e) {
        showMessage(std::string("Failed to launch WebView: ") + e.what());
    }
    
    kill(pidF, SIGTERM);
    kill(pidB, SIGTERM);
    #endif
    
    return 0;
}