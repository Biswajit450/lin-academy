// auth.js

import { signInWithPopup, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { auth, db, googleProvider } from "./firebase-config.js";

let isLoginMode = true;

// 🚀 NAYA: Smart Error Handling Engine (No more ugly alerts!)
function showAuthError(message, isSuccess = false) {
    const errorEl = document.getElementById('auth-error-msg');
    if (errorEl) {
        errorEl.innerHTML = isSuccess ? `<i class="fa-solid fa-check-circle mr-1"></i> ${message}` : `<i class="fa-solid fa-triangle-exclamation mr-1"></i> ${message}`;
        errorEl.classList.remove('hidden');
        if (isSuccess) {
            errorEl.classList.remove('text-rose-500', 'bg-rose-50', 'dark:bg-rose-900/30');
            errorEl.classList.add('text-emerald-500', 'bg-emerald-50', 'dark:bg-emerald-900/30');
        } else {
            errorEl.classList.remove('text-emerald-500', 'bg-emerald-50', 'dark:bg-emerald-900/30');
            errorEl.classList.add('text-rose-500', 'bg-rose-50', 'dark:bg-rose-900/30');
        }
    }
}

window.openAuthModal = function(mode = 'login') {
    document.getElementById('auth-modal').classList.remove('hidden'); 
    isLoginMode = (mode === 'login');
    const title = document.getElementById('auth-title'); 
    const submitBtn = document.getElementById('auth-submit-btn'); 
    const toggleBtn = document.getElementById('auth-toggle-btn');
    const forgotPwdContainer = document.getElementById('forgot-pwd-container');
    
    // Naya form khulte hi purane errors chupa do
    const errorEl = document.getElementById('auth-error-msg');
    if (errorEl) errorEl.classList.add('hidden');

    if (isLoginMode) { 
        title.innerText = "Welcome Back"; 
        submitBtn.innerText = "Sign In"; 
        toggleBtn.innerHTML = `Don't have an account? <span class="text-slate-900 dark:text-white underline">Sign up here</span>`; 
        if (forgotPwdContainer) forgotPwdContainer.classList.remove('hidden'); // Sign In mein Forgot Pwd dikhao
    } else { 
        title.innerText = "Create Account"; 
        submitBtn.innerText = "Create Account"; 
        toggleBtn.innerHTML = `Already have an account? <span class="text-slate-900 dark:text-white underline">Sign in here</span>`; 
        if (forgotPwdContainer) forgotPwdContainer.classList.add('hidden'); // Sign Up mein chupa do
    }
}

window.closeAuthModal = function() { 
    document.getElementById('auth-modal').classList.add('hidden'); 
}

window.toggleAuthMode = function() { 
    window.openAuthModal(!isLoginMode ? 'login' : 'signup'); 
}

// 🚀 NAYA: Forgot Password Reset Engine
window.handleForgotPassword = async function() {
    const email = document.getElementById('auth-email').value.trim();
    if (!email) {
        showAuthError("Please enter your email first to reset password.");
        return;
    }
    
    const btn = document.getElementById('auth-submit-btn');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Sending Link...';
    btn.disabled = true;

    try {
        await sendPasswordResetEmail(auth, email);
        showAuthError("Password reset link sent! Check your inbox.", true);
    } catch (error) {
        let errorMsg = "Failed to send reset link.";
        if (error.code === 'auth/user-not-found') errorMsg = "No account found with this email.";
        else if (error.code === 'auth/invalid-email') errorMsg = "Invalid email format.";
        showAuthError(errorMsg);
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

window.handleGoogleLogin = async function() { 
    try { 
        // Hide previous errors
        const errorEl = document.getElementById('auth-error-msg');
        if (errorEl) errorEl.classList.add('hidden');

        await signInWithPopup(auth, googleProvider); 
        window.closeAuthModal(); 
    } catch (error) { 
        showAuthError("Google Login Cancelled or Failed."); 
    } 
}

window.handleAuth = async function(event) {
    event.preventDefault(); 
    const email = document.getElementById('auth-email').value.trim(); 
    const password = document.getElementById('auth-password').value;
    
    const btn = document.getElementById('auth-submit-btn');
    const originalText = btn.innerHTML;
    
    // 🚀 Smart Loading Spinner
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Authenticating...';
    btn.disabled = true;

    // Hide previous errors
    const errorEl = document.getElementById('auth-error-msg');
    if (errorEl) errorEl.classList.add('hidden');

    try { 
        if (isLoginMode) { 
            await signInWithEmailAndPassword(auth, email, password); 
        } else { 
            await createUserWithEmailAndPassword(auth, email, password); 
        } 
        // Modal will close automatically via onAuthStateChanged
    } catch(error) { 
        // 🚀 Human Readable Errors translation
        let errorMsg = "Authentication failed. Please try again.";
        if (error.code === 'auth/user-not-found') errorMsg = "Account not found. Please sign up.";
        else if (error.code === 'auth/wrong-password') errorMsg = "Incorrect password.";
        else if (error.code === 'auth/email-already-in-use') errorMsg = "Email is already registered. Please sign in.";
        else if (error.code === 'auth/weak-password') errorMsg = "Password should be at least 6 characters.";
        else if (error.code === 'auth/invalid-credential') errorMsg = "Invalid email or password combination.";
        else if (error.code === 'auth/too-many-requests') errorMsg = "Too many attempts. Please try again later.";
        
        showAuthError(errorMsg);
        
        // Reset Button
        btn.innerHTML = originalText;
        btn.disabled = false;
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
        
        // 🚨 THE ULTIMATE IMAGE ERROR CATCHER 🚨
        let finalPhotoUrl = user.photoURL;
        if (!finalPhotoUrl || finalPhotoUrl.includes('picture/0')) {
            finalPhotoUrl = `https://ui-avatars.com/api/?name=${displayName}&background=2563eb&color=fff`;
        }
        
        const profilePicEl = document.getElementById('user-profile-pic');
        // Agar image load hone mein fail ho jaye (Workspace CORS / 403 Error)
        profilePicEl.onerror = function() {
            this.onerror = null; // Infinite loop rokne ke liye
            this.src = `https://ui-avatars.com/api/?name=${displayName}&background=2563eb&color=fff`;
        };
        profilePicEl.src = finalPhotoUrl;
        
        // Reset buttons if they were spinning before closing
        const btn = document.getElementById('auth-submit-btn');
        if(btn) {
            btn.innerHTML = 'Sign In';
            btn.disabled = false;
        }

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
                // 🛑 NEW: THE BOUNCER MIDDLEWARE (Block Checker) 🛑
                if (userData.isBlocked && userData.blockedUntil) {
                    const blockEndDate = new Date(userData.blockedUntil);
                    const now = new Date();
                    
                    if (now < blockEndDate) {
                        alert(`🛑 Access Denied: Your account has been suspended until ${blockEndDate.toLocaleDateString()}. Please contact support for any queries.`);
                        await signOut(auth);
                        window.location.reload();
                        return; // Pura code yahi rok do
                    }
                }
                
                // BULLETPROOF ROLE & COURSE VARIABLES
                const rawRole = userData.role || userData.Role || userData.ROLE || "student";
                const role = String(rawRole).toLowerCase().trim();
                const unlocked = userData.unlocked_courses || userData.Unlocked_Courses || userData.Unlocked_courses || [];
                
                window.currentUserRole = role; 
                window.currentUnlockedCourses = unlocked; 
                
                const navBtn = document.getElementById('nav-desk-admin'); // 🚀 NEW DESKTOP ID
                const mobileNavBtn = document.getElementById('nav-mob-admin'); // 🚀 NEW MOBILE ID
                const vaultBtn = document.getElementById('nav-desk-vault'); // 🚀 NEW VAULT ID
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
                    if (vaultBtn) { vaultBtn.classList.remove('hidden'); vaultBtn.classList.add('flex'); } // 🚀 SHOW VAULT TABS
                    
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
                
                // 🚨 TRIGGER THE BOUNCER ENGINE 🚨
                if(window.registerDeviceSession) window.registerDeviceSession(user);
                // 🚀 TRIGGER NATIVE PUSH ENGINE 🚀
                if(window.initNativePushNotifications) window.initNativePushNotifications(user);
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
        const dVault = document.getElementById('nav-desk-vault'); 
        if(dAdmin) dAdmin.classList.add('hidden'); 
        if(mAdmin) mAdmin.classList.add('hidden');
        if(dVault) dVault.classList.add('hidden');
        
        if(window.renderEnrollments) window.renderEnrollments([], "student");
        
        setTimeout(() => { 
            if(document.getElementById('header-auth').classList.contains('hidden')){ 
                window.openAuthModal('login'); 
            } 
        }, 1500);
    }
});