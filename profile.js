// profile.js

import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { auth, db } from "./firebase-config.js";

// Naya Function: Jab Profile kamra banega, tab yeh call hoga
window.loadProfileData = async function() {
    const user = auth.currentUser;
    if (!user) return; // Agar login nahi hai toh wapas jao

    // 1. Basic Info (Name, Email, Photo) set karo
    const nameEl = document.getElementById('profile-page-name');
    const emailEl = document.getElementById('profile-page-email');
    const picEl = document.getElementById('profile-page-pic');

    if(nameEl) nameEl.innerText = user.displayName || user.email.split('@')[0];
    if(emailEl) emailEl.innerText = user.email || '';
    if(picEl) picEl.src = user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName || 'S'}&background=2563eb&color=fff`;

    // 2. Role check karo aur zaroorat ke hisaab se UI chupao (Strict Mode)
    const role = String(window.currentUserRole).toLowerCase().trim();
    const studentBadges = document.getElementById('profile-student-badges');
    const adminBadge = document.getElementById('profile-admin-badge');
    const roleText = document.getElementById('profile-role-text');
    const progressSection = document.getElementById('profile-progress-section');

    if (role === "admin" || role === "educator" || role === "superadmin") {
        if (studentBadges) studentBadges.classList.add('hidden');
        if (progressSection) progressSection.classList.add('hidden'); // Progress bar gayab!
        if (adminBadge) {
            adminBadge.classList.remove('hidden');
            adminBadge.classList.add('inline-flex');
        }
        if (roleText) {
            roleText.innerText = role === "superadmin" ? "Super Admin" : "Admin";
        }
    } else {
        if (studentBadges) {
            studentBadges.classList.remove('hidden');
            studentBadges.classList.add('flex');
        }
        if (progressSection) progressSection.classList.remove('hidden');
        if (adminBadge) adminBadge.classList.add('hidden');
    }

    // 3. Extra Data (Phone, City, Courses) Database se laao
    try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
            const data = userDoc.data();
            const phoneInput = document.getElementById('profile-phone');
            const cityInput = document.getElementById('profile-city');
            
            if(phoneInput && data.phone) phoneInput.value = data.phone;
            if(cityInput && data.city) cityInput.value = data.city;

            // 🚨 DYNAMIC BADGE LOGIC 🚨
            const badgeEl = document.getElementById('profile-learner-badge');
            if (badgeEl && role === "student") {
                const courseCount = (data.unlocked_courses || []).length;
                if (courseCount > 0) {
                    badgeEl.innerHTML = '<i class="fa-solid fa-crown text-amber-500 mr-1"></i> Pro Learner';
                    badgeEl.className = 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-[10px] md:text-xs font-bold px-3 py-1.5 rounded-full shadow-sm transition-all';
                } else {
                    badgeEl.innerHTML = '<i class="fa-solid fa-seedling text-emerald-500 mr-1"></i> New Explorer';
                    badgeEl.className = 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-[10px] md:text-xs font-bold px-3 py-1.5 rounded-full shadow-sm transition-all';
                }
            }
            
            // Progress sirf student ko dikhega
            if (role === "student" && window.renderProgress) {
                window.renderProgress(data.unlocked_courses || []);
            }
        }
    } catch (error) {
        console.error("Error fetching user details", error);
    }
}

window.renderProgress = function(courses) {
    const container = document.getElementById('profile-progress-list');
    if(!container) return;

    if(!courses || courses.length === 0) {
        container.innerHTML = '<p class="text-xs text-slate-400">No active courses found. Enroll in a course to start tracking progress.</p>';
        return;
    }

    let html = '';
    courses.forEach(course => {
        const mockProgress = Math.floor(Math.random() * 60) + 10; 
        html += `
        <div>
            <div class="flex justify-between text-xs font-bold mb-1"><span class="text-slate-700 dark:text-slate-300">${course}</span><span class="text-brand-blue">${mockProgress}%</span></div>
            <div class="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5"><div class="bg-brand-blue h-2.5 rounded-full" style="width: ${mockProgress}%"></div></div>
        </div>`;
    });
    container.innerHTML = html;
}

window.saveProfileInfo = async function() {
    const user = auth.currentUser;
    if(!user) return alert("Please login first!");

    const phone = document.getElementById('profile-phone').value;
    const city = document.getElementById('profile-city').value;
    const btn = event.target;
    const originalText = btn.innerHTML;
    
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
    btn.disabled = true;

    try {
        await setDoc(doc(db, "users", user.uid), { phone: phone, city: city }, { merge: true });
        alert("Success! Your profile details have been updated.");
    } catch (error) {
        console.error("Error saving profile", error);
        alert("Failed to save details. Try again.");
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}