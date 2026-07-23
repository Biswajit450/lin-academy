// profile.js

import { doc, getDoc, setDoc, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
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
    
    // 🚨 THE ULTIMATE IMAGE ERROR CATCHER 🚨
    let finalPhotoUrl = user.photoURL;
    const fallbackUrl = `https://ui-avatars.com/api/?name=${user.displayName || 'S'}&background=2563eb&color=fff`;
    
    if (!finalPhotoUrl || finalPhotoUrl.includes('picture/0')) {
        finalPhotoUrl = fallbackUrl;
    }
    
    if(picEl) {
        // Agar image load hone mein fail ho jaye
        picEl.onerror = function() {
            this.onerror = null;
            this.src = fallbackUrl;
        };
        picEl.src = finalPhotoUrl;
    }
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
            
            if (phoneInput && data.phone) { 
                phoneInput.value = data.phone; 
                phoneInput.disabled = true; // Data hai toh Lock kardo
            }
            if (cityInput && data.city) { 
                cityInput.value = data.city; 
                cityInput.disabled = true; // Data hai toh Lock kardo
            }

            // Agar dono mein se kuch bhi bhara hua hai, toh Save chhupao aur Edit dikhao
            if (data.phone || data.city) {
                const btnSave = document.getElementById('btn-save-profile');
                const btnEdit = document.getElementById('btn-edit-profile');
                if (btnSave) btnSave.classList.add('hidden');
                if (btnEdit) btnEdit.classList.remove('hidden');
            }

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
            
            // 🚀 Fetch Real Performance Data from Vault
            if (role === "student" && window.renderProgress) {
                const q = query(collection(db, "student_performance"), where("userId", "==", user.uid));
                const perfSnap = await getDocs(q);
                const performances = [];
                perfSnap.forEach(d => performances.push(d.data()));
                
                // 🚀 NEW: Hum ab bacche ka course_progress map bhi bhej rahe hain
                window.renderProgress(data.unlocked_courses || [], performances, data.course_progress || {});
            }
        }
    } catch (error) {
        console.error("Error fetching user details", error);
    }
}

// ==========================================
// 🚀 SMART PROGRESS TRACKER (COURSE + TESTS)
// ==========================================
window.renderProgress = async function(courses, performances, courseProgressMap = {}) {
    const container = document.getElementById('profile-progress-list');
    if(!container) return;

    container.innerHTML = '<div class="text-center py-6"><i class="fa-solid fa-spinner fa-spin text-brand-blue mb-2 text-2xl"></i><br><span class="text-xs text-slate-400 font-bold">Calculating your journey...</span></div>';

    // 1. 🎓 COURSE JOURNEY CALCULATION
    let courseHtml = '';
    if (courses.length > 0) {
        courseHtml += '<h4 class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2"><i class="fa-solid fa-route text-amber-500"></i> Course Journey</h4>';
        
        const { doc, getDoc } = await import("https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js");
        
        // Promise.all use kar rahe hain taaki calculation super fast ho
        await Promise.all(courses.map(async (courseName) => {
            let pct = 0;
            try {
                const snap = await getDoc(doc(db, "published_courses", courseName));
                if (snap.exists()) {
                    const html = snap.data().canvasHtml || '';
                    // 🧠 Logic: Canvas mein jitne "block-" IDs hain wo total syllabus hai
                    const totalBlocks = (html.match(/id="block-/g) || []).length;
                    const completed = courseProgressMap[courseName] ? Object.keys(courseProgressMap[courseName]).length : 0;
                    pct = totalBlocks > 0 ? Math.round((completed / totalBlocks) * 100) : 0;
                    if(pct > 100) pct = 100; // Cap at 100%
                }
            } catch(e) { console.error(e); }
            
            let colorClass = pct >= 100 ? 'bg-emerald-500' : (pct > 0 ? 'bg-brand-blue' : 'bg-slate-300 dark:bg-slate-700');
            let textClass = pct >= 100 ? 'text-emerald-600 dark:text-emerald-400' : 'text-brand-blue dark:text-blue-400';
            
            courseHtml += `
            <div class="mb-4 bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm cursor-pointer hover:border-brand-blue hover:shadow-md transition-all active:scale-95 group" onclick="window.openCourseFromProfile('${courseName}')">
                <div class="flex justify-between items-center text-xs font-bold mb-3">
                    <span class="text-slate-800 dark:text-slate-200 truncate w-3/4"><i class="fa-solid fa-graduation-cap text-slate-400 mr-2 group-hover:text-brand-blue transition-colors"></i>${courseName}</span>
                    <span class="${textClass}">${pct}%</span>
                </div>
                <div class="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div class="${colorClass} h-1.5 rounded-full transition-all duration-1000 ease-out" style="width: ${pct}%"></div>
                </div>
            </div>`;
        }));
    }

    // 2. ⚡ MOCK TEST (ARENA) CALCULATION
    let recentTestsHtml = '';
    let dashboardHtml = '';
    
    if(performances && performances.length > 0) {
        let totalTests = performances.length;
        let totalObtained = 0;
        let totalMax = 0;
        
        performances.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        performances.forEach((p, index) => {
            totalObtained += p.score;
            totalMax += p.maxScore;
            
            if (index < 3) {
                let colorClass = p.percentage >= 40 ? 'bg-emerald-500' : 'bg-rose-500';
                let textClass = p.percentage >= 40 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500';
                recentTestsHtml += `
                <div class="mb-3 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm hover:border-emerald-200 transition-colors">
                    <div class="flex justify-between text-xs font-bold mb-2">
                        <span class="text-slate-700 dark:text-slate-300 truncate w-2/3"><i class="fa-solid fa-flask text-slate-400 mr-2"></i>${p.testTitle}</span>
                        <span class="${textClass}">${p.percentage.toFixed(1)}%</span>
                    </div>
                    <div class="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1 overflow-hidden">
                        <div class="${colorClass} h-1 rounded-full transition-all duration-1000 ease-out" style="width: ${p.percentage}%"></div>
                    </div>
                </div>`;
            }
        });

        const overallPct = totalMax > 0 ? ((totalObtained / totalMax) * 100).toFixed(1) : 0;
        
        dashboardHtml = `
            <h4 class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 mt-6 flex items-center gap-2">
                <i class="fa-solid fa-bolt text-blue-500"></i> Arena Stats
            </h4>
            <div class="grid grid-cols-3 gap-3 mb-4">
                <div class="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-2xl border border-blue-100 dark:border-blue-800/50 text-center shadow-sm">
                    <div class="text-lg sm:text-xl font-extrabold text-brand-blue">${totalTests}</div>
                    <div class="text-[8px] sm:text-[9px] text-slate-500 font-bold uppercase tracking-wider mt-1">Attempts</div>
                </div>
                <div class="bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-2xl border border-emerald-100 dark:border-emerald-800/50 text-center shadow-sm">
                    <div class="text-lg sm:text-xl font-extrabold text-emerald-600 dark:text-emerald-400">${overallPct}%</div>
                    <div class="text-[8px] sm:text-[9px] text-slate-500 font-bold uppercase tracking-wider mt-1">Accuracy</div>
                </div>
                <div class="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-2xl border border-purple-100 dark:border-purple-800/50 text-center shadow-sm">
                    <div class="text-lg sm:text-xl font-extrabold text-purple-600 dark:text-purple-400">${totalObtained.toFixed(1)}</div>
                    <div class="text-[8px] sm:text-[9px] text-slate-500 font-bold uppercase tracking-wider mt-1">Total Score</div>
                </div>
            </div>
            ${recentTestsHtml}
        `;
    } else {
        dashboardHtml = `
            <h4 class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 mt-6 flex items-center gap-2">
                <i class="fa-solid fa-bolt text-blue-500"></i> Arena Stats
            </h4>
            <p class="text-xs text-slate-400 text-center py-4 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900/30">No test data found yet.</p>
        `;
    }

    if(courses.length === 0 && (!performances || performances.length === 0)) {
        container.innerHTML = '<p class="text-xs text-slate-400 text-center py-8 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900/50">Your journey starts here. Enroll in a course to see your progress!</p>';
    } else {
        container.innerHTML = courseHtml + dashboardHtml;
    }
}

// ==========================================
// 🚀 SMART PROFILE TOGGLE ENGINE
// ==========================================
window.editProfileMode = function() {
    // 1. Dabbe khol do (Unlock)
    document.getElementById('profile-phone').disabled = false;
    document.getElementById('profile-city').disabled = false;
    
    // 2. Edit chupao, Save wapas lao
    document.getElementById('btn-edit-profile').classList.add('hidden');
    document.getElementById('btn-save-profile').classList.remove('hidden');
    
    // 3. Phone wale dabbe mein cursor daal do
    document.getElementById('profile-phone').focus();
}

window.saveProfileInfo = async function() {
    const user = auth.currentUser;
    if(!user) return alert("Please login first!");

    const phoneInput = document.getElementById('profile-phone');
    const cityInput = document.getElementById('profile-city');
    
    const phone = phoneInput.value;
    const city = cityInput.value;
    const btn = event.target;
    const originalText = btn.innerHTML;
    
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
    btn.disabled = true;

    try {
        // Data Firebase mein bhejo
        await setDoc(doc(db, "users", user.uid), { phone: phone, city: city }, { merge: true });
        alert("Success! Your profile details have been updated.");
        
        // 🚀 Data save hone ke baad: Dabbe lock kardo
        phoneInput.disabled = true;
        cityInput.disabled = true;
        
        // Save chupao, Edit dikhao
        document.getElementById('btn-save-profile').classList.add('hidden');
        document.getElementById('btn-edit-profile').classList.remove('hidden');
        
    } catch (error) {
        console.error("Error saving profile", error);
        alert("Failed to save details. Try again.");
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

// ==========================================
// 🚨 THE PROFILE BOUNCER: Check Expiry Before Opening Course
// ==========================================
window.openCourseFromProfile = async function(courseName) {
    if (!auth.currentUser) return;
    
    // UI Feedback: Button click hone par wait dikhayein
    const originalCursor = document.body.style.cursor;
    document.body.style.cursor = 'wait';
    
    try {
        const userSnap = await getDoc(doc(db, "users", auth.currentUser.uid));
        if (userSnap.exists()) {
            const userData = userSnap.data();
            
            // Expiry Check Logic
            let isExpired = false;
            if (userData.course_expiries && userData.course_expiries[courseName]) {
                const expDate = new Date(userData.course_expiries[courseName]);
                const now = new Date();
                
                if (now > expDate) {
                    isExpired = true;
                }
            }
            
            if (isExpired) {
                // Agar expire ho gaya hai, toh access block karo aur alert do
                alert(`🔒 Access Denied!\nYour enrollment for "${courseName}" has expired. Please go to the Enrollments tab to renew your access.`);
                if(window.showScreen) window.showScreen('screen-enrollments');
            } else {
                // Agar active hai, toh normal course view khol do
                if(window.openCourseView) {
                    window.openCourseView(courseName);
                }
            }
        }
    } catch (e) {
        console.error("Profile Course Access Error:", e);
        alert("Something went wrong. Please check your connection.");
    } finally {
        // Cursor wapas normal karein
        document.body.style.cursor = originalCursor;
    }
}