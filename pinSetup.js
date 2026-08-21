const { ipcRenderer } = require("electron");
document.getElementById("save").onclick = async () => {
    const a = document.getElementById("pin1").value;
    const b = document.getElementById("pin2").value;
    if (a.length !== 4 || a !== b) {
        alert("PINs don't match");
        return;
    }
    const saved = await ipcRenderer.invoke(
        "save-pin",
        a
    );
    if (!saved) {
        alert("Could not save PIN. Restart Stream Hub.");
        return;
    }
    ipcRenderer.send("pin-created");
};