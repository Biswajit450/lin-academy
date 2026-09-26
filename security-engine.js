// ==========================================
// 🛡️ LIN ACADEMY PWOS - SECURITY ENGINE (V2)
// Layer 1: Anti-Snipping & Focus Lock (Blur Shield)
// Layer 2: Dynamic Fear Watermarking (Traceability)
// Layer 3: Keyboard & Right-Click Executioner (Anti-Piracy)
// ==========================================

const securityEngine = {
    watermarkInterval: null,
    
    // ==========================================
    // 1. DYNAMIC WATERMARK ENGINE (Identity Fetcher Fix)
    // ==========================================
    initWatermark: function() {
        if (!document.getElementById('security-watermark')) {
            const wm = document.createElement('div');
            wm.id = 'security-watermark';
            wm.className = 'fixed z-[9999] pointer-events-none opacity-20 text-[10px] md:text-sm font-bold text-slate-500 uppercase tracking-widest select-none drop-shadow-md mix-blend-difference';
            wm.style.transition = 'top 1s ease-in-out, left 1s ease-in-out';
            document.body.appendChild(wm);
        }

        const updateWatermark = () => {
            const wm = document.getElementById('security-watermark');
            if (!wm) return;
            
            // 🚀 The Fix: Using Global Identity set by Firebase
            let email = window.secureEmail || "Verifying Identity...";
            let uid = window.secureUid || "Pending";
            
            wm.innerText = `${email} • UID: ${uid.substring(0,8)}`;

            const maxX = window.innerWidth - 200; 
            const maxY = window.innerHeight - 50;  
            
            const randomX = Math.max(10, Math.floor(Math.random() * maxX));
            const randomY = Math.max(10, Math.floor(Math.random() * maxY));
            
            wm.style.left = `${randomX}px`;
            wm.style.top = `${randomY}px`;
        };

        updateWatermark();
        this.watermarkInterval = setInterval(updateWatermark, 4000); // 4 seconds par ghoomega
    },

    // ==========================================
    // 2. FOCUS LOCK ENGINE (iPhone/iOS Upgraded)
    // ==========================================
    initFocusLock: function() {
        if (!document.getElementById('security-blur-shield')) {
            const shield = document.createElement('div');
            shield.id = 'security-blur-shield';
            shield.className = 'fixed inset-0 z-[10000] bg-slate-900/95 backdrop-blur-3xl flex flex-col items-center justify-center text-center px-4 hidden transition-opacity duration-200';
            shield.innerHTML = `
                <i class="fa-solid fa-user-secret text-6xl text-rose-500 mb-6 animate-pulse"></i>
                <h1 class="text-3xl md:text-5xl font-extrabold text-white font-serif tracking-wide mb-4">Security Protocol Active</h1>
                <p class="text-slate-400 font-medium text-sm md:text-base max-w-md mx-auto mb-8">Screen capture tools detected or window lost focus. Click below to return to your class.</p>
                <button id="btn-resume-class" class="bg-brand-blue hover:bg-blue-600 text-white font-bold py-3 px-8 rounded-xl shadow-lg transition-transform active:scale-95 text-lg">Resume Class</button>
            `;
            document.body.appendChild(shield);

            shield.addEventListener('click', () => {
                shield.classList.add('hidden');
                document.body.focus(); 
            });
        }

        // 🚀 THE APPLE FIX: Page Visibility API (Catches iOS app minimizing)
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                const shield = document.getElementById('security-blur-shield');
                if (shield) shield.classList.remove('hidden');
            }
        });

        // 🚀 WINDOWS/ANDROID FIX: Keeps Alt-Tab / Snipping tool protection
        window.addEventListener('blur', () => {
            const shield = document.getElementById('security-blur-shield');
            if (shield) shield.classList.remove('hidden');
        });
    },

    // ==========================================
    // 3. KEYBOARD & MOUSE EXECUTIONER
    // ==========================================
    initExecutioner: function() {
        document.addEventListener('contextmenu', event => event.preventDefault());

        document.addEventListener('keydown', event => {
            if (event.ctrlKey && (event.key === 'p' || event.key === 'P')) {
                event.preventDefault();
                alert("Printing is strictly disabled by Lin Academy.");
            }
            if (event.ctrlKey && (event.key === 's' || event.key === 'S')) event.preventDefault();
            if (event.key === 'F12' || (event.ctrlKey && event.shiftKey && (event.key === 'I' || event.key === 'i' || event.key === 'C' || event.key === 'c'))) event.preventDefault();

            if (event.key === 'PrintScreen') {
                this.clearClipboard();
                alert("Screenshots are disabled. Clipboard wiped.");
            }
        });

        document.addEventListener('copy', (e) => {
            e.preventDefault();
            if (e.clipboardData) {
                e.clipboardData.setData('text/plain', 'Premium content is protected by Lin Academy.');
            }
        });
    },

    clearClipboard: function() {
        const tempInput = document.createElement("input");
        tempInput.value = " ";
        document.body.appendChild(tempInput);
        tempInput.select();
        document.execCommand("copy");
        document.body.removeChild(tempInput);
    },

    // ==========================================
    // BOOT ENGINE
    // ==========================================
    start: function() {
        console.log("🛡️ Lin Academy Security Engine V2 Activated");
        
        // 🚀 THE ANONYMOUS FIX: Connect directly to Firebase Auth internally
        import("https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js")
            .then(({ getAuth, onAuthStateChanged }) => {
                const auth = getAuth();
                onAuthStateChanged(auth, (user) => {
                    if (user) {
                        // Global variables set for the watermark to read
                        window.secureEmail = user.email;
                        window.secureUid = user.uid;
                    }
                });
            }).catch(e => console.log("Security Auth Link Pending..."));

        this.initWatermark();
        this.initFocusLock();
        this.initExecutioner();
    }
};

// Auto-Start
window.addEventListener('load', () => {
    setTimeout(() => { securityEngine.start(); }, 1000); 
});
