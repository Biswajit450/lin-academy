// app.js

// 🚨 IMPORT UPDATED: Added deleteDoc for Inventory Manager
import { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, query, where, getDocs, arrayUnion, arrayRemove, getCountFromServer, orderBy, limit } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
// 🚀 NEW: Added Firebase Storage tools for Image Uploads
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-storage.js";
import { auth, db, storage } from "./firebase-config.js"; // Added 'storage' here

import "./auth.js";
import "./cms.js";
import "./course-builder.js";
import "./profile.js";
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-functions.js";

// ==========================================
// 🧮 KaTeX & Quill.js RICH EDITOR ENGINE (WITH SMART IMAGE UPLOADER)
// ==========================================
window.questionEditor = null;
window.explanationEditor = null;

window.initRichEditors = function() {
    if(window.questionEditor) return;

    const toolbarOptions = [
        ['bold', 'italic', 'underline', 'strike'],        
        [{ 'script': 'sub'}, { 'script': 'super' }],      
        ['image', 'formula'],                             // 🚀 THE NEW IMAGE BUTTON ADDED
        ['clean']                                         
    ];

    // 🚀 THE SMART UPLOADER LOGIC
    const imageHandler = function() {
        const editor = this.quill;
        const input = document.createElement('input');
        input.setAttribute('type', 'file');
        input.setAttribute('accept', 'image/*');
        input.click();

        input.onchange = async () => {
            const file = input.files[0];
            if (file) {
                const range = editor.getSelection(true);
                editor.insertText(range.index, 'Uploading image...', 'user');
                
                try {
                    // Create a unique filename and upload to Firebase Storage
                    const filename = 'exam_images/' + Date.now() + '_' + file.name.replace(/[^a-zA-Z0-9.]/g, '_');
                    const storageRef = ref(storage, filename);
                    await uploadBytes(storageRef, file);
                    const url = await getDownloadURL(storageRef);
                    
                    // Remove "Uploading image..." text and insert the actual image
                    editor.deleteText(range.index, 18);
                    editor.insertEmbed(range.index, 'image', url);
                    editor.setSelection(range.index + 1);
                } catch (error) {
                    console.error("Image upload failed:", error);
                    editor.deleteText(range.index, 18);
                    alert("Image upload failed. Please check your internet connection.");
                }
            }
        };
    };

    // Initialize Question Editor with custom handler
    window.questionEditor = new window.Quill('#q-text-editor', {
        modules: { 
            toolbar: { container: toolbarOptions, handlers: { image: imageHandler } } 
        },
        theme: 'snow',
        placeholder: 'Type question here. Use (fx) for math, and (🖼️) for images...'
    });

    // Initialize Explanation Editor with custom handler
    window.explanationEditor = new window.Quill('#q-exp-editor', {
        modules: { 
            toolbar: { container: toolbarOptions, handlers: { image: imageHandler } } 
        },
        theme: 'snow',
        placeholder: 'Provide a detailed explanation here...'
    });
}

// ==========================================
// 🚀 DYNAMIC COLOR NAV ENGINE
// ==========================================
window.updateNavHighlight = function(activeScreenId) {
    const navs = [
        { id: 'dashboard', color: 'text-blue-500' },     // Home = Blue
        { id: 'enrollments', color: 'text-emerald-500' }, // Enroll = Green
        { id: 'admin', color: 'text-rose-500' },          // Admin = Red
        { id: 'profile', color: 'text-amber-500' }        // Profile = Yellow
    ];

    navs.forEach(nav => {
        const deskBtn = document.getElementById(`nav-desk-${nav.id}`);
        const mobBtn = document.getElementById(`nav-mob-${nav.id}`);
        
        if(deskBtn && mobBtn) {
            // 1. Purane sabhi colors aur glows ko saaf karo
            ['text-blue-500', 'text-emerald-500', 'text-rose-500', 'text-amber-500', 'opacity-40', 'opacity-100', 'scale-110', 'drop-shadow-[0_0_8px_currentColor]'].forEach(cls => {
                deskBtn.classList.remove(cls);
                mobBtn.classList.remove(cls);
            });
            
            // 2. Agar yeh tab ACTIVE hai (Glow & Bright Mode)
            if(`screen-${nav.id}` === activeScreenId) {
                deskBtn.classList.add(nav.color, 'opacity-100', 'scale-110', 'drop-shadow-[0_0_8px_currentColor]');
                mobBtn.classList.add(nav.color, 'opacity-100', 'scale-110', 'drop-shadow-[0_0_8px_currentColor]');
            } else {
                // 3. Agar yeh tab INACTIVE hai (Dim Mode)
                deskBtn.classList.add(nav.color, 'opacity-40');
                mobBtn.classList.add(nav.color, 'opacity-40');
            }
        }
    });
}
// App start hote hi Home button ko active kar do
setTimeout(() => window.updateNavHighlight('screen-dashboard'), 500);

// ==========================================
// SPA ROUTING & SMART FETCH ENGINE (THE MAGIC ROUTER)
// ==========================================
window.showScreen = async function(screenId) {
    const container = document.getElementById('dynamic-screen-container');

    if (!document.getElementById(screenId)) {
        try {
            const pageName = screenId.replace('screen-', '');
            const response = await fetch(`pages/${pageName}.html`);
            
            if (response.ok) {
                const htmlContent = await response.text();
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = htmlContent;
                container.appendChild(tempDiv.firstElementChild);
                console.log(`[Router] Successfully loaded: ${pageName}.html`);

                if (pageName === 'admin') {
                    const role = String(window.currentUserRole).toLowerCase().trim();
                    const cmsTabBtn = document.querySelector('button[onclick*="homecms"]');
                    const settingsTabBtn = document.getElementById('admin-tab-settings');
                    const deployerTabBtn = document.getElementById('admin-tab-deployer');

                    if (role === 'superadmin') {
                        if (cmsTabBtn) cmsTabBtn.classList.remove('hidden');
                        if (settingsTabBtn) settingsTabBtn.classList.remove('hidden');
                        if (deployerTabBtn) deployerTabBtn.classList.remove('hidden');
                        
                        if(window.loadCMSDataIntoAdmin) {
                            window.loadCMSDataIntoAdmin();
                        }
                    } else {
                        if (cmsTabBtn) cmsTabBtn.classList.add('hidden');
                        if (settingsTabBtn) settingsTabBtn.classList.add('hidden');
                        if (deployerTabBtn) deployerTabBtn.classList.add('hidden');
                    }
                }
                
                if (pageName === 'profile') {
                    if (window.loadProfileData) window.loadProfileData();
                }
                
            } else {
                console.error("Page not found:", pageName);
                alert(`Page "${pageName}" is under construction or missing!`);
                return;
            }
        } catch (error) {
            console.error("Error fetching page:", error);
            alert("Error loading page. Please check your connection.");
            return;
        }
    }

    document.querySelectorAll('.app-screen').forEach(screen => {
        screen.classList.add('hidden');
    });
    
    if(screenId !== 'screen-admin') {
        const courseSelector = document.getElementById('admin-course-selector');
        if(courseSelector) courseSelector.value = "";
        
        const toolbar = document.getElementById('admin-editor-toolbar');
        if(toolbar) toolbar.classList.add('hidden');
        
        const canvasWrapper = document.getElementById('admin-draft-canvas-wrapper');
        if(canvasWrapper) canvasWrapper.classList.add('hidden');
    }

    if(screenId === 'screen-enrollments') {
        if(window.renderEnrollments) window.renderEnrollments(window.currentUnlockedCourses || [], window.currentUserRole);
    }
    if(screenId === 'screen-profile') {
        if(window.loadProfileData) window.loadProfileData();
    }
    
    // 🚀 NEW LOGIC: Refresh Admin Dropdown & UI every time Admin Screen is opened
    if(screenId === 'screen-admin') {
        if(window.loadAdminCourseDropdown) window.loadAdminCourseDropdown();
        // Wake up CMS Data and Categories so they don't disappear on hard refresh
        if(window.loadCMSDataIntoAdmin) window.loadCMSDataIntoAdmin();
        if(window.loadDeployerCategories) window.loadDeployerCategories();
        // 🚨 NEW: Auto-load Inventory
        if(window.loadDeployerInventory) window.loadDeployerInventory();
    }
    
    const targetScreen = document.getElementById(screenId);
    if(targetScreen) {
        targetScreen.classList.remove('hidden');
    }
    window.scrollTo(0, 0);
    
    // 🚀 NEW: Page badalte hi Nav Bar ka color update karo!
    window.updateNavHighlight(screenId);
}

// ==========================================
// ADMIN SUB-TABS & UI UTILITIES
// ==========================================
window.switchAdminSubTab = function(tabId) {
    document.querySelectorAll('.admin-subtab').forEach(tab => tab.classList.add('hidden'));
    
    document.querySelectorAll('.admin-tab-btn').forEach(btn => {
        btn.classList.remove('active', 'text-brand-blue', 'border-brand-blue');
        btn.classList.add('text-slate-500', 'border-transparent');
    });
    
    const targetTab = document.getElementById(`admin-subtab-${tabId}`);
    if(targetTab) targetTab.classList.remove('hidden');
    
    const activeBtn = document.querySelector(`button[onclick="window.switchAdminSubTab('${tabId}')"]`);
    if(activeBtn) {
        activeBtn.classList.remove('text-slate-500', 'border-transparent');
        activeBtn.classList.add('active', 'text-brand-blue', 'border-brand-blue');
    }

    // 🚀 THE FIX: Engine ko tab click hote hi zinda karna!
    if(tabId === 'homecms' && window.loadCMSDataIntoAdmin) {
        window.loadCMSDataIntoAdmin();
    } else if (tabId === 'deployer') {
        if (window.loadDeployerCategories) window.loadDeployerCategories();
        if (window.loadDeployerInventory) window.loadDeployerInventory();
    }
}

window.toggleDarkMode = function() { 
    document.documentElement.classList.toggle('dark'); 
    localStorage.setItem('theme', document.documentElement.classList.contains('dark') ? 'dark' : 'light'); 
}

// ==========================================
// 🚀 IN-APP UNIVERSAL BROADCAST ENGINE (PRO)
// ==========================================

window.toggleNotifications = function() { 
    const panel = document.getElementById('notification-panel');
    if(!panel) return;
    
    panel.classList.toggle('hidden'); 
    
    if(!panel.classList.contains('hidden')) {
        // 1. Agar user Superadmin hai, toh Broadcast Box dikhao
        const role = String(window.currentUserRole).toLowerCase().trim();
        const adminBox = document.getElementById('admin-broadcast-box');
        if (role === 'superadmin' || role === 'admin') {
            if (adminBox) adminBox.classList.remove('hidden');
        }
        
        // 2. Bell khulte hi "Last Opened" time save kar lo taaki Red Dot gayab ho jaye
        localStorage.setItem('lastOpenedNotifs', new Date().toISOString());
        window.fetchUniversalNotifications();
    }
}

window.pushUniversalNotification = async function() {
    const textEl = document.getElementById('admin-broadcast-text');
    const text = textEl.value.trim();
    if(!text) return alert("Please write a message to broadcast!");

    const btn = event.currentTarget;
    const originalHtml = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Sending...';
    btn.disabled = true;

    try {
        const newNotif = {
            id: Date.now().toString(),
            text: text,
            time: new Date().toISOString()
        };

        const { doc, setDoc, arrayUnion } = await import("https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js");
        await setDoc(doc(db, "cms", "notifications"), {
            list: arrayUnion(newNotif)
        }, { merge: true });

        alert("Universal Broadcast sent successfully! 🚀");
        textEl.value = "";
        window.fetchUniversalNotifications();
    } catch(e) {
        console.error("Broadcast failed:", e);
        alert("Failed to send broadcast.");
    } finally {
        btn.innerHTML = originalHtml;
        btn.disabled = false;
    }
}

window.fetchUniversalNotifications = async function() {
    const listEl = document.getElementById('bell-notif-list');
    const countEl = document.getElementById('bell-notif-count');
    const dotEl = document.getElementById('bell-notif-indicator');
    
    const role = String(window.currentUserRole).toLowerCase().trim();
    const isAdmin = role === 'superadmin' || role === 'admin';

    try {
        const { doc, getDoc } = await import("https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js");
        const snap = await getDoc(doc(db, "cms", "notifications"));

        if(snap.exists() && snap.data().list) {
            let list = snap.data().list;
            
            // 🧠 SORTING: Sabse nayi notification hamesha upar (Top)
            list.sort((a,b) => new Date(b.time) - new Date(a.time));
            
            // 🧠 CLEAR ENGINE: Agar student ne "Clear All" dabaya tha, toh purani hide kardo
            const clearedTime = localStorage.getItem('clearedNotifsTime');
            if (clearedTime && !isAdmin) { // Admins ko hamesha sab dikhega
                list = list.filter(item => new Date(item.time) > new Date(clearedTime));
            }
            
            // 🧠 RED DOT ENGINE: Agar latest notification ka time 'lastOpenedNotifs' se naya hai
            const lastOpened = localStorage.getItem('lastOpenedNotifs');
            const hasNewAlerts = list.length > 0 && (!lastOpened || new Date(list[0].time) > new Date(lastOpened));

            if(hasNewAlerts) {
                if(dotEl) dotEl.style.display = 'block';
            } else {
                if(dotEl) dotEl.style.display = 'none';
            }

            // Count Update
            if(countEl) countEl.innerText = list.length > 0 ? `${list.length} Alerts` : `0 New`;

            // Agar list khali hai
            if(list.length === 0) {
                listEl.innerHTML = '<div class="text-xs text-slate-400 text-center py-4">No new announcements.</div>';
                return;
            }

            // UI Render
            let html = '';
            list.forEach(item => {
                const dateObj = new Date(item.time);
                const dateStr = dateObj.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' });
                const safeText = encodeURIComponent(item.text); // Taaki line-breaks UI na tode
                
                // 🧠 ADMIN CONTROLS (Edit & Delete)
                let adminControlsHtml = '';
                if (isAdmin) {
                    adminControlsHtml = `
                        <div class="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onclick="window.editUniversalNotification('${item.id}', '${safeText}')" class="w-6 h-6 rounded bg-slate-200 hover:bg-brand-blue hover:text-white text-slate-600 flex items-center justify-center text-[10px] transition-colors shadow-sm" title="Edit"><i class="fa-solid fa-pen"></i></button>
                            <button onclick="window.deleteUniversalNotification('${item.id}')" class="w-6 h-6 rounded bg-rose-100 hover:bg-rose-500 hover:text-white text-rose-600 flex items-center justify-center text-[10px] transition-colors shadow-sm" title="Delete"><i class="fa-solid fa-trash"></i></button>
                        </div>`;
                }

                html += `
                <div class="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-xl border border-blue-100 dark:border-blue-800/50 relative group ${isAdmin ? 'pr-16' : ''}">
                    <p class="text-xs text-slate-700 dark:text-slate-300 mb-1 leading-relaxed whitespace-pre-wrap">${item.text}</p>
                    <p class="text-[9px] font-bold text-slate-400 uppercase"><i class="fa-regular fa-clock"></i> ${dateStr}</p>
                    ${adminControlsHtml}
                </div>`;
            });
            
            // 🧠 STUDENT CLEAR BUTTON
            if (!isAdmin && list.length > 0) {
                html += `<button onclick="window.clearStudentNotifications()" class="mt-2 text-[10px] text-slate-400 hover:text-rose-500 font-bold uppercase tracking-wider w-full text-center py-2 transition-colors bg-slate-50 dark:bg-slate-800 rounded-lg"><i class="fa-solid fa-broom mr-1"></i> Clear All Alerts</button>`;
            }

            listEl.innerHTML = html;

        } else {
            if(listEl) listEl.innerHTML = '<div class="text-xs text-slate-400 text-center py-4">No new announcements.</div>';
            if(dotEl) dotEl.style.display = 'none';
            if(countEl) countEl.innerText = '0 New';
        }
    } catch(e) {
        console.error("Error fetching notifications", e);
        if(listEl) listEl.innerHTML = '<div class="text-xs text-rose-500 text-center py-4">Failed to load alerts.</div>';
    }
}

// Helper Functions for Controls
window.clearStudentNotifications = function() {
    localStorage.setItem('clearedNotifsTime', new Date().toISOString());
    window.fetchUniversalNotifications();
}

window.deleteUniversalNotification = async function(notifId) {
    if(!confirm("Are you sure you want to completely delete this notification for ALL students?")) return;
    try {
        const { doc, getDoc, setDoc } = await import("https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js");
        const snap = await getDoc(doc(db, "cms", "notifications"));
        if(snap.exists() && snap.data().list) {
            let list = snap.data().list;
            list = list.filter(n => n.id !== notifId); // Remove specific ID
            await setDoc(doc(db, "cms", "notifications"), { list: list }, { merge: true });
            window.fetchUniversalNotifications(); // Refresh Live
        }
    } catch(e) { console.error("Delete failed", e); alert("Failed to delete."); }
}

window.editUniversalNotification = async function(notifId, encodedOldText) {
    const oldText = decodeURIComponent(encodedOldText);
    const newText = prompt("Edit your notification text below:", oldText);
    if(newText === null || newText.trim() === "" || newText === oldText) return; // Cancelled or no change

    try {
        const { doc, getDoc, setDoc } = await import("https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js");
        const snap = await getDoc(doc(db, "cms", "notifications"));
        if(snap.exists() && snap.data().list) {
            let list = snap.data().list;
            let index = list.findIndex(n => n.id === notifId);
            if(index > -1) {
                list[index].text = newText.trim();
                // Hum time change nahi kar rahe, taaki sorting order purana hi rahe
                await setDoc(doc(db, "cms", "notifications"), { list: list }, { merge: true });
                window.fetchUniversalNotifications(); // Refresh Live
            }
        }
    } catch(e) { console.error("Edit failed", e); alert("Failed to edit."); }
}

// Background Check on App Load (Taaki app khulte hi Red Dot dikh jaye)
setTimeout(() => { window.fetchUniversalNotifications(); }, 3500);

// ==========================================
// 🚀 DYNAMIC ADMIN DROPDOWN ENGINE 
// ==========================================
window.loadAdminCourseDropdown = async function() {
    const selector = document.getElementById('admin-course-selector');
    const injectSelector = document.getElementById('inject-course-name');
    const datalist = document.getElementById('admin-course-datalist');

    try {
        const snap = await getDocs(collection(db, "deployed_courses"));
        let optionsHtml = '<option value="" disabled selected>-- Select Course --</option>';
        let datalistHtml = '';
        
        snap.forEach(doc => {
            const data = doc.data();
            optionsHtml += `<option value="${data.title}">${data.title}</option>`;
            datalistHtml += `<option value="${data.title}">`;
        });
        
        if (selector) selector.innerHTML = optionsHtml;
        if (injectSelector) injectSelector.innerHTML = optionsHtml;
        if (datalist) datalist.innerHTML = datalistHtml;
    } catch (e) {
        console.error("Error loading dynamic dropdowns", e);
    }
}

// ==========================================
// 🚀 VAULT VISIBILITY ENGINE (DYNAMIC ENROLLMENTS WITH AUTO-EXPIRY)
// ==========================================
window.renderEnrollments = async function(unlockedCourses = [], passedRole = null) {
    try {
        if (!auth.currentUser) return;

        // 🚀 NEW: Fetch fresh user data to securely check EXPIRE DATES
        const userSnap = await getDoc(doc(db, "users", auth.currentUser.uid));
        const userData = userSnap.exists() ? userSnap.data() : {};
        const courseExpiries = userData.course_expiries || {}; // Gets the expiry dates map

        let role = passedRole || window.currentUserRole || 'student';
        role = String(role).toLowerCase().trim(); 

        const isGodMode = role.includes('admin') || role.includes('educator') || role === 'superadmin';
        
        let coursesList = userData.unlocked_courses || [];

        const enrollScreen = document.getElementById('screen-enrollments');
        if(!enrollScreen) return;

        const oldCompGrid = document.getElementById('enrollments-grid-competitive');
        if(oldCompGrid && oldCompGrid.parentElement) oldCompGrid.parentElement.style.display = 'none';
        const oldAcadGrid = document.getElementById('enrollments-grid-academics');
        if(oldAcadGrid && oldAcadGrid.parentElement) oldAcadGrid.parentElement.style.display = 'none';

        let dynamicContainer = document.getElementById('dynamic-enrollments-vault');
        if(!dynamicContainer) {
            dynamicContainer = document.createElement('div');
            dynamicContainer.id = 'dynamic-enrollments-vault';
            dynamicContainer.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6';
            
            const headerObj = enrollScreen.querySelector('h3');
            if(headerObj && headerObj.parentElement.parentElement) {
                headerObj.parentElement.parentElement.insertAdjacentElement('afterend', dynamicContainer);
            } else {
                enrollScreen.appendChild(dynamicContainer);
            }
        }

        dynamicContainer.innerHTML = '<div class="text-slate-400 col-span-full py-10 text-center"><i class="fa-solid fa-spinner fa-spin mr-2"></i> Opening your secure vault...</div>';

        const coursesSnap = await getDocs(collection(db, "deployed_courses"));
        let html = '';
        let count = 0;

        coursesSnap.forEach(docSnap => {
            const course = docSnap.data();
            const isUnlocked = coursesList.includes(course.title);
            
            if (isGodMode || isUnlocked) {
                count++;
                const d = course.design || {};
                
                // 🚀 SMART EXPIRY CHECK ENGINE 🚀
                let isExpired = false;
                let expiryText = "Lifetime Access";
                let badgeHtml = `<div class="absolute top-0 right-0 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 text-[10px] font-bold px-3 py-1 rounded-bl-xl z-10 shadow-sm"><i class="fa-solid fa-check-circle mr-1"></i> Unlocked</div>`;
                let actionBtnHtml = `<button onclick="window.openCourseView('${course.title}')" class="mt-auto w-full bg-brand-blue hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-colors text-sm shadow-sm active:scale-95 flex items-center justify-center gap-2"><i class="fa-solid fa-play"></i> Enter Classroom</button>`;

                if (!isGodMode && courseExpiries[course.title]) {
                    const expDate = new Date(courseExpiries[course.title]);
                    const now = new Date();
                    
                    const options = { day: 'numeric', month: 'short', year: 'numeric' };
                    expiryText = "Valid till " + expDate.toLocaleDateString('en-IN', options);

                    if (now > expDate) {
                        isExpired = true;
                        badgeHtml = `<div class="absolute top-0 right-0 bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400 text-[10px] font-bold px-3 py-1 rounded-bl-xl z-10 shadow-sm"><i class="fa-solid fa-lock mr-1"></i> Expired</div>`;
                        actionBtnHtml = `<button onclick="window.initiateCheckout('${course.title}')" class="mt-auto w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 rounded-xl transition-colors text-sm shadow-sm active:scale-95 flex items-center justify-center gap-2"><i class="fa-solid fa-rotate-right"></i> Renew Subscription</button>`;
                    }
                }

                html += `
                    <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 border-2 border-solid shadow-md flex flex-col relative overflow-hidden group ${isExpired ? 'opacity-85' : 'hover:-translate-y-1'} transition-all" style="border-color: ${d.tileBorder || '#f1f5f9'};">
                        ${badgeHtml}
                        
                        <div class="w-14 h-14 rounded-2xl flex items-center justify-center mb-5 text-2xl border-2 border-solid shadow-inner transition-transform group-hover:scale-110" style="background-color: ${d.boxBg || '#ecfdf5'}; color: ${d.iconColor || '#059669'}; border-color: ${d.boxBorder || 'transparent'};">
                            <i class="fa-solid ${d.icon || 'fa-book'}"></i>
                        </div>
                        <h4 class="text-lg font-bold text-slate-900 dark:text-white mb-2 leading-snug">${course.title}</h4>
                        <p class="text-xs text-slate-500 dark:text-slate-400 font-medium mb-3 line-clamp-2">${course.subtitle || 'Premium Course'}</p>
                        
                        <p class="text-[10px] font-bold ${isExpired ? 'text-red-500' : 'text-emerald-500'} uppercase tracking-wider mb-6 flex items-center gap-1.5"><i class="fa-solid fa-clock"></i> ${expiryText}</p>
                        
                        ${actionBtnHtml}
                    </div>
                `;
            }
        });

        if (count === 0) {
            dynamicContainer.innerHTML = `
                <div class="col-span-full flex flex-col items-center justify-center py-16 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                    <div class="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4"><i class="fa-solid fa-lock text-3xl text-slate-300 dark:text-slate-600"></i></div>
                    <h3 class="text-lg font-bold text-slate-900 dark:text-white mb-2">Your Vault is Empty</h3>
                    <p class="text-sm text-slate-500 mb-6 text-center max-w-sm">You haven't enrolled in any courses yet. Visit the homepage to explore premium ecosystems.</p>
                    <button onclick="window.showScreen('screen-dashboard')" class="bg-brand-blue hover:bg-blue-700 text-white font-bold px-6 py-2.5 rounded-xl shadow-sm">Explore Courses</button>
                </div>
            `;
        } else {
            dynamicContainer.innerHTML = html;
        }

    } catch(err) {
        console.error("Strict rendering error:", err);
    }
}

// ==========================================
// CHECKOUT ENGINE (100% LIVE & SECURE)
// ==========================================
window.initiateCheckout = async function(courseName) { 
    if (!auth.currentUser) {
        alert("Please login first to enroll.");
        if(window.openAuthModal) window.openAuthModal('login');
        return;
    }

    try {
        console.log(`Initiating secure payment for: ${courseName}...`);

        // 🚨 MASTER FIX: Forcefully apne ID Card (Token) ko naya aur taza karo!
        await auth.currentUser.getIdToken(true); 

        // 2. Dynamically load Razorpay SDK
        if (!window.Razorpay) {
            await new Promise((resolve) => {
                const script = document.createElement('script');
                script.src = 'https://checkout.razorpay.com/v1/checkout.js';
                script.onload = resolve;
                document.body.appendChild(script);
            });
        }

        // 3. Call Firebase Backend Bouncer
        const functions = getFunctions(auth.app);
        const createOrderApi = httpsCallable(functions, 'createOrder');
        
        const response = await createOrderApi({ courseTitle: courseName });
        const orderData = response.data;

        // ... (Baaki ka Razorpay Options ka code waise hi rahega)

        // 4. Open the Real Razorpay Popup!
        const options = {
            // 🚨 APNI LIVE KEY ID YAHAN BHI DAALIYE (e.g., rzp_live_...) 👇
            key: "rzp_live_T5Sz0KnOfFMwzp", 
            amount: orderData.amount,
            currency: orderData.currency,
            name: "Lin Academy",
            description: `Enrollment for ${courseName}`,
            order_id: orderData.id,
            prefill: {
                name: auth.currentUser.displayName || "Student",
                email: auth.currentUser.email || "",
            },
            theme: {
                color: "#2563eb" // Lin Academy Brand Blue
            },
            handler: function (response) {
                // Payment success hotey hi Razorpay ye function chalayega
                // Aur background mein humara Webhook Firebase mein course unlock kar dega!
                alert("Payment Successful! 🎉\n\nYour course is unlocking... Welcome to the premium ecosystem!");
                
                // 3 second baad automatic enrollments tab khol denge
                setTimeout(() => {
                    window.showScreen('screen-enrollments');
                    // Page reload karne se vault turant fresh data fetch kar lega
                    window.location.reload(); 
                }, 3000);
            }
        };

        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', function (response){
            alert("Payment Failed or Cancelled. Please try again.");
        });
        rzp.open();

    } catch (error) {
        console.error("Checkout Error:", error);
        alert("Could not initiate payment. Server is verifying data... Error: " + error.message);
    }
}

// ==========================================
// SUPER ADMIN SETTINGS & POLICY ENGINE
// ==========================================
let policyTimeout = null;
window.currentEditingUserId = null;

window.saveContactSettings = async function() {
    if(!String(window.currentUserRole).includes('admin')) return alert("Access Denied: Admin Only.");
    const wa = document.getElementById('setting-whatsapp').value;
    const email = document.getElementById('setting-email').value;
    
    try {
        await setDoc(doc(db, "settings", "global_contacts"), { whatsapp: wa, email: email }, { merge: true });
        alert("Support Contacts saved to Firebase successfully!");
    } catch(e) {
        console.error(e);
        alert("Error saving contacts!");
    }
}

window.openSupportMail = async function() {
    try {
        const snap = await getDoc(doc(db, "settings", "global_contacts"));
        let emailId = "support@linacademy.com";
        if(snap.exists() && snap.data().email) {
            emailId = snap.data().email;
        }
        window.open(`mailto:${emailId}`, '_blank');
    } catch(e) {
        console.error("Failed to fetch custom email", e);
        window.open(`mailto:support@linacademy.com`, '_blank');
    }
}

window.loadPolicyDraft = async function(pageId) {
    if(!pageId) return;
    const textarea = document.getElementById('setting-policy-content');
    textarea.value = "Fetching from secure vault...";
    
    try {
        const snap = await getDoc(doc(db, "settings", `policy_${pageId}`));
        if(snap.exists() && snap.data().content) {
            textarea.value = snap.data().content;
        } else {
            textarea.value = ""; 
        }
    } catch(e) {
        console.error(e);
        textarea.value = "Error loading content.";
    }
}

window.autoSavePolicyDraft = function() {
    const status = document.getElementById('policy-save-status');
    status.classList.remove('hidden');
    status.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
    
    clearTimeout(policyTimeout);
    policyTimeout = setTimeout(async () => {
        const pageId = document.getElementById('setting-policy-selector').value;
        const content = document.getElementById('setting-policy-content').value;
        if(!pageId) return;
        
        try {
            await setDoc(doc(db, "settings", `policy_${pageId}`), { content: content }, { merge: true });
            status.innerHTML = '<i class="fa-solid fa-check"></i> Draft Saved';
            setTimeout(() => status.classList.add('hidden'), 2000);
        } catch(e) {
            console.error("Auto-save failed", e);
        }
    }, 1500);
}

window.publishPolicy = async function() {
    if(!String(window.currentUserRole).includes('admin')) return alert("Access Denied: Admin Only.");
    const pageId = document.getElementById('setting-policy-selector').value;
    const content = document.getElementById('setting-policy-content').value;
    
    if(!pageId) return alert("Please select a policy page from the dropdown first.");
    
    try {
        await setDoc(doc(db, "settings", `policy_${pageId}`), { content: content, published: true, lastUpdated: new Date().toISOString() }, { merge: true });
        alert("Page Published Successfully! Students will now see the updated content.");
    } catch(e) {
        console.error(e);
        alert("Failed to publish page.");
    }
}

window.openPolicyPage = async function(pageId, pageTitle) {
    await window.showScreen('screen-policy-viewer');
    
    document.getElementById('policy-viewer-title').innerText = pageTitle;
    const contentDiv = document.getElementById('policy-viewer-content');
    contentDiv.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> Fetching details from secure server...';
    
    try {
        const snap = await getDoc(doc(db, "settings", `policy_${pageId}`));
        if(snap.exists() && snap.data().content) {
            contentDiv.innerHTML = snap.data().content.replace(/\n/g, '<br>');
        } else {
            contentDiv.innerHTML = "This document is currently being updated. Please check back soon.";
        }
    } catch(e) {
        console.error(e);
        contentDiv.innerHTML = "Error loading document from server.";
    }
}

// ==========================================
// SUPER ADMIN USER ROLE & OMNIBOX MANAGER
// ==========================================
window.executeSmartAdminSearch = async function() {
    if(!String(window.currentUserRole).includes('admin')) return alert("Access Denied: Admin Only.");
    
    const inputStr = document.getElementById('role-search-input').value.trim();
    if(!inputStr) return alert("Please enter an email, 'admin', or a Course Name.");
    
    const resultsContainer = document.getElementById('smart-admin-results-container');
    const editPanel = document.getElementById('role-edit-panel');
    
    resultsContainer.innerHTML = '<div class="text-center text-brand-blue py-10"><i class="fa-solid fa-spinner fa-spin text-2xl mb-2"></i><br><span class="font-bold text-sm">Executing Smart Search...</span></div>';
    editPanel.classList.add('hidden');
    
    const lowerInput = inputStr.toLowerCase();

    try {
        // MODE A: Email Identity Search (Purana Logic Intact!)
        if (inputStr.includes('@')) {
            resultsContainer.innerHTML = ''; // Table ki zaroorat nahi
            const q = query(collection(db, "users"), where("email", "==", inputStr));
            const snap = await getDocs(q);
            
            if(snap.empty) return alert("No user found with this email!");
            
            snap.forEach((docSnap) => {
                const userData = docSnap.data();
                window.currentEditingUserId = docSnap.id;
                document.getElementById('role-user-name').innerText = userData.name || "Unknown Name";
                document.getElementById('role-user-email').innerText = userData.email;
                document.getElementById('role-user-select').value = String(userData.role || 'student').toLowerCase().trim();
                editPanel.classList.remove('hidden');
            });
        } 
        // MODE B: Role Search
        else if (lowerInput === 'admin' || lowerInput === 'superadmin') {
            await window.fetchCourseRosterData(null, lowerInput); // Fetch Admins
        } 
        // MODE C: Course Roster Search
        else {
            await window.fetchCourseRosterData(inputStr, null);
        }
    } catch(e) {
        console.error("Search engine error:", e);
        resultsContainer.innerHTML = '<div class="text-center text-rose-500 py-4">Search failed. Check console.</div>';
    }
}

window.updateUserRole = async function() {
    if(!String(window.currentUserRole).includes('admin')) return alert("Access Denied: Admin Only.");
    if(!window.currentEditingUserId) return alert("Please search for a user first.");
    
    const newRole = document.getElementById('role-user-select').value;
    
    try {
        await updateDoc(doc(db, "users", window.currentEditingUserId), {
            role: newRole
        });
        
        alert(`Success! User has been granted [${newRole.toUpperCase()}] access.`);
        document.getElementById('role-edit-panel').classList.add('hidden');
        // 🚀 BUG FIX: Yahan 'role-search-input' kar diya hai
        document.getElementById('role-search-input').value = ""; 
        window.currentEditingUserId = null;
        
    } catch(e) {
        console.error("Role update error", e);
        alert("Failed to update user role.");
    }
}

window.fetchCourseRosterData = async function(courseName, roleType) {
    const container = document.getElementById('smart-admin-results-container');
    try {
        let q;
        let titleText = "";
        
        if (roleType) {
            q = query(collection(db, "users"), where("role", "==", roleType));
            titleText = `All ${roleType.toUpperCase()}S`;
        } else {
            q = query(collection(db, "users"), where("unlocked_courses", "array-contains", courseName));
            titleText = `Enrolled Students in: ${courseName}`;
        }
        
        const snap = await getDocs(q);
        if (snap.empty) {
            container.innerHTML = `<div class="text-center text-slate-500 py-10 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900">No active users found for this query.</div>`;
            return;
        }

        let tableRows = '';
        snap.forEach(docSnap => {
            const data = docSnap.data();
            const photo = data.photoURL || `https://ui-avatars.com/api/?name=${data.name || 'S'}&background=2563eb&color=fff`;
            
            tableRows += `
            <tr class="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <td class="px-4 py-3 flex items-center gap-3">
                    <img src="${photo}" class="w-8 h-8 rounded-full bg-slate-200 shrink-0 object-cover">
                    <span class="font-bold text-slate-800 dark:text-white">${data.name || 'Unknown'}</span>
                </td>
                <td class="px-4 py-3 font-mono text-[10px] text-slate-400">${docSnap.id}</td>
                <td class="px-4 py-3 text-xs text-slate-600 dark:text-slate-300 font-medium">${data.email}</td>
                <td class="px-4 py-3 text-right space-x-2">
                    <button onclick="window.blockStudentTemp('${docSnap.id}', '${data.email}')" class="text-[10px] bg-amber-100 text-amber-700 hover:bg-amber-200 px-3 py-1.5 rounded-lg font-bold transition-colors" title="Suspend User"><i class="fa-solid fa-ban"></i> Block</button>
                    ${courseName ? `<button onclick="window.banStudentFromCourse('${docSnap.id}', '${courseName}', '${data.email}')" class="text-[10px] bg-rose-100 text-rose-700 hover:bg-rose-200 px-3 py-1.5 rounded-lg font-bold transition-colors" title="Remove from this course"><i class="fa-solid fa-user-slash"></i> Ban</button>` : ''}
                </td>
            </tr>`;
        });

        container.innerHTML = `
        <div class="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div class="bg-slate-50 dark:bg-slate-950 p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                <h4 class="font-bold text-slate-900 dark:text-white flex items-center gap-2"><i class="fa-solid fa-table-list text-brand-blue"></i> ${titleText}</h4>
                <span class="text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1 rounded-full font-bold text-slate-600 dark:text-slate-300">Total: ${snap.size}</span>
            </div>
            <div class="overflow-x-auto">
                <table class="w-full text-left text-sm whitespace-nowrap">
                    <thead class="bg-white dark:bg-slate-900 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                        <tr><th class="px-4 py-3">Student Name</th><th class="px-4 py-3">Firebase UID</th><th class="px-4 py-3">Email Address</th><th class="px-4 py-3 text-right">Action Controls</th></tr>
                    </thead>
                    <tbody>${tableRows}</tbody>
                </table>
            </div>
        </div>`;
    } catch(e) {
        console.error("Table render error:", e);
        container.innerHTML = '<div class="text-center text-rose-500 py-4">Failed to load roster.</div>';
    }
}

window.adminAuditLog = async function(actionText) {
    try {
        await setDoc(doc(collection(db, "admin_audit_logs")), {
            adminId: auth.currentUser.uid,
            adminEmail: auth.currentUser.email,
            action: actionText,
            timestamp: new Date().toISOString()
        });
    } catch(e) { console.warn("Audit log failed to save", e); }
}

window.blockStudentTemp = async function(userId, email) {
    const days = prompt(`For how many days do you want to block ${email}? (e.g., 7, 30)`);
    if(!days || isNaN(days)) return;
    
    if(confirm(`Are you sure you want to block ${email} for ${days} days from the entire platform?`)) {
        try {
            const blockedUntil = new Date();
            blockedUntil.setDate(blockedUntil.getDate() + parseInt(days));
            
            await updateDoc(doc(db, "users", userId), {
                isBlocked: true,
                blockedUntil: blockedUntil.toISOString()
            });
            window.adminAuditLog(`Blocked user ${email} for ${days} days.`);
            alert(`User suspended until ${blockedUntil.toDateString()}`);
        } catch(e) { console.error(e); alert("Failed to block user."); }
    }
}

window.banStudentFromCourse = async function(userId, courseName, email) {
    if(confirm(`⚠️ WARNING: Permanently remove ${email} from [${courseName}]? They will lose access immediately.`)) {
        try {
            await updateDoc(doc(db, "users", userId), {
                unlocked_courses: arrayRemove(courseName)
            });
            window.adminAuditLog(`Banned user ${email} from course ${courseName}.`);
            alert("User successfully banned from the course.");
            // Refresh table
            document.getElementById('role-search-input').value = courseName;
            window.executeSmartAdminSearch();
        } catch(e) { console.error(e); alert("Failed to ban user from course."); }
    }
}

window.manualEnrollStudent = async function() {
    const email = document.getElementById('inject-email').value.trim();
    const courseName = document.getElementById('inject-course-name').value;
    const validityDays = parseInt(document.getElementById('inject-validity').value);
    
    if(!email || !courseName || !validityDays) return alert("Please fill all fields!");
    
    const btn = event.target;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing...';
    btn.disabled = true;
    
    try {
        // 1. Find user by email
        const q = query(collection(db, "users"), where("email", "==", email));
        const snap = await getDocs(q);
        
        if(snap.empty) {
            alert("No registered user found with this email! They must sign up first.");
            btn.innerHTML = 'Grant Access'; btn.disabled = false; return;
        }
        
        // 2. Calculate Expiry Date
        const expDate = new Date();
        expDate.setDate(expDate.getDate() + validityDays);
        const expDateString = expDate.toISOString();
        
        // 3. Inject Course
        snap.forEach(async (docSnap) => {
            const userId = docSnap.id;
            await updateDoc(doc(db, "users", userId), {
                unlocked_courses: arrayUnion(courseName),
                [`course_expiries.${courseName}`]: expDateString
            });
            window.adminAuditLog(`Manually enrolled ${email} into ${courseName} for ${validityDays} days.`);
            alert(`Success! ${email} has been enrolled in ${courseName}.`);
            document.getElementById('manual-inject-modal').classList.add('hidden');
        });
    } catch(e) {
        console.error(e);
        alert("Failed to inject student. Check console.");
    } finally {
        btn.innerHTML = 'Grant Access';
        btn.disabled = false;
    }
}

// ==========================================
// STUDENT EXAM ENGINE (LIVE TEST PORTAL)
// ==========================================
window.currentExamSession = {
    vaultId: null, settings: null, questions: [], userAnswers: [],
    currentQIndex: 0, timeRemaining: 0, timerInterval: null, companionInterval: null
};

window.switchExamScreen = function(screenId) {
    ['exam-intro-screen', 'exam-active-screen', 'exam-result-screen', 'exam-review-screen'].forEach(id => {
        const el = document.getElementById(id);
        if(el) el.style.display = 'none';
    });
    const target = document.getElementById(screenId);
    if(target) target.style.display = 'flex';
    const engine = document.getElementById('screen-exam-engine');
    if(engine) engine.scrollTop = 0;
}

window.exitExamEngine = function() {
    clearInterval(window.currentExamSession.timerInterval);
    clearInterval(window.currentExamSession.companionInterval);
    const engine = document.getElementById('screen-exam-engine');
    if(engine) engine.classList.add('hidden');
}

window.initStudentExam = async function(vaultId) {
    await window.showScreen('screen-exam-engine'); 
    document.getElementById('screen-exam-engine').classList.remove('hidden'); 
    
    window.switchExamScreen('exam-intro-screen');
    document.getElementById('exam-main-title').innerText = "Loading Test...";
    document.getElementById('start-exam-btn').disabled = true;
    document.getElementById('start-exam-text').innerText = "Fetching securely...";

    try {
        const snap = await getDoc(doc(db, "exams", vaultId));
        if(snap.exists()) {
            const data = snap.data();
            window.currentExamSession.vaultId = vaultId;
            window.currentExamSession.settings = data.settings;
            window.currentExamSession.questions = data.questions || [];
            window.currentExamSession.userAnswers = new Array(data.questions.length).fill(null);
            window.currentExamSession.timeRemaining = (data.settings.totalTimeInMinutes || 0) * 60;
            window.currentExamSession.currentQIndex = 0;

            document.getElementById('exam-main-title').innerText = data.settings.testTitle || "Mock Test";
            document.getElementById('intro-total-qs').innerText = data.questions.length;
            document.getElementById('intro-total-mins').innerText = data.settings.totalTimeInMinutes;
            document.getElementById('intro-pos-marks').innerText = "+" + data.settings.marksForCorrectAnswer;
            document.getElementById('intro-neg-marks').innerText = "-" + data.settings.marksForWrongAnswer;
            document.getElementById('intro-pass-percent').innerText = data.settings.passPercentage || 40;

            document.getElementById('start-exam-btn').disabled = false;
            document.getElementById('start-exam-text').innerText = "Begin Examination";
        } else {
            alert("Test not found! It may have been removed.");
            window.exitExamEngine();
        }
    } catch(e) {
        console.error("Exam load error", e);
        alert("Failed to load the test.");
        window.exitExamEngine();
    }
}

window.startExamSequence = function() {
    window.switchExamScreen('exam-active-screen');
    document.getElementById('exam-timer-display').style.display = 'flex';
    
    document.getElementById('exam-companion-ui').classList.remove('translate-x-48', 'opacity-0');
    document.getElementById('exam-timeout-overlay').style.display = 'none';
    document.getElementById('exam-timeout-overlay').classList.add('opacity-0');
    document.getElementById('exam-timer-display').className = "bg-slate-800 px-3 sm:px-4 py-1.5 rounded-md text-amber-400 font-mono font-bold tracking-wider border border-slate-700 items-center shadow-inner transition-colors duration-300 flex";
    document.getElementById('exam-clock-icon').classList.remove('animate-pulse', 'text-red-500');

    window.loadExamQuestion(0);
    window.startExamTimer();
    
    window.currentExamSession.companionInterval = setInterval(() => {
        if(Math.random() > 0.7) window.showExamCompanionSpeech("Check the clock! ⏰");
    }, 45000);
}

window.showExamCompanionSpeech = function(text) {
    const bubble = document.getElementById('exam-companion-speech');
    bubble.innerText = text;
    bubble.classList.remove('hidden');
    setTimeout(() => bubble.classList.add('hidden'), 3000);
}

window.pokeDonkey = function() {
    const phrases = ["Hee-Haw! Focus on the test!", "I'm monitoring your tabs...", "You got this!", "Don't guess, use logic!"];
    window.showExamCompanionSpeech(phrases[Math.floor(Math.random() * phrases.length)]);
}

window.loadExamQuestion = function(index) {
    const session = window.currentExamSession;
    const q = session.questions[index];
    
    document.getElementById('exam-q-number').innerText = `Question ${index + 1} of ${session.questions.length}`;
    document.getElementById('exam-q-pos-mark').innerText = `+${session.settings.marksForCorrectAnswer} Marks`;
    document.getElementById('exam-q-text').innerHTML = q.question;
    
    const progress = (index / session.questions.length) * 100;
    document.getElementById('exam-progress-bar').style.width = `${progress}%`;

    const container = document.getElementById('exam-options-container');
    container.innerHTML = '';
    
    q.options.forEach((opt, optIndex) => {
        const isChecked = session.userAnswers[index] === optIndex ? "checked" : "";
        container.innerHTML += `
            <label class="relative block cursor-pointer group">
                <input type="radio" name="exam-option" class="peer sr-only" value="${optIndex}" onchange="window.selectExamOption(${index}, ${optIndex})" ${isChecked}>
                <div class="border-2 border-slate-100 rounded-xl p-4 sm:p-5 bg-slate-50 transition-all hover:bg-white hover:border-brand-blue flex items-center gap-4">
                    <div class="radio-circle shrink-0 w-5 h-5 rounded-full border-2 border-slate-300 flex items-center justify-center transition-colors bg-white">
                        <div class="w-2 h-2 rounded-full bg-white"></div>
                    </div>
                    <span class="text-slate-700 font-medium text-sm sm:text-lg">${opt}</span>
                </div>
            </label>`;
    });

    document.getElementById('exam-prev-btn').disabled = (index === 0);
    
    if (index === session.questions.length - 1) {
        document.getElementById('exam-next-btn').style.display = 'none';
        document.getElementById('exam-submit-btn').style.display = 'flex';
    } else {
        document.getElementById('exam-next-btn').style.display = 'flex';
        document.getElementById('exam-submit-btn').style.display = 'none';
    }
}

window.selectExamOption = function(qIndex, optIndex) {
    window.currentExamSession.userAnswers[qIndex] = optIndex;
    window.showExamCompanionSpeech("Good! Keep going.");
}

window.examNextQ = function() { 
    if (window.currentExamSession.currentQIndex < window.currentExamSession.questions.length - 1) { 
        window.currentExamSession.currentQIndex++; 
        window.loadExamQuestion(window.currentExamSession.currentQIndex); 
    } 
}
window.examPrevQ = function() { 
    if (window.currentExamSession.currentQIndex > 0) { 
        window.currentExamSession.currentQIndex--; 
        window.loadExamQuestion(window.currentExamSession.currentQIndex); 
    } 
}

window.startExamTimer = function() {
    const display = document.getElementById('exam-time-text');
    const timerContainer = document.getElementById('exam-timer-display');
    const icon = document.getElementById('exam-clock-icon');

    window.currentExamSession.timerInterval = setInterval(() => {
        let tr = window.currentExamSession.timeRemaining;
        let m = parseInt(tr / 60, 10); let s = parseInt(tr % 60, 10);
        m = m < 10 ? "0" + m : m; s = s < 10 ? "0" + s : s;
        display.textContent = m + ":" + s;

        if(tr === 60) window.showExamCompanionSpeech("Only 1 minute left! Hurry up! ⏱️");

        if(tr < 60) {
            timerContainer.classList.remove('text-amber-400');
            timerContainer.classList.add('text-red-500', 'bg-red-950', 'border-red-800');
            icon.classList.add('animate-pulse', 'text-red-500');
        }
        if (--window.currentExamSession.timeRemaining < 0) { 
            clearInterval(window.currentExamSession.timerInterval); 
            window.triggerExamTimeOut(); 
        }
    }, 1000);
}

window.triggerExamTimeOut = function() {
    clearInterval(window.currentExamSession.timerInterval);
    clearInterval(window.currentExamSession.companionInterval);
    
    document.getElementById('exam-companion-ui').style.display = 'none'; 
    const overlay = document.getElementById('exam-timeout-overlay');
    overlay.style.display = 'flex';
    
    setTimeout(() => overlay.classList.remove('opacity-0', 'opacity-100'), 50);
    setTimeout(() => window.calculateExamResult(), 2500);
}

window.examSubmitSequence = function() {
    if(confirm("Are you sure you want to submit the test?")) {
        clearInterval(window.currentExamSession.timerInterval); 
        clearInterval(window.currentExamSession.companionInterval);
        window.calculateExamResult();
    }
}

window.calculateExamResult = function() {
    document.getElementById('exam-timer-display').style.display = 'none';
    document.getElementById('exam-timeout-overlay').style.display = 'none'; 
    
    const s = window.currentExamSession;
    let correct = 0; let wrong = 0; let skipped = 0;

    for (let i = 0; i < s.questions.length; i++) {
        if (s.userAnswers[i] === null) skipped++; 
        else if (s.userAnswers[i] === s.questions[i].correctAnswerIndex) correct++; 
        else wrong++; 
    }

    const totalScore = (correct * s.settings.marksForCorrectAnswer) - (wrong * s.settings.marksForWrongAnswer);
    const maxScore = s.questions.length * s.settings.marksForCorrectAnswer;
    const pct = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;
    // 🚀 THE DATA CATCHER: Save Real Result to Firebase
    if (auth.currentUser) {
        try {
            const attemptId = Date.now().toString();
            // Naya folder banega: student_performance
            const perfRef = doc(db, "student_performance", auth.currentUser.uid + "_" + attemptId);
            setDoc(perfRef, {
                userId: auth.currentUser.uid,
                userName: auth.currentUser.displayName || "Student", // 🚀 ADDED: Naam
                userPhoto: auth.currentUser.photoURL || "",          // 🚀 ADDED: Photo
                testId: s.vaultId || "unknown",
                testTitle: s.settings.testTitle || "Mock Test",
                score: totalScore,
                maxScore: maxScore,
                percentage: pct,
                timestamp: new Date().toISOString()
            }).then(() => {
                // 🚀 NEW: Result save hote hi background mein Rank aur Percentile calculate karo
                window.calculateRankAndPercentile(totalScore, s.vaultId);
            });
        } catch(e) {
            console.error("Failed to save performance metrics:", e);
        }
    }

    document.getElementById('exam-final-score').innerText = totalScore.toFixed(2);
    document.getElementById('exam-max-score').innerText = maxScore.toFixed(2);
    document.getElementById('exam-correct-count').innerText = correct;
    document.getElementById('exam-wrong-count').innerText = wrong;
    document.getElementById('exam-skipped-count').innerText = skipped;
    
    const gArea = document.getElementById('exam-gamification-area');
    const avatar = document.getElementById('exam-result-avatar');
    const status = document.getElementById('exam-result-status');
    const msg = document.getElementById('exam-result-message');

    avatar.classList.remove('animate-bounce', 'animate-laugh');
    gArea.classList.remove('bg-emerald-50', 'border-emerald-200', 'bg-red-50', 'border-red-200');
    status.classList.remove('text-emerald-600', 'text-red-600');

    if (pct >= (s.settings.passPercentage || 40)) {
        gArea.classList.add('bg-emerald-50', 'border-emerald-200');
        status.innerText = "Exam Cleared!";
        status.classList.add('text-emerald-600');
        avatar.innerText = "🐴🎉";
        avatar.classList.add('animate-bounce');
        msg.innerText = "Hee-haw! Congratulations! You successfully crossed the target line. Outstanding performance!";
    } else {
        gArea.classList.add('bg-red-50', 'border-red-200');
        status.innerText = "Failed!";
        status.classList.add('text-red-600');
        avatar.innerText = "🐴🤣";
        avatar.classList.add('animate-laugh');
        msg.innerText = "Hee-haw! That was a disaster! You fell short of the pass mark. Review your mistakes and try again!";
    }

    window.switchExamScreen('exam-result-screen'); 
    document.getElementById('exam-progress-bar').style.width = `100%`;
}

window.buildExamReviewScreen = function() {
    window.switchExamScreen('exam-review-screen');
    const container = document.getElementById('exam-review-container');
    container.innerHTML = ''; 
    
    const s = window.currentExamSession;

    s.questions.forEach((q, index) => {
        const userAns = s.userAnswers[index]; 
        const correctAns = q.correctAnswerIndex;
        
        let badgeHtml = '';
        if (userAns === null) badgeHtml = `<span class="bg-slate-200 text-slate-600 text-xs font-bold px-3 py-1 rounded-md uppercase">Unanswered</span>`; 
        else if (userAns === correctAns) badgeHtml = `<span class="bg-emerald-100 text-emerald-700 text-xs font-bold px-3 py-1 rounded-md uppercase">Correct</span>`; 
        else badgeHtml = `<span class="bg-red-100 text-red-700 text-xs font-bold px-3 py-1 rounded-md uppercase">Wrong</span>`;

        let optionsHtml = '';
        q.options.forEach((opt, optIndex) => {
            let borderClass = 'border-slate-200 bg-white'; 
            let circleClass = 'border-slate-300'; 
            let dotClass = 'bg-transparent';
            
            if (optIndex === correctAns) { 
                borderClass = 'border-emerald-500 bg-emerald-50'; circleClass = 'border-emerald-500 bg-emerald-500'; dotClass = 'bg-white'; 
            } else if (optIndex === userAns && userAns !== correctAns) { 
                borderClass = 'border-red-400 bg-red-50 opacity-80'; circleClass = 'border-red-400 bg-red-400'; dotClass = 'bg-white'; 
            }
            
            optionsHtml += `
                <div class="border-2 ${borderClass} rounded-xl p-4 flex items-center gap-4 mb-3">
                    <div class="shrink-0 w-5 h-5 rounded-full border-2 ${circleClass} flex items-center justify-center"><div class="w-2 h-2 rounded-full ${dotClass}"></div></div>
                    <span class="text-slate-700 font-medium text-sm sm:text-base">${opt}</span>
                </div>`;
        });

        container.innerHTML += `
            <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div class="p-5 sm:p-8">
                    <div class="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                        <span class="text-xs sm:text-sm font-extrabold text-brand-blue uppercase bg-blue-50 px-3 py-1 rounded-lg">Question ${index + 1}</span>
                        ${badgeHtml}
                    </div>
                    <h3 class="text-base sm:text-lg font-semibold text-slate-900 mb-6">${q.question}</h3>
                    <div class="mb-6">${optionsHtml}</div>
                    <div class="bg-blue-50 border border-blue-100 rounded-xl p-4 sm:p-5 mt-6">
                        <h4 class="text-xs sm:text-sm font-bold text-blue-900 mb-2 uppercase"><i class="fas fa-lightbulb text-amber-500 mr-2"></i> Explanation</h4>
                        <p class="text-xs sm:text-sm text-blue-800 leading-relaxed">${q.explanation || 'No explanation provided.'}</p>
                    </div>
                </div>
            </div>`;
    });
}

// ==========================================
// 🚀 CATEGORY AUTOCOMPLETE ENGINE
// ==========================================
window.loadDeployerCategories = async function() {
    try {
        // Yeh sirf background mein dropdown lists (suggestions) bharne ke liye hai
        const snap = await getDoc(doc(db, "cms", "homepage"));
        if(snap.exists() && snap.data().courseCategories) {
            const categories = snap.data().courseCategories;
            const datalist = document.getElementById('deploy-category-list');
            if(datalist) {
                datalist.innerHTML = '';
                categories.forEach(cat => {
                    const catName = typeof cat === 'string' ? cat : cat.name;
                    datalist.innerHTML += `<option value="${catName}">`;
                });
            }
        }
    } catch(e) { console.error("Autocomplete Load Error:", e); }
}

window.loadDeployerInventory = async function() {
    const container = document.getElementById('deployer-inventory-list');
    if(!container) return;
    
    container.innerHTML = '<div class="text-center text-slate-400 text-sm py-4"><i class="fa-solid fa-spinner fa-spin"></i> Fetching inventory...</div>';

    try {
        const snap = await getDocs(collection(db, "deployed_courses"));
        let html = '';
        snap.forEach(docSnap => {
            const data = docSnap.data();
            html += `
            <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 flex justify-between items-center shadow-sm hover:shadow-md transition-shadow mb-2">
                <div class="flex items-center gap-3 overflow-hidden">
                    <div class="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style="background-color: ${data.design?.boxBg || '#ecfdf5'}; color: ${data.design?.iconColor || '#059669'}; border: 1px solid ${data.design?.boxBorder || 'transparent'}">
                        <i class="fa-solid ${data.design?.icon || 'fa-book'}"></i>
                    </div>
                    <div class="truncate">
                        <span class="text-[9px] font-bold bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded uppercase tracking-wider">${data.category || 'Uncategorized'}</span>
                        <h4 class="font-bold text-sm text-slate-800 dark:text-white truncate mt-0.5">${data.title}</h4>
                    </div>
                </div>
                <div class="flex gap-2 shrink-0 ml-2">
                    <button onclick="window.editDeployedCourse('${docSnap.id}')" class="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 transition-colors flex items-center justify-center" title="Edit Course"><i class="fa-solid fa-pen-to-square"></i></button>
                    <button onclick="window.deleteDeployedCourse('${docSnap.id}')" class="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 hover:bg-rose-100 transition-colors flex items-center justify-center" title="Delete Course"><i class="fa-solid fa-trash"></i></button>
                </div>
            </div>`;
        });
        
        if(html === '') {
            html = '<div class="text-center text-slate-400 text-sm py-4">No tiles deployed yet.</div>';
        }
        container.innerHTML = html;
        
    } catch(e) {
        console.error("Error loading inventory", e);
        container.innerHTML = '<div class="text-center text-rose-500 text-sm py-4">Failed to load inventory.</div>';
    }
}

window.editDeployedCourse = async function(docId) {
    try {
        const docRef = doc(db, "deployed_courses", docId);
        const docSnap = await getDoc(docRef);
        
        if(docSnap.exists()) {
            const data = docSnap.data();
            
            document.getElementById('deploy-category').value = data.category || '';
            document.getElementById('deploy-sub-category').value = data.subCategory || ''; // 🚀 ADDED
            document.getElementById('deploy-title').value = data.title || '';
            document.getElementById('deploy-subtitle').value = data.subtitle || '';
            document.getElementById('deploy-badge').value = data.badge || '';
            document.getElementById('deploy-price').value = data.price || '';
            document.getElementById('deploy-validity').value = data.validity || '';
            
            if(data.design) {
                document.getElementById('deploy-icon').value = data.design.icon || 'fa-book';
                document.getElementById('deploy-icon-color').value = data.design.iconColor || '#059669';
                document.getElementById('deploy-box-bg').value = data.design.boxBg || '#ecfdf5';
                document.getElementById('deploy-box-border').value = data.design.boxBorder || '#a7f3d0';
                document.getElementById('deploy-tile-border').value = data.design.tileBorder || '#f1f5f9';
                document.getElementById('deploy-tile-size').value = data.design.size || 'large';
            }
            
            if(window.updateLivePreview) window.updateLivePreview();
            
            const deployBtn = document.getElementById('deploy-master-btn');
            if(deployBtn) {
                deployBtn.innerHTML = '<i class="fa-solid fa-satellite-dish"></i> Update & Deploy Tile';
                deployBtn.classList.remove('from-brand-blue', 'to-indigo-600');
                deployBtn.classList.add('from-emerald-500', 'to-emerald-700');
            }
            
            const deployerTab = document.querySelector('#admin-subtab-deployer');
            if(deployerTab) deployerTab.scrollIntoView({ behavior: 'smooth' });
            
            alert(`Loaded "${data.title}" into the Editor! Change anything and hit Update.`);
        }
    } catch(e) {
        console.error("Error editing course", e);
    }
}

window.deleteDeployedCourse = async function(docId) {
    if(confirm(`⚠️ WARNING: Are you sure you want to completely DELETE this course?\n\nThis will remove the tile from the Storefront and Student Enrollments vault forever!`)) {
        try {
            await deleteDoc(doc(db, "deployed_courses", docId));
            alert("Course deleted successfully!");
            window.loadDeployerInventory(); 
            if(window.loadAdminCourseDropdown) window.loadAdminCourseDropdown(); 
        } catch(e) {
            console.error("Error deleting", e);
            alert("Failed to delete the course.");
        }
    }
}

window.updateLivePreview = function() {
    const title = document.getElementById('deploy-title')?.value || 'Course Title';
    const subtitle = document.getElementById('deploy-subtitle')?.value || 'Your catchy subtitle will appear right here.';
    const icon = document.getElementById('deploy-icon')?.value || 'fa-book';
    const iconColor = document.getElementById('deploy-icon-color')?.value || '#059669';
    const boxBg = document.getElementById('deploy-box-bg')?.value || '#ecfdf5';
    const boxBorder = document.getElementById('deploy-box-border')?.value || '#a7f3d0';
    const badge = document.getElementById('deploy-badge')?.value;
    const tileBorder = document.getElementById('deploy-tile-border')?.value || '#f1f5f9';
    const textMode = document.getElementById('deploy-text-color-mode')?.value || 'default';
    
    // 🚀 THE MAGIC SIZE READER
    const tileSize = document.getElementById('deploy-tile-size')?.value || 'large';

    const previewTitle = document.getElementById('preview-title');
    const previewSubtitle = document.getElementById('preview-subtitle');
    const previewIcon = document.getElementById('preview-icon');
    const previewIconBox = document.getElementById('preview-icon-box');
    const previewTile = document.getElementById('deploy-preview-tile');
    const badgeEl = document.getElementById('preview-badge');
    
    if(previewTitle) previewTitle.innerText = title;
    if(previewSubtitle) previewSubtitle.innerText = subtitle;
    if(previewIcon) previewIcon.className = `fa-solid ${icon}`;
    
    if(previewIconBox) {
        previewIconBox.style.color = iconColor;
        previewIconBox.style.backgroundColor = boxBg;
        previewIconBox.style.borderColor = boxBorder;
        previewIconBox.className = 'rounded-2xl flex items-center justify-center border-2 border-solid shadow-inner transition-transform group-hover:scale-110';
    }

    if(previewTile) {
        previewTile.style.borderColor = tileBorder;
        previewTile.className = 'bg-white dark:bg-slate-900 rounded-3xl border-2 border-solid shadow-xl flex flex-col transition-all duration-300 overflow-hidden relative mx-auto';
    }

    const btnEl = previewTile ? previewTile.querySelector('button') : null;

    // 🚀 APPLY SIZES TO PREVIEW
    if (tileSize === 'small') {
        if(previewTile) previewTile.classList.add('w-40', 'p-4');
        if(previewIconBox) previewIconBox.classList.add('w-10', 'h-10', 'text-lg', 'mb-3');
        if(previewTitle) previewTitle.className = 'text-sm font-bold mb-2 leading-snug transition-colors';
        if(previewSubtitle) previewSubtitle.className = 'text-[10px] text-slate-500 dark:text-slate-400 font-medium mb-3 line-clamp-1 flex-grow';
        if(btnEl) btnEl.className = 'mt-auto w-full bg-slate-50 dark:bg-slate-800 text-brand-blue font-bold py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-[10px] shadow-sm pointer-events-none';
    } else if (tileSize === 'medium') {
        if(previewTile) previewTile.classList.add('w-52', 'p-5');
        if(previewIconBox) previewIconBox.classList.add('w-12', 'h-12', 'text-xl', 'mb-4');
        if(previewTitle) previewTitle.className = 'text-base font-bold mb-2 leading-snug transition-colors';
        if(previewSubtitle) previewSubtitle.className = 'text-xs text-slate-500 dark:text-slate-400 font-medium mb-4 line-clamp-2 flex-grow';
        if(btnEl) btnEl.className = 'mt-auto w-full bg-slate-50 dark:bg-slate-800 text-brand-blue font-bold py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs shadow-sm pointer-events-none';
    } else { 
        if(previewTile) previewTile.classList.add('w-64', 'p-6');
        if(previewIconBox) previewIconBox.classList.add('w-14', 'h-14', 'text-2xl', 'mb-5');
        if(previewTitle) previewTitle.className = 'text-lg font-bold mb-2 leading-snug transition-colors';
        if(previewSubtitle) previewSubtitle.className = 'text-xs text-slate-500 dark:text-slate-400 font-medium mb-6 line-clamp-2 flex-grow';
        if(btnEl) btnEl.className = 'mt-auto w-full bg-slate-50 dark:bg-slate-800 text-brand-blue font-bold py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm shadow-sm pointer-events-none';
    }

    // Apply Text Colors
    if(previewTitle) {
        if (textMode === 'brand') previewTitle.classList.add('text-brand-blue');
        else if (textMode === 'emerald') previewTitle.classList.add('text-emerald-600', 'dark:text-emerald-400');
        else if (textMode === 'rose') previewTitle.classList.add('text-rose-600', 'dark:text-rose-400');
        else if (textMode === 'amber') previewTitle.classList.add('text-amber-600', 'dark:text-amber-400');
        else previewTitle.classList.add('text-slate-900', 'dark:text-white');
    }

    // Badge Logic
    if(badgeEl) {
        if(!badge) {
            badgeEl.classList.add('hidden');
        } else {
            badgeEl.classList.remove('hidden');
            badgeEl.className = 'absolute top-0 right-0 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl z-10 shadow-sm transition-all';
            if(badge === 'bestseller') { badgeEl.innerText = '🔥 Bestseller'; badgeEl.classList.add('bg-rose-500'); }
            else if(badge === 'new') { badgeEl.innerText = '✨ New Launch'; badgeEl.classList.add('bg-emerald-500'); }
            else if(badge === 'limited') { badgeEl.innerText = '⏳ Limited Offer'; badgeEl.classList.add('bg-amber-500'); }
            else if(badge === 'premium') { badgeEl.innerText = '💎 Premium'; badgeEl.classList.add('bg-purple-500'); }
        }
    }
}

window.deployMasterCourse = async function() {
    if(!auth.currentUser) return alert("Please login first to deploy courses.");
    
    const category = document.getElementById('deploy-category')?.value.trim() || '';
    const subCategory = document.getElementById('deploy-sub-category')?.value.trim() || ''; 
    const title = document.getElementById('deploy-title')?.value.trim() || '';
    
    if(!category || !title) { 
        alert("Course Title and Category are required!"); 
        return; 
    }

    const deployBtn = document.getElementById('deploy-master-btn');
    const originalHtml = deployBtn ? deployBtn.innerHTML : 'Deploy';
    
    if (deployBtn) {
        deployBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Deploying...';
        deployBtn.disabled = true;
    }

    const courseData = {
        category: category,
        subCategory: subCategory,
        title: title,
        subtitle: document.getElementById('deploy-subtitle')?.value.trim() || '',
        badge: document.getElementById('deploy-badge')?.value || '',
        price: Number(document.getElementById('deploy-price')?.value) || 0,
        validity: Number(document.getElementById('deploy-validity')?.value) || 0,
        status: document.getElementById('deploy-status')?.value || 'live',
        design: {
            icon: document.getElementById('deploy-icon')?.value || 'fa-book',
            textColorMode: document.getElementById('deploy-text-color-mode')?.value || 'default',
            iconColor: document.getElementById('deploy-icon-color')?.value || '#059669',
            boxBg: document.getElementById('deploy-box-bg')?.value || '#ecfdf5',
            boxBorder: document.getElementById('deploy-box-border')?.value || '#a7f3d0',
            tileBorder: document.getElementById('deploy-tile-border')?.value || '#f1f5f9',
            tileSize: document.getElementById('deploy-tile-size')?.value || 'large' // 🚀 PROPER FIX: tileSize mapped
        },
        updatedAt: new Date().toISOString()
    };

    try {
        await setDoc(doc(db, "deployed_courses", title), courseData, { merge: true });
        
        // 🚀 UPGRADE: Auto-Add Category & Sub-Category properly inside the new Object Structure
        const cmsSnap = await getDoc(doc(db, "cms", "homepage"));
        let existingCats = cmsSnap.exists() && cmsSnap.data().courseCategories ? cmsSnap.data().courseCategories : [];
        let catFound = false;
        
        let newCats = existingCats.map(c => {
            let cObj = typeof c === 'string' ? { name: c, subCategories: [] } : c;
            if(cObj.name === category) {
                catFound = true;
                if(subCategory && !cObj.subCategories.includes(subCategory)) {
                    cObj.subCategories.push(subCategory);
                }
            }
            return cObj;
        });

        if(!catFound) {
            newCats.push({
                name: category,
                subCategories: subCategory ? [subCategory] : []
            });
        }
        await setDoc(doc(db, "cms", "homepage"), { courseCategories: newCats }, { merge: true });
        // --- END UPGRADE ---

        alert("Course Deployed Successfully! 🚀");
        
        if (document.getElementById('deploy-category')) document.getElementById('deploy-category').value = '';
        if (document.getElementById('deploy-sub-category')) document.getElementById('deploy-sub-category').value = '';
        if (document.getElementById('deploy-title')) document.getElementById('deploy-title').value = '';
        if (document.getElementById('deploy-subtitle')) document.getElementById('deploy-subtitle').value = '';
        
        if (deployBtn) {
            deployBtn.innerHTML = '<i class="fa-solid fa-satellite-dish"></i> Deploy to App';
            deployBtn.classList.remove('from-emerald-500', 'to-emerald-700');
            deployBtn.classList.add('from-brand-blue', 'to-indigo-600');
            deployBtn.disabled = false;
        }
        
        if(window.updateLivePreview) window.updateLivePreview();
        if(window.loadDeployerInventory) window.loadDeployerInventory();
        if(window.loadAdminCourseDropdown) window.loadAdminCourseDropdown();
        if(window.renderHomepage) window.renderHomepage(); 
        
    } catch(e) {
        console.error("Deploy error", e);
        alert("Failed to deploy course.");
        if (deployBtn) {
            deployBtn.innerHTML = originalHtml;
            deployBtn.disabled = false;
        }
    }
}

// ==========================================
// 🏆 LEADERBOARD & RANK ENGINE
// ==========================================
window.calculateRankAndPercentile = async function(myScore, testId) {
    if (!testId || testId === "unknown") return;
    
    try {
        const perfCol = collection(db, "student_performance");
        
        // 1. Total bachhe (using getCountFromServer for zero cost)
        const totalQuery = query(perfCol, where("testId", "==", testId));
        const totalSnap = await getCountFromServer(totalQuery);
        const totalStudents = totalSnap.data().count;
        
        // 2. Kitne bachhon ka score mujhse ZYADA hai?
        const higherQuery = query(perfCol, where("testId", "==", testId), where("score", ">", myScore));
        const higherSnap = await getCountFromServer(higherQuery);
        const higherStudents = higherSnap.data().count;
        
        // 3. Math Magic: Rank aur Percentile
        const myRank = higherStudents + 1; 
        const myPercentile = totalStudents > 1 ? ((totalStudents - myRank) / totalStudents) * 100 : 100;
        
        // 4. Update the UI (Hum isey exam-engine.html mein add karenge)
        const rankEl = document.getElementById('exam-my-rank');
        const percEl = document.getElementById('exam-my-percentile');
        
        if(rankEl) rankEl.innerText = `AIR ${myRank} / ${totalStudents}`;
        if(percEl) percEl.innerText = `${myPercentile.toFixed(1)}%ile`;
        
    } catch (e) {
        console.error("Rank calculation error:", e);
    }
}

window.fetchLeaderboard = async function(testId) {
    if (!testId || testId === "unknown") return;
    const listContainer = document.getElementById('leaderboard-list');
    if(!listContainer) return;
    
    listContainer.innerHTML = '<div class="text-center py-6"><i class="fa-solid fa-spinner fa-spin text-brand-blue text-2xl mb-2"></i><br><span class="text-xs text-slate-500 font-bold">Summoning Top 10...</span></div>';
    
    try {
        // Sirf Top 10 data download hoga (Cost saving!)
        const q = query(collection(db, "student_performance"), where("testId", "==", testId), orderBy("score", "desc"), limit(10));
        const snap = await getDocs(q);
        
        let html = '';
        let rank = 1;
        
        snap.forEach(doc => {
            const data = doc.data();
            const photo = data.userPhoto || `https://ui-avatars.com/api/?name=${data.userName}&background=2563eb&color=fff`;
            
            // The Podium Crowns
            let badge = `<span class="text-slate-400 font-bold w-6 text-center text-sm">#${rank}</span>`;
            if(rank === 1) badge = `<span class="text-2xl" title="Rank 1">🥇</span>`;
            else if(rank === 2) badge = `<span class="text-2xl" title="Rank 2">🥈</span>`;
            else if(rank === 3) badge = `<span class="text-2xl" title="Rank 3">🥉</span>`;
            
            html += `
            <div class="flex items-center gap-3 p-3 bg-slate-50 border border-slate-100 rounded-xl mb-2 hover:border-brand-blue transition-colors shadow-sm">
                <div class="shrink-0 w-8 flex justify-center">${badge}</div>
                <img src="${photo}" class="w-10 h-10 rounded-full border-2 border-white shadow-sm object-cover shrink-0">
                <div class="flex-grow min-w-0">
                    <div class="font-bold text-slate-800 text-sm truncate">${data.userName}</div>
                </div>
                <div class="shrink-0 text-right bg-blue-50 px-3 py-1 rounded-lg border border-blue-100">
                    <div class="text-brand-blue font-extrabold text-sm">${data.score.toFixed(2)}</div>
                    <div class="text-[8px] text-blue-500 font-bold uppercase">Score</div>
                </div>
            </div>`;
            rank++;
        });
        
        if(html === '') html = '<div class="text-center py-4 text-slate-500">No warriors on the board yet.</div>';
        listContainer.innerHTML = html;
        
    } catch(e) {
        console.error("Leaderboard fetch error:", e);
        listContainer.innerHTML = '<div class="text-center py-4 text-rose-500 font-bold">Failed to load leaderboard.</div>';
    }
}

// ==========================================
// 🚀 DEEP LINKING & MARKETING ROUTER (ULTIMATE BOUNCER)
// ==========================================
setTimeout(async () => {
    // URL se data padhne wala engine
    const urlParams = new URLSearchParams(window.location.search);
    const targetCourse = urlParams.get('course');

    if (targetCourse) {
        const cleanCourseName = decodeURIComponent(targetCourse);
        console.log("Deep link detected for course:", cleanCourseName);

        let hasValidAccess = false;

        // 🧠 SECURE CHECK: Firebase se direct user ki kundali (data) nikalo
        if (auth.currentUser) {
            try {
                // Yahan hum doc aur getDoc ka use karke seedha database check kar rahe hain
                const { doc, getDoc } = await import("https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js");
                const userSnap = await getDoc(doc(db, "users", auth.currentUser.uid));
                
                if (userSnap.exists()) {
                    const userData = userSnap.data();
                    const role = String(userData.role || 'student').toLowerCase();
                    const isGodMode = role.includes('admin') || role.includes('educator') || role === 'superadmin';
                    const unlocked = userData.unlocked_courses || [];

                    if (isGodMode) {
                        hasValidAccess = true; // Admin/Educator ke liye sab free hai
                    } else if (unlocked.includes(cleanCourseName)) {
                        // ⏳ THE EXPIRY CHECKER ENGINE
                        const expiries = userData.course_expiries || {};
                        if (expiries[cleanCourseName]) {
                            const expDate = new Date(expiries[cleanCourseName]);
                            if (new Date() <= expDate) {
                                hasValidAccess = true; // Validity bachi hai
                            } else {
                                console.log("Course expired! Forcing renewal...");
                            }
                        } else {
                            hasValidAccess = true; // Lifetime access (koi expiry set nahi thi)
                        }
                    }
                }
            } catch (e) {
                console.error("Deep Link Security Check Failed:", e);
            }
        }

        // 🚦 THE FINAL DECISION
        if (hasValidAccess) {
            // ✅ Case 1: Active Subscription hai! Seedha Classroom mein bhejo
            console.log("Valid access found. Opening classroom...");
            if (window.openCourseView) window.openCourseView(cleanCourseName);
        } else {
            // ❌ Case 2: Subscription nahi hai YA Expire ho gaya hai! Checkout/Renewal par bhejo
            console.log("No valid access. Initiating checkout...");
            if (window.initiateCheckout) window.initiateCheckout(cleanCourseName);
        }
    }
}, 3000); // 3 seconds wait taaki auth load ho jaye