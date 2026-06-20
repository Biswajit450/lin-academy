// app.js

import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { auth, db } from "./firebase-config.js";

import "./auth.js";
import "./cms.js";
import "./course-builder.js";
import "./profile.js";

// ==========================================
// SPA ROUTING & SMART FETCH ENGINE (THE MAGIC ROUTER)
// ==========================================
window.showScreen = async function(screenId) {
    const container = document.getElementById('dynamic-screen-container');

    // 1. SMART FETCH: Agar screen HTML mein nahi hai, toh 'pages' folder se uthao!
    if (!document.getElementById(screenId)) {
        try {
            // Jaise 'screen-admin' me se 'admin' nikalna
            const pageName = screenId.replace('screen-', '');
            
            // Background mein file fetch karna
            const response = await fetch(`pages/${pageName}.html`);
            
            if (response.ok) {
                const htmlContent = await response.text();
                // Naya block banakar use main container mein chipkana
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = htmlContent;
                container.appendChild(tempDiv.firstElementChild);
                console.log(`[Router] Successfully loaded: ${pageName}.html`);
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

    // 2. Saari screens ko hide karo
    document.querySelectorAll('.app-screen').forEach(screen => {
        screen.classList.add('hidden');
    });
    
    // 3. Admin specific UI cleanup
    if(screenId !== 'screen-admin') {
        const courseSelector = document.getElementById('admin-course-selector');
        if(courseSelector) courseSelector.value = "";
        
        const toolbar = document.getElementById('admin-editor-toolbar');
        if(toolbar) toolbar.classList.add('hidden');
        
        const canvasWrapper = document.getElementById('admin-draft-canvas-wrapper');
        if(canvasWrapper) canvasWrapper.classList.add('hidden');
    }

    // 4. Enrollments double-tap (Strict Security Engine)
    if(screenId === 'screen-enrollments') {
        if(window.renderEnrollments) {
            window.renderEnrollments(window.currentUnlockedCourses || [], window.currentUserRole);
        }
    }
    
    // 5. Target screen ko show karo
    const targetScreen = document.getElementById(screenId);
    if(targetScreen) {
        targetScreen.classList.remove('hidden');
    }
    window.scrollTo(0, 0);
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
}

window.toggleDarkMode = function() { 
    document.documentElement.classList.toggle('dark'); 
    localStorage.setItem('theme', document.documentElement.classList.contains('dark') ? 'dark' : 'light'); 
}

window.toggleNotifications = function() { 
    const panel = document.getElementById('notification-panel');
    if(panel) panel.classList.toggle('hidden'); 
}

// ==========================================
// VAULT VISIBILITY ENGINE (STRICT SECURITY FIX)
// ==========================================
window.renderEnrollments = function(unlockedCourses = [], passedRole = null) {
    try {
        let role = passedRole || window.currentUserRole || 'student';
        role = String(role).toLowerCase().trim(); 

        const isGodMode = role.includes('admin') || role.includes('educator') || role === 'superadmin';
        
        let coursesList = [];
        if (Array.isArray(unlockedCourses) && unlockedCourses.length > 0) {
            coursesList = unlockedCourses;
        } else if (Array.isArray(window.currentUnlockedCourses)) {
            coursesList = window.currentUnlockedCourses;
        }

        const tiles = document.querySelectorAll('.enrollment-tile');
        let compCount = 0;
        let acadCount = 0;

        tiles.forEach(tile => {
            const courseName = tile.getAttribute('data-course');
            const isUnlocked = coursesList.includes(courseName);
            
            if (isGodMode || isUnlocked) {
                tile.classList.remove('hidden');
                tile.setAttribute('style', 'display: flex !important;'); 
                
                const parent = tile.parentElement;
                if(parent && parent.id === 'enrollments-grid-competitive') compCount++;
                if(parent && parent.id === 'enrollments-grid-academics') acadCount++;
            } else {
                tile.classList.add('hidden');
                tile.setAttribute('style', 'display: none !important;');
            }
        });

        const compGrid = document.getElementById('enrollments-grid-competitive');
        if(compGrid && compGrid.parentElement) {
            if (compCount > 0) {
                compGrid.parentElement.classList.remove('hidden');
                compGrid.parentElement.setAttribute('style', 'display: block !important;');
            } else {
                compGrid.parentElement.classList.add('hidden');
                compGrid.parentElement.setAttribute('style', 'display: none !important;');
            }
        }
        
        const acadGrid = document.getElementById('enrollments-grid-academics');
        if(acadGrid && acadGrid.parentElement) {
            if (acadCount > 0) {
                acadGrid.parentElement.classList.remove('hidden');
                acadGrid.parentElement.setAttribute('style', 'display: block !important;');
            } else {
                acadGrid.parentElement.classList.add('hidden');
                acadGrid.parentElement.setAttribute('style', 'display: none !important;');
            }
        }

    } catch(err) {
        console.error("Strict rendering error:", err);
        document.querySelectorAll('.enrollment-tile').forEach(t => {
            t.classList.add('hidden');
            t.setAttribute('style', 'display: none !important;');
        });
    }
}

// ==========================================
// CHECKOUT ENGINE 
// ==========================================
window.initiateCheckout = async function(courseName) { 
    alert(`Razorpay Gateway Initiated for: ${courseName}\n\nOnce payment is successful, our Webhook will automatically tell Firebase to unlock this for the student!`); 
    
    if (auth.currentUser) {
        if(confirm(`[DEV TESTING]: Do you want to instantly unlock "${courseName}" and add it to your Enrollments Vault?`)) {
            try {
                const userRef = doc(db, "users", auth.currentUser.uid);
                const userSnap = await getDoc(userRef);
                if(userSnap.exists()) {
                    let unlocked = userSnap.data().unlocked_courses || [];
                    if(!unlocked.includes(courseName)) {
                        unlocked.push(courseName);
                        await setDoc(userRef, { unlocked_courses: unlocked }, { merge: true });
                        alert("Course Unlocked Successfully! Go check your Enrollments tab.");
                        window.renderEnrollments(unlocked, userSnap.data().role);
                    } else {
                        alert("You already own this course!");
                    }
                }
            } catch(e) {
                console.error("Unlock error", e);
            }
        }
    } else {
        alert("Please login first to enroll.");
        if(window.openAuthModal) window.openAuthModal('login');
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
    window.showScreen('screen-policy-viewer');
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
// SUPER ADMIN USER ROLE MANAGER
// ==========================================
window.searchUserForRole = async function() {
    if(!String(window.currentUserRole).includes('admin')) return alert("Access Denied: Admin Only.");
    
    const emailToSearch = document.getElementById('role-search-email').value.trim();
    if(!emailToSearch) return alert("Please enter a valid student email to search.");
    
    try {
        const q = query(collection(db, "users"), where("email", "==", emailToSearch));
        const querySnapshot = await getDocs(q);
        
        if(querySnapshot.empty) {
            alert("No user found with this email! Please check the spelling.");
            document.getElementById('role-edit-panel').classList.add('hidden');
            return;
        }
        
        querySnapshot.forEach((docSnap) => {
            const userData = docSnap.data();
            window.currentEditingUserId = docSnap.id;
            
            document.getElementById('role-user-name').innerText = userData.name || "Unknown Name";
            document.getElementById('role-user-email').innerText = userData.email;
            
            const userRoleVal = String(userData.role || userData.Role || userData.ROLE || 'student').toLowerCase().trim();
            document.getElementById('role-user-select').value = userRoleVal;
            
            document.getElementById('role-edit-panel').classList.remove('hidden');
        });
        
    } catch(e) {
        console.error("Search error", e);
        alert("An error occurred while searching for the user.");
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
        document.getElementById('role-search-email').value = "";
        window.currentEditingUserId = null;
        
    } catch(e) {
        console.error("Role update error", e);
        alert("Failed to update user role.");
    }
}