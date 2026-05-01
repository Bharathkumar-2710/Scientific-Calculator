document.addEventListener("DOMContentLoaded", () => {

// ================= GLOBALS =================
let isShift = false;
let isDeg = true;
let memory = 0.0;
const HISTORY_KEY = "calcHistory";
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
    nerdamer.set('ANGLE_MODE', deg ? 'DEGREE' : 'RADIANS');
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

    try {
        let result = nerdamer(exp).evaluate();
        let resText = result.text();
        display.value = resText;

        if (resText !== "Error") {
            addToHistory(exp, resText);
        }
    } catch (e) {
        display.value = "Error";
    }
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

    if (op === "M+") memory += val;
    else if (op === "M-") memory -= val;
    else if (op === "MR") display.value = memory.toString();
    else if (op === "MC") memory = 0;
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
    let exp = display.value;
    try {
        let func = nerdamer(exp);
        let x_vals = [];
        let y_vals = [];
        for (let x = -10; x <= 10; x += 0.1) {
            try {
                let y = func.evaluate({x: x}).text();
                x_vals.push(x);
                y_vals.push(parseFloat(y));
            } catch (e) {
                // skip invalid points
            }
        }
        let data = [{x: x_vals, y: y_vals, type: 'scatter'}];
        Plotly.newPlot('graph', data);
        document.getElementById('graphCont').style.display = 'block';
    } catch (e) {
        alert("Error plotting: " + e.message);
    }
}

// ================= SOLVE =================
window.solveEquation = function() {
    let exp = display.value;
    try {
        let result = nerdamer.solve(exp, 'x');
        display.value = result.text();
        addToHistory(exp, result.text());
    } catch (e) {
        display.value = "Error";
    }
}

// ================= HISTORY =================
function addToHistory(exp, res) {
    let list = document.getElementById("historyList");
    if (!list) return;

    let item = document.createElement("li");
    item.textContent = exp + " = " + res;

    item.onclick = () => {
        display.value = exp;
        display.focus();
    };

    list.prepend(item);

    // Save to local storage
    let history = JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
    history.unshift(exp + " = " + res);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
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

function saveHistory() {
    let items = [];
    document.querySelectorAll("#historyList li").forEach(li => {
        items.push(li.innerHTML);
    });

    localStorage.setItem(HISTORY_KEY, JSON.stringify(items));
}

function loadHistory() {
    let data = localStorage.getItem(HISTORY_KEY);
    if (!data) return;

    let items = JSON.parse(data);
    let list = document.getElementById("historyList");

    items.forEach(item => {
        let li = document.createElement("li");
        li.textContent = item;

        li.onclick = () => {
            display.value = item.split(" = ")[0];
            display.focus();
        };

        list.appendChild(li);
    });
}

window.clearHistory = function() {
    let list = document.getElementById("historyList");
    if (list) {
        list.innerHTML = "";
    }
    localStorage.removeItem(HISTORY_KEY);
}

loadHistory();

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