// =====================================
// 🚀 STUDENT ENGINE - FULLY OPTIMIZED (WITH AUTO-SCALING & DRAWER)
// =====================================
import { doc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { db } from "../firebase-config.js";

const wrapper = document.getElementById('canvas-wrapper');
const canvas = new fabric.Canvas('student-canvas', {
    selection: false, // Strict Read-Only Mode
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

let currentPdfDoc = null;
let currentSlideData = {};
let lastEducatorWidth = null; // 🚀 NAYA: Scaling variable

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

// The Core Rendering Logic (WITH AUTO-SCALING)
window.syncEducatorBoard = function(jsonContent, metaContent) {
    if (!jsonContent) return;

    // 1. Process Background Slide/PDF & CALCULATE SCALE
    let educatorWidth = 1920; // Default fallback width (Full HD)
    if (metaContent) {
        try {
            const meta = JSON.parse(metaContent);
            if (meta.canvasWidth) {
                educatorWidth = meta.canvasWidth;
                lastEducatorWidth = meta.canvasWidth; // Yaad rakho taaki resize pe kaam aaye
            }
        } catch(e) {
            console.error("Sync parsing error:", e);
        }
    } else if (lastEducatorWidth) {
        educatorWidth = lastEducatorWidth; 
    }

    // 2. Process Canvas Strokes & Objects
    canvas.loadFromJSON(jsonContent, function() {
        
        // 🚀 THE MAGIC RATIO FIX: Calculate Zoom based on student's screen vs educator's screen
        const studentWidth = wrapper.clientWidth;
        const scaleMultiplier = studentWidth / educatorWidth;
        
        // Apply the zoom to fit the entire drawing perfectly!
        canvas.setZoom(scaleMultiplier);

        // Lock all incoming objects to prevent student tampering
        canvas.getObjects().forEach(obj => {
            obj.set({ selectable: false, evented: false, hasControls: false, lockMovementX: true, lockMovementY: true });
        });
        
        canvas.renderAll();
        
        // Check theme inversion immediately after rendering
        window.applyStudentTheme(document.documentElement.classList.contains('dark') ? 'dark' : 'light');
    });
};

// =====================================
// 📱 SLIDING DRAWER & CAMERA ENGINE (THE BIG FIX)
// =====================================
const chatDrawer = document.getElementById('chat-drawer'); // 🚀 Fixed ID
const btnTogglePanel = document.getElementById('btn-toggle-panel');
const togglePanelIcon = document.getElementById('toggle-panel-icon');
const webcamContainer = document.getElementById('webcam-container');
const webcamPlaceholder = document.getElementById('webcam-placeholder');

// HTML Drawer default hidden (translate-x-full) hai, toh state true rahegi
let isPanelHidden = true; 
let isDraggingCam = false;
let camOffsetX = 0, camOffsetY = 0;

// UI update karne ka master function
function updatePanelUI() {
    const isMobile = window.innerWidth < 640; 
    
    if (isPanelHidden) {
        // 1. Hide Drawer (Slide off-screen)
        chatDrawer.classList.add('translate-x-full');
        togglePanelIcon.classList.replace('fa-arrow-right-to-bracket', 'fa-message');
        togglePanelIcon.classList.replace('fa-xmark', 'fa-message'); 
        
        // 2. Pop Webcam out to become a floating PIP
        document.body.appendChild(webcamContainer);
        webcamContainer.className = 'absolute z-50 shadow-2xl rounded-xl overflow-hidden cursor-grab border border-slate-700 bg-slate-900 flex flex-col items-center justify-center text-slate-500 select-none transition-all duration-300';
        
        // 🚀 MICRO PIP CAMERA FIX FOR MOBILE (60px x 45px)
        if (isMobile) {
            webcamContainer.style.width = '60px'; 
            webcamContainer.style.height = '45px'; 
            webcamContainer.style.top = '15px'; 
            webcamContainer.style.right = '55px'; // Naye patle toolbar (48px) ke theek bagal mein
        } else {
            webcamContainer.style.width = '240px'; 
            webcamContainer.style.height = '160px'; 
            webcamContainer.style.top = '20px'; 
            webcamContainer.style.right = '80px'; 
        }
        webcamContainer.style.left = 'auto';

    } else {
        // 1. Show Drawer (Slide in)
        chatDrawer.classList.remove('translate-x-full');
        togglePanelIcon.classList.replace('fa-message', 'fa-arrow-right-to-bracket');
        
        // 2. Snap Webcam Back to Drawer
        webcamPlaceholder.appendChild(webcamContainer);
        webcamContainer.className = 'h-full w-full flex flex-col items-center justify-center text-slate-500 select-none relative';
        webcamContainer.removeAttribute('style'); 
    }
}

// System start hote hi Camera ko bahar nikal lo (Kyunki drawer band hai)
updatePanelUI();

// Button click logic
btnTogglePanel.addEventListener('click', () => {
    isPanelHidden = !isPanelHidden;
    updatePanelUI();

    // 🚀 Smooth Canvas Resizing 
    let startTime = Date.now();
    let smoothResize = setInterval(() => {
        canvas.setWidth(wrapper.clientWidth);
        
        // Dynamically correct scale during slide animation
        if (lastEducatorWidth) {
            const scaleMultiplier = wrapper.clientWidth / lastEducatorWidth;
            canvas.setZoom(scaleMultiplier);
        }
        
        canvas.renderAll();
        if (Date.now() - startTime > 320) clearInterval(smoothResize);
    }, 15);
});

// Agar Desktop par class join ki hai, toh Chat Box apne aap khul jayega
if (window.innerWidth >= 640) {
    setTimeout(() => {
        if (isPanelHidden) btnTogglePanel.click();
    }, 400); 
}

// =====================================
// 🖐️ DRAGGABLE WEBCAM LOGIC (HYBRID)
// =====================================
function startDragCam(e) {
    if (!isPanelHidden) return; // Jab chat khula ho tab drag nahi hoga
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
    } else {
        handIndicator.classList.add('hidden');
        btnRaiseHand.classList.replace('text-white', 'text-amber-500');
        btnRaiseHand.classList.replace('bg-amber-500', 'hover:bg-amber-50');
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