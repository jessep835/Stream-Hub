console.log("🔥 MAINSTREAM LOADED");
const { app, BrowserWindow, BrowserView, ipcMain, screen  } = require("electron");
const { autoUpdater } = require("electron-updater");
const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");
const userDataPath = app.getPath("userData");
if (!fs.existsSync(userDataPath)) {
    fs.mkdirSync(userDataPath, { recursive: true });
}
const profilePath = path.join(userDataPath, "profile.json");
const timetablePath = path.join(userDataPath, "streamTimetable.json");
let win;
let lockWindow;
// views
let streamView;
let classroomView;
let mahiView;
// state system
const appState = {
    stream: { view: null, loaded: false },
    classroom: { view: null, loaded: false },
    mahi: { view: null, loaded: false }
};
let activeApp = null;
function resizeView(view){
    if(!view || !win) return;
    const bounds = win.getBounds();
    view.setBounds({
        x: 250,
        y: 0,
        width: bounds.width - 250,
        height: bounds.height
    });
}
function hideAll(){
    if(!win) return;
    win.setBrowserView(null);
    activeApp = null;
}
function showView(appName){
    const data = appState[appName];
    if(!data || !data.view) return;
    hideAll();
    win.setBrowserView(data.view);
    const bounds = win.getBounds();
    data.view.setBounds({
        x: 250,
        y: 0,
        width: bounds.width - 250,
        height: bounds.height
    });
    activeApp = appName;
}
function loadApp(appName, url){
    const data = appState[appName];
    if(!data || !data.view) return;
    if(!data.loaded){
        data.view.webContents.loadURL(url);
        data.view.webContents.on("did-fail-load", (e, code, desc) => {
            console.log(`${appName.toUpperCase()} FAILED:`, code, desc);
        });
        data.loaded = true;
    }
}
function toggleApp(appName, url){
    const data = appState[appName];
    if(!data) return;
    if(!data.loaded){
        loadApp(appName, url);
        showView(appName);
        return;
    }
    if(activeApp === appName){
        hideAll();
        activeApp = null;
        return;
    }
    showView(appName);
}
function hasPIN(){
    if(!fs.existsSync(profilePath)){
        return false;
    }
    const profile = JSON.parse(
        fs.readFileSync(profilePath)
    );
    return (
        profile.pin &&
        profile.pin.length === 4
    );
}
function hasTimetable(){
    if (!fs.existsSync(timetablePath)) {
        return false;
    }
    try {
        const data = JSON.parse(
            fs.readFileSync(timetablePath, "utf8")
        );
        return data && Object.keys(data).length > 0;
    } catch (err) {
        console.error("❌ INVALID TIMETABLE JSON:", err);
        return false;
    }
}
function openVPN(){
    exec(
        'explorer.exe shell:AppsFolder\\29645FreeConnectedLimited.X-VPN-FreeUnlimitedVPNPr_qjvpctbgym0d0!App'
    );
}
let timetableWindow;
function openTimetableSetup(){
    timetableWindow = new BrowserWindow({
        frame:false,
        resizable:false,
        fullscreen:false,
        width:1920,
        height:1080,
        backgroundColor:"#020617",
        webPreferences:{
            nodeIntegration:true,
            contextIsolation:false,
            webSecurity:false
        }
    });
    timetableWindow.loadFile(
        path.join(__dirname, "timetableSetup.html")
    );
    timetableWindow.webContents.on("did-fail-load", (event, code, description) => {
        console.error("❌ TIMETABLE SETUP FAILED TO LOAD");
        console.error("Code:", code);
        console.error("Description:", description);
    });
    timetableWindow.webContents.on("did-finish-load", () => {
        console.log("✅ TIMETABLE SETUP HTML LOADED");
    });
    timetableWindow.once("ready-to-show",()=>{
    const display = screen.getPrimaryDisplay();
    timetableWindow.setBounds({
        x: display.bounds.x,
        y: display.bounds.y,
        width: display.bounds.width,
        height: display.bounds.height
    });
    timetableWindow.show();
});
}
function createLockWindow() {
    console.log("🔐 CREATING CALCULATOR LOCK WINDOW");
    lockWindow = new BrowserWindow({
        width: 350,
        height: 500,
        resizable: false,
        frame: false,
        alwaysOnTop: true,
        icon: path.join(__dirname, "assets-2", "schoollogo.ico"),
        title: "Stream Hub",
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });
    lockWindow.loadFile(
        path.join(__dirname, "calculator.html")
    );
    lockWindow.webContents.on("did-finish-load", () => {
        console.log("🔐 CALCULATOR LOADED SUCCESSFULLY");
    });
    lockWindow.webContents.on("did-fail-load", (event, code, description) => {
        console.error("❌ CALCULATOR FAILED TO LOAD");
        console.error("Code:", code);
        console.error("Description:", description);
    });
}
ipcMain.handle("save-profile", async (event, profile) => {
    try {
        fs.mkdirSync(userDataPath, { recursive: true });
        fs.writeFileSync(
            profilePath,
            JSON.stringify(profile, null, 4),
            "utf8"
        );
        console.log("✅ PROFILE SAVED:", profilePath);
        return true;
    } catch (err) {
        console.error("❌ FAILED TO SAVE PROFILE:", err);
        return false;
    }
});
ipcMain.handle("save-pin", async (event, pin) => {
    try {
        if (!fs.existsSync(profilePath)) {
            console.error("❌ PROFILE DOES NOT EXIST:", profilePath);
            return false;
        }
        const profile = JSON.parse(
            fs.readFileSync(profilePath, "utf8")
        );
        profile.pin = pin;
        fs.writeFileSync(
            profilePath,
            JSON.stringify(profile, null, 4),
            "utf8"
        );
        console.log("✅ PIN SAVED:", profilePath);
        return true;
    } catch (err) {
        console.error("❌ FAILED TO SAVE PIN:", err);
        return false;
    }
});
ipcMain.on("unlock", () => {
    if (lockWindow) {
        lockWindow.close();
        lockWindow = null;
    }
    createWindow();
});
console.log("REGISTERING OCR HANDLER");
ipcMain.handle("load-timetable", () => {
    if(fs.existsSync(timetablePath)){
        return JSON.parse(
            fs.readFileSync(timetablePath, "utf8")
        );
    }
    return null;
});
ipcMain.handle("scan-timetable", async (event, imagePath) => {
  try {
    console.log("🔥 MAIN RECEIVED SCAN:", imagePath);
    const { readTimetableImage } = require("./timetableVision");
    const week = await readTimetableImage(imagePath);
    console.log("✅ VISION RESULT:", week);
    return week;
  } catch (err) {
    console.error("❌ VISION FAILED:", err);
    return "VISION ERROR: " + err.message;
  }
});
ipcMain.handle("save-timetable", async (event, data) => {
  console.log("🔥 SAVE HANDLER RECEIVED");
  const { buildTimetable } = require("./timetableBuilder");
  const parsed = buildTimetable(data);
  fs.writeFileSync(timetablePath, JSON.stringify(parsed, null, 2));
  console.log("✅ SAVED PARSED TIMETABLE");
  return true;
});
ipcMain.handle("get-timetable", async () => {
    if (!fs.existsSync(timetablePath)) {
        return null;
    }
    try {
        return JSON.parse(
            fs.readFileSync(timetablePath, "utf8")
        );
    } catch (err) {
        console.error("❌ FAILED TO LOAD TIMETABLE:", err);
        return null;
    }
});
ipcMain.on("timetable-complete",()=>{
    if(timetableWindow){
        timetableWindow.close();
        timetableWindow=null;
    }
    createLockWindow();
});
function checkSetup(){
    if(!fs.existsSync(profilePath)){
        createSetupWindow();
        return false;
    }
    return true;
}
function hasCompletedSetup(){
    if(!fs.existsSync(profilePath)){
        return false;
    }
    try{
        const profile = JSON.parse(
            fs.readFileSync(profilePath)
        );
        return profile.setupComplete === true;
    }
    catch(err){
        console.log("Profile error:", err);
        return false;
    }
}
let setupWindow;
function createSetupWindow(){
    setupWindow = new BrowserWindow({
        frame:false,
        resizable:false,
        fullscreen:false,
        width:1920,
        height:1080,
        backgroundColor:"#020617",
        webPreferences:{
            nodeIntegration:true,
            contextIsolation:false
        }
    });
    setupWindow.loadFile("setup.html");
    setupWindow.once("ready-to-show",()=>{
        const display = screen.getPrimaryDisplay();
        setupWindow.setBounds({
            x: display.bounds.x,
            y: display.bounds.y,
            width: display.bounds.width,
            height: display.bounds.height
        });
        setupWindow.show();
    });
    ipcMain.once("setup-complete",()=>{
    if(setupWindow){
        setupWindow.close();
        setupWindow=null;
    }
    if(!hasPIN()){
        createPINSetup();
    }
    else{
        createLockWindow();
    }
});
    setupWindow.on("closed",()=>{
        setupWindow=null;
    });
}
function createWindow(){
    win = new BrowserWindow({
        width: 1600,
        height: 900,
        fullscreen: true,
        frame: false,
        title: "STREAM HUB",
        icon: __dirname + "/assets-2/schoollogo.ico",
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });
    win.loadFile("stream.html");
    // CREATE VIEWS
    streamView = new BrowserView({
        webPreferences: { nodeIntegration: false, contextIsolation: true }
    });
    classroomView = new BrowserView({
        webPreferences: { nodeIntegration: false, contextIsolation: true }
    });
    mahiView = new BrowserView({
        webPreferences: { nodeIntegration: false, contextIsolation: true }
    });
    mahiView.webContents.on("did-finish-load", () => {
    console.log("[MAHI] Loaded — waiting for dashboard data...");
    setTimeout(() => {
        getMahiStats();
    }, 2500);
});
setInterval(() => {
    if (
        mahiView &&
        !mahiView.webContents.isLoading()
    ) {
        getMahiStats();
    }
}, 60000);
    appState.stream.view = streamView;
    appState.classroom.view = classroomView;
    appState.mahi.view = mahiView;
    hideAll();
    // IPC
    ipcMain.on("show-app", (event, appName) => {
        if(appName === "stream")
            toggleApp("stream", "https://stream.school.kiwi");
        else if(appName === "classroom")
            toggleApp("classroom", "https://classroom.google.com");
        else if(appName === "mahi")
            toggleApp("mahi", "https://app.mymahi.com/my-school/timetable");
    });
    ipcMain.on("shutdown-app", () => {
        app.quit();
    });
    ipcMain.handle("get-profile", () => {
        try {
            if (fs.existsSync(profilePath)) {
                return JSON.parse(
                    fs.readFileSync(profilePath, "utf8")
                );
            }
            return {};
        }  catch (err) {
            console.error("❌ FAILED TO LOAD PROFILE:", err);
            return {};
        }
    });
    ipcMain.on("open-vpn", () => {
        openVPN();
    });
    win.on("resize", () => {
        [streamView, classroomView, mahiView].forEach(v => {
            if(v && v.getBounds().width > 0){
                resizeView(v);
            }
        });
    });
}
// ============================================================
// STREAM HUB — AUTO UPDATER
// ============================================================
function setupAutoUpdater() {
    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;
    autoUpdater.on("checking-for-update", () => {
        console.log("🔄 STREAM HUB: Checking for updates...");
    });
    autoUpdater.on("update-available", (info) => {
        console.log("🚀 STREAM HUB: Update available:", info.version);
        if (win && !win.isDestroyed()) {
            win.webContents.send("update-available", {
                version: info.version
            });
        }
    });
    autoUpdater.on("download-progress", (progress) => {
        console.log(
            `⬇️ UPDATE: ${progress.percent.toFixed(1)}%`
        );
        if (win && !win.isDestroyed()) {
            win.webContents.send("update-progress", {
                percent: progress.percent
            });
        }
    });
    autoUpdater.on("update-downloaded", (info) => {
        console.log("✅ STREAM HUB: Update downloaded:", info.version);
        if (win && !win.isDestroyed()) {
            win.webContents.send("update-downloaded", {
                version: info.version
            });
        }
    });
    autoUpdater.on("update-not-available", () => {
        console.log("✅ STREAM HUB: Already up to date.");
    });
    autoUpdater.on("error", (error) => {
        console.error("❌ STREAM HUB UPDATE ERROR:", error);
    });
    // Don't check while running the raw development version
    if (!app.isPackaged) {
        console.log("🛠️ Development mode — updater disabled.");
        return;
    }
    // Give the app a moment to finish loading
    setTimeout(() => {
        autoUpdater.checkForUpdatesAndNotify();
    }, 5000);
}
app.whenReady().then(()=>{
    setupAutoUpdater();
    if(!hasCompletedSetup()){
        createSetupWindow();
    }
    else if(!hasPIN()){
        createPINSetup();
    }
    else if(!hasTimetable()){
        openTimetableSetup();
    }
    else{
        createLockWindow();
    }
});
// ============================================================
// MYMAHI — LIVE ATTENDANCE + NCEA DATA
// ============================================================
async function getMahiStats() {
    console.log("[MAHI] ===============================");
    console.log("[MAHI] GETTING LIVE DATA");
    console.log("[MAHI] mahiView:", !!mahiView);
    console.log("[MAHI] URL:", mahiView?.webContents?.getURL());
    console.log("[MAHI] ===============================");
    if (!mahiView || !mahiView.webContents) {
        console.error("[MAHI] ❌ No MyMahi BrowserView");
        return;
    }
    try {
        const stats = await mahiView.webContents.executeJavaScript(`
            (async () => {
                console.log("[MAHI PAGE] Starting GraphQL request");
                const query = \`
                    query StreamHubStats {
                        me {
                            id
                            currentMySchoolProvider {
                                id
                                assessmentResultsList {
                                    id
                                    type
                                    number
                                    version
                                    level
                                    credits
                                    weighting
                                    points
                                    title
                                    description
                                    purpose
                                    subField
                                    date
                                    subject
                                    result
                                    comment
                                }
                                attendanceSummary(
                                    start: "2026-01-01"
                                    end: "2026-12-31"
                                ) {
                                    halfDaysJustified
                                    halfDaysUnjustified
                                    halfDaysPresent
                                    halfDaysTotal
                                    standing
                                }
                            }
                        }
                    }
                \`;
                const response = await fetch("/graphql", {
                    method: "POST",
                    credentials: "include",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        query
                    })
                });
                console.log(
                    "[MAHI PAGE] GraphQL HTTP:",
                    response.status
                );
                if (!response.ok) {
                    throw new Error(
                        "GraphQL HTTP " + response.status
                    );
                }
                const json = await response.json();
                console.log(
                    "[MAHI PAGE] GraphQL response:",
                    json
                );
                if (json.errors) {
                    throw new Error(
                        JSON.stringify(json.errors)
                    );
                }
                const provider =
                    json?.data?.me?.currentMySchoolProvider;
                if (!provider) {
                    throw new Error(
                        "currentMySchoolProvider not found"
                    );
                }
                // ============================================
                // ATTENDANCE
                // ============================================
                const a = provider.attendanceSummary;
                const present =
                    Number(a?.halfDaysPresent || 0);
                const total =
                    Number(a?.halfDaysTotal || 0);
                const justified =
                    Number(a?.halfDaysJustified || 0);
                const unjustified =
                    Number(a?.halfDaysUnjustified || 0);
                const percentage =
                    total > 0
                        ? Math.round((present / total) * 100)
                        : 0;
                // ============================================
                // NCEA RESULTS
                // ============================================
                const results =
                    provider.assessmentResultsList || [];
                const nzqaResults = results.filter(r => {
                    const level = Number(r.level);
                    return (
                        (r.type === "A" || r.type === "U") &&
                        level >= 1 &&
                        level <= 6 &&
                        Number(r.credits) > 0
                    );
                });
                let excellence = 0;
                let merit = 0;
                let achieved = 0;
                for (const r of nzqaResults) {
                    const credits =
                        Number(r.credits) || 0;
                    const result =
                        String(r.result || "")
                            .toLowerCase();
                    if (
                        result.includes("excellence") ||
                        result.includes("kairangi")
                    ) {
                        excellence += credits;
                    } else if (
                        result.includes("merit") ||
                        result.includes("kaiaka")
                    ) {
                        merit += credits;
                    } else if (
                        result === "achieved" ||
                        result.includes("paetae")
                    ) {
                        achieved += credits;
                    }
                }
                // ============================================
                // RETURN
                // ============================================
                return {
                    attendance: {
                        percentage,
                        present,
                        total,
                        justified,
                        unjustified,
                        standing:
                            a?.standing || "UNKNOWN"
                    },
                    credits: {
                        excellence,
                        merit,
                        achieved,
                        total:
                            excellence +
                            merit +
                            achieved
                    },
                    rawResults: nzqaResults
                };
            })()
        `);
        console.log(
            "[MAHI] ✅ LIVE DATA RECEIVED:",
            stats
        );
        if (win && !win.isDestroyed()) {
            win.webContents.send(
                "mahi-stats",
                stats
            );
        }
    } catch (error) {
        console.error(
            "[MAHI] ❌ LIVE DATA FAILED:",
            error
        );
    }
}
console.log("[MAHI] ===============================");
console.log("[MAHI] Starting live data extraction");
console.log("[MAHI] mahiView exists:", !!mahiView);
console.log("[MAHI] webContents exists:", !!mahiView?.webContents);
console.log("[MAHI] URL:", mahiView?.webContents?.getURL());
console.log("[MAHI] ===============================");
function createPINSetup(){
    let pinWindow = new BrowserWindow({
        width:520,
        height:500,
        frame:false,
        resizable:false,
        webPreferences:{
            nodeIntegration:true,
            contextIsolation:false
        }
    });
    pinWindow.loadFile("pinSetup.html");
    ipcMain.once("pin-created",()=>{
    pinWindow.close();
    if(!hasTimetable()){
        openTimetableSetup();
    }
    else{
        createLockWindow();
    }
});
}
app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
});