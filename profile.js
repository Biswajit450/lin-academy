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
                
                window.renderProgress(data.unlocked_courses || [], performances);
            }
        }
    } catch (error) {
        console.error("Error fetching user details", error);
    }
}

window.renderProgress = function(courses, performances) {
    const container = document.getElementById('profile-progress-list');
    if(!container) return;

    if(!performances || performances.length === 0) {
        container.innerHTML = '<p class="text-xs text-slate-400 text-center py-6 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl">No test data found. Attempt a Mock Test or Challenger Arena to see your live progress here!</p>';
        return;
    }

    // 🧮 Math Calculations for Dashboard
    let totalTests = performances.length;
    let totalObtained = 0;
    let totalMax = 0;
    let recentTestsHtml = '';
    
    // Sort logic: Naya test sabse upar dikhega
    performances.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    performances.forEach((p, index) => {
        totalObtained += p.score;
        totalMax += p.maxScore;
        
        // Sirf top 4 recent tests dikhayenge list mein
        if (index < 4) {
            let colorClass = p.percentage >= 40 ? 'bg-emerald-500' : 'bg-red-500';
            let textClass = p.percentage >= 40 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500';
            recentTestsHtml += `
            <div class="mb-4 bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm transition-transform hover:-translate-y-0.5">
                <div class="flex justify-between text-xs font-bold mb-2">
                    <span class="text-slate-700 dark:text-slate-300 truncate w-2/3"><i class="fa-solid fa-flask text-slate-400 mr-1.5"></i>${p.testTitle}</span>
                    <span class="${textClass}">${p.percentage.toFixed(1)}%</span>
                </div>
                <div class="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1.5">
                    <div class="${colorClass} h-1.5 rounded-full" style="width: ${p.percentage}%"></div>
                </div>
            </div>`;
        }
    });

    const overallPct = totalMax > 0 ? ((totalObtained / totalMax) * 100).toFixed(1) : 0;
    
    // 🎨 The Premium UI Construction
    const dashboardHtml = `
        <div class="grid grid-cols-3 gap-3 mb-6">
            <div class="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-2xl border border-blue-100 dark:border-blue-800/50 text-center shadow-sm">
                <div class="text-xl font-extrabold text-brand-blue">${totalTests}</div>
                <div class="text-[9px] text-slate-500 font-bold uppercase tracking-wider mt-1">Attempts</div>
            </div>
            <div class="bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-2xl border border-emerald-100 dark:border-emerald-800/50 text-center shadow-sm">
                <div class="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">${overallPct}%</div>
                <div class="text-[9px] text-slate-500 font-bold uppercase tracking-wider mt-1">Accuracy</div>
            </div>
            <div class="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-2xl border border-purple-100 dark:border-purple-800/50 text-center shadow-sm">
                <div class="text-xl font-extrabold text-purple-600 dark:text-purple-400">${totalObtained.toFixed(1)}</div>
                <div class="text-[9px] text-slate-500 font-bold uppercase tracking-wider mt-1">Total Score</div>
            </div>
        </div>
        <h4 class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
            <i class="fa-solid fa-clock-rotate-left"></i> Recent Test History
        </h4>
        ${recentTestsHtml}
    `;
    
    container.innerHTML = dashboardHtml;
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