import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, collection, addDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyDgJowFUpgzqf9nEyW6vPowdqGSw1WcBSM",
    authDomain: "lin-academy.firebaseapp.com",
    projectId: "lin-academy",
    storageBucket: "lin-academy.firebasestorage.app",
    messagingSenderId: "138973997932",
    appId: "1:138973997932:web:3e2a41b1774c8a9e69a149",
    measurementId: "G-9Z8VZKV7CH"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

window.laAuth = auth;
window.laDb = db;

// 1. SPA Routing & Utilities
window.showScreen = function(screenId) {
    document.querySelectorAll('.app-screen').forEach(screen => screen.classList.add('hidden'));
    if(screenId !== 'screen-admin') {
        document.getElementById('admin-course-selector').value = "";
        document.getElementById('admin-editor-toolbar').classList.add('hidden');
        document.getElementById('admin-draft-canvas-wrapper').classList.add('hidden');
    }
    document.getElementById(screenId)?.classList.remove('hidden');
    window.scrollTo(0, 0);
}

window.toggleDarkMode = function() { document.documentElement.classList.toggle('dark'); localStorage.setItem('theme', document.documentElement.classList.contains('dark') ? 'dark' : 'light'); }
window.toggleNotifications = function() { document.getElementById('notification-panel').classList.toggle('hidden'); }
window.initiateCheckout = function(courseName) { alert(`Razorpay Gateway Initiated for: ${courseName}\n\nOnce payment is successful, our Webhook will automatically tell Firebase to unlock this for the student!`); }

// 2. Auth Modals
let isLoginMode = true;
window.openAuthModal = function(mode = 'login') {
    document.getElementById('auth-modal').classList.remove('hidden'); isLoginMode = (mode === 'login');
    const title = document.getElementById('auth-title'); const submitBtn = document.getElementById('auth-submit-btn'); const toggleBtn = document.getElementById('auth-toggle-btn');
    if (isLoginMode) { title.innerText = "Welcome Back"; submitBtn.innerText = "Sign In"; toggleBtn.innerHTML = `Don't have an account? <span class="text-slate-900 dark:text-white underline">Sign up here</span>`; } 
    else { title.innerText = "Create Account"; submitBtn.innerText = "Create Account"; toggleBtn.innerHTML = `Already have an account? <span class="text-slate-900 dark:text-white underline">Sign in here</span>`; }
}
window.closeAuthModal = function() { document.getElementById('auth-modal').classList.add('hidden'); }
window.toggleAuthMode = function() { window.openAuthModal(!isLoginMode ? 'login' : 'signup'); }

window.handleGoogleLogin = async function() { try { await signInWithPopup(auth, googleProvider); window.closeAuthModal(); } catch (error) { alert("Login Failed: " + error.message); } }
window.handleAuth = async function(event) {
    event.preventDefault(); const email = document.getElementById('auth-email').value; const password = document.getElementById('auth-password').value;
    try { if (isLoginMode) { await signInWithEmailAndPassword(auth, email, password); } else { await createUserWithEmailAndPassword(auth, email, password); } window.closeAuthModal(); } catch(error) { alert("Error: " + error.message); }
}
window.handleLogout = async function() { await signOut(auth); window.location.reload(); }

onAuthStateChanged(auth, async (user) => {
    if (user) {
        document.getElementById('header-unauth').classList.add('hidden'); document.getElementById('header-auth').classList.remove('hidden'); document.getElementById('header-auth').classList.add('flex');
        let displayName = user.displayName || user.email.split('@')[0];
        document.getElementById('user-profile-name').innerText = displayName; document.getElementById('user-profile-pic').src = user.photoURL || `https://ui-avatars.com/api/?name=${displayName}&background=2563eb&color=fff`;
        window.closeAuthModal();

        try {
            const userRef = doc(db, "users", user.uid); const userSnap = await getDoc(userRef);
            if (!userSnap.exists()) { await setDoc(userRef, { name: displayName, email: user.email, role: "student", unlocked_courses: [], joinedAt: new Date().toISOString() }); } 
            else if (userSnap.data().role === "admin" || userSnap.data().role === "educator") {
                document.getElementById('nav-admin-btn').classList.remove('hidden'); document.getElementById('nav-admin-btn').classList.add('flex');
                document.getElementById('mobile-nav-admin-btn').classList.remove('hidden'); document.getElementById('mobile-nav-admin-btn').classList.add('flex');
            }
        } catch (error) { console.error(error); }
    } else {
        document.getElementById('header-unauth').classList.remove('hidden'); document.getElementById('header-auth').classList.add('hidden'); document.getElementById('header-auth').classList.remove('flex');
        document.getElementById('nav-admin-btn').classList.add('hidden'); document.getElementById('mobile-nav-admin-btn').classList.add('hidden');
        setTimeout(() => { if(document.getElementById('header-auth').classList.contains('hidden')){ window.openAuthModal('login'); } }, 1500);
    }
});

// 3. Admin Command Center Modals & Tabs
window.switchAdminSubTab = function(tabId) {
    document.querySelectorAll('.admin-subtab').forEach(tab => tab.classList.add('hidden'));
    document.querySelectorAll('.admin-tab-btn').forEach(btn => {
        btn.classList.remove('active', 'text-brand-blue', 'border-brand-blue');
        btn.classList.add('text-slate-500', 'border-transparent');
    });
    document.getElementById('admin-subtab-' + tabId).classList.remove('hidden');
    event.currentTarget.classList.remove('text-slate-500', 'border-transparent');
    event.currentTarget.classList.add('active', 'text-brand-blue', 'border-brand-blue');
}
window.openTestModal = function() { document.getElementById('test-creator-modal').classList.remove('hidden'); }
window.closeTestModal = function() { document.getElementById('test-creator-modal').classList.add('hidden'); }

// 4. Admin Canvas Engine
window.clearCanvasPlaceholder = function() { const placeholder = document.getElementById('canvas-placeholder'); if (placeholder) placeholder.remove(); }

window.addBlock = function(type) {
    window.clearCanvasPlaceholder();
    const dropzone = document.getElementById('editor-canvas-dropzone');
    const blockId = 'block-' + Date.now();
    let blockHTML = '';

    if(type === 'text') {
        blockHTML = `
        <div id="${blockId}" class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm block-hover-effect cursor-move mb-3" draggable="true" ondragstart="window.drag(event)">
            <div class="flex justify-between items-center mb-2">
                <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider"><i class="fa-solid fa-heading text-purple-400 mr-1"></i> Text Area</span>
                <button onclick="document.getElementById('${blockId}').remove(); window.autoSaveDraft();" class="text-slate-300 hover:text-red-500 transition-colors"><i class="fa-solid fa-trash"></i></button>
            </div>
            <input type="text" placeholder="Section Heading (Optional)" class="w-full bg-transparent border-none outline-none text-xl font-bold text-slate-900 dark:text-white mb-2 placeholder-slate-300 dark:placeholder-slate-700">
            <textarea placeholder="Type your paragraph or description here..." rows="2" class="w-full bg-transparent border-none outline-none text-sm text-slate-600 dark:text-slate-400 placeholder-slate-300 dark:placeholder-slate-700 resize-y"></textarea>
        </div>`;
    }
    
    else if(type === 'table') {
        blockHTML = `
        <div id="${blockId}" class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm block-hover-effect cursor-move mb-3" draggable="true" ondragstart="window.drag(event)">
            <div class="flex justify-between items-center mb-2">
                <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider"><i class="fa-solid fa-table text-cyan-400 mr-1"></i> Syllabus Table</span>
                <div class="flex items-center gap-2">
                    <button onclick="window.addRow(this)" class="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700">+ Row</button>
                    <button onclick="window.removeRow(this)" class="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700">- Row</button>
                    <button onclick="window.addCol(this)" class="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 ml-2">+ Col</button>
                    <button onclick="window.removeCol(this)" class="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700">- Col</button>
                    <button onclick="document.getElementById('${blockId}').remove(); window.autoSaveDraft();" class="text-slate-300 hover:text-red-500 transition-colors ml-2"><i class="fa-solid fa-trash"></i></button>
                </div>
            </div>
            <div class="overflow-x-auto">
                <table class="editor-table w-full text-sm">
                    <tr><th contenteditable="true" class="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold p-2">Column 1</th><th contenteditable="true" class="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold p-2">Column 2</th></tr>
                    <tr><td contenteditable="true" class="p-2 text-slate-600 dark:text-slate-400">Data</td><td contenteditable="true" class="p-2 text-slate-600 dark:text-slate-400">Data</td></tr>
                </table>
            </div>
        </div>`;
    }

    else if(type === 'live' || type === 'video' || type === 'pdf') {
        let icon = ''; let color = ''; let placeholderText = ''; let typeName = ''; let extraInputs = ''; let actionBtnText = ''; let actionColor = '';
        
        if(type === 'live') { 
            icon = 'fa-video'; color = 'text-red-400 bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800'; typeName = 'Live Session'; placeholderText = 'Google Meet Link';
            actionBtnText = '🔴 Join Live Session'; actionColor = 'bg-red-500 hover:bg-red-600 text-white';
            extraInputs = `
                <div class="grid grid-cols-2 gap-3 mt-3 border-t border-slate-100 dark:border-slate-800 pt-3">
                    <div><label class="text-[10px] font-bold text-slate-400 block mb-1">START TIME</label><input type="datetime-local" class="w-full text-xs p-1.5 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 dark:text-white outline-none"></div>
                    <div><label class="text-[10px] font-bold text-slate-400 block mb-1">END TIME</label><input type="datetime-local" class="w-full text-xs p-1.5 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 dark:text-white outline-none"></div>
                </div>`;
        }
        if(type === 'video') { icon = 'fa-play'; color = 'text-blue-400 bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800'; typeName = 'Video Lecture'; placeholderText = 'Bunny.net Video ID'; actionBtnText = '▶ Watch Lecture'; actionColor = 'bg-brand-blue hover:bg-blue-700 text-white'; }
        if(type === 'pdf') { icon = 'fa-file-pdf'; color = 'text-rose-400 bg-rose-50 dark:bg-rose-900/10 border-rose-200 dark:border-rose-800'; typeName = 'PDF Notes'; placeholderText = 'Firebase PDF URL'; actionBtnText = '📄 Open Handout'; actionColor = 'bg-rose-500 hover:bg-rose-600 text-white'; }

        blockHTML = `
        <div id="${blockId}" class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex items-start gap-4 shadow-sm block-hover-effect cursor-move mb-3" draggable="true" ondragstart="window.drag(event)">
            <div class="w-12 h-12 rounded-xl flex items-center justify-center border ${color} shrink-0 text-xl"><i class="fa-solid ${icon}"></i></div>
            <div class="flex-grow w-full">
                <div class="flex items-center justify-between mb-1">
                    <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">${typeName}</span>
                    <button onclick="document.getElementById('${blockId}').remove(); window.autoSaveDraft();" class="text-slate-300 hover:text-red-500 transition-colors"><i class="fa-solid fa-trash"></i></button>
                </div>
                <input type="text" placeholder="${typeName} Title" class="w-full bg-transparent border-b border-slate-100 dark:border-slate-800 focus:border-brand-blue outline-none text-sm font-bold text-slate-900 dark:text-white pb-1 mb-2 transition-colors">
                
                <div class="admin-input-area">
                    <input type="text" placeholder="${placeholderText}" class="link-input w-full bg-transparent border-none outline-none text-xs text-slate-500 dark:text-slate-400">
                    ${extraInputs}
                </div>
                
                <button class="student-action-btn mt-3 px-5 py-2 rounded-lg text-sm font-bold shadow-sm transition-transform hover:scale-105 active:scale-95 ${actionColor}" onclick="window.consumeContent('${type}', this)">
                    ${actionBtnText}
                </button>
            </div>
        </div>`;
    }
    dropzone.insertAdjacentHTML('beforeend', blockHTML);
    setTimeout(window.autoSaveDraft, 200);
}

window.addDynamicFolder = function() {
    window.clearCanvasPlaceholder();
    const blockId = 'folder-' + Date.now();
    const dropzone = document.getElementById('editor-canvas-dropzone');
    const html = `
        <div id="${blockId}" class="bg-white dark:bg-slate-900 border-2 border-dashed border-amber-300 dark:border-amber-700/50 rounded-2xl p-4 mb-4 shadow-sm" draggable="true" ondragstart="window.drag(event)">
            <div class="flex items-center justify-between mb-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                <div class="flex items-center gap-3 w-full">
                    <i class="fa-solid fa-folder-open text-amber-500 text-2xl"></i>
                    <input type="text" placeholder="Folder Name (e.g., Module 1: Blood & Circulation)" class="bg-transparent border-none outline-none font-bold text-slate-800 dark:text-white w-full text-lg">
                </div>
                <button onclick="document.getElementById('${blockId}').remove(); window.autoSaveDraft();" class="text-slate-300 hover:text-red-500 transition-colors ml-2" title="Delete Folder"><i class="fa-solid fa-trash text-lg"></i></button>
            </div>
            <div class="folder-dropzone min-h-[60px] space-y-3 p-3 rounded-xl bg-slate-50/50 dark:bg-slate-950/50 transition-colors" ondragover="window.allowDrop(event)" ondrop="window.drop(event)">
                <div class="text-[10px] text-slate-400 text-center font-bold uppercase tracking-widest pointer-events-none mt-2">Drop Blocks Here</div>
            </div>
        </div>
    `;
    dropzone.insertAdjacentHTML('beforeend', html);
    setTimeout(window.autoSaveDraft, 200);
}

// Table logic
window.addRow = function(btn) {
    const table = btn.closest('div[id^="block-"]').querySelector('table'); const cols = table.rows[0].cells.length; let row = table.insertRow();
    for(let i=0; i<cols; i++) { row.insertCell(i).innerHTML = "Data"; row.cells[i].contentEditable = "true"; row.cells[i].className = "p-2 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700"; }
    window.autoSaveDraft();
}
window.removeRow = function(btn) {
    const table = btn.closest('div[id^="block-"]').querySelector('table');
    if(table.rows.length > 2) { table.deleteRow(-1); window.autoSaveDraft(); } else { alert("You must have at least one row of data!"); }
}
window.addCol = function(btn) {
    const table = btn.closest('div[id^="block-"]').querySelector('table');
    for(let i=0; i<table.rows.length; i++) {
        let cell = (i===0) ? document.createElement('th') : table.rows[i].insertCell(-1);
        if(i===0) { table.rows[0].appendChild(cell); cell.innerHTML = "New Column"; cell.className = "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold p-2 border border-slate-200 dark:border-slate-700"; }
        else { cell.innerHTML = "Data"; cell.className = "p-2 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700"; }
        cell.contentEditable = "true";
    }
    window.autoSaveDraft();
}
window.removeCol = function(btn) {
    const table = btn.closest('div[id^="block-"]').querySelector('table');
    if(table.rows[0].cells.length > 1) { for(let i=0; i<table.rows.length; i++) { table.rows[i].deleteCell(-1); } window.autoSaveDraft(); } else { alert("You must have at least one column!"); }
}

// Drag & Drop logic
window.draggedElement = null;
window.drag = function(ev) { window.draggedElement = ev.target; ev.dataTransfer.effectAllowed = "move"; setTimeout(() => ev.target.classList.add('opacity-50'), 0); }
window.allowDrop = function(ev) { ev.preventDefault(); }
window.drop = function(ev) {
    ev.preventDefault();
    if(window.draggedElement) {
        window.draggedElement.classList.remove('opacity-50');
        let dropTarget = ev.target.closest('.folder-dropzone') || document.getElementById('editor-canvas-dropzone');
        if(window.draggedElement !== dropTarget && !window.draggedElement.contains(dropTarget)) {
             const innerText = dropTarget.querySelector('.pointer-events-none');
             if(innerText) innerText.style.display = 'none';
             dropTarget.appendChild(window.draggedElement);
             window.autoSaveDraft();
        }
    }
}
document.addEventListener('dragend', function(e) { if(window.draggedElement) window.draggedElement.classList.remove('opacity-50'); });

// 5. Cloud Auto-Save & Publish
window.autoSaveDraft = async function() {
    const courseName = document.getElementById('admin-course-selector').value;
    if(!courseName) return;
    
    const dropzone = document.getElementById('editor-canvas-dropzone');
    dropzone.querySelectorAll('input').forEach(input => input.setAttribute('value', input.value));
    dropzone.querySelectorAll('textarea').forEach(ta => ta.innerHTML = ta.value);
    dropzone.querySelectorAll('th, td').forEach(cell => { if(cell.contentEditable === "true") cell.setAttribute('data-content', cell.innerHTML); });

    const dropzoneHtml = dropzone.innerHTML;
    const mainTitle = document.getElementById('draft-main-title').value;
    const subTitle = document.getElementById('draft-sub-title').value;

    try {
        await setDoc(doc(db, "course_drafts", courseName), { mainTitle: mainTitle, subTitle: subTitle, canvasHtml: dropzoneHtml, updatedAt: new Date().toISOString() });
        const status = document.getElementById('cloud-sync-status');
        status.classList.remove('hidden'); setTimeout(() => status.classList.add('hidden'), 2000);
    } catch(e) { console.error("Auto-save failed", e); }
}

window.loadDraftForAdmin = async function(courseName) {
    if(!courseName) return;
    document.getElementById('admin-editor-toolbar').classList.remove('hidden');
    document.getElementById('admin-draft-canvas-wrapper').classList.remove('hidden');
    
    try {
        const draftSnap = await getDoc(doc(db, "course_drafts", courseName));
        if(draftSnap.exists()) {
            const data = draftSnap.data();
            document.getElementById('draft-main-title').value = data.mainTitle || '';
            document.getElementById('draft-sub-title').value = data.subTitle || '';
            document.getElementById('editor-canvas-dropzone').innerHTML = data.canvasHtml || '';
        } else {
            document.getElementById('draft-main-title').value = ''; document.getElementById('draft-sub-title').value = '';
            document.getElementById('editor-canvas-dropzone').innerHTML = `<div id="canvas-placeholder" class="text-center text-slate-400 dark:text-slate-600 py-10 text-sm font-medium"><i class="fa-solid fa-arrow-up text-2xl mb-3 animate-bounce"></i><br>Select a course, then use the ribbon above to insert folders and blocks here.</div>`;
        }
    } catch(e) { console.error("Load draft failed", e); }
}

window.publishCourse = async function() {
    const courseName = document.getElementById('admin-course-selector').value;
    if(!courseName) { alert("Please select a course first!"); return; }

    const dropzone = document.getElementById('editor-canvas-dropzone');
    dropzone.querySelectorAll('input').forEach(input => input.setAttribute('value', input.value));
    dropzone.querySelectorAll('textarea').forEach(ta => ta.innerHTML = ta.value);

    const dropzoneHtml = dropzone.innerHTML;
    const mainTitle = document.getElementById('draft-main-title').value;
    const subTitle = document.getElementById('draft-sub-title').value;

    try {
        await setDoc(doc(db, "published_courses", courseName), { mainTitle: mainTitle, subTitle: subTitle, canvasHtml: dropzoneHtml, publishedAt: new Date().toISOString() });
        alert("Boom! 🚀 Course successfully published to the Enrollments tab!");
    } catch(e) { console.error("Publish failed", e); alert("Failed to publish!"); }
}

window.openCourseView = async function(courseName) {
    document.getElementById('course-view-title').innerText = courseName;
    window.showScreen('screen-course-view');
    
    const canvas = document.getElementById('course-render-canvas');
    canvas.innerHTML = '<div class="text-center text-slate-400 py-10"><i class="fa-solid fa-spinner fa-spin text-2xl mb-3"></i><br>Fetching your ecosystem...</div>';
    
    try {
        const docRef = doc(db, "published_courses", courseName);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            const data = docSnap.data();
            document.getElementById('student-main-title').value = data.mainTitle || '';
            document.getElementById('student-sub-title').value = data.subTitle || '';
            canvas.innerHTML = data.canvasHtml || '';
        } else {
            canvas.innerHTML = '<div class="text-center text-rose-500 py-10"><i class="fa-solid fa-triangle-exclamation text-2xl mb-3"></i><br>Course content is being updated. Please check back soon!</div>';
        }
    } catch(error) { console.error("Error fetching course", error); canvas.innerHTML = '<div class="text-center text-rose-500 py-10">Error fetching course. Check console.</div>'; }
}

// 6. Exam Builder Engine
window.draftQuestions = []; 
window.addDraftQuestion = function() {
    const qText = document.getElementById('q-text').value;
    const opt1 = document.getElementById('q-opt1').value; const opt2 = document.getElementById('q-opt2').value;
    const opt3 = document.getElementById('q-opt3').value; const opt4 = document.getElementById('q-opt4').value;
    const correctAns = parseInt(document.getElementById('q-correct').value); const explanation = document.getElementById('q-exp').value;

    if(!qText || !opt1 || !opt2 || !opt3 || !opt4) { alert("Please fill out the question and all 4 options!"); return; }

    window.draftQuestions.push({ question: qText, options: [opt1, opt2, opt3, opt4], correctAnswerIndex: correctAns, explanation: explanation });
    document.getElementById('draft-counter').innerText = window.draftQuestions.length;

    document.getElementById('q-text').value = ''; document.getElementById('q-opt1').value = ''; document.getElementById('q-opt2').value = '';
    document.getElementById('q-opt3').value = ''; document.getElementById('q-opt4').value = ''; document.getElementById('q-exp').value = '';
}

window.publishExamToFirebase = async function() {
    if(window.draftQuestions.length === 0) { alert("Add at least 1 question before publishing!"); return; }

    const title = document.getElementById('exam-setting-title').value; const duration = parseFloat(document.getElementById('exam-setting-time').value);
    const posMarks = parseFloat(document.getElementById('exam-setting-pos').value); const negMarks = parseFloat(document.getElementById('exam-setting-neg').value);
    const passPct = parseFloat(document.getElementById('exam-setting-pass').value);

    if(!title || !duration || !posMarks) { alert("Please fill out the Global Exam Settings at the top!"); return; }

    const submitBtn = event.target; const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving to Vault...'; submitBtn.disabled = true;

    try {
        const docRef = await addDoc(collection(db, "exams"), {
            settings: { testTitle: title, totalTimeInMinutes: duration, marksForCorrectAnswer: posMarks, marksForWrongAnswer: negMarks, passPercentage: passPct },
            questions: window.draftQuestions, createdAt: new Date().toISOString()
        });
        
        window.clearCanvasPlaceholder();
        const blockId = 'test-' + Date.now();
        const dropzone = document.getElementById('editor-canvas-dropzone');
        const testHtml = `
            <div id="${blockId}" class="bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 flex items-center gap-4 shadow-sm block-hover-effect cursor-move mb-3" draggable="true" ondragstart="window.drag(event)">
                <div class="w-12 h-12 bg-emerald-100 dark:bg-emerald-800 rounded-xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0 text-xl border border-emerald-200 dark:border-emerald-700"><i class="fa-solid fa-clipboard-list"></i></div>
                <div class="flex-grow w-full">
                    <div class="flex items-center justify-between mb-1"><span class="text-[10px] font-bold text-emerald-600 dark:text-emerald-500 uppercase tracking-wider">Premium Mock Test</span><button onclick="document.getElementById('${blockId}').remove(); window.autoSaveDraft();" class="text-slate-300 hover:text-red-500 transition-colors"><i class="fa-solid fa-trash"></i></button></div>
                    <div class="font-bold text-slate-900 dark:text-white text-sm truncate">${title}</div>
                    <div class="text-[10px] text-slate-500 font-medium mt-0.5">Vault ID: ${docRef.id} • ${window.draftQuestions.length} Questions</div>
                    <button class="student-action-btn mt-3 px-5 py-2 rounded-lg text-sm font-bold shadow-sm transition-transform hover:scale-105 active:scale-95 bg-emerald-600 hover:bg-emerald-700 text-white" onclick="window.consumeContent('test', '${docRef.id}')">📝 Start Mock Test</button>
                </div>
            </div>`;
        dropzone.insertAdjacentHTML('beforeend', testHtml);
        window.autoSaveDraft();
        
        window.draftQuestions = []; document.getElementById('draft-counter').innerText = "0"; document.getElementById('exam-builder-form').reset(); window.closeTestModal();
    } catch (e) { console.error(e); alert("Failed to publish exam. Check console."); } finally { submitBtn.innerHTML = originalText; submitBtn.disabled = false; }
}

// 7. Content Consumption Engine
window.consumeContent = function(type, elementOrId) {
    if(type === 'test') {
        alert(`Redirecting to Exam Engine for Vault ID: ${elementOrId} \n\n(Note for Boss: We will build the actual Exam Engine UI module later!)`);
        return;
    }
    
    const block = elementOrId.closest('[id^="block-"]');
    const linkInput = block.querySelector('.link-input');
    const val = linkInput ? linkInput.value : '';
    
    if(!val) { alert("Your educator hasn't provided a link for this resource yet."); return; }
    
    if(type === 'pdf' || type === 'live') { window.open(val, '_blank'); }
    else if(type === 'video') { alert(`Opening Video Player Modal for Bunny.net ID: ${val}`); }
}