const functions = require("firebase-functions");
// 🚨 MAGIC UPGRADE: Importing Google's modern V2 Engine for secure checkouts
const { onCall, HttpsError } = require("firebase-functions/v2/https"); 
const admin = require("firebase-admin");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const cors = require("cors")({ origin: true });

// 1. Initialize Firebase Admin
admin.initializeApp();
const db = admin.firestore();

// 🚨 RAZORPAY KEYS (Aapki Live Keys Secure hain)
const RAZORPAY_KEY_ID = "rzp_live_T5Sz0KnOfFMwzp";
const RAZORPAY_KEY_SECRET = "EgvyyzwkbSObM67JVVithLJ5";
const WEBHOOK_SECRET = "lin_academy_super_secret_123"; 

// Initialize Razorpay Instance
const razorpay = new Razorpay({
  key_id: RAZORPAY_KEY_ID,
  key_secret: RAZORPAY_KEY_SECRET,
});

// ============================================================================
// API 1: CREATE ORDER (App bulayegi jab bachha 'Enroll Now' dabayega)
// ============================================================================
// 🚨 V2 UPGRADE: Changed from functions.https.onCall to modern onCall(request)
exports.createOrder = onCall(async (request) => {
    // Check if user is logged in using the modern V2 'request.auth'
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "Bhai, pehle login karo!");
    }
    
    const userId = request.auth.uid;
    const courseTitle = request.data.courseTitle; // V2 uses request.data

    if (!courseTitle) {
        throw new HttpsError("invalid-argument", "Course ka naam missing hai.");
    }

    try {
        // 1. Securely fetch course price & validity from Firestore
        const courseSnap = await db.collection("deployed_courses").doc(courseTitle).get();
        if (!courseSnap.exists) {
            throw new HttpsError("not-found", "Course nahi mila.");
        }
        
        const courseData = courseSnap.data();
        const priceInRupees = courseData.price || 0;
        const validityDays = courseData.validity || 0;

        if (priceInRupees <= 0) {
             throw new HttpsError("failed-precondition", "Free course hai ya price theek nahi hai.");
        }

        // 2. Tell Razorpay to create a fresh Order
        const options = {
            amount: priceInRupees * 100, // Razorpay takes amount in Paise (₹1 = 100p)
            currency: "INR",
            receipt: `rcpt_${userId.substring(0, 5)}_${Date.now()}`,
            // NOTES are the magic trick! We send these to Razorpay, and they send it back in Webhook
            notes: {
                userId: userId,
                courseTitle: courseTitle,
                validity: validityDays
            }
        };

        const order = await razorpay.orders.create(options);
        
        // Send Order ID back to Frontend App
        return {
            id: order.id,
            amount: order.amount,
            currency: order.currency
        };

    } catch (error) {
        console.error("Order Creation Error:", error);
        throw new HttpsError("internal", error.message);
    }
});

// ============================================================================
// API 2: RAZORPAY WEBHOOK (Automated Cashier - Sunta rahega background mein)
// ============================================================================
exports.razorpayWebhook = functions.https.onRequest((req, res) => {
    cors(req, res, async () => {
        // Razorpay always sends data via POST method
        if (req.method !== "POST") {
            return res.status(405).send("Method Not Allowed");
        }

        const signature = req.headers["x-razorpay-signature"];
        const body = req.rawBody; // Raw payload needed for signature check

        try {
            // 1. The Bouncer Check: Verify Razorpay Signature
            const expectedSignature = crypto
                .createHmac("sha256", WEBHOOK_SECRET)
                .update(body)
                .digest("hex");

            if (expectedSignature !== signature) {
                console.error("🚨 HACKER ALERT! Invalid Signature.");
                return res.status(400).send("Invalid Signature");
            }

            // 2. Parse the verified data
            const payload = req.body;

            // We only take action if payment was successfully captured
            if (payload.event === "payment.captured") {
                const payment = payload.payload.payment.entity;
                const notes = payment.notes;

                const userId = notes.userId;
                const courseTitle = notes.courseTitle;
                const validityDays = parseInt(notes.validity) || 0;

                if (!userId || !courseTitle) {
                    console.error("Missing mapping info", notes);
                    return res.status(200).send("Skipped - No metadata.");
                }

                // 3. Unlock Magic: Add to User's Database
                const userRef = db.collection("users").doc(userId);

                // Add to array for immediate UI unlock
                await userRef.set({
                    unlocked_courses: admin.firestore.FieldValue.arrayUnion(courseTitle)
                }, { merge: true });

                // 4. Time Machine: Calculate and save Expiry Date
                if (validityDays > 0) {
                    const expiresAt = new Date();
                    expiresAt.setDate(expiresAt.getDate() + validityDays);

                    await userRef.set({
                        // 🚀 NEW: Frontend App.js isko read karega
                        course_expiries: {
                            [courseTitle]: expiresAt.toISOString()
                        },
                        // Old backup details for Admin/Audit
                        subscriptions: {
                            [courseTitle]: {
                                unlockedAt: admin.firestore.FieldValue.serverTimestamp(),
                                expiresAt: expiresAt.toISOString(),
                                status: "active"
                            }
                        }
                    }, { merge: true });
                }

                console.log(`✅ BINGO! Unlocked "${courseTitle}" for user ${userId}`);
            }

            // Always respond with 200 OK so Razorpay knows we got the message
            res.status(200).send("Webhook Processed");

        } catch (error) {
            console.error("Webhook Error:", error);
            res.status(500).send("Internal Server Error");
        }
    });
});

// ============================================================================
// API 3: BUNNY.NET VIDEO TICKET (Secure Direct Uploader with Auto-Folders)
// ============================================================================
// 🚨 BUNNY KEYS: Yahan apni actual Library ID aur API Key daaliye
const BUNNY_LIBRARY_ID = "673982";
const BUNNY_API_KEY = "287095c5-0307-472c-a1e5ba3a3501-8929-4180";

exports.createBunnyVideoTicket = onCall(async (request) => {
    // 1. Authentication & Role Check
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "Please login first!");
    }
    
    const uid = request.auth.uid;
    const userDoc = await db.collection("users").doc(uid).get();
    if (!userDoc.exists) {
        throw new HttpsError("permission-denied", "User not found.");
    }
    
    const role = userDoc.data().role || 'student';
    if (role !== 'admin' && role !== 'superadmin') {
        throw new HttpsError("permission-denied", "Access Denied: Only authorized educators can upload videos.");
    }

    // 2. Data from Frontend
    const videoTitle = request.data.title || `LinAcademy_Video_${Date.now()}`;
    const courseName = request.data.courseName || "Uncategorized_Course"; // 🚀 Naya Logic

    try {
        let collectionId = "";

        // 3. 🚀 THE SMART FOLDER ENGINE: Find or Create Collection
        try {
            // A. Check if folder already exists
            const getColUrl = `https://video.bunnycdn.com/library/${BUNNY_LIBRARY_ID}/collections?search=${encodeURIComponent(courseName)}`;
            const getColRes = await fetch(getColUrl, { headers: { 'AccessKey': BUNNY_API_KEY, 'Accept': 'application/json' }});
            const getColData = await getColRes.json();
            
            let foundCollection = getColData.items ? getColData.items.find(c => c.name === courseName) : null;
            
            if (foundCollection) {
                collectionId = foundCollection.guid;
            } else {
                // B. Folder doesn't exist, Create a new one!
                const createColUrl = `https://video.bunnycdn.com/library/${BUNNY_LIBRARY_ID}/collections`;
                const createColRes = await fetch(createColUrl, {
                    method: 'POST',
                    headers: { 'AccessKey': BUNNY_API_KEY, 'Content-Type': 'application/json', 'Accept': 'application/json' },
                    body: JSON.stringify({ name: courseName })
                });
                const createColData = await createColRes.json();
                collectionId = createColData.guid;
            }
        } catch(folderErr) {
            console.error("Folder Creation Error:", folderErr);
            // Agar folder banne mein koi issue aaye toh error nahi denge, root me save kar lenge
        }

        // 4. Talk to Bunny.net to create a Blank Video Entry IN THE FOLDER
        const url = `https://video.bunnycdn.com/library/${BUNNY_LIBRARY_ID}/videos`;
        const bodyData = { title: videoTitle };
        if (collectionId) {
            bodyData.collectionId = collectionId; // Video ko is folder me daalo
        }

        const options = {
            method: 'POST',
            headers: {
                'AccessKey': BUNNY_API_KEY,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(bodyData)
        };

        const response = await fetch(url, options);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "Bunny.net API rejected the request.");
        }

        const videoId = data.guid;

        // 5. Generate the Secure Upload Signature (Valid for 2 Hours)
        const expirationTime = Math.floor(Date.now() / 1000) + (2 * 60 * 60);
        const signatureString = `${BUNNY_LIBRARY_ID}${BUNNY_API_KEY}${expirationTime}${videoId}`;
        const crypto = require("crypto"); 
        const signature = crypto.createHash('sha256').update(signatureString).digest('hex');

        // 6. Give the VIP Ticket back to the App
        return {
            libraryId: BUNNY_LIBRARY_ID,
            videoId: videoId,
            expirationTime: expirationTime,
            signature: signature
        };

    } catch (error) {
        console.error("Bunny Ticket Generation Error:", error);
        throw new HttpsError("internal", error.message);
    }
});