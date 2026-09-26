// ==========================================
// 🛡️ LIN ACADEMY PWOS - SECURITY ENGINE (V1)
// Layer 1: Anti-Snipping & Focus Lock (Blur Shield)
// Layer 2: Dynamic Fear Watermarking (Traceability)
// Layer 3: Keyboard & Right-Click Executioner (Anti-Piracy)
// ==========================================

const securityEngine = {
    watermarkInterval: null,
    
    // ==========================================
    // 1. DYNAMIC WATERMARK ENGINE (Fear & Traceability)
    // ==========================================
    initWatermark: function() {
        if (!document.getElementById('security-watermark')) {
            const wm = document.createElement('div');
            wm.id = 'security-watermark';
            // Styling it to be subtle but unremovable without breaking video
            wm.className = 'fixed z-[9999] pointer-events-none opacity-20 text-[10px] md:text-sm font-bold text-slate-500 uppercase tracking-widest select-none drop-shadow-md mix-blend-difference';
            wm.style.transition = 'top 1s ease-in-out, left 1s ease-in-out';
            document.body.appendChild(wm);
        }

        const updateWatermark = () => {
            const wm = document.getElementById('security-watermark');
            if (!wm) return;
            
            // Get user info (Fallback to Anonymous if not loaded yet)
            let email = "Anonymous";
            let uid = "Unknown";
            
            // Try fetching from auth object if it exists globally
            if (window.auth && window.auth.currentUser) {
                email = window.auth.currentUser.email || "Student";
                uid = window.auth.currentUser.uid;
            } else if (document.getElementById('role-user-email')) {
                // Sasta hack agar auth object direct load nahi hua
                email = document.getElementById('role-user-email').innerText || "Student";
            }
            
            wm.innerText = `${email} • UID: ${uid.substring(0,8)}`;

            // Random Coordinate Generation (Keep it within screen bounds)
            const maxX = window.innerWidth - 200; // Leave 200px margin right
            const maxY = window.innerHeight - 50;  // Leave 50px margin bottom
            
            const randomX = Math.max(10, Math.floor(Math.random() * maxX));
            const randomY = Math.max(10, Math.floor(Math.random() * maxY));
            
            wm.style.left = `${randomX}px`;
            wm.style.top = `${randomY}px`;
        };

        // Update position every 5 seconds!
        updateWatermark();
        this.watermarkInterval = setInterval(updateWatermark, 5000);
    },

    // ==========================================
    // 2. FOCUS LOCK ENGINE (The Blur Shield)
    // ==========================================
    initFocusLock: function() {
        // Create the massive blur overlay
        if (!document.getElementById('security-blur-shield')) {
            const shield = document.createElement('div');
            shield.id = 'security-blur-shield';
            shield.className = 'fixed inset-0 z-[10000] bg-slate-900/90 backdrop-blur-3xl flex flex-col items-center justify-center text-center px-4 hidden transition-opacity duration-200';
            shield.innerHTML = `
                <i class="fa-solid fa-user-secret text-6xl text-rose-500 mb-6 animate-pulse"></i>
                <h1 class="text-3xl md:text-5xl font-extrabold text-white font-serif tracking-wide mb-4">Security Protocol Active</h1>
                <p class="text-slate-400 font-medium text-sm md:text-base max-w-md mx-auto mb-8">Screen recording or capturing premium content is strictly prohibited. Click anywhere to return to your class.</p>
                <button id="btn-resume-class" class="bg-brand-blue hover:bg-blue-600 text-white font-bold py-3 px-8 rounded-xl shadow-lg transition-transform active:scale-95 text-lg">Resume Class</button>
            `;
            document.body.appendChild(shield);

            // Click anywhere to remove shield and regain focus
            shield.addEventListener('click', () => {
                shield.classList.add('hidden');
                document.body.focus(); 
            });
        }

        const shield = document.getElementById('security-blur-shield');

        // Event: User clicks out of window (Snipping Tool or Screen Recorder)
        window.addEventListener('blur', () => {
            if(shield) shield.classList.remove('hidden');
        });

        // Event: User comes back
        window.addEventListener('focus', () => {
            // Hum automatically nahi hatayenge, user ko button dabana padega
            // Taki unhe security ka darr (fear factor) mehsoos ho!
        });
    },

    // ==========================================
    // 3. KEYBOARD & MOUSE EXECUTIONER
    // ==========================================
    initExecutioner: function() {
        // Disable Right Click (Context Menu)
        document.addEventListener('contextmenu', event => event.preventDefault());

        // Disable specific Key Combinations
        document.addEventListener('keydown', event => {
            // Block Ctrl+P (Print)
            if (event.ctrlKey && (event.key === 'p' || event.key === 'P')) {
                event.preventDefault();
                alert("Printing is strictly disabled by Lin Academy Security Protocol.");
            }
            
            // Block Ctrl+S (Save)
            if (event.ctrlKey && (event.key === 's' || event.key === 'S')) {
                event.preventDefault();
            }

            // Block Developer Tools (F12, Ctrl+Shift+I, Ctrl+Shift+C)
            if (
                event.key === 'F12' || 
                (event.ctrlKey && event.shiftKey && (event.key === 'I' || event.key === 'i' || event.key === 'C' || event.key === 'c'))
            ) {
                event.preventDefault();
            }

            // Snipping Tool Block Strategy (Clipboard Clear)
            // While we can't fully block the OS PrintScreen button via JS, we can clear the clipboard immediately!
            if (event.key === 'PrintScreen') {
                this.clearClipboard();
                alert("Screenshots are disabled. Your clipboard has been wiped.");
            }
        });

        // Prevent copying text
        document.addEventListener('copy', (e) => {
            e.preventDefault();
            e.clipboardData.setData('text/plain', 'Nice try! Premium content is protected by Lin Academy.');
        });
    },

    // Utility: Force Clear Clipboard
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
        console.log("🛡️ Lin Academy Security Engine Activated");
        this.initWatermark();
        this.initFocusLock();
        this.initExecutioner();
    }
};

// Auto-Start on load
window.addEventListener('load', () => {
    // Thoda ruk kar start karenge taaki Auth load ho jaye aur Watermark par email aaye
    setTimeout(() => {
        securityEngine.start();
    }, 2500); 
});
