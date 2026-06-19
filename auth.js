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
                if(window.renderEnrollments) window.renderEnrollments([], "student");
            } else {
                const userData = userSnap.data();
                const role = userData.role || "student";
                window.currentUserRole = role; // Global variable set for UI lockdown
                
                // SUPER ADMIN & ADMIN LOGIC
                if (role === "admin" || role === "educator" || role === "superadmin") {
                    const navBtn = document.getElementById('nav-admin-btn');
                    const mobileNavBtn = document.getElementById('mobile-nav-admin-btn');
                    
                    navBtn.classList.remove('hidden'); 
                    navBtn.classList.add('flex');
                    mobileNavBtn.classList.remove('hidden'); 
                    mobileNavBtn.classList.add('flex');
                    
                    const navSpan = navBtn.querySelector('span');
                    const mobileNavSpan = mobileNavBtn.querySelector('span');
                    
                    // The CMS Tab Button
                    const cmsTabBtn = document.querySelector('button[onclick="window.switchAdminSubTab(\'homecms\')"]');

                    if (role === "superadmin") {
                        if (navSpan) navSpan.innerText = "Super Admin";
                        if (mobileNavSpan) mobileNavSpan.innerText = "Super Admin";
                        if (cmsTabBtn) cmsTabBtn.classList.remove('hidden'); // Unlock CMS
                    } else {
                        if (navSpan) navSpan.innerText = "Admin";
                        if (mobileNavSpan) mobileNavSpan.innerText = "Admin";
                        if (cmsTabBtn) cmsTabBtn.classList.add('hidden'); // Lock CMS for regular admins
                    }
                }
                
                if(window.renderEnrollments) window.renderEnrollments(userData.unlocked_courses || [], role);
            }
        } catch (error) { 
            console.error(error); 
        }
    } else {
        window.currentUserRole = null;
        document.getElementById('header-unauth').classList.remove('hidden'); 
        document.getElementById('header-auth').classList.add('hidden'); 
        document.getElementById('header-auth').classList.remove('flex');
        document.getElementById('nav-admin-btn').classList.add('hidden'); 
        document.getElementById('mobile-nav-admin-btn').classList.add('hidden');
        
        if(window.renderEnrollments) window.renderEnrollments([], "student");
        
        setTimeout(() => { 
            if(document.getElementById('header-auth').classList.contains('hidden')){ 
                window.openAuthModal('login'); 
            } 
        }, 1500);
    }
});