// auth.js

import { signInWithPopup, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { auth, db, googleProvider } from "./firebase-config.js";

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
                window.currentUserRole = "student";
                window.currentUnlockedCourses = [];
                if(window.renderEnrollments) window.renderEnrollments([], "student");
            } else {
                const userData = userSnap.data();
                
                // BULLETPROOF ROLE & COURSE VARIABLES
                const rawRole = userData.role || userData.Role || userData.ROLE || "student";
                const role = String(rawRole).toLowerCase().trim();
                const unlocked = userData.unlocked_courses || userData.Unlocked_Courses || userData.Unlocked_courses || [];
                
                window.currentUserRole = role; 
                window.currentUnlockedCourses = unlocked; 
                
                const navBtn = document.getElementById('nav-desk-admin'); // 🚀 NEW DESKTOP ID
                const mobileNavBtn = document.getElementById('nav-mob-admin'); // 🚀 NEW MOBILE ID
                const navSpan = navBtn ? navBtn.querySelector('span') : null;
                const mobileNavSpan = mobileNavBtn ? mobileNavBtn.querySelector('span') : null;
                
                const cmsTabBtn = document.querySelector('button[onclick="window.switchAdminSubTab(\'homecms\')"]');
                const settingsTabBtn = document.getElementById('admin-tab-settings');
                const deployerTabBtn = document.getElementById('admin-tab-deployer');
                
                const studentBadges = document.getElementById('profile-student-badges');
                const adminBadge = document.getElementById('profile-admin-badge');
                const roleText = document.getElementById('profile-role-text');
                const progressSection = document.getElementById('profile-progress-section');
                
                if (role === "admin" || role === "educator" || role === "superadmin") {
                    if (navBtn) { navBtn.classList.remove('hidden'); navBtn.classList.add('flex'); }
                    if (mobileNavBtn) { mobileNavBtn.classList.remove('hidden'); mobileNavBtn.classList.add('flex'); }
                    
                    if (studentBadges) studentBadges.classList.add('hidden');
                    if (progressSection) progressSection.classList.add('hidden');
                    if (adminBadge) {
                        adminBadge.classList.remove('hidden');
                        adminBadge.classList.add('inline-flex');
                    }

                    if (role === "superadmin") {
                        if (navSpan) navSpan.innerText = "Super Admin";
                        if (mobileNavSpan) mobileNavSpan.innerText = "Super Admin";
                        if (roleText) roleText.innerText = "Super Admin";
                        
                        if (cmsTabBtn) cmsTabBtn.classList.remove('hidden');
                        if (settingsTabBtn) settingsTabBtn.classList.remove('hidden');
                        if (deployerTabBtn) deployerTabBtn.classList.remove('hidden');
                    } else {
                        if (navSpan) navSpan.innerText = "Admin";
                        if (mobileNavSpan) mobileNavSpan.innerText = "Admin";
                        if (roleText) roleText.innerText = "Admin";
                        
                        if (cmsTabBtn) cmsTabBtn.classList.add('hidden');
                        if (settingsTabBtn) settingsTabBtn.classList.add('hidden');
                        if (deployerTabBtn) deployerTabBtn.classList.add('hidden');
                    }
                } else {
                    if (navBtn) navBtn.classList.add('hidden');
                    if (mobileNavBtn) mobileNavBtn.classList.add('hidden');
                    
                    if (studentBadges) {
                        studentBadges.classList.remove('hidden');
                        studentBadges.classList.add('flex');
                    }
                    if (progressSection) progressSection.classList.remove('hidden');
                    if (adminBadge) adminBadge.classList.add('hidden');
                }
                
                // Safely attempt first render
                if(window.renderEnrollments) window.renderEnrollments(unlocked, role);
            }
        } catch (error) { 
            console.error(error); 
        }
    } else {
        window.currentUserRole = null;
        window.currentUnlockedCourses = [];
        document.getElementById('header-unauth').classList.remove('hidden'); 
        document.getElementById('header-auth').classList.add('hidden'); 
        document.getElementById('header-auth').classList.remove('flex');
        // 🚀 SAFELY HIDING NEW ADMIN BUTTONS ON LOGOUT
        const dAdmin = document.getElementById('nav-desk-admin');
        const mAdmin = document.getElementById('nav-mob-admin');
        if(dAdmin) dAdmin.classList.add('hidden'); 
        if(mAdmin) mAdmin.classList.add('hidden');
        
        if(window.renderEnrollments) window.renderEnrollments([], "student");
        
        setTimeout(() => { 
            if(document.getElementById('header-auth').classList.contains('hidden')){ 
                window.openAuthModal('login'); 
            } 
        }, 1500);
    }
});