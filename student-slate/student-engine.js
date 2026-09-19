// =====================================
// 🚀 STUDENT ENGINE - FULLY OPTIMIZED (SAFE SYNC & PARENT DOM BRIDGE)
// =====================================
import { doc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { db } from "../firebase-config.js";

const wrapper = document.getElementById('canvas-wrapper');
const canvas = new fabric.Canvas('student-canvas', {
    selection: false, // Strict Read-Only Mode
    isDrawingMode: false,
    width: wrapper ? wrapper.clientWidth : window.innerWidth,
    height: wrapper ? wrapper.clientHeight : window.innerHeight,
    backgroundColor: '#ffffff'
});

// Auto-Resize Canvas on Window/Mobile Rotation
window.addEventListener('resize', () => {
    if (wrapper) {
        canvas.setWidth(wrapper.clientWidth);
        canvas.setHeight(wrapper.clientHeight);
        canvas.renderAll();
    }
});

// 🚀 ULTRA-SAFE DOM HELPER: Uses Try-Catch to prevent browser CORS crashes!
function safeSetText(id, text) {
    let el = document.getElementById(id);
    if (el) {
        el.innerText = text;
        return;
    }
    // Agar element yahan nahi hai, toh parent frame mein safely try karo
    try {
        if (window.parent && window.parent.document) {
            let pEl = window.parent.document.getElementById(id);
            if (pEl) pEl.innerText = text;
        }
    } catch(e) {
        console.warn("Parent DOM access blocked by browser security. Script execution continues safely.", e);
    }
}

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

    if (btnTheme) {
        btnTheme.innerHTML = isDark ? '<i class="fa-solid fa-sun text-lg"></i>' : '<i class="fa-solid fa-moon text-lg"></i>';
    }
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

if (btnTheme) {
    btnTheme.addEventListener('click', () => window.applyStudentTheme());
}

if (localStorage.getItem('student_theme') === 'dark') {
    window.applyStudentTheme('dark');
}

// =====================================
// 📡 THE FIREBASE SYNC BRIDGE (REAL-TIME RECEIVER)
// =====================================

let currentPdfDoc = null;
let currentSlideData = {};
let lastEducatorWidth = null; 

// 1. Read Room ID from URL
const urlParams = new URLSearchParams(window.location.search);
const roomId = urlParams.get('roomId');
const courseName = urlParams.get('course');

if (courseName) {
    safeSetText('class-title', decodeURIComponent(courseName));
}

// 2. The Real-time Listener
if (roomId) {
    const sessionRef = doc(db, "live_sessions", roomId);

    onSnapshot(sessionRef, (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            
            // Update Educator Info Safely
            if (data.educatorName) {
                safeSetText('educator-name', data.educatorName);
            }

            // Sync Canvas Data (If educator pushed a new state)
            if (data.canvasState) {
                window.syncEducatorBoard(data.canvasState, data.metaContent);
            }
            
            // Handle Stream end
            if (data.status === 'ended') {
                alert("The educator has ended the live session.");
                // Safe parent closure
                try {
                    if (window.parent && typeof window.parent.closeStudentSlate === 'function') {
                        window.parent.closeStudentSlate();
                    } else {
                        window.close();
                    }
                } catch(e) {
                    window.close();
                }
            }
        } else {
            safeSetText('educator-name', "Session Not Found");
        }
    });
} else {
    safeSetText('educator-name', "Invalid Room ID");
}

// The Core Rendering Logic (WITH AUTO-SCALING)
window.syncEducatorBoard = function(jsonContent, metaContent) {
    if (!jsonContent) return;

    let educatorWidth = 1920; 
    if (metaContent) {
        try {
            const meta = JSON.parse(metaContent);
            if (meta.canvasWidth) {
                educatorWidth = meta.canvasWidth;
                lastEducatorWidth = meta.canvasWidth; 
            }
        } catch(e) {
            console.error("Sync parsing error:", e);
        }
    } else if (lastEducatorWidth) {
        educatorWidth = lastEducatorWidth; 
    }

    canvas.loadFromJSON(jsonContent, function() {
        const studentWidth = wrapper ? wrapper.clientWidth : window.innerWidth;
        const scaleMultiplier = studentWidth / educatorWidth;
        
        canvas.setZoom(scaleMultiplier);

        // Lock all incoming objects to prevent student tampering
        canvas.getObjects().forEach(obj => {
            obj.set({ selectable: false, evented: false, hasControls: false, lockMovementX: true, lockMovementY: true });
        });
        
        canvas.renderAll();
        window.applyStudentTheme(document.documentElement.classList.contains('dark') ? 'dark' : 'light');
    });
};

// =====================================
// 📱 SLIDING DRAWER & CAMERA ENGINE
// =====================================
const chatDrawer = document.getElementById('chat-drawer');
const btnTogglePanel = document.getElementById('btn-toggle-panel');
const togglePanelIcon = document.getElementById('toggle-panel-icon');
const webcamContainer = document.getElementById('webcam-container');
const webcamPlaceholder = document.getElementById('webcam-placeholder');

let isPanelHidden = true; 
let isDraggingCam = false;
let camOffsetX = 0, camOffsetY = 0;

function updatePanelUI() {
    const isMobile = window.innerWidth < 1024; 
    
    if (isPanelHidden) {
        if (chatDrawer) chatDrawer.classList.add('translate-x-full');
        if (togglePanelIcon) {
            togglePanelIcon.classList.replace('fa-arrow-right-to-bracket', 'fa-message');
            togglePanelIcon.classList.replace('fa-xmark', 'fa-message'); 
        }
        
        if (webcamContainer) {
            document.body.appendChild(webcamContainer);
            webcamContainer.className = 'absolute z-50 shadow-2xl rounded-xl overflow-hidden cursor-grab border border-slate-700 bg-slate-900 flex flex-col items-center justify-center text-slate-500 select-none transition-all duration-300';
            
            if (isMobile) {
                webcamContainer.style.width = '60px'; 
                webcamContainer.style.height = '45px'; 
                webcamContainer.style.top = '15px'; 
                webcamContainer.style.right = '55px'; 
            } else {
                webcamContainer.style.width = '240px'; 
                webcamContainer.style.height = '160px'; 
                webcamContainer.style.top = '20px'; 
                webcamContainer.style.right = '80px'; 
            }
            webcamContainer.style.left = 'auto';
        }

    } else {
        if (chatDrawer) chatDrawer.classList.remove('translate-x-full');
        if (togglePanelIcon) {
            togglePanelIcon.classList.replace('fa-message', 'fa-arrow-right-to-bracket');
        }
        
        if (webcamPlaceholder && webcamContainer) {
            webcamPlaceholder.appendChild(webcamContainer);
            webcamContainer.className = 'h-full w-full flex flex-col items-center justify-center text-slate-500 select-none relative';
            webcamContainer.removeAttribute('style'); 
        }
    }
}

updatePanelUI();

if (btnTogglePanel) {
    btnTogglePanel.addEventListener('click', () => {
        isPanelHidden = !isPanelHidden;
        updatePanelUI();

        let startTime = Date.now();
        let smoothResize = setInterval(() => {
            if (wrapper) canvas.setWidth(wrapper.clientWidth);
            
            if (lastEducatorWidth && wrapper) {
                const scaleMultiplier = wrapper.clientWidth / lastEducatorWidth;
                canvas.setZoom(scaleMultiplier);
            }
            
            canvas.renderAll();
            if (Date.now() - startTime > 320) clearInterval(smoothResize);
        }, 15);
    });
}

if (window.innerWidth >= 1024) {
    setTimeout(() => {
        if (isPanelHidden && btnTogglePanel) btnTogglePanel.click();
    }, 400); 
}

// =====================================
// 🖐️ DRAGGABLE WEBCAM LOGIC
// =====================================
function startDragCam(e) {
    if (!isPanelHidden || !webcamContainer) return; 
    isDraggingCam = true;
    const clientX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
    const clientY = e.type.includes('mouse') ? e.clientY : e.touches[0].clientY;
    camOffsetX = clientX - webcamContainer.getBoundingClientRect().left;
    camOffsetY = clientY - webcamContainer.getBoundingClientRect().top;
    webcamContainer.classList.replace('cursor-grab', 'cursor-grabbing');
}

function dragCam(e) {
    if (!isDraggingCam || !webcamContainer) return;
    if (e.type.includes('touch')) e.preventDefault(); 
    const clientX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
    const clientY = e.type.includes('mouse') ? e.clientY : e.touches[0].clientY;
    webcamContainer.style.left = (clientX - camOffsetX) + 'px';
    webcamContainer.style.top = (clientY - camOffsetY) + 'px';
    webcamContainer.style.right = 'auto'; 
}

function endDragCam() {
    if (!isDraggingCam || !webcamContainer) return;
    isDraggingCam = false;
    webcamContainer.classList.replace('cursor-grabbing', 'cursor-grab');
}

if (webcamContainer) {
    webcamContainer.addEventListener('mousedown', startDragCam);
    window.addEventListener('mousemove', dragCam, { passive: false });
    window.addEventListener('mouseup', endDragCam);

    webcamContainer.addEventListener('touchstart', startDragCam, { passive: true });
    window.addEventListener('touchmove', dragCam, { passive: false });
    window.addEventListener('touchend', endDragCam);
}

// =====================================
// 🙋‍♂️ STUDENT UTILITIES (RAISE HAND & VIDEO SETTINGS)
// =====================================

const btnRaiseHand = document.getElementById('btn-raise-hand');
const handIndicator = document.getElementById('hand-indicator');
let isHandRaised = false;

if (btnRaiseHand) {
    btnRaiseHand.addEventListener('click', () => {
        isHandRaised = !isHandRaised;
        if (isHandRaised) {
            if (handIndicator) handIndicator.classList.remove('hidden');
            btnRaiseHand.classList.replace('text-amber-500', 'text-white');
            btnRaiseHand.classList.replace('hover:bg-amber-50', 'bg-amber-500');
        } else {
            if (handIndicator) handIndicator.classList.add('hidden');
            btnRaiseHand.classList.replace('text-white', 'text-amber-500');
            btnRaiseHand.classList.replace('bg-amber-500', 'hover:bg-amber-50');
        }
    });
}

const toggleVideoCheck = document.getElementById('toggle-video');
const liveVideoEl = document.getElementById('student-live-video');
const offlineUiEl = document.getElementById('cam-offline-ui');

if (toggleVideoCheck) {
    toggleVideoCheck.addEventListener('change', (e) => {
        if (e.target.checked) {
            if (liveVideoEl) liveVideoEl.classList.remove('hidden');
            if (offlineUiEl) offlineUiEl.classList.add('hidden');
        } else {
            if (liveVideoEl) liveVideoEl.classList.add('hidden');
            if (offlineUiEl) offlineUiEl.classList.remove('hidden');
        }
    });
}

// =====================================
// 📊 INTERACTIVE POLLING RECEIVER
// =====================================
const pollOverlay = document.getElementById('poll-overlay');

window.triggerPoll = function(question, optionsArray) {
    const qText = document.getElementById('poll-question-text');
    if (qText) {
        qText.innerText = question;
        qText.classList.remove('hidden');
    }
    
    const container = document.getElementById('poll-options-container');
    if (container) {
        container.innerHTML = ''; 
        optionsArray.forEach((opt, index) => {
            container.innerHTML += `
                <button onclick="window.submitPollAnswer(${index})" class="w-full text-left px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-brand-blue hover:text-white hover:border-brand-blue transition-colors shadow-sm">
                    ${String.fromCharCode(65 + index)}. ${opt}
                </button>
            `;
        });
    }

    if (pollOverlay) pollOverlay.classList.remove('hidden');
};

window.submitPollAnswer = function(selectedIndex) {
    const container = document.getElementById('poll-options-container');
    if (container) {
        container.innerHTML = `<div class="text-center py-6"><i class="fa-solid fa-spinner fa-spin text-2xl text-brand-blue mb-2"></i><br><span class="text-xs font-bold text-slate-500">Submitting answer...</span></div>`;
    }
    
    setTimeout(() => {
        if (pollOverlay) pollOverlay.classList.add('hidden');
    }, 1500);
};

// =====================================
// 🚀 LIVE CHAT ENGINE (STUDENT SIDE)
// =====================================
const chatInput = document.getElementById('chat-input');
const btnSendChat = document.getElementById('btn-send-chat');
const chatMessages = document.getElementById('chat-messages');
const chatLockOverlay = document.getElementById('chat-lock-overlay');

let lastMessageTime = 0;
const SPAM_COOLDOWN = 2000; // 2 Seconds Anti-Spam Timer

// 1. Emoji Inserter Function
window.insertStudentEmoji = function(emoji) {
    if(chatInput && !chatInput.disabled) {
        chatInput.value += emoji;
        chatInput.focus();
    }
}

// 2. Main Chat Init Function
async function initStudentChat() {
    if (!roomId) return;

    try {
        const { collection, query, orderBy, onSnapshot, addDoc } = await import("https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js");
        const { getAuth } = await import("https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js");
        const auth = getAuth();

        // A. Listen for Admin Chat Lock (God Mode)
        onSnapshot(doc(db, "live_sessions", roomId), (snap) => {
            if (snap.exists()) {
                const isChatDisabled = snap.data().chatDisabled || false;
                if (isChatDisabled) {
                    if (chatLockOverlay) chatLockOverlay.classList.remove('hidden');
                    if (chatInput) chatInput.disabled = true;
                    if (btnSendChat) btnSendChat.disabled = true;
                } else {
                    if (chatLockOverlay) chatLockOverlay.classList.add('hidden');
                    if (chatInput) chatInput.disabled = false;
                    if (btnSendChat) btnSendChat.disabled = false;
                }
            }
        });

        // B. Listen for Incoming Chat Messages
        const q = query(collection(db, "live_sessions", roomId, "chats"), orderBy("timestamp", "asc"));
        onSnapshot(q, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === "added") {
                    renderStudentChatMessage(change.doc.data(), auth);
                }
            });
            // Auto-Scroll chat to bottom
            if (chatMessages) {
                chatMessages.scrollTop = chatMessages.scrollHeight;
            }
        });

        // C. Send Message Handler (With Anti-Spam)
        window.sendStudentMessage = async function() {
            const text = chatInput.value.trim();
            if (!text || !roomId) return;

            // Anti-Spam Check
            const now = Date.now();
            if (now - lastMessageTime < SPAM_COOLDOWN) {
                const originalP = chatInput.placeholder;
                chatInput.value = '';
                chatInput.placeholder = "Cool down... wait 2s";
                setTimeout(() => { chatInput.placeholder = originalP; }, 2000);
                return;
            }

            const btn = btnSendChat;
            const originalHtml = btn.innerHTML;
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin text-[10px] lg:text-base"></i>';
            btn.disabled = true;

            try {
                // Fetch student name from Firebase Auth
                const userName = (auth && auth.currentUser) ? (auth.currentUser.displayName || "Student") : "Student";
                await addDoc(collection(db, "live_sessions", roomId, "chats"), {
                    senderName: userName,
                    role: "student",
                    text: text,
                    timestamp: new Date().toISOString()
                });
                
                lastMessageTime = Date.now();
                chatInput.value = '';
            } catch (e) {
                console.error("Failed to send", e);
            } finally {
                btn.innerHTML = originalHtml;
                btn.disabled = false;
                chatInput.focus();
            }
        };

        if (btnSendChat && chatInput) {
            btnSendChat.addEventListener('click', sendStudentMessage);
            chatInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') sendStudentMessage();
            });
        }

    } catch (e) {
        console.error("Student chat engine failed:", e);
    }
}

// 3. Smart UI Renderer (Styles Educator vs Student)
function renderStudentChatMessage(msg, auth) {
    if (!chatMessages) return;

    const isEducator = msg.role === 'educator';
    const currentUserName = (auth && auth.currentUser) ? (auth.currentUser.displayName || "Student") : "Student";
    const isMe = (msg.role === 'student' && msg.senderName === currentUserName);
    
    const timeStr = new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    let html = '';

    if (isEducator) {
        // Educator Message (VIP Highlighted style)
        html = `
        <div class="flex flex-col items-start w-full animate-fade-in-up mt-1">
            <span class="text-[8px] lg:text-[10px] font-bold text-amber-500 mb-0.5 ml-1 uppercase tracking-widest"><i class="fa-solid fa-graduation-cap mr-1"></i> Educator • ${timeStr}</span>
            <div class="bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-100 px-3 py-2 rounded-xl rounded-tl-sm shadow-sm border border-amber-200 dark:border-amber-700/50 max-w-[90%]">
                <p class="leading-relaxed font-medium">${msg.text}</p>
            </div>
        </div>`;
    } else if (isMe) {
        // My Message (Blue styling on Right)
        html = `
        <div class="flex flex-col items-end w-full animate-fade-in-up mt-1">
            <span class="text-[8px] lg:text-[10px] font-bold text-slate-400 mb-0.5 mr-1">You • ${timeStr}</span>
            <div class="bg-brand-blue text-white px-3 py-2 rounded-xl rounded-tr-sm shadow-sm max-w-[85%] border border-blue-600">
                <p class="leading-relaxed">${msg.text}</p>
            </div>
        </div>`;
    } else {
        // Other Students (Gray styling on Left)
        html = `
        <div class="flex flex-col items-start w-full animate-fade-in-up mt-1">
            <span class="text-[8px] lg:text-[10px] font-bold text-slate-500 mb-0.5 ml-1">${msg.senderName} • ${timeStr}</span>
            <div class="bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 px-3 py-2 rounded-xl rounded-tl-sm shadow-sm border border-slate-200 dark:border-slate-700 max-w-[85%]">
                <p class="leading-relaxed">${msg.text}</p>
            </div>
        </div>`;
    }

    chatMessages.insertAdjacentHTML('beforeend', html);
}

// 🚀 Start Engine automatically!
if (roomId) {
    initStudentChat();
}