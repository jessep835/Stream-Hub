const fs = require("fs");
const path = require("path");
const profilePath = path.join(__dirname, "profile.json");
let userProfile = {
    name:"User"
};
if(fs.existsSync(profilePath)){
    userProfile = JSON.parse(
        fs.readFileSync(profilePath)
    );
}
window.userProfile = userProfile;
window.addEventListener("DOMContentLoaded",()=>{
    const name = userProfile.name;
    document.querySelectorAll("[data-user-name]")
    .forEach(el=>{
        el.innerText = name;
    });
    document.title = `STREAM HUB - ${name}`;
});