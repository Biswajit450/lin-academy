import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, collection, addDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-storage.js";

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
const storage = getStorage(app);
const googleProvider = new GoogleAuthProvider();

window.laAuth = auth;
window.laDb = db;
window.laStorage = storage;

// ==========================================
// 1. SPA ROUTING & UI UTILITIES
// ==========================================
window.showScreen = function(screenId) {
    document.querySelectorAll('.app-screen').forEach(screen => {
        screen.classList.add('hidden');
    });
    
    // Hide Editor specific elements if not on admin screen
    if(screenId !== 'screen-admin') {
        document.getElementById('admin-course-selector').value = "";
        document.getElementById('admin-editor-toolbar').classList.add('hidden');
        document.getElementById('admin-draft-canvas-wrapper').classList.add('hidden');
    }
    
    const targetScreen = document.getElementById(screenId);
    if(targetScreen) {
        targetScreen.classList.remove('hidden');
    }
    window.scrollTo(0, 0);
}

// BUG FIX: Dynamic "View All" Functionality
window.showGenericViewAll = function(title, type) {
    document.getElementById('generic-view-title').innerText = title;
    const grid = document.getElementById('generic-view-grid');
    grid.innerHTML = '<div class="text-slate-400 col-span-full text-center py-10">Loading...</div>';
    
    window.showScreen('screen-generic-view');

    getDoc(doc(db, "cms", "homepage")).then(snap => {
        if(snap.exists()) {
            const data = snap.data();
            grid.innerHTML = '';
            
            if(type === 'educators' && data.educators) {
                data.educators.forEach(edu => {
                    const photo = edu.photoUrl || `https://ui-avatars.com/api/?name=${edu.name}&background=2563eb&color=fff`;
                    grid.innerHTML += `
                        <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-md flex flex-col items-center text-center hover:-translate-y-1 transition-transform cursor-pointer">
                            <img src="${photo}" class="w-20 h-20 rounded-full mb-4 object-cover border-4 border-slate-50 dark:border-slate-800 shadow-sm">
                            <h4 class="font-bold text-slate-900 dark:text-white">${edu.name}</h4>
                            <p class="text-[10px] text-brand-blue uppercase font-bold tracking-wider mt-1">${edu.expertise}</p>
                        </div>`;
                });
            } else if(type.startsWith('arena_')) {
                const catName = type.split('_')[1];
                const cat = data.arenaCategories.find(c => c.name === catName);
                if(cat && cat.tests) {
                    cat.tests.forEach(test => {
                        if(test.status === 'locked') {
                            grid.innerHTML += `
                                <button class="h-24 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col items-center justify-center opacity-50 cursor-not-allowed shadow-sm">
                                    <i class="fa-solid fa-lock text-slate-400 dark:text-slate-600 mb-1"></i>
                                    <span class="text-[10px] font-bold text-slate-400 dark:text-slate-600 uppercase">Locked</span>
                                    <div class="text-[10px] font-bold text-slate-500 mt-1 truncate w-full px-2">${test.name}</div>
                                </button>`;
                        } else {
                            grid.innerHTML += `
                                <button onclick="window.consumeContent('test', '${test.vaultId}')" class="h-24 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl flex flex-col items-center justify-center shadow-sm hover:-translate-y-1 transition-transform">
                                    <span class="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-widest"><i class="fa-solid fa-play mr-1"></i> Live</span>
                                    <div class="text-[10px] font-bold text-slate-700 dark:text-slate-300 mt-1.5 truncate w-full px-2">${test.name}</div>
                                </button>`;
                        }
                    });
                }
            }
        }
    });
}

window.toggleDarkMode = function() { 
    document.documentElement.classList.toggle('dark'); 
    localStorage.setItem('theme', document.documentElement.classList.contains('dark') ? 'dark' : 'light'); 
}

window.toggleNotifications = function() { 
    document.getElementById('notification-panel').classList.toggle('hidden'); 
}

window.initiateCheckout = function(courseName) { 
    alert(`Razorpay Gateway Initiated for: ${courseName}\n\nOnce payment is successful, our Webhook will automatically tell Firebase to unlock this for the student!`); 
}

// Image Preview & Clear Utilities for CMS
window.previewImage = function(input, previewId) {
    const file = input.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = document.getElementById(previewId);
            img.src = e.target.result;
            img.classList.remove('hidden');
            const parent = img.parentElement;
            const icon = parent.querySelector('i');
            const span = parent.querySelector('span');
            if(icon) icon.style.display = 'none';
            if(span) span.style.display = 'none';
        }
        reader.readAsDataURL(file);
    }
}

window.clearImagePreview = function(previewId, inputId) {
    document.getElementById(inputId).value = '';
    const img = document.getElementById(previewId);
    img.src = '';
    img.classList.add('hidden');
    const parent = img.parentElement;
    const icon = parent.querySelector('i');
    const span = parent.querySelector('span');
    if(icon) icon.style.display = '';
    if(span) span.style.display = '';
}

// BUG FIX: Robust Error handling for Firebase Storage upload
async function uploadFileToStorage(file, folderPath) {
    if (!file) return null;
    try {
        const filename = Date.now() + '_' + file.name;
        const storageRef = ref(storage, folderPath + '/' + filename);
        await uploadBytes(storageRef, file);
        return await getDownloadURL(storageRef);
    } catch(err) {
        console.error("Storage Upload Error:", err);
        alert(`Failed to upload image. Error: ${err.message}`);
        return null;
    }
}

// ==========================================
// 2. AUTHENTICATION LOGIC
// ==========================================
let isLoginMode = true;
window.openAuthModal = function(mode = 'login') {
    document.getElementById('auth-modal').classList.remove('hidden'); 
    isLoginMode = (mode === 'login');
    const title = document.getElementById('auth-title'); 
    const submitBtn = document.getElementById('auth-submit-btn'); 
    const toggleBtn = document.getElementById('auth-toggle-btn');
    
    if (isLoginMode) { 
        title.innerText = "Welcome Back"; 
        submitBtn.innerText = "Sign In"; 
        toggleBtn.innerHTML = `Don't have an account? <span class="text-slate-900 dark:text-white underline">Sign up here</span>`; 
    } else { 
        title.innerText = "Create Account"; 
        submitBtn.innerText = "Create Account"; 
        toggleBtn.innerHTML = `Already have an account? <span class="text-slate-900 dark:text-white underline">Sign in here</span>`; 
    }
}

window.closeAuthModal = function() { 
    document.getElementById('auth-modal').classList.add('hidden'); 
}

window.toggleAuthMode = function() { 
    window.openAuthModal(!isLoginMode ? 'login' : 'signup'); 
}

window.handleGoogleLogin = async function() { 
    try { 
        await signInWithPopup(auth, googleProvider); 
        window.closeAuthModal(); 
    } catch (error) { 
        alert("Login Failed: " + error.message); 
    } 
}

window.handleAuth = async function(event) {
    event.preventDefault(); 
    const email = document.getElementById('auth-email').value; 
    const password = document.getElementById('auth-password').value;
    try { 
        if (isLoginMode) { 
            await signInWithEmailAndPassword(auth, email, password); 
        } else { 
            await createUserWithEmailAndPassword(auth, email, password); 
        } 
        window.closeAuthModal(); 
    } catch(error) { 
        alert("Error: " + error.message); 
    }
}

window.handleLogout = async function() { 
    await signOut(auth); 
    window.location.reload(); 
}

onAuthStateChanged(auth, async (user) => {
    if (user) {
        document.getElementById('header-unauth').classList.add('hidden'); 
        document.getElementById('header-auth').classList.remove('hidden'); 
        document.getElementById('header-auth').classList.add('flex');
        
        let displayName = user.displayName || user.email.split('@')[0];
        document.getElementById('user-profile-name').innerText = displayName; 
        document.getElementById('user-profile-pic').src = user.photoURL || `https://ui-avatars.com/api/?name=${displayName}&background=2563eb&color=fff`;
        window.closeAuthModal();

        try {
            const userRef = doc(db, "users", user.uid); 
            const userSnap = await getDoc(userRef);
            
            if (!userSnap.exists()) { 
                await setDoc(userRef, { 
                    name: displayName, 
                    email: user.email, 
                    role: "student", 
                    unlocked_courses: [], 
                    joinedAt: new Date().toISOString() 
                }); 
            } else if (userSnap.data().role === "admin" || userSnap.data().role === "educator") {
                document.getElementById('nav-admin-btn').classList.remove('hidden'); 
                document.getElementById('nav-admin-btn').classList.add('flex');
                document.getElementById('mobile-nav-admin-btn').classList.remove('hidden'); 
                document.getElementById('mobile-nav-admin-btn').classList.add('flex');
            }
        } catch (error) { 
            console.error(error); 
        }
    } else {
        document.getElementById('header-unauth').classList.remove('hidden'); 
        document.getElementById('header-auth').classList.add('hidden'); 
        document.getElementById('header-auth').classList.remove('flex');
        document.getElementById('nav-admin-btn').classList.add('hidden'); 
        document.getElementById('mobile-nav-admin-btn').classList.add('hidden');
        
        setTimeout(() => { 
            if(document.getElementById('header-auth').classList.contains('hidden')){ 
                window.openAuthModal('login'); 
            } 
        }, 1500);
    }
});

// ==========================================
// 3. ADMIN CMS ENGINE (PRO LEVEL)
// ==========================================

window.switchAdminSubTab = function(tabId) {
    document.querySelectorAll('.admin-subtab').forEach(tab => tab.classList.add('hidden'));
    document.querySelectorAll('.admin-tab-btn').forEach(btn => {
        btn.classList.remove('active', 'text-brand-blue', 'border-brand-blue');
        btn.classList.add('text-slate-500', 'border-transparent');
    });
    
    document.getElementById('admin-subtab-' + tabId).classList.remove('hidden');
    event.currentTarget.classList.remove('text-slate-500', 'border-transparent');
    event.currentTarget.classList.add('active', 'text-brand-blue', 'border-brand-blue');
    
    // Auto-load CMS data when the Homepage CMS tab is opened
    if(tabId === 'homecms') { 
        window.loadCMSDataIntoAdmin(); 
    }
}

// ------------------------------------------
// CMS Builders (Notifications, Categories, Educators)
// ------------------------------------------

// BUG FIX: Notification Manager Wiping Bug Resolved via createElement
window.cmsAddNotification = function(text = '') {
    const list = document.getElementById('cms-notification-list');
    const placeholder = list.querySelector('.text-slate-400');
    if(placeholder) placeholder.remove(); 
    
    const id = 'notif-' + Date.now();
    const div = document.createElement('div');
    div.id = id;
    div.className = "cms-notif-item bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center gap-3 cursor-move";
    div.draggable = true;
    div.ondragstart = window.drag;
    
    div.innerHTML = `
        <i class="fa-solid fa-grip-vertical text-slate-400 px-2 cursor-grab"></i>
        <input type="text" class="notif-text w-full bg-transparent border-none outline-none text-sm text-slate-800 dark:text-white" value="${text}" placeholder="Enter announcement text...">
        <button type="button" onclick="document.getElementById('${id}').remove()" class="text-slate-400 hover:text-rose-500 transition-colors"><i class="fa-solid fa-trash"></i></button>
    `;
    list.appendChild(div);
}

// Drag logic specifically for reordering notifications
window.dropSort = function(ev) {
    ev.preventDefault();
    if(window.draggedElement && window.draggedElement.classList.contains('cms-notif-item')) {
        const dropTarget = ev.target.closest('.cms-notif-item');
        const list = document.getElementById('cms-notification-list');
        
        if(dropTarget && window.draggedElement !== dropTarget) {
            dropTarget.parentNode.insertBefore(window.draggedElement, dropTarget);
        } else if (!dropTarget && ev.target.id === 'cms-notification-list') {
            list.appendChild(window.draggedElement);
        }
    }
}

window.cmsAddArenaCategory = function(catData = null) {
    const list = document.getElementById('cms-arena-category-list');
    const placeholder = list.querySelector('.text-slate-400.text-center');
    if(placeholder) placeholder.remove();
    
    const catId = 'cat-' + Date.now() + Math.floor(Math.random()*1000);
    const catName = catData ? catData.name : '';
    
    const div = document.createElement('div');
    div.id = catId;
    div.className = "cms-arena-cat-item bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm";
    div.innerHTML = `
        <div class="flex justify-between items-center mb-4 border-b border-slate-200 dark:border-slate-700 pb-3">
            <input type="text" class="cat-name w-1/2 bg-transparent border-none outline-none font-bold text-slate-800 dark:text-white text-lg placeholder-slate-400" placeholder="Category Name (e.g., UPSC GS Tests)" value="${catName}">
            <div class="flex gap-3 items-center">
                <button type="button" onclick="window.cmsAddArenaTestToCat('${catId}')" class="text-xs bg-brand-blue text-white px-3 py-1.5 rounded-lg font-bold">+ Add Test</button>
                <button type="button" onclick="document.getElementById('${catId}').remove()" class="text-xs text-rose-500 hover:underline font-bold">Delete Category</button>
            </div>
        </div>
        <div class="cat-tests-list space-y-3 pl-4 border-l-2 border-slate-200 dark:border-slate-800">
            </div>`;
    list.appendChild(div);
    
    if(catData && catData.tests) {
        catData.tests.forEach(test => window.cmsAddArenaTestToCat(catId, test));
    }
}

// BUG FIX: Added "Create New in Vault" button directly linked to Test Modal
window.cmsAddArenaTestToCat = function(catId, testData = null) {
    const testList = document.getElementById(catId).querySelector('.cat-tests-list');
    const testId = 'test-' + Date.now() + Math.floor(Math.random()*1000);
    
    const name = testData ? testData.name : '';
    const vaultId = testData ? testData.vaultId : '';
    const status = testData ? testData.status : 'live';

    const div = document.createElement('div');
    div.id = testId;
    div.className = "cms-arena-test-item flex flex-col md:flex-row gap-3 items-end bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-100 dark:border-slate-800";
    div.innerHTML = `
        <div class="w-full md:w-2/5">
            <label class="text-[10px] font-bold text-slate-400 block mb-1">TEST NAME</label>
            <input type="text" class="test-name w-full p-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 outline-none dark:text-white" value="${name}" placeholder="e.g., Minor Test 1">
        </div>
        <div class="w-full md:w-2/5">
            <div class="flex justify-between items-center">
                <label class="text-[10px] font-bold text-slate-400 block mb-1">VAULT ID</label>
                <button type="button" onclick="window.openTestModal()" class="text-emerald-500 hover:underline font-bold text-[10px]"><i class="fa-solid fa-flask"></i> Create New</button>
            </div>
            <input type="text" class="test-vault w-full p-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 outline-none dark:text-white" value="${vaultId}" placeholder="Firebase ID">
        </div>
        <div class="w-full md:w-1/5">
            <label class="text-[10px] font-bold text-slate-400 block mb-1">STATUS</label>
            <select class="test-status w-full p-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 outline-none dark:text-white font-bold">
                <option value="live" ${status==='live'?'selected':''}>🟢 Live</option>
                <option value="locked" ${status==='locked'?'selected':''}>🔒 Locked</option>
            </select>
        </div>
        <button type="button" onclick="document.getElementById('${testId}').remove()" class="text-slate-400 hover:text-rose-500 p-2 mb-0.5"><i class="fa-solid fa-trash"></i></button>`;
    testList.appendChild(div);
}

window.cmsAddEducator = function(eduData = null) {
    const list = document.getElementById('cms-educator-list');
    const placeholder = list.querySelector('.text-slate-400.text-center');
    if(placeholder) placeholder.remove();
    
    const id = 'edu-' + Date.now();
    const name = eduData ? eduData.name : '';
    const exp = eduData ? eduData.expertise : '';
    const qual = eduData ? eduData.qualifications : '';
    const photoUrl = eduData ? eduData.photoUrl : '';
    
    let photoPreviewHtml = photoUrl 
        ? `<img id="preview-${id}" src="${photoUrl}" class="absolute inset-0 w-full h-full object-cover">` 
        : `<img id="preview-${id}" class="absolute inset-0 w-full h-full object-cover hidden">`;
    let iconDisplay = photoUrl ? 'style="display:none;"' : '';

    const div = document.createElement('div');
    div.id = id;
    div.className = "cms-edu-item bg-slate-50 dark:bg-slate-950 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row gap-6 items-start shadow-sm";
    div.innerHTML = `
        <div class="flex flex-col items-center gap-2">
            <div class="shrink-0 w-24 h-24 rounded-full border-2 border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center overflow-hidden relative bg-white dark:bg-slate-900 cursor-pointer hover:border-brand-blue transition-colors" onclick="document.getElementById('upload-${id}').click()">
                ${photoPreviewHtml}
                <i class="fa-solid fa-camera text-slate-300 text-2xl" ${iconDisplay}></i>
            </div>
            <input type="file" id="upload-${id}" class="edu-upload hidden" accept="image/*" onchange="window.previewImage(this, 'preview-${id}')">
            <input type="hidden" class="edu-existing-photo" value="${photoUrl}">
            <button type="button" onclick="window.clearImagePreview('preview-${id}', 'upload-${id}'); document.getElementById('${id}').querySelector('.edu-existing-photo').value='';" class="text-[10px] text-rose-500 hover:underline">Remove Photo</button>
        </div>
        
        <div class="flex-grow grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
            <div>
                <label class="text-[10px] font-bold text-slate-400 block mb-1">EDUCATOR NAME</label>
                <input type="text" class="edu-name w-full p-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white outline-none" value="${name}" placeholder="e.g. Dr. Biswajit">
            </div>
            <div>
                <label class="text-[10px] font-bold text-slate-400 block mb-1">EXPERTISE</label>
                <input type="text" class="edu-exp w-full p-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white outline-none" value="${exp}" placeholder="e.g. Zoology & Anatomy">
            </div>
            <div class="md:col-span-2">
                <label class="text-[10px] font-bold text-slate-400 block mb-1">QUALIFICATIONS</label>
                <input type="text" class="edu-qual w-full p-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white outline-none" value="${qual}" placeholder="e.g. MBBS, AIIMS Delhi">
            </div>
        </div>
        <button type="button" onclick="document.getElementById('${id}').remove()" class="text-slate-400 hover:text-rose-500 transition-colors pt-2 md:pt-8"><i class="fa-solid fa-trash text-lg"></i></button>`;
    list.appendChild(div);
}

// ------------------------------------------
// Save and Load Core CMS Logic
// ------------------------------------------

window.saveCMSData = async function() {
    const btn = event.currentTarget; 
    const originalHtml = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Publishing to Cloud...'; 
    btn.disabled = true;

    try {
        // 1. Handle Global Logo Upload
        let globalLogoUrl = document.getElementById('cms-logo-preview').src;
        const logoFileInput = document.getElementById('cms-logo-upload').files[0];
        if(logoFileInput) {
            const upUrl = await uploadFileToStorage(logoFileInput, 'cms_images/logo');
            if(upUrl) globalLogoUrl = upUrl;
        } else if (!globalLogoUrl || globalLogoUrl.includes('index.html')) {
            globalLogoUrl = '';
        }

        // 2. Gather Notifications
        const notifications = [];
        document.querySelectorAll('.cms-notif-item').forEach(item => {
            const text = item.querySelector('.notif-text').value.trim();
            if(text) notifications.push(text);
        });

        // 3. Handle Featured Event Banner & Data
        let eventBannerUrl = document.getElementById('cms-event-img-preview').src;
        const eventFileInput = document.getElementById('cms-event-img-upload').files[0];
        if(eventFileInput) {
            const bUrl = await uploadFileToStorage(eventFileInput, 'cms_images/events');
            if(bUrl) eventBannerUrl = bUrl;
        } else if (!eventBannerUrl || eventBannerUrl.includes('index.html')) {
            eventBannerUrl = '';
        }

        const eventData = {
            bannerUrl: eventBannerUrl,
            title: document.getElementById('cms-event-title').value, 
            btnText: document.getElementById('cms-event-btn-text').value,
            desc: document.getElementById('cms-event-desc').value, 
            link: document.getElementById('cms-event-link').value
        };

        // 4. Gather Arena Categories & Nested Tests
        const arenaCategories = [];
        document.querySelectorAll('.cms-arena-cat-item').forEach(catItem => {
            const catName = catItem.querySelector('.cat-name').value.trim();
            if(!catName) return; 
            
            const tests = [];
            catItem.querySelectorAll('.cms-arena-test-item').forEach(testItem => {
                tests.push({
                    name: testItem.querySelector('.test-name').value, 
                    vaultId: testItem.querySelector('.test-vault').value,
                    status: testItem.querySelector('.test-status').value
                });
            });
            arenaCategories.push({ name: catName, tests: tests });
        });

        // 5. Gather Educators & Upload Photos
        const educators = [];
        const eduNodes = document.querySelectorAll('.cms-edu-item');
        for (let item of eduNodes) {
            let photoUrl = item.querySelector('.edu-existing-photo').value;
            const fileInput = item.querySelector('.edu-upload').files[0];
            
            if (fileInput) {
                const pUrl = await uploadFileToStorage(fileInput, 'cms_images/educators');
                if(pUrl) photoUrl = pUrl;
            }
            
            educators.push({ 
                name: item.querySelector('.edu-name').value, 
                expertise: item.querySelector('.edu-exp').value,
                qualifications: item.querySelector('.edu-qual').value,
                photoUrl: photoUrl
            });
        }

        // FINAL SAVE TO FIRESTORE
        const finalCmsData = {
            appLogo: globalLogoUrl,
            notifications: notifications,
            event: eventData, 
            arenaCategories: arenaCategories, 
            educators: educators, 
            updatedAt: new Date().toISOString()
        };

        await setDoc(doc(db, "cms", "homepage"), finalCmsData);
        alert("Success! 🚀 Your Homepage CMS is officially published and live for all students.");
        
        window.renderHomepage(); 

    } catch(e) { 
        console.error("CMS Save Error", e); 
        alert("Failed to save CMS data. Check console for details."); 
    } finally { 
        btn.innerHTML = originalHtml; 
        btn.disabled = false; 
    }
}

window.loadCMSDataIntoAdmin = async function() {
    try {
        const snap = await getDoc(doc(db, "cms", "homepage"));
        if(snap.exists()) {
            const data = snap.data();
            
            // Load Logo
            if(data.appLogo) {
                const logoImg = document.getElementById('cms-logo-preview');
                logoImg.src = data.appLogo;
                logoImg.classList.remove('hidden');
                document.getElementById('cms-logo-upload').parentElement.querySelector('i').style.display = 'none';
            }

            // Load Notifications
            document.getElementById('cms-notification-list').innerHTML = '';
            if(data.notifications && data.notifications.length > 0) {
                data.notifications.forEach(text => window.cmsAddNotification(text));
            } else {
                document.getElementById('cms-notification-list').innerHTML = '<div class="text-center text-slate-400 text-sm py-4 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl pointer-events-none">Click "+ Add Notification" to create alerts. Drag to reorder priority.</div>';
            }

            // Load Event
            if(data.event) { 
                document.getElementById('cms-event-title').value = data.event.title || ''; 
                document.getElementById('cms-event-btn-text').value = data.event.btnText || ''; 
                document.getElementById('cms-event-desc').value = data.event.desc || ''; 
                document.getElementById('cms-event-link').value = data.event.link || ''; 
                
                if(data.event.bannerUrl) {
                    const bannerImg = document.getElementById('cms-event-img-preview');
                    bannerImg.src = data.event.bannerUrl;
                    bannerImg.classList.remove('hidden');
                    bannerImg.parentElement.querySelector('i').style.display = 'none';
                    bannerImg.parentElement.querySelector('span').style.display = 'none';
                }
            }
            
            // Load Arena Categories
            document.getElementById('cms-arena-category-list').innerHTML = '';
            if(data.arenaCategories && data.arenaCategories.length > 0) { 
                data.arenaCategories.forEach(cat => window.cmsAddArenaCategory(cat)); 
            } else { 
                document.getElementById('cms-arena-category-list').innerHTML = '<div class="text-center text-slate-400 text-sm py-4 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl">Click "+ Add Category" (e.g., "NEET UG Minor") to start building Arenas.</div>'; 
            }

            // Load Educators
            document.getElementById('cms-educator-list').innerHTML = '';
            if(data.educators && data.educators.length > 0) { 
                data.educators.forEach(edu => window.cmsAddEducator(edu)); 
            } else {
                document.getElementById('cms-educator-list').innerHTML = '<div class="text-center text-slate-400 text-sm py-4 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl pointer-events-none">Click "+ Add Educator" to create a public profile.</div>';
            }
        }
    } catch(e) { 
        console.error("CMS Load Error", e); 
    }
}

// ------------------------------------------
// RENDER CMS DATA ON STUDENT HOMEPAGE
// ------------------------------------------

window.renderHomepage = async function() {
    try {
        const snap = await getDoc(doc(db, "cms", "homepage"));
        if(snap.exists()) {
            const data = snap.data();
            
            // 1. Render App Logo
            if(data.appLogo) {
                const desktopLogoImg = document.getElementById('app-logo-img');
                const desktopLogoText = document.getElementById('app-logo-text');
                if(desktopLogoImg) {
                    desktopLogoImg.src = data.appLogo;
                    desktopLogoImg.classList.remove('hidden');
                    if(desktopLogoText) desktopLogoText.classList.add('hidden');
                }
            }

            // 2. Render Bell Notifications
            const notifList = document.getElementById('bell-notif-list');
            const notifCount = document.getElementById('bell-notif-count');
            const notifIndicator = document.getElementById('bell-notif-indicator');
            
            if(data.notifications && data.notifications.length > 0) {
                notifList.innerHTML = '';
                notifCount.innerText = `${data.notifications.length} New`;
                notifIndicator.classList.remove('hidden');
                
                data.notifications.forEach(text => {
                    notifList.innerHTML += `
                        <div class="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-xl border border-blue-100 dark:border-blue-800/50">
                            <p class="text-xs text-slate-700 dark:text-slate-300 leading-relaxed"><i class="fa-solid fa-bolt text-amber-500 mr-1"></i> ${text}</p>
                        </div>`;
                });
            } else {
                notifList.innerHTML = '<div class="text-xs text-slate-400 text-center py-4">No new announcements.</div>';
                notifCount.innerText = '0 New';
                notifIndicator.classList.add('hidden');
            }

            // 3. Render Featured Event
            if(data.event) {
                const eventSection = document.getElementById('student-featured-event');
                document.getElementById('student-event-title').innerText = data.event.title || 'Welcome';
                document.getElementById('student-event-desc').innerText = data.event.desc || 'Explore our premium courses.';
                
                const btn = document.getElementById('student-event-btn');
                btn.innerText = data.event.btnText || 'Explore Now';
                btn.onclick = () => window.open(data.event.link, '_blank');
                
                if(data.event.bannerUrl) {
                    eventSection.style.backgroundImage = `url('${data.event.bannerUrl}')`;
                }
            }

            // 4. Render Dynamic Arena Categories
            if(data.arenaCategories) {
                const arenaContainer = document.getElementById('dynamic-arena-container');
                arenaContainer.innerHTML = ''; 
                
                data.arenaCategories.forEach(cat => {
                    let testsHtml = '';
                    cat.tests.forEach(test => {
                        if(test.status === 'locked') {
                            testsHtml += `
                                <button class="shrink-0 w-24 h-20 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col items-center justify-center opacity-50 cursor-not-allowed shadow-sm">
                                    <i class="fa-solid fa-lock text-slate-400 dark:text-slate-600 mb-1"></i>
                                    <span class="text-[10px] font-bold text-slate-400 dark:text-slate-600 uppercase">Locked</span>
                                    <div class="text-[9px] font-bold text-slate-500 truncate w-full px-2 mt-1">${test.name}</div>
                                </button>`;
                        } else {
                            testsHtml += `
                                <button onclick="window.consumeContent('test', '${test.vaultId}')" class="shrink-0 w-28 h-20 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-800 rounded-xl flex flex-col items-center justify-center transition-all hover:-translate-y-1 shadow-sm">
                                    <span class="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-widest"><i class="fa-solid fa-play mr-1"></i> Live</span>
                                    <div class="text-[10px] font-bold text-slate-700 dark:text-slate-300 truncate w-full px-2 mt-1.5">${test.name}</div>
                                </button>`;
                        }
                    });

                    const catHtml = `
                        <div class="mb-6">
                            <div class="flex items-end justify-between mb-3">
                                <h5 class="text-[10px] md:text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">${cat.name}</h5>
                                <button onclick="window.showGenericViewAll('${cat.name}', 'arena_${cat.name}')" class="text-brand-blue dark:text-blue-400 text-[10px] md:text-xs font-bold hover:underline shrink-0">View All</button>
                            </div>
                            <div class="flex overflow-x-auto hide-scrollbar gap-3 pb-2 pt-1">
                                ${testsHtml || '<div class="text-xs text-slate-400">Tests coming soon...</div>'}
                            </div>
                        </div>`;
                    arenaContainer.insertAdjacentHTML('beforeend', catHtml);
                });
            }

            // 5. Render Educator Profiles
            if(data.educators) {
                const eduContainer = document.getElementById('dynamic-educator-container');
                eduContainer.innerHTML = '';
                
                data.educators.forEach(edu => {
                    const photo = edu.photoUrl || `https://ui-avatars.com/api/?name=${edu.name}&background=2563eb&color=fff`;
                    
                    const eduHtml = `
                        <div class="snap-center shrink-0 w-64 bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-md hover:-translate-y-1 transition-all flex flex-col items-center text-center">
                            <div class="w-20 h-20 rounded-full border-4 border-slate-50 dark:border-slate-800 shadow-sm overflow-hidden mb-4">
                                <img src="${photo}" class="w-full h-full object-cover" alt="${edu.name}">
                            </div>
                            <h4 class="text-lg font-bold text-slate-900 dark:text-white mb-1">${edu.name}</h4>
                            <p class="text-xs text-brand-blue dark:text-blue-400 font-bold uppercase tracking-wider mb-2">${edu.expertise}</p>
                            <p class="text-[10px] text-slate-500 dark:text-slate-400 font-medium mb-4 h-6">${edu.qualifications}</p>
                            
                            <div class="flex gap-1 text-amber-400 text-sm mb-2">
                                <i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star-half-stroke"></i>
                            </div>
                            <span class="text-[9px] text-slate-400 font-bold">4.8 / 5 (Student Ratings)</span>
                        </div>`;
                    eduContainer.insertAdjacentHTML('beforeend', eduHtml);
                });
                
                // Map the Educator View All button
                const eduViewAllBtn = document.getElementById('view-all-edu-btn');
                if(eduViewAllBtn) {
                    eduViewAllBtn.onclick = () => window.showGenericViewAll('Our Top Educators', 'educators');
                }
            }
        }
    } catch(e) { console.error("Error rendering homepage", e); }
}

// Call renderHomepage initially to build the dashboard
window.renderHomepage();


// ==========================================
// 4. COURSE BUILDER CANVAS ENGINE
// ==========================================
window.clearCanvasPlaceholder = function() { 
    const placeholder = document.getElementById('canvas-placeholder'); 
    if (placeholder) placeholder.remove(); 
}

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
    } else if(type === 'table') {
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
    } else if(type === 'live' || type === 'video' || type === 'pdf') {
        let icon = ''; let color = ''; let placeholderText = ''; let typeName = ''; let extraInputs = ''; let actionBtnText = ''; let actionColor = '';
        if(type === 'live') { 
            icon = 'fa-video'; color = 'text-red-400 bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800'; typeName = 'Live Session'; placeholderText = 'Google Meet Link';
            actionBtnText = '🔴 Join Live Session'; actionColor = 'bg-red-500 hover:bg-red-600 text-white';
            extraInputs = `<div class="grid grid-cols-2 gap-3 mt-3 border-t border-slate-100 dark:border-slate-800 pt-3"><div><label class="text-[10px] font-bold text-slate-400 block mb-1">START TIME</label><input type="datetime-local" class="w-full text-xs p-1.5 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 dark:text-white outline-none"></div><div><label class="text-[10px] font-bold text-slate-400 block mb-1">END TIME</label><input type="datetime-local" class="w-full text-xs p-1.5 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 dark:text-white outline-none"></div></div>`;
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
                <button class="student-action-btn mt-3 px-5 py-2 rounded-lg text-sm font-bold shadow-sm transition-transform hover:scale-105 active:scale-95 ${actionColor}" onclick="window.consumeContent('${type}', this)">${actionBtnText}</button>
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
        </div>`;
    dropzone.insertAdjacentHTML('beforeend', html); 
    setTimeout(window.autoSaveDraft, 200);
}

// Table logic
window.addRow = function(btn) { 
    const table = btn.closest('div[id^="block-"]').querySelector('table'); 
    const cols = table.rows[0].cells.length; 
    let row = table.insertRow(); 
    for(let i=0; i<cols; i++) { 
        row.insertCell(i).innerHTML = "Data"; 
        row.cells[i].contentEditable = "true"; 
        row.cells[i].className = "p-2 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700"; 
    } 
    window.autoSaveDraft(); 
}

window.removeRow = function(btn) { 
    const table = btn.closest('div[id^="block-"]').querySelector('table'); 
    if(table.rows.length > 2) { 
        table.deleteRow(-1); 
        window.autoSaveDraft(); 
    } else { 
        alert("You must have at least one row of data!"); 
    } 
}

window.addCol = function(btn) { 
    const table = btn.closest('div[id^="block-"]').querySelector('table'); 
    for(let i=0; i<table.rows.length; i++) { 
        let cell = (i===0) ? document.createElement('th') : table.rows[i].insertCell(-1); 
        if(i===0) { 
            table.rows[0].appendChild(cell); 
            cell.innerHTML = "New Column"; 
            cell.className = "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold p-2 border border-slate-200 dark:border-slate-700"; 
        } else { 
            cell.innerHTML = "Data"; 
            cell.className = "p-2 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700"; 
        } 
        cell.contentEditable = "true"; 
    } 
    window.autoSaveDraft(); 
}

window.removeCol = function(btn) { 
    const table = btn.closest('div[id^="block-"]').querySelector('table'); 
    if(table.rows[0].cells.length > 1) { 
        for(let i=0; i<table.rows.length; i++) { 
            table.rows[i].deleteCell(-1); 
        } 
        window.autoSaveDraft(); 
    } else { 
        alert("You must have at least one column!"); 
    } 
}

// Drag & Drop logic for Course Builder
window.draggedElement = null;

window.drag = function(ev) { 
    window.draggedElement = ev.target; 
    ev.dataTransfer.effectAllowed = "move"; 
    setTimeout(() => ev.target.classList.add('opacity-50'), 0); 
}

window.allowDrop = function(ev) { 
    ev.preventDefault(); 
}

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

document.addEventListener('dragend', function(e) { 
    if(window.draggedElement) window.draggedElement.classList.remove('opacity-50'); 
});

// ==========================================
// 5. CLOUD SAVE & PUBLISH (COURSE BUILDER)
// ==========================================
window.autoSaveDraft = async function() {
    const courseName = document.getElementById('admin-course-selector').value; 
    if(!courseName) return;
    
    const dropzone = document.getElementById('editor-canvas-dropzone');
    dropzone.querySelectorAll('input').forEach(input => input.setAttribute('value', input.value));
    dropzone.querySelectorAll('textarea').forEach(ta => ta.innerHTML = ta.value);
    dropzone.querySelectorAll('th, td').forEach(cell => { 
        if(cell.contentEditable === "true") cell.setAttribute('data-content', cell.innerHTML); 
    });
    
    try { 
        await setDoc(doc(db, "course_drafts", courseName), { 
            mainTitle: document.getElementById('draft-main-title').value, 
            subTitle: document.getElementById('draft-sub-title').value, 
            canvasHtml: dropzone.innerHTML, 
            updatedAt: new Date().toISOString() 
        }); 
        
        const status = document.getElementById('cloud-sync-status'); 
        status.classList.remove('hidden'); 
        setTimeout(() => status.classList.add('hidden'), 2000); 
    } catch(e) { 
        console.error("Auto-save failed", e); 
    }
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
            document.getElementById('draft-main-title').value = ''; 
            document.getElementById('draft-sub-title').value = ''; 
            document.getElementById('editor-canvas-dropzone').innerHTML = `<div id="canvas-placeholder" class="text-center text-slate-400 dark:text-slate-600 py-10 text-sm font-medium"><i class="fa-solid fa-arrow-up text-2xl mb-3 animate-bounce"></i><br>Select a course, then use the ribbon above to insert folders and blocks here.</div>`; 
        } 
    } catch(e) { 
        console.error("Load draft failed", e); 
    }
}

window.publishCourse = async function() {
    const courseName = document.getElementById('admin-course-selector').value; 
    if(!courseName) { alert("Please select a course first!"); return; }
    
    const dropzone = document.getElementById('editor-canvas-dropzone'); 
    dropzone.querySelectorAll('input').forEach(input => input.setAttribute('value', input.value)); 
    dropzone.querySelectorAll('textarea').forEach(ta => ta.innerHTML = ta.value);
    
    try { 
        await setDoc(doc(db, "published_courses", courseName), { 
            mainTitle: document.getElementById('draft-main-title').value, 
            subTitle: document.getElementById('draft-sub-title').value, 
            canvasHtml: dropzone.innerHTML, 
            publishedAt: new Date().toISOString() 
        }); 
        alert("Boom! 🚀 Course successfully published to the Enrollments tab!"); 
    } catch(e) { 
        console.error("Publish failed", e); 
        alert("Failed to publish!"); 
    }
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
    } catch(error) { 
        console.error("Error fetching course", error); 
        canvas.innerHTML = '<div class="text-center text-rose-500 py-10">Error fetching course. Check console.</div>'; 
    }
}

// ==========================================
// 6. EXAM BUILDER ENGINE
// ==========================================
window.openTestModal = function() { 
    document.getElementById('test-creator-modal').classList.remove('hidden'); 
}

window.closeTestModal = function() { 
    document.getElementById('test-creator-modal').classList.add('hidden'); 
}

window.draftQuestions = []; 

window.addDraftQuestion = function() {
    const qText = document.getElementById('q-text').value; 
    const opt1 = document.getElementById('q-opt1').value; 
    const opt2 = document.getElementById('q-opt2').value; 
    const opt3 = document.getElementById('q-opt3').value; 
    const opt4 = document.getElementById('q-opt4').value; 
    const correctAns = parseInt(document.getElementById('q-correct').value); 
    const explanation = document.getElementById('q-exp').value;
    
    if(!qText || !opt1 || !opt2 || !opt3 || !opt4) { 
        alert("Please fill out the question and all 4 options!"); 
        return; 
    }
    
    window.draftQuestions.push({ 
        question: qText, 
        options: [opt1, opt2, opt3, opt4], 
        correctAnswerIndex: correctAns, 
        explanation: explanation 
    });
    
    document.getElementById('draft-counter').innerText = window.draftQuestions.length;
    
    // Clear form for next question
    document.getElementById('q-text').value = ''; 
    document.getElementById('q-opt1').value = ''; 
    document.getElementById('q-opt2').value = ''; 
    document.getElementById('q-opt3').value = ''; 
    document.getElementById('q-opt4').value = ''; 
    document.getElementById('q-exp').value = '';
}

window.publishExamToFirebase = async function() {
    if(window.draftQuestions.length === 0) { 
        alert("Add at least 1 question before publishing!"); 
        return; 
    }
    
    const title = document.getElementById('exam-setting-title').value; 
    const duration = parseFloat(document.getElementById('exam-setting-time').value); 
    const posMarks = parseFloat(document.getElementById('exam-setting-pos').value); 
    const negMarks = parseFloat(document.getElementById('exam-setting-neg').value); 
    const passPct = parseFloat(document.getElementById('exam-setting-pass').value);
    
    if(!title || !duration || !posMarks) { 
        alert("Please fill out the Global Exam Settings at the top!"); 
        return; 
    }

    const submitBtn = event.target; 
    const originalText = submitBtn.innerHTML; 
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving to Vault...'; 
    submitBtn.disabled = true;

    try {
        const docRef = await addDoc(collection(db, "exams"), { 
            settings: { 
                testTitle: title, 
                totalTimeInMinutes: duration, 
                marksForCorrectAnswer: posMarks, 
                marksForWrongAnswer: negMarks, 
                passPercentage: passPct 
            }, 
            questions: window.draftQuestions, 
            createdAt: new Date().toISOString() 
        });
        
        window.clearCanvasPlaceholder(); 
        const blockId = 'test-' + Date.now(); 
        const dropzone = document.getElementById('editor-canvas-dropzone');
        
        if(dropzone) {
            const testHtml = `
                <div id="${blockId}" class="bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 flex items-center gap-4 shadow-sm block-hover-effect cursor-move mb-3" draggable="true" ondragstart="window.drag(event)">
                    <div class="w-12 h-12 bg-emerald-100 dark:bg-emerald-800 rounded-xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0 text-xl border border-emerald-200 dark:border-emerald-700">
                        <i class="fa-solid fa-clipboard-list"></i>
                    </div>
                    <div class="flex-grow w-full">
                        <div class="flex items-center justify-between mb-1">
                            <span class="text-[10px] font-bold text-emerald-600 dark:text-emerald-500 uppercase tracking-wider">Premium Mock Test</span>
                            <button onclick="document.getElementById('${blockId}').remove(); window.autoSaveDraft();" class="text-slate-300 hover:text-red-500 transition-colors"><i class="fa-solid fa-trash"></i></button>
                        </div>
                        <div class="font-bold text-slate-900 dark:text-white text-sm truncate">${title}</div>
                        <div class="text-[10px] text-slate-500 font-medium mt-0.5">Vault ID: ${docRef.id} • ${window.draftQuestions.length} Questions</div>
                        <button class="student-action-btn mt-3 px-5 py-2 rounded-lg text-sm font-bold shadow-sm transition-transform hover:scale-105 active:scale-95 bg-emerald-600 hover:bg-emerald-700 text-white" onclick="window.consumeContent('test', '${docRef.id}')">📝 Start Mock Test</button>
                    </div>
                </div>`;
                
            dropzone.insertAdjacentHTML('beforeend', testHtml); 
            window.autoSaveDraft();
        }
        
        window.draftQuestions = []; 
        document.getElementById('draft-counter').innerText = "0"; 
        document.getElementById('exam-builder-form').reset(); 
        window.closeTestModal();
        
        alert(`Test Saved! Your Vault ID is: ${docRef.id}\nYou can copy this ID and use it in the Arena Test Manager!`);
        
    } catch (e) { 
        console.error(e); 
        alert("Failed to publish exam."); 
    } finally { 
        submitBtn.innerHTML = originalText; 
        submitBtn.disabled = false; 
    }
}

// ==========================================
// 7. CONTENT CONSUMPTION ENGINE
// ==========================================
window.consumeContent = function(type, elementOrId) {
    if(type === 'test') { 
        alert(`Redirecting to Exam Engine for Vault ID: ${elementOrId} \n\n(Note for Boss: We will build the actual Exam Engine UI module next!)`); 
        return; 
    }
    
    const block = elementOrId.closest('[id^="block-"]'); 
    const linkInput = block.querySelector('.link-input'); 
    const val = linkInput ? linkInput.value : '';
    
    if(!val) { 
        alert("Your educator hasn't provided a link for this resource yet."); 
        return; 
    }
    
    if(type === 'pdf' || type === 'live') { 
        window.open(val, '_blank'); 
    } else if(type === 'video') { 
        alert(`Opening Video Player Modal for Bunny.net ID: ${val}`); 
    }
}