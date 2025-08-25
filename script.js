const readyBtn = document.querySelector("#begin");
const startBtn = document.querySelector("#start");
const cancelBtn = document.querySelector("#cancel");
const notification = document.querySelector("#notification");
const modal = document.querySelector("#modal");

// Show modal
readyBtn.addEventListener("click", () => {
    notification.classList.add("active");
});

// Start button → go to next page
startBtn.addEventListener("click", () => {
    window.location.href = "main.html"; // or menu.html
});

// Cancel button → hide modal
cancelBtn.addEventListener("click", () => {
    notification.classList.remove("active");
});

// Close when clicking outside modal
notification.addEventListener("click", (e) => {
    if (e.target === notification) {
        notification.classList.remove("active");
    }
});

// Close on Escape key
document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
        notification.classList.remove("active");
    }
});
