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

// =====================================
// 🚀 GAMIFIED LIVE POLLING ENGINE (STUDENT SIDE)
// =====================================

const pollOverlay = document.getElementById('poll-overlay');
const countdownEl = document.getElementById('student-poll-countdown');
const progressEl = document.getElementById('student-poll-progress');
const activeUI = document.getElementById('student-poll-active-ui');
const resultUI = document.getElementById('student-poll-result-ui');
const leaderboardUI = document.getElementById('student-poll-leaderboard');
const pollBtns = document.querySelectorAll('.student-poll-opt');

let currentPollId = null;
let pollInterval = null;
let hasVoted = false;
let studentSelectedOpt = null;

// The Listener: Watch for new polls from the Educator
async function initStudentPolling() {
    if (!roomId) return;

    try {
        const { doc, onSnapshot, setDoc } = await import("https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js");
        const { getAuth } = await import("https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js");
        const auth = getAuth();

        const pollRef = doc(db, "live_sessions", roomId, "polls", "current_poll");

        onSnapshot(pollRef, (snap) => {
            if (!snap.exists()) return;
            const pollData = snap.data();

            // 1. A new poll is launched!
            if (pollData.status === 'active' && pollData.id !== currentPollId) {
                currentPollId = pollData.id;
                hasVoted = false;
                studentSelectedOpt = null;
                
                // Reset UI
                pollBtns.forEach(btn => {
                    btn.disabled = false;
                    btn.className = "student-poll-opt bg-slate-50 dark:bg-slate-900/50 border-2 border-slate-200 dark:border-slate-700 rounded-xl py-3 text-lg font-black text-slate-700 dark:text-white hover:border-brand-blue hover:text-brand-blue transition-all active:scale-95";
                });
                
                if (activeUI) activeUI.classList.remove('hidden');
                if (resultUI) resultUI.classList.add('hidden');
                if (leaderboardUI) leaderboardUI.classList.add('hidden');
                
                // Slide up animation
                if (pollOverlay) {
                    pollOverlay.classList.remove('hidden');
                    setTimeout(() => {
                        pollOverlay.classList.remove('translate-y-[150%]', 'opacity-0');
                        pollOverlay.classList.add('translate-y-0', 'opacity-100');
                    }, 50);
                }

                startStudentTimer(pollData);
            }

            // 2. Poll is finished! Reveal answers
            if (pollData.status === 'ended' && currentPollId === pollData.id) {
                if (pollInterval) clearInterval(pollInterval);
                revealPollResult(pollData);
            }
        });

        // Handle Voting
        pollBtns.forEach(btn => {
            btn.addEventListener('click', async (e) => {
                if (hasVoted) return; // Prevent double voting
                
                hasVoted = true;
                studentSelectedOpt = e.target.getAttribute('data-opt');
                
                // Visual lock-in
                pollBtns.forEach(b => {
                    b.disabled = true;
                    b.classList.remove('hover:border-brand-blue', 'hover:text-brand-blue', 'active:scale-95');
                    b.classList.add('opacity-50');
                });
                e.target.classList.replace('opacity-50', 'border-brand-blue');
                e.target.classList.add('bg-blue-50', 'dark:bg-blue-900/30', 'text-brand-blue');

                // Send to Firebase
                try {
                    const userName = (auth && auth.currentUser) ? (auth.currentUser.displayName || "Student") : "Student";
                    const userId = (auth && auth.currentUser) ? auth.currentUser.uid : "anon_" + Date.now();
                    
                    const voteRef = doc(db, "live_sessions", roomId, "polls", currentPollId, "votes", userId);
                    await setDoc(voteRef, {
                        name: userName,
                        answer: studentSelectedOpt,
                        timestamp: Date.now() // For fastest finger calculation
                    });
                } catch(err) {
                    console.error("Failed to cast vote", err);
                }
            });
        });

    } catch (e) {
        console.error("Polling Engine Error:", e);
    }
}

// Timer Logic
function startStudentTimer(pollData) {
    let timeLeft = pollData.duration;
    
    // Sync logic: Adjust time if student joined slightly late
    const timeElapsedSecs = Math.floor((new Date() - new Date(pollData.launchedAt)) / 1000);
    timeLeft = Math.max(0, pollData.duration - timeElapsedSecs);

    if (countdownEl) {
        countdownEl.innerText = timeLeft < 10 ? "0" + timeLeft : timeLeft;
        countdownEl.previousElementSibling.classList.replace('text-rose-500', 'text-brand-blue');
    }
    
    if (progressEl) {
        progressEl.style.width = '100%';
        progressEl.className = "absolute left-0 top-0 h-full bg-brand-blue transition-all duration-1000 ease-linear w-full";
    }

    if (pollInterval) clearInterval(pollInterval);

    pollInterval = setInterval(() => {
        timeLeft--;
        if (timeLeft < 0) {
            clearInterval(pollInterval);
            if (countdownEl) countdownEl.innerText = "00";
            return;
        }

        if (countdownEl) countdownEl.innerText = timeLeft < 10 ? "0" + timeLeft : timeLeft;
        if (progressEl) progressEl.style.width = `${(timeLeft / pollData.duration) * 100}%`;

        // Amber warning at 10s
        if (timeLeft === 10) {
            if (progressEl) progressEl.classList.replace('bg-brand-blue', 'bg-amber-500');
            if (countdownEl) {
                countdownEl.classList.add('text-amber-500');
                countdownEl.previousElementSibling.classList.replace('text-brand-blue', 'text-amber-500');
            }
        }
        // Red critical at 3s
        if (timeLeft === 3) {
            if (progressEl) progressEl.classList.replace('bg-amber-500', 'bg-rose-500');
            if (countdownEl) {
                countdownEl.classList.replace('text-amber-500', 'text-rose-500');
                countdownEl.previousElementSibling.classList.replace('text-amber-500', 'text-rose-500');
            }
        }

    }, 1000);
}

// Result Reveal & Leaderboard Logic - (FUTURE PROOF FIREBASE INDEXED QUERY)
async function revealPollResult(pollData) {
    if (activeUI) activeUI.classList.add('hidden');
    if (resultUI) resultUI.classList.remove('hidden');
    
    const iconEl = document.getElementById('poll-result-icon');
    const titleEl = document.getElementById('poll-result-title');
    const msgEl = document.getElementById('poll-result-msg');

    if (iconEl && titleEl && msgEl) {
        iconEl.className = "w-16 h-16 rounded-full flex items-center justify-center text-3xl shadow-inner border-4 mb-2";
        titleEl.className = "font-black text-lg text-center uppercase tracking-wider";

        if (!hasVoted) {
            iconEl.classList.add('bg-slate-100', 'dark:bg-slate-800', 'border-slate-300', 'text-slate-400');
            iconEl.innerHTML = '<i class="fa-solid fa-hourglass-end"></i>';
            titleEl.classList.add('text-slate-500');
            titleEl.innerText = "Time Up!";
            msgEl.innerText = `You didn't vote. Correct answer was ${pollData.correctOption}.`;
        } else if (studentSelectedOpt === pollData.correctOption) {
            iconEl.classList.add('bg-emerald-100', 'dark:bg-emerald-900/40', 'border-emerald-500', 'text-emerald-500', 'animate-bounce');
            iconEl.innerHTML = '<i class="fa-solid fa-check"></i>';
            titleEl.classList.add('text-emerald-500');
            titleEl.innerText = "Excellent!";
            msgEl.innerText = `Your answer ${studentSelectedOpt} was correct!`;
        } else {
            iconEl.classList.add('bg-rose-100', 'dark:bg-rose-900/40', 'border-rose-500', 'text-rose-500', 'animate-wiggle');
            iconEl.innerHTML = '<i class="fa-solid fa-xmark"></i>';
            titleEl.classList.add('text-rose-500');
            titleEl.innerText = "Incorrect!";
            msgEl.innerHTML = `You chose ${studentSelectedOpt}.<br>Correct answer was <span class="text-emerald-500 font-bold">${pollData.correctOption}</span>.`;
        }
    }

    // 🚀 FASTEST FINGERS (Server Side Filtering - Cost & Speed Optimized)
    try {
        const { collection, query, orderBy, limit, getDocs, where } = await import("https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js");
        const votesRef = collection(db, "live_sessions", roomId, "polls", currentPollId, "votes");
        
        // LIMIT 5 Lagane se sirf 5 docs download honge, bhale class mein 10,000 bacche hon!
        const q = query(votesRef, where("answer", "==", pollData.correctOption), orderBy("timestamp", "asc"), limit(5));
        const snap = await getDocs(q);

        const listEl = document.getElementById('fastest-fingers-list');
        if (listEl) {
            listEl.innerHTML = '';
            if (snap.empty) {
                listEl.innerHTML = '<div class="text-center text-xs text-slate-500 py-2">No correct answers given.</div>';
            } else {
                let rank = 1;
                snap.forEach(docSnap => {
                    const vData = docSnap.data();
                    const badge = rank === 1 ? '🥇' : (rank === 2 ? '🥈' : (rank === 3 ? '🥉' : `#${rank}`));
                    listEl.innerHTML += `
                        <div class="flex items-center justify-between bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-100 dark:border-slate-700 shadow-sm">
                            <span class="text-xs font-bold text-slate-700 dark:text-slate-300"><span class="w-5 inline-block text-center mr-1">${badge}</span> ${vData.name}</span>
                            <span class="text-[10px] text-emerald-500 font-bold bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded">Correct</span>
                        </div>
                    `;
                    rank++;
                });
            }
        }
        if(leaderboardUI) leaderboardUI.classList.remove('hidden');
    } catch(e) {
        console.error("Leaderboard fetch error:", e);
    }

    // Auto-hide popup after 10 seconds
    setTimeout(() => {
        if (pollOverlay) {
            pollOverlay.classList.remove('translate-y-0', 'opacity-100');
            pollOverlay.classList.add('translate-y-[150%]', 'opacity-0');
            setTimeout(() => pollOverlay.classList.add('hidden'), 500);
        }
    }, 10000);
}

// 🚀 Start Polling Engine automatically!
if (roomId) {
    initStudentPolling();
}

// =====================================
// 🚀 WEBRTC ENGINE (STUDENT: RECEIVER & LIVE INK RENDERER)
// =====================================

let peerConnection = null;
let signalingUnsubscribe = null;

const rtcConfig = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
    ]
};

async function initStudentWebRTC() {
    if (!roomId) return;

    try {
        const { doc, setDoc, onSnapshot, getDoc } = await import("https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js");
        const { db } = await import("../firebase-config.js");

        peerConnection = new RTCPeerConnection(rtcConfig);

        // 1. Listen for the High-Speed Data Channel from Admin
        peerConnection.ondatachannel = (event) => {
            const receiveChannel = event.channel;
            receiveChannel.onopen = () => console.log("⚡ WebRTC Live Ink Connected!");
            
            // This is where the magic happens (Receiving pixels)
            receiveChannel.onmessage = (e) => {
                renderLiveInk(e.data);
            };
        };

        // 2. Handle ICE Candidates
        peerConnection.onicecandidate = async (event) => {
            if (event.candidate) {
                // Send student's network route back to admin
                // (In 1-to-many, this requires an SFU server. For this test, we write direct)
                const candidatesRef = doc(db, "live_sessions", roomId, "webrtc_signaling", "student_candidates");
                await setDoc(candidatesRef, event.candidate.toJSON(), { merge: true });
            }
        };

        // 3. Find the Educator's Offer
        const offerRef = doc(db, "live_sessions", roomId, "webrtc_signaling", "offer");
        
        signalingUnsubscribe = onSnapshot(offerRef, async (snap) => {
            const data = snap.data();
            if (data && data.type === 'offer' && !peerConnection.currentRemoteDescription) {
                const offer = new RTCSessionDescription(data);
                await peerConnection.setRemoteDescription(offer);

                // Create the Answer and send it back
                const answer = await peerConnection.createAnswer();
                await peerConnection.setLocalDescription(answer);

                await setDoc(doc(db, "live_sessions", roomId, "webrtc_signaling", "answer"), {
                    sdp: answer.sdp,
                    type: answer.type
                });
            }
        });

    } catch (e) {
        console.error("WebRTC Student Init Error:", e);
    }
}

// Hook it into the startup sequence
if (roomId) {
    setTimeout(() => {
        initStudentWebRTC();
    }, 2000); // Give Firebase a moment to load chat first
}

// -------------------------------------
// 🎨 RENDER LIVE PEN STROKES (GHOST PEN)
// -------------------------------------

// We create a temporary invisible canvas on top to draw live pixels 
// so it doesn't mess with Fabric.js history state
const liveInkCanvas = document.createElement('canvas');
liveInkCanvas.style.position = 'absolute';
liveInkCanvas.style.top = '0';
liveInkCanvas.style.left = '0';
liveInkCanvas.style.pointerEvents = 'none'; // Click through it
liveInkCanvas.style.zIndex = '5';
wrapper.appendChild(liveInkCanvas);

let ctx = liveInkCanvas.getContext('2d');
let lastX = 0, lastY = 0;

// Sync size with Fabric canvas
window.addEventListener('resize', syncLiveCanvasSize);
function syncLiveCanvasSize() {
    liveInkCanvas.width = wrapper.clientWidth;
    liveInkCanvas.height = wrapper.clientHeight;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
}
setTimeout(syncLiveCanvasSize, 500);

function renderLiveInk(dataString) {
    const data = JSON.parse(dataString);
    
    // Scale coordinates from educator's screen to student's screen
    const educatorW = lastEducatorWidth || 1920; 
    const scale = wrapper.clientWidth / educatorW;
    
    const currentX = data.x * scale;
    const currentY = data.y * scale;

    if (data.a === 'start') {
        ctx.beginPath();
        ctx.moveTo(currentX, currentY);
        lastX = currentX;
        lastY = currentY;
    } else if (data.a === 'move') {
        ctx.strokeStyle = data.c;
        ctx.lineWidth = data.w * scale;
        
        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
        ctx.lineTo(currentX, currentY);
        ctx.stroke();
        
        lastX = currentX;
        lastY = currentY;
    } else if (data.a === 'end') {
        // When educator lifts the pen, Firebase will send the final perfect vector object.
        // So we clear our temporary pixel canvas!
        ctx.clearRect(0, 0, liveInkCanvas.width, liveInkCanvas.height);
    }
}