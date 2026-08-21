const { ipcRenderer } = require("electron");
const nameInput = document.getElementById("nameInput");
const continueBtn = document.getElementById("continueBtn");
continueBtn.onclick = async () => {
    const name = nameInput.value.trim();
    if (!name) {
        nameInput.style.boxShadow = "0 0 20px red";
        return;
    }
    const profile = {
        name: name,
        setupComplete: true,
        pin: null,
        created: new Date().toISOString(),
        settings: {
            theme: "cyan",
            sound: true
        }
    };
    const saved = await ipcRenderer.invoke(
        "save-profile",
        profile
    );
    if (!saved) {
        continueBtn.innerHTML = "Save Failed — Try Again";
        return;
    }
    continueBtn.innerHTML = "Loading STREAM HUB...";
    setTimeout(() => {
        ipcRenderer.send("setup-complete");
    }, 500);
};
nameInput.addEventListener("keydown", e => {
    if (e.key === "Enter") {
        continueBtn.click();
    }
});