// =====================================
// 🚀 STUDENT ENGINE - CORE INITIALIZATION
// =====================================
const wrapper = document.getElementById('canvas-wrapper');
const canvas = new fabric.Canvas('student-canvas', {
    selection: false, // 🔒 Strict Read-Only Mode
    isDrawingMode: false,
    width: wrapper.clientWidth,
    height: wrapper.clientHeight,
    backgroundColor: '#ffffff'
});

// Auto-Resize Canvas on Window/Mobile Rotation
window.addEventListener('resize', () => {
    canvas.setWidth(wrapper.clientWidth);
    canvas.setHeight(wrapper.clientHeight);
    canvas.renderAll();
});

// =====================================
// 🎨 DARK MODE & THEME SYNC
// =====================================
const btnTheme = document.getElementById('btn-theme');

window.applyStudentTheme = function(forceTheme) {
    let isDark;
    if (forceTheme) {
        if (forceTheme === 'dark') document.documentElement.classList.add('dark');
        else document.documentElement.classList.remove('dark');
        isDark = (forceTheme === 'dark');
    } else {
        document.documentElement.classList.toggle('dark');
        isDark = document.documentElement.classList.contains('dark');
    }

    btnTheme.innerHTML = isDark ? '<i class="fa-solid fa-sun text-lg"></i>' : '<i class="fa-solid fa-moon text-lg"></i>';
    canvas.backgroundColor = isDark ? '#0f172a' : '#ffffff';
    
    // Auto-invert blank slides and strokes for dark mode readability
    canvas.getObjects().forEach(obj => {
        if (obj.isSlide && obj.type === 'rect') {
            obj.set('fill', isDark ? '#1e293b' : '#ffffff');
        } else if (obj.type === 'path') {
            if (isDark && obj.stroke === '#0f172a') obj.set('stroke', '#ffffff');
            else if (!isDark && obj.stroke === '#ffffff') obj.set('stroke', '#0f172a');
        }
    });
    canvas.renderAll();
    localStorage.setItem('student_theme', isDark ? 'dark' : 'light');
};

btnTheme.addEventListener('click', () => window.applyStudentTheme());

if (localStorage.getItem('student_theme') === 'dark') {
    window.applyStudentTheme('dark');
}

// =====================================
// 📡 THE FIREBASE SYNC BRIDGE (REAL-TIME RECEIVER)
// =====================================
import { doc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { db } from "../pwos-studio/firebase-config.js"; // Adjust path if needed

let currentPdfDoc = null;
let currentSlideData = {};

// 1. Read Room ID from URL
const urlParams = new URLSearchParams(window.location.search);
const roomId = urlParams.get('roomId');
const courseName = urlParams.get('course');

if (courseName) {
    document.getElementById('class-title').innerText = decodeURIComponent(courseName);
}

// 2. The Real-time Listener
if (roomId) {
    const sessionRef = doc(db, "live_sessions", roomId);

    onSnapshot(sessionRef, (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            
            // Update Educator Info
            if (data.educatorName) {
                document.getElementById('educator-name').innerText = data.educatorName;
            }

            // Sync Canvas Data (If educator pushed a new state)
            if (data.canvasState) {
                window.syncEducatorBoard(data.canvasState, data.metaContent);
            }
            
            // Handle Stream end
            if (data.status === 'ended') {
                alert("The educator has ended the live session.");
                window.close(); // Close the student slate tab
            }
        } else {
             document.getElementById('educator-name').innerText = "Session Not Found";
        }
    });
} else {
    document.getElementById('educator-name').innerText = "Invalid Room ID";
}

// The Core Rendering Logic
window.syncEducatorBoard = function(jsonContent, metaContent) {
    if (!jsonContent) return;

    // 1. Process Canvas Strokes & Objects
    canvas.loadFromJSON(jsonContent, function() {
        // Lock all incoming objects to prevent student tampering
        canvas.getObjects().forEach(obj => {
            obj.set({ selectable: false, evented: false, hasControls: false, lockMovementX: true, lockMovementY: true });
        });
        canvas.renderAll();
        // Check theme inversion immediately after rendering
        window.applyStudentTheme(document.documentElement.classList.contains('dark') ? 'dark' : 'light');
    });

    // 2. Process Background Slide/PDF
    if (metaContent) {
        try {
            const meta = JSON.parse(metaContent);
            // Additional logic for rendering PDF slides can go here
            console.log("Meta Content Received:", meta);
        } catch(e) {
            console.error("Sync parsing error:", e);
        }
    }
};

// =====================================
// 📱 MOBILE INTERACTION PANEL & DYNAMIC CANVAS
// =====================================
const rightPanel = document.getElementById('right-panel');
const chatSection = document.getElementById('chat-section');
const btnTogglePanel = document.getElementById('btn-toggle-panel');
const togglePanelIcon = document.getElementById('toggle-panel-icon');
const webcamContainer = document.getElementById('webcam-container');
const webcamPlaceholder = document.getElementById('webcam-placeholder');

let isPanelHidden = false;
let isDraggingCam = false;
let camOffsetX = 0, camOffsetY = 0;

btnTogglePanel.addEventListener('click', () => {
    isPanelHidden = !isPanelHidden;
    const isMobile = window.innerWidth < 640; // 🚀 Detect Mobile Screen
    
    if (isPanelHidden) {
        // 1. Hide Chat
        chatSection.style.display = 'none';
        
        // 2. Shrink Panel
        rightPanel.classList.remove('w-full', 'sm:w-[350px]', 'md:w-[400px]');
        rightPanel.classList.add('w-14');
        
        togglePanelIcon.classList.replace('fa-arrow-right-to-bracket', 'fa-message');
        
        // 3. Floating Webcam
        document.body.appendChild(webcamContainer);
        webcamContainer.className = 'absolute z-50 shadow-2xl rounded-2xl overflow-hidden cursor-grab border border-slate-700 bg-slate-900 flex flex-col items-center justify-center text-slate-500 select-none transition-all';
        
        // 🚀 THE FIX: Chhota camera for Mobile, Bada camera for Desktop
        if (isMobile) {
            webcamContainer.style.width = '120px'; 
            webcamContainer.style.height = '90px'; 
            webcamContainer.style.top = '10px'; 
            webcamContainer.style.right = '65px'; // Just beside the toolbar
        } else {
            webcamContainer.style.width = '240px'; 
            webcamContainer.style.height = '160px'; 
            webcamContainer.style.top = '20px'; 
            webcamContainer.style.right = '80px'; 
        }
        webcamContainer.style.left = 'auto';

    } else {
        // Show Chat & Reset
        chatSection.style.display = 'flex';
        rightPanel.classList.remove('w-14');
        rightPanel.classList.add('w-full', 'sm:w-[350px]', 'md:w-[400px]');
        togglePanelIcon.classList.replace('fa-message', 'fa-arrow-right-to-bracket');
        
        webcamPlaceholder.appendChild(webcamContainer);
        webcamContainer.className = 'h-full w-full flex flex-col items-center justify-center text-slate-500 select-none relative';
        webcamContainer.removeAttribute('style'); 
    }

    // 🚀 Smooth Resize Sync
    let startTime = Date.now();
    let smoothResize = setInterval(() => {
        canvas.setWidth(wrapper.clientWidth);
        canvas.renderAll();
        if (Date.now() - startTime > 320) clearInterval(smoothResize);
    }, 15);
});

// 🚀 THE MAGIC AUTOLOAD FIX: Phone par app khulte hi panel automatically band ho jayega
if (window.innerWidth < 640) {
    setTimeout(() => {
        if (!isPanelHidden) btnTogglePanel.click();
    }, 400); // Thoda delay taaki UI pehle load ho jaye
}

// =====================================
// 🖐️ DRAGGABLE WEBCAM LOGIC (HYBRID)
// =====================================
function startDragCam(e) {
    if (!isPanelHidden) return; 
    isDraggingCam = true;
    const clientX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
    const clientY = e.type.includes('mouse') ? e.clientY : e.touches[0].clientY;
    camOffsetX = clientX - webcamContainer.getBoundingClientRect().left;
    camOffsetY = clientY - webcamContainer.getBoundingClientRect().top;
    webcamContainer.classList.replace('cursor-grab', 'cursor-grabbing');
}

function dragCam(e) {
    if (!isDraggingCam) return;
    if (e.type.includes('touch')) e.preventDefault(); // Stop mobile screen scrolling
    const clientX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
    const clientY = e.type.includes('mouse') ? e.clientY : e.touches[0].clientY;
    webcamContainer.style.left = (clientX - camOffsetX) + 'px';
    webcamContainer.style.top = (clientY - camOffsetY) + 'px';
    webcamContainer.style.right = 'auto'; 
}

function endDragCam() {
    if (!isDraggingCam) return;
    isDraggingCam = false;
    webcamContainer.classList.replace('cursor-grabbing', 'cursor-grab');
}

webcamContainer.addEventListener('mousedown', startDragCam);
window.addEventListener('mousemove', dragCam, { passive: false });
window.addEventListener('mouseup', endDragCam);

webcamContainer.addEventListener('touchstart', startDragCam, { passive: true });
window.addEventListener('touchmove', dragCam, { passive: false });
window.addEventListener('touchend', endDragCam);

// =====================================
// 🙋‍♂️ STUDENT UTILITIES (RAISE HAND & VIDEO SETTINGS)
// =====================================

// Raise Hand Logic
const btnRaiseHand = document.getElementById('btn-raise-hand');
const handIndicator = document.getElementById('hand-indicator');
let isHandRaised = false;

btnRaiseHand.addEventListener('click', () => {
    isHandRaised = !isHandRaised;
    if (isHandRaised) {
        handIndicator.classList.remove('hidden');
        btnRaiseHand.classList.replace('text-amber-500', 'text-white');
        btnRaiseHand.classList.replace('hover:bg-amber-50', 'bg-amber-500');
        console.log("Hand Raised!");
    } else {
        handIndicator.classList.add('hidden');
        btnRaiseHand.classList.replace('text-white', 'text-amber-500');
        btnRaiseHand.classList.replace('bg-amber-500', 'hover:bg-amber-50');
        console.log("Hand Lowered.");
    }
});

// Video Toggle Logic
const toggleVideoCheck = document.getElementById('toggle-video');
const liveVideoEl = document.getElementById('student-live-video');
const offlineUiEl = document.getElementById('cam-offline-ui');

toggleVideoCheck.addEventListener('change', (e) => {
    if (e.target.checked) {
        liveVideoEl.classList.remove('hidden');
        offlineUiEl.classList.add('hidden');
    } else {
        liveVideoEl.classList.add('hidden');
        offlineUiEl.classList.remove('hidden');
    }
});

// =====================================
// 📊 INTERACTIVE POLLING RECEIVER
// =====================================
const pollOverlay = document.getElementById('poll-overlay');

// Simulated Function to receive Polls from Educator
window.triggerPoll = function(question, optionsArray) {
    document.getElementById('poll-question-text').innerText = question;
    document.getElementById('poll-question-text').classList.remove('hidden');
    
    const container = document.getElementById('poll-options-container');
    container.innerHTML = ''; 
    
    optionsArray.forEach((opt, index) => {
        container.innerHTML += `
            <button onclick="window.submitPollAnswer(${index})" class="w-full text-left px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-brand-blue hover:text-white hover:border-brand-blue transition-colors shadow-sm">
                ${String.fromCharCode(65 + index)}. ${opt}
            </button>
        `;
    });

    pollOverlay.classList.remove('hidden');
};

window.submitPollAnswer = function(selectedIndex) {
    const container = document.getElementById('poll-options-container');
    container.innerHTML = `<div class="text-center py-6"><i class="fa-solid fa-spinner fa-spin text-2xl text-brand-blue mb-2"></i><br><span class="text-xs font-bold text-slate-500">Submitting answer...</span></div>`;
    
    setTimeout(() => {
        pollOverlay.classList.add('hidden');
        console.log(`Poll Answer Submitted: Option ${selectedIndex + 1}`);
    }, 1500);
};
