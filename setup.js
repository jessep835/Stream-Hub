const fs = require("fs");
const path = require("path");
const { ipcRenderer } = require("electron");
const profilePath = path.join(__dirname, "profile.json");
const nameInput = document.getElementById("nameInput");
const continueBtn = document.getElementById("continueBtn");
continueBtn.onclick = () => {
    const name = nameInput.value.trim();
    if(!name){
        nameInput.style.boxShadow = "0 0 20px red";
        return;
    }
    const profile = {
        name:name,
        setupComplete:true,
        pin:null,
        created:new Date().toISOString(),
        settings:{
            theme:"cyan",
            sound:true
        }
    };
    fs.writeFileSync(
        profilePath,
        JSON.stringify(profile,null,4)
    );
    continueBtn.innerHTML="Loading STREAM HUB...";
    setTimeout(()=>{
        ipcRenderer.send("setup-complete");
    },1000);
};
nameInput.addEventListener("keydown",e=>{
    if(e.key==="Enter"){
        continueBtn.click();
    }
});