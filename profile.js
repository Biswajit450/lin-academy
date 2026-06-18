// profile.js

import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

// Update Profile UI jab bhi user login/refresh kare
onAuthStateChanged(auth, async (user) => {
    if (user) {
        // Basic Info from Google
        const nameEl = document.getElementById('profile-page-name');
        const emailEl = document.getElementById('profile-page-email');
        const picEl = document.getElementById('profile-page-pic');

        if(nameEl) nameEl.innerText = user.displayName || 'Student';
        if(emailEl) emailEl.innerText = user.email || '';
        if(picEl) picEl.src = user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName || 'S'}&background=2563eb&color=fff`;

        // Fetch Extra Info (Phone, City) from Firestore
        try {
            const userDoc = await getDoc(doc(db, "users", user.uid));
            if (userDoc.exists()) {
                const data = userDoc.data();
                const phoneInput = document.getElementById('profile-phone');
                const cityInput = document.getElementById('profile-city');
                
                if(phoneInput && data.phone) phoneInput.value = data.phone;
                if(cityInput && data.city) cityInput.value = data.city;
                
                // Render Progress for Unlocked Courses
                renderProgress(data.unlocked_courses || []);
            }
        } catch (error) {
            console.error("Error fetching user details", error);
        }
    }
});

window.saveProfileInfo = async function() {
    const user = auth.currentUser;
    if(!user) {
        alert("Please login first!");
        return;
    }

    const phone = document.getElementById('profile-phone').value;
    const city = document.getElementById('profile-city').value;
    const btn = event.target;
    const originalText = btn.innerHTML;
    
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
    btn.disabled = true;

    try {
        await setDoc(doc(db, "users", user.uid), {
            phone: phone,
            city: city
        }, { merge: true }); // Merge true means existing data delete nahi hoga
        
        alert("Success! Your profile details have been updated.");
    } catch (error) {
        console.error("Error saving profile", error);
        alert("Failed to save details. Try again.");
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

function renderProgress(courses) {
    const container = document.getElementById('profile-progress-list');
    if(!container) return;

    if(!courses || courses.length === 0) {
        container.innerHTML = '<p class="text-xs text-slate-400">No active courses found. Enroll in a course to start tracking progress.</p>';
        return;
    }

    let html = '';
    courses.forEach(course => {
        // UI ke liye dummy progress percentage (10% se 70% ke beech)
        const mockProgress = Math.floor(Math.random() * 60) + 10; 
        
        html += `
        <div>
            <div class="flex justify-between text-xs font-bold mb-1"><span class="text-slate-700 dark:text-slate-300">${course}</span><span class="text-brand-blue">${mockProgress}%</span></div>
            <div class="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5"><div class="bg-brand-blue h-2.5 rounded-full" style="width: ${mockProgress}%"></div></div>
        </div>`;
    });
    container.innerHTML = html;
}