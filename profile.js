const { ipcRenderer } = require("electron");
let userProfile = {
    name: "User"
};
(async () => {
    try {
        const profile = await ipcRenderer.invoke("get-profile");
        if (profile && profile.name) {
            userProfile = profile;
        }
    } catch (err) {
        console.error("❌ FAILED TO LOAD PROFILE:", err);
    }
    window.userProfile = userProfile;
    document.querySelectorAll("[data-user-name]")
        .forEach(el => {
            el.innerText = userProfile.name;
        });
    document.title = `STREAM HUB - ${userProfile.name}`;
})();