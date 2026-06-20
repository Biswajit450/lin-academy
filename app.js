// app.js

import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { auth, db } from "./firebase-config.js";

// Master Imports: Yahan hum baaki saari files ko zinda kar rahe hain!
import "./auth.js";
import "./cms.js";
import "./course-builder.js";
import "./profile.js";

// ==========================================
// SPA ROUTING & UI UTILITIES
// ==========================================
window.showScreen = function(screenId) {
    document.querySelectorAll('.app-screen').forEach(screen => {
        screen.classList.add('hidden');
    });
    
    // Hide Editor specific elements if not on admin screen
    if(screenId !== 'screen-admin') {
        const courseSelector = document.getElementById('admin-course-selector');
        if(courseSelector) courseSelector.value = "";
        
        const toolbar = document.getElementById('admin-editor-toolbar');
        if(toolbar) toolbar.classList.add('hidden');
        
        const canvasWrapper = document.getElementById('admin-draft-canvas-wrapper');
        if(canvasWrapper) canvasWrapper.classList.add('hidden');
    }
    
    const targetScreen = document.getElementById(screenId);
    if(targetScreen) {
        targetScreen.classList.remove('hidden');
    }
    window.scrollTo(0, 0);
}

window.switchAdminSubTab = function(tabId) {
    // Hide all admin subtabs
    document.querySelectorAll('.admin-subtab').forEach(tab => tab.classList.add('hidden'));
    
    // Reset all admin tab buttons
    document.querySelectorAll('.admin-tab-btn').forEach(btn => {
        btn.classList.remove('active', 'text-brand-blue', 'border-brand-blue');
        btn.classList.add('text-slate-500', 'border-transparent');
    });
    
    // Show target tab and activate button
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
// VAULT VISIBILITY ENGINE
// ==========================================
window.renderEnrollments = function(unlockedCourses = [], role = 'student') {
    const tiles = document.querySelectorAll('.enrollment-tile');
    
    tiles.forEach(tile => {
        const courseName = tile.getAttribute('data-course');
        // Asli Magic: Superadmin, Admin aur Educator ko sab dikhega test karne ke liye
        if (role === 'superadmin' || role === 'admin' || role === 'educator') {
            tile.style.display = 'flex'; 
        } else {
            // Student ko sirf uske kharide hue courses dikhenge
            if (unlockedCourses.includes(courseName)) {
                tile.style.display = 'flex';
            } else {
                tile.style.display = 'none';
            }
        }
    });

    // Clean UI: Agar kisi category me ek bhi course nahi hai, toh uska heading hide kar do
    const compGrid = document.getElementById('enrollments-grid-competitive');
    const acadGrid = document.getElementById('enrollments-grid-academics');
    
    if(compGrid && compGrid.parentElement) {
        const visibleComp = Array.from(compGrid.children).filter(el => el.style.display !== 'none');
        compGrid.parentElement.style.display = visibleComp.length > 0 ? 'block' : 'none';
    }
    if(acadGrid && acadGrid.parentElement) {
        const visibleAcad = Array.from(acadGrid.children).filter(el => el.style.display !== 'none');
        acadGrid.parentElement.style.display = visibleAcad.length > 0 ? 'block' : 'none';
    }
}

// ==========================================
// CHECKOUT ENGINE 
// ==========================================
window.initiateCheckout = async function(courseName) { 
    alert(`Razorpay Gateway Initiated for: ${courseName}\n\nOnce payment is successful, our Webhook will automatically tell Firebase to unlock this for the student!`); 
    
    // Developer Test Auto-Unlock Logic
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
    if(window.currentUserRole !== 'superadmin') return alert("Access Denied: Super Admin Only.");
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
            textarea.value = ""; // Empty draft
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
    if(window.currentUserRole !== 'superadmin') return alert("Access Denied: Super Admin Only.");
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
            // Replace newlines with breaks so normal typing looks good as HTML
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
    if(window.currentUserRole !== 'superadmin') return alert("Access Denied: Super Admin Only.");
    
    const emailToSearch = document.getElementById('role-search-email').value.trim();
    if(!emailToSearch) return alert("Please enter a valid student email to search.");
    
    try {
        // Find user by email in Firestore
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
            document.getElementById('role-user-select').value = userData.role || 'student';
            
            document.getElementById('role-edit-panel').classList.remove('hidden');
        });
        
    } catch(e) {
        console.error("Search error", e);
        alert("An error occurred while searching for the user.");
    }
}

window.updateUserRole = async function() {
    if(window.currentUserRole !== 'superadmin') return alert("Access Denied: Super Admin Only.");
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