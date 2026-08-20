console.log("timetableSetup.js loaded");
console.log(typeof require);
const { ipcRenderer, webUtils } = require("electron");
let week1Image = null;
let week2Image = null;
function sleep(ms){
    return new Promise(resolve=>setTimeout(resolve,ms));
}
document.getElementById("week1Image").onchange = e => {
    week1Image = e.target.files[0];
};
document.getElementById("week2Image").onchange = e => {
    week2Image = e.target.files[0];
};
async function scanTimetable(){
    try {
        console.log("1. SCAN BUTTON PRESSED");
        const week1Input = document.getElementById("week1Image");
        const week2Input = document.getElementById("week2Image");
        console.log("2. INPUTS:", week1Input, week2Input);
        const week1 = week1Input.files[0];
        const week2 = week2Input.files[0];
        console.log("3. FILES:", week1, week2);
        if(!week1 || !week2){
            console.log("4. Missing file");
            alert("Upload both timetable images");
            return;
        }
        console.log("5. Getting paths");
        const week1Path = webUtils.getPathForFile(week1);
        const week2Path = webUtils.getPathForFile(week2);
        console.log("6. PATHS:", week1Path, week2Path);
        console.log("7. INVOKING MAIN WEEK 1");
        const text1 = await ipcRenderer.invoke(
            "scan-timetable",
            week1Path
        );
        console.log("8. WEEK 1 OCR RETURNED:", text1);
        console.log("Waiting before Week 2...");
        await sleep(5000);
        console.log("9. INVOKING MAIN WEEK 2");
        const text2 = await ipcRenderer.invoke(
            "scan-timetable",
            week2Path
        );
        console.log("10. WEEK 2 OCR RETURNED:", text2);
        console.log("11. SAVING TIMETABLE");
        await ipcRenderer.invoke(
            "save-timetable",
            {
                week1: text1,
                week2: text2
            }
        );
        console.log("12. SAVE COMPLETE");
        document.getElementById("status").innerText =
            "OCR complete.";
        // Tell main process we're finished
        ipcRenderer.send("timetable-complete");
    } catch(err) {
        console.error("❌ TIMETABLE SCAN FAILED:");
        console.error(err);
        document.getElementById("status").innerText =
            "OCR failed. Check console.";
    }
}
document.addEventListener("DOMContentLoaded", () => {
    const btn = document.getElementById("continueBtn");
    console.log("Found button:", btn);
    if(!btn){
        console.error("❌ Scan button not found!");
        return;
    }
    btn.addEventListener("click", scanTimetable);
});