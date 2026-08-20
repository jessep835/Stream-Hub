const fs = require("fs");
const path = require("path");
const {ipcRenderer} = require("electron");
const profilePath = path.join(
    __dirname,
    "profile.json"
);
document.getElementById("save").onclick = ()=>{
    const a = document.getElementById("pin1").value;
    const b = document.getElementById("pin2").value;
    if(a.length !== 4 || a !== b){
        alert("PINs don't match");
        return;
    }
    const profile = JSON.parse(
        fs.readFileSync(profilePath)
    );
    profile.pin = a;
    fs.writeFileSync(
        profilePath,
        JSON.stringify(profile,null,4)
    );
    ipcRenderer.send("pin-created");
};