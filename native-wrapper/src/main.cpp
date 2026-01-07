#include <iostream>
#include <fstream>
#include <string>
#include <filesystem>
#include <thread>
#include <chrono>
#include <cstdlib>
#include <cstdio>

#include "webview/webview.h"

#ifdef _WIN32
#define WIN32_LEAN_AND_MEAN
#pragma comment(lib, "Ws2_32.lib")
#include <windows.h>
#include <winsock2.h>
#include <ws2tcpip.h>
#else
#include <sys/types.h>
#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>
#include <netdb.h>
#include <unistd.h>
#include <signal.h>
#include <errno.h>
#include <sys/wait.h>
#endif

namespace fs = std::filesystem;

static constexpr int BACKEND_PORT = 52321;
static constexpr int FRONTEND_PORT = 58000;

// --------------------
// Utilities
// --------------------
std::string getLocalIP() {
#ifdef _WIN32
    WSADATA wsa;
    WSAStartup(MAKEWORD(2,2), &wsa);
#endif
    char hostname[256];
    if(gethostname(hostname, sizeof(hostname)) != 0) return "127.0.0.1";

    addrinfo hints{};
    hints.ai_family = AF_INET;
    addrinfo* info = nullptr;
    if(getaddrinfo(hostname, nullptr, &hints, &info) != 0) return "127.0.0.1";

    std::string ip = "127.0.0.1";
    if(info) {
        sockaddr_in* addr = reinterpret_cast<sockaddr_in*>(info->ai_addr);
        char buf[INET_ADDRSTRLEN]{};
#ifdef _WIN32
        InetNtopA(AF_INET, &addr->sin_addr, buf, sizeof(buf));
#else
        inet_ntop(AF_INET, &addr->sin_addr, buf, sizeof(buf));
#endif
        ip = buf;
        freeaddrinfo(info);
    }
#ifdef _WIN32
    WSACleanup();
#endif
    return ip;
}

bool isNodeInstalled() {
#ifdef _WIN32
    STARTUPINFOW si{sizeof(si)};
    PROCESS_INFORMATION pi{};
    wchar_t cmd[] = L"node -v";
    if(!CreateProcessW(nullptr, cmd, nullptr, nullptr, FALSE, CREATE_NO_WINDOW, nullptr, nullptr, &si, &pi))
        return false;
    WaitForSingleObject(pi.hProcess, INFINITE);
    DWORD code = 1;
    GetExitCodeProcess(pi.hProcess, &code);
    CloseHandle(pi.hProcess);
    CloseHandle(pi.hThread);
    return code == 0;
#else
    return system("node -v > /dev/null 2>&1") == 0;
#endif
}

// --------------------
// Backend check
// --------------------
bool waitForBackend(const std::string& url, int timeoutSec) {
    auto start = std::chrono::steady_clock::now();

#ifdef _WIN32
    auto execCurl = [&](const std::string& cmd) -> std::string {
        FILE* pipe = _popen(cmd.c_str(), "r");
        if (!pipe) return "";
        char buffer[128]{};
        std::string result;
        while (fgets(buffer, sizeof(buffer), pipe)) result += buffer;
        _pclose(pipe);
        return result;
    };
#else
    auto execCurl = [&](const std::string& cmd) -> std::string {
        FILE* pipe = popen(cmd.c_str(), "r");
        if (!pipe) return "";
        char buffer[128]{};
        std::string result;
        while (fgets(buffer, sizeof(buffer), pipe)) result += buffer;
        pclose(pipe);
        return result;
    };
#endif

    while(true) {
        std::string command = "curl -s --max-time 1 " + url;
        std::string resp = execCurl(command);
        if(resp.find("ok") != std::string::npos) return true;

        if(std::chrono::steady_clock::now() - start > std::chrono::seconds(timeoutSec))
            return false;

        std::this_thread::sleep_for(std::chrono::milliseconds(200));
    }
}

// --------------------
// Message box / terminal output
// --------------------
void showMessage(const std::string& msg, bool isError = true) {
#ifdef _WIN32
    MessageBoxA(nullptr, msg.c_str(), "Nivix Studio", MB_OK | (isError ? MB_ICONERROR : MB_ICONINFORMATION));
#else
    if(isError) std::cerr << "Error: ";
    std::cout << msg << std::endl;
#endif
}

// --------------------
// Attach console on Windows for debug mode
// --------------------
#ifdef _WIN32
void attachDebugConsole() {
    if(AttachConsole(ATTACH_PARENT_PROCESS)) {
        FILE* fp = nullptr;
        freopen_s(&fp, "CONOUT$", "w", stdout);
        freopen_s(&fp, "CONOUT$", "w", stderr);
        freopen_s(&fp, "CONIN$", "r", stdin);
        std::cout.clear();
        std::cerr.clear();
        std::cin.clear();
    }
}
#endif

// --------------------
// Process helpers
// --------------------
#ifdef _WIN32
bool launchProcess(const std::wstring& cmd, PROCESS_INFORMATION& pi, bool hidden = true) {
    STARTUPINFOW si{sizeof(si)};
    DWORD flags = hidden ? CREATE_NO_WINDOW : 0;
    return CreateProcessW(nullptr, (LPWSTR)cmd.c_str(), nullptr, nullptr, FALSE, flags, nullptr, nullptr, &si, &pi);
}
#else
pid_t launchProcess(const char* path, char* const argv[]) {
    pid_t pid = fork();
    if(pid == 0) execvp(path, argv);
    return pid;
}
#endif

// --------------------
// Main
// --------------------
int main(int argc, char* argv[]) {
    bool debugConsole = false;
    if(argc > 1 && std::string(argv[1]) == "--console") debugConsole = true;

#ifdef _WIN32
    if(debugConsole) attachDebugConsole();
    else FreeConsole();
#else
    if(debugConsole) std::cout << "Debug mode enabled" << std::endl;
#endif

    if(!isNodeInstalled()) {
        showMessage("Node.js is not installed.");
        return 1;
    }

    fs::path nodeModules = fs::current_path() / "node_modules";
    while(!fs::exists(nodeModules)) {
        if(system("npm install") != 0) {
            std::this_thread::sleep_for(std::chrono::seconds(2));
            continue;
        }
        std::this_thread::sleep_for(std::chrono::seconds(1));
    }

    std::string ip = getLocalIP();
    std::string frontendURL = "http://" + ip + ":" + std::to_string(FRONTEND_PORT) + "/front/index.html";
    std::string preloadURL = "file://" + (fs::current_path() / "front" / "preload.html").string();

#ifdef _WIN32
    PROCESS_INFORMATION backend{}, frontend{};
    if(!launchProcess(L"node runtime.js", backend)) {
        showMessage("Failed to launch backend process.");
        return 1;
    }

    if(!waitForBackend("http://127.0.0.1:52321/ready", 15)) {
        TerminateProcess(backend.hProcess, 1);
        showMessage("Backend connection timed out.");
        return 1;
    }

    if(!launchProcess(L"node fronthost.js", frontend)) {
        TerminateProcess(backend.hProcess, 1);
        showMessage("Failed to launch frontend process.");
        return 1;
    }
#else
    char* backendArgs[] = {(char*)"node", (char*)"runtime.js", nullptr};
    char* frontendArgs[] = {(char*)"node", (char*)"fronthost.js", nullptr};

    pid_t pidB = launchProcess("node", backendArgs);
    if(pidB <= 0) { showMessage("Failed to launch backend process."); return 1; }

    if(!waitForBackend("http://127.0.0.1:52321/ready", 15)) {
        kill(pidB, SIGTERM);
        showMessage("Backend connection timed out.");
        return 1;
    }

    pid_t pidF = launchProcess("node", frontendArgs);
    if(pidF <= 0) { kill(pidB, SIGTERM); showMessage("Failed to launch frontend process."); return 1; }
#endif

    try {
        webview::webview w(true, nullptr);
        w.set_title("Nivix Studio");
        w.set_size(1280, 720, WEBVIEW_HINT_NONE);
        w.navigate(preloadURL);

        w.run();
    } catch(...) {
        showMessage("WebView failed to launch.");
    }

#ifdef _WIN32
    TerminateProcess(frontend.hProcess, 0);
    TerminateProcess(backend.hProcess, 0);
    CloseHandle(frontend.hProcess); CloseHandle(frontend.hThread);
    CloseHandle(backend.hProcess); CloseHandle(backend.hThread);
#else
    kill(pidF, SIGTERM);
    kill(pidB, SIGTERM);
#endif

    return 0;
}