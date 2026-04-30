document.addEventListener("DOMContentLoaded", () => {

// ================= GLOBALS =================
let isShift = false;
let isDeg = true;
const display = document.getElementById("display");

// ================= INIT =================
display.focus();

// ================= MODE =================
document.getElementById('degBtn').onclick = () => toggleMode(true);
document.getElementById('radBtn').onclick = () => toggleMode(false);
document.getElementById('shiftBtn').onclick = () => {
    isShift = !isShift;
    document.getElementById('shiftBtn').classList.toggle("active", isShift);
};

function toggleMode(deg) {
    isDeg = deg;
    document.getElementById('degBtn').classList.toggle('active', deg);
    document.getElementById('radBtn').classList.toggle('active', !deg);
}

// ================= INSERT =================
function insertAtCursor(val) {
    display.focus();

    let start = display.selectionStart ?? display.value.length;
    let end = display.selectionEnd ?? display.value.length;

    display.value =
        display.value.slice(0, start) +
        val +
        display.value.slice(end);

    display.setSelectionRange(start + val.length, start + val.length);
}

// ================= PRESS =================
window.press = function(val) {
    if (val === "×") val = "*";
    if (val === "÷") val = "/";
    if (val === "π") val = "pi";

    insertAtCursor(val);
}

// ================= CLEAR =================
window.clearDisplay = function() {
    display.value = "";
    display.focus();
}

// ================= BACKSPACE =================
window.backspace = function() {
    let start = display.selectionStart ?? display.value.length;
    let end = display.selectionEnd ?? display.value.length;

    if (start === end && start > 0) {
        display.value =
            display.value.slice(0, start - 1) +
            display.value.slice(end);

        display.setSelectionRange(start - 1, start - 1);
    } else {
        display.value =
            display.value.slice(0, start) +
            display.value.slice(end);

        display.setSelectionRange(start, start);
    }
}

// ================= FIX BRACKETS =================
function fixExpression(exp) {
    let open = (exp.match(/\(/g) || []).length;
    let close = (exp.match(/\)/g) || []).length;
    return exp + ')'.repeat(Math.max(0, open - close));
}

// ================= CALCULATE =================
window.calculate = function() {
    let exp = fixExpression(display.value);

    fetch("/calculate", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
            expression: exp,
            mode: isDeg ? "DEG" : "RAD"
        })
    })
    .then(res => res.json())
    .then(data => {
        display.value = data.result;

        if (data.result !== "Error") {
            addToHistory(exp, data.result);
        }
    });
}

// ================= KEYBOARD =================
document.addEventListener("keydown", (e) => {

    if (e.key === "Enter" || e.key === "=") {
        e.preventDefault();
        calculate();
    }

    else if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        press(e.key);
    }

    else if (["+", "-", "*", "/", "."].includes(e.key)) {
        e.preventDefault();
        press(e.key);
    }

    else if (e.key === "(" || e.key === ")") {
        e.preventDefault();
        press(e.key);
    }

    else if (e.key === "Backspace") {
        e.preventDefault();
        backspace();
    }

    else if (e.key === "Escape") {
        e.preventDefault();
        clearDisplay();
    }

    else if (e.key === "ArrowLeft") {
        let pos = Math.max(0, display.selectionStart - 1);
        display.setSelectionRange(pos, pos);
    }

    else if (e.key === "ArrowRight") {
        let pos = Math.min(display.value.length, display.selectionStart + 1);
        display.setSelectionRange(pos, pos);
    }
});

// ================= MEMORY =================
window.mem = function(op) {
    const val = parseFloat(display.value) || 0;

    fetch("/memory", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ op, value: val })
    })
    .then(res => res.json())
    .then(data => {
        display.value = data.result;
    });
}

// ================= SHIFT BUTTONS =================
document.querySelectorAll('.shifted').forEach(btn => {
    btn.addEventListener("click", () => {
        const main = btn.dataset.main;
        const shift = btn.dataset.shift;

        press(isShift ? shift : main);
    });
});

// ================= GRAPH =================
window.plotGraph = function() {
    fetch("/plot", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ expression: display.value })
    })
    .then(res => res.json())
    .then(data => {
        if (data.image) {
            document.getElementById("graph").src =
                data.image + "?t=" + Date.now();
            document.getElementById("graphCont").style.display = "block";
        }
    });
}

// ================= SOLVE =================
window.solveEquation = function() {
    fetch("/solve", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ expression: display.value })
    })
    .then(res => res.json())
    .then(data => {
        display.value = data.result;
    });
}

// ================= HISTORY =================
function addToHistory(exp, res) {
    let list = document.getElementById("historyList");

    let item = document.createElement("li");
    item.textContent = exp + " = " + res;

    item.onclick = () => {
        display.value = exp;
        display.focus();
    };

    list.prepend(item);
}

// ================= VOICE INPUT =================
function startVoice() {

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
        alert("Voice not supported in this browser");
        return;
    }

    const recognition = new SpeechRecognition();

    recognition.lang = "en-US";
    recognition.start();

    recognition.onstart = () => {
        console.log("Listening...");
    };

    recognition.onresult = (event) => {
        let speech = event.results[0][0].transcript.toLowerCase();

        console.log("You said:", speech);

        // Convert speech → math expression
        speech = convertSpeechToMath(speech);

        // Put in display
        display.value = speech;

        // Auto calculate (optional)
        calculate();
    };

    recognition.onerror = (event) => {
        console.log("Error:", event.error);
    };
}

function convertSpeechToMath(text) {

    return text
        .replace(/plus/g, "+")
        .replace(/minus/g, "-")
        .replace(/into|multiply|times/g, "*")
        .replace(/divide|by/g, "/")
        .replace(/power/g, "**")
        .replace(/square root/g, "sqrt")
        .replace(/sin/g, "sin")
        .replace(/cos/g, "cos")
        .replace(/tan/g, "tan")
        .replace(/pi/g, "pi")
        .replace(/ /g, "");
}

// ================= TOGGLE HISTORY =================
window.toggleHistory = function() {
    let h = document.getElementById("history");

    if (h.style.display === "none" || h.style.display === "") {
        h.style.display = "block";
    } else {
        h.style.display = "none";
    }
}

});