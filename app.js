// app.js

import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { auth, db } from "./firebase-config.js";

// Master Imports: Yahan hum baaki saari files ko zinda kar rahe hain!
import "./auth.js";
import "./cms.js";
import "./course-builder.js";
import "./profile.js"; // Profile screen ko zinda rakhne ke liye naya import

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