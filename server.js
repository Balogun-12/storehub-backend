require('dns').setDefaultResultOrder('ipv4first');

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const app = express();

app.use(cors());
app.use(express.json({ limit: "50mb" }));

/* =========================
   DATABASE CONNECTION
========================= */

mongoose.set('strictQuery', false);

mongoose.connect(
"mongodb://storehubAdmin:balogun0012@ac-dzwnrvs-shard-00-00.pjfummp.mongodb.net:27017,ac-dzwnrvs-shard-00-01.pjfummp.mongodb.net:27017,ac-dzwnrvs-shard-00-02.pjfummp.mongodb.net:27017/?ssl=true&replicaSet=atlas-10b3rd-shard-0&authSource=admin&appName=storehub-db"
)
.then(() => console.log("✅ MongoDB connected successfully"))
.catch(err => console.log("❌ MongoDB connection error:", err));

/* =========================
   STORE MODEL
========================= */

const storeSchema = new mongoose.Schema({

    businessName: { type: String, required: true },
    logo: { type: String, default: "" },
    description: { type: String, default: "" },

    storeUsername: {
        type: String,
        unique: true,
        sparse: true
    },

    whatsapp: { type: String, default: null },
    email: { type: String, default: null },

    /* BACKGROUND */
    backgroundImage: { type: String, default: "" },
    brightness: { type: Number, default: 1 },

    /* THEME */
    productsBgColor: { type: String, default: "#f7c4c4" },
    businessNameColor: { type: String, default: "#ffffff" },
    descriptionColor: { type: String, default: "#ffffff" },
    smallTextColor: { type: String, default: "#f1f1f1" },
    enableShadow: { type: Boolean, default: false },

    /* ANALYTICS */
    totalOrders: { type: Number, default: 0 },
    customerViews: { type: Number, default: 0 },

    /* PRODUCTS */
    products: [{
        productImage: String,
        productName: String,
        productPrice: String,
        productStatus: String,
        createdAt: { type: Date, default: Date.now }
    }],

    createdAt: { type: Date, default: Date.now }
});

const Store = mongoose.model("Store", storeSchema);

/* =========================
   POST MODEL (FEED)
========================= */

const postSchema = new mongoose.Schema({
    storeId: { type: String, required: true },
    storeUsername: { type: String, required: true },
    caption: String,
    music: String,
    images: [String],
    createdAt: { type: Date, default: Date.now }
});

postSchema.index({ createdAt: -1 });

const Post = mongoose.model("Post", postSchema);

const analyticsSchema = new mongoose.Schema({

    type: {
        type: String,
        required: true
    },

    storeId: {
        type: String,
        required: true
    },

    source: {
        type: String,
        default: "unknown"
    },

    userAgent: String,

}, { timestamps: true });

const Analytics = mongoose.model("Analytics", analyticsSchema);
/* =========================
   BASIC ROUTE
========================= */

app.get("/", (req, res) => {
    res.send("🚀 STOREHUB BACKEND IS RUNNING");
});

/* =========================
   CREATE STORE
========================= */

app.post("/api/store", async (req, res) => {
    try {
        const { businessName, description, logo } = req.body;

        if (!businessName || !description || !logo) {
            return res.status(400).json({ success: false, error: "Missing fields" });
        }

        const newStore = new Store({ businessName, description, logo });
        await newStore.save();

        res.json({ success: true, store: newStore });

    } catch (err) {
        console.log(err);
        res.status(500).json({ success: false, error: "Server error" });
    }
});

/* =========================
   GET STORE
========================= */

app.get("/api/store/:id", async (req, res) => {
    try {

        const store = await Store.findById(req.params.id);

        if (!store) {
            return res.status(404).json({
                success: false,
                error: "Store not found"
            });
        }

        return res.json({
            success: true,
            store
        });

    } catch (err) {
        console.log(err);

        return res.status(500).json({
            success: false,
            error: "Server error"
        });
    }
});

/* =========================
   UPDATE STORE (SAFE)
========================= */

app.put("/api/store/:id", async (req, res) => {
    try {

        console.log("UPDATE STORE HIT");
        console.log("ID:", req.params.id);
        console.log("BODY:", req.body);

        if (!req.body || Object.keys(req.body).length === 0) {
            return res.status(400).json({
                success: false,
                error: "Empty update"
            });
        }

        const updatedStore = await Store.findByIdAndUpdate(
            req.params.id,
            { $set: req.body },
            {
                new: true,
                runValidators: true
            }
        );

        if (!updatedStore) {
            return res.status(404).json({
                success: false,
                error: "Store not found"
            });
        }

        return res.json({
            success: true,
            store: updatedStore
        });

    } catch (error) {
        console.log("UPDATE ERROR:", error);

        return res.status(500).json({
            success: false,
            error: error.message || "Server error"
        });
    }
});

/* =========================
   LOGIN
========================= */

app.post("/api/login", async (req, res) => {
    try {

        const { storeUsername, whatsapp } = req.body;

        const store = await Store.findOne({
            storeUsername: storeUsername?.toLowerCase()
        });

        if (!store) {
            return res.status(404).json({ success: false, error: "Store not found" });
        }

        if (store.whatsapp !== whatsapp) {
            return res.status(401).json({ success: false, error: "Invalid login" });
        }

        res.json({ success: true, store });

    } catch (err) {
        res.status(500).json({ success: false });
    }
});

/* =========================
   PRODUCT ROUTES
========================= */

app.post("/api/product/:storeId", async (req, res) => {
    try {

        const store = await Store.findById(req.params.storeId);
        if (!store) return res.status(404).json({ success: false });

        const { productName, productPrice, productStatus, productImage } = req.body;

        if (!productName || !productPrice || !productStatus || !productImage) {
            return res.status(400).json({ success: false });
        }

        store.products.push({
            productName,
            productPrice,
            productStatus,
            productImage
        });

        await store.save();

        res.json({ success: true });

    } catch (err) {
        res.status(500).json({ success: false });
    }
});

app.delete("/api/product/:storeId/:index", async (req, res) => {
    try {

        const store = await Store.findById(req.params.storeId);
        if (!store) return res.status(404).json({ success: false });

        store.products.splice(req.params.index, 1);

        await store.save();

        res.json({ success: true });

    } catch (err) {
        res.status(500).json({ success: false });
    }
});

/* =========================
   POSTS (FEED)
========================= */

app.post("/api/post", async (req, res) => {
    try {

        const { storeId, storeUsername, caption, music, images } = req.body;

        if (!storeId || !storeUsername) {
            return res.status(400).json({ success: false, error: "Missing store identity" });
        }

        const post = new Post({
            storeId,
            storeUsername,
            caption,
            music,
            images
        });

        await post.save();

        res.json({ success: true, post });

    } catch (err) {
        res.status(500).json({ success: false });
    }
});

app.get("/api/posts", async (req, res) => {
    try {

        const posts = await Post.find({})
            .sort({ createdAt: -1 })
            .limit(20);

        res.json({ success: true, posts });

    } catch (err) {
        res.status(500).json({ success: false });
    }
});

/* =========================
   BACKGROUND
========================= */

app.put("/api/store/background/:id", async (req, res) => {
    try {

        const updated = await Store.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );

        res.json({ success: true, store: updated });

    } catch (err) {
        res.status(500).json({ success: false });
    }
});

app.put("/api/store/background/reset/:id", async (req, res) => {
    try {

        const updated = await Store.findByIdAndUpdate(
            req.params.id,
            { backgroundImage: "", brightness: 1 },
            { new: true }
        );

        res.json({ success: true, store: updated });

    } catch (err) {
        res.status(500).json({ success: false });
    }
});

/* =========================
   THEME
========================= */

app.put("/api/store/theme/:id", async (req, res) => {
    try {

        const updated = await Store.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );

        res.json({ success: true, store: updated });

    } catch (err) {
        res.status(500).json({ success: false });
    }
});

app.put("/api/store/theme/reset/:id", async (req, res) => {
    try {

        const updated = await Store.findByIdAndUpdate(
            req.params.id,
            {
                productsBgColor: "#f7c4c4",
                businessNameColor: "#ffffff",
                descriptionColor: "#ffffff",
                smallTextColor: "#f1f1f1",
                enableShadow: false
            },
            { new: true }
        );

        res.json({ success: true, store: updated });

    } catch (err) {
        res.status(500).json({ success: false });
    }
});

/* =========================
   ANALYTICS
========================= */

app.put("/api/store/order/:id", async (req, res) => {
    await Store.findByIdAndUpdate(req.params.id, { $inc: { totalOrders: 1 } });
    res.json({ success: true });
});

app.put("/api/store/view/:id", async (req, res) => {
    await Store.findByIdAndUpdate(req.params.id, { $inc: { customerViews: 1 } });
    res.json({ success: true });
});

app.post("/api/analytics/track", async (req, res) => {

    try {

        const { type, storeId, source } = req.body;

        if (!type || !storeId) {
            return res.status(400).json({
                success: false,
                error: "Missing fields"
            });
        }

        await Analytics.create({
            type,
            storeId,
            source,
            userAgent: req.headers["user-agent"]
        });

        res.json({ success: true });

    } catch (err) {

        console.log("Analytics error:", err);

        res.status(500).json({ success: false });
    }
});

app.get("/api/analytics/stats/:storeId", async (req, res) => {

    try {

        const { storeId } = req.params;

        const stats = await Analytics.aggregate([

            { $match: { storeId } },

            {
                $group: {
                    _id: "$type",
                    count: { $sum: 1 }
                }
            }

        ]);

        res.json({
            success: true,
            stats
        });

    } catch (err) {

        console.log(err);

        res.status(500).json({ success: false });
    }
});

app.get("/s/:username", async (req, res) => {

    const store = await Store.findOne({
        storeUsername: req.params.username
    });

    if (!store) {
        return res.status(404).send("Store not found");
    }

    const frontendURL =
        process.env.FRONTEND_URL ||
        "https://storehub-app.vercel.app";

    return res.redirect(
        `${frontendURL}/view-store.html?id=${store._id}`
    );
});

/* =========================
   SERVER START
========================= */
const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => {
    console.log("✅ Server running on port " + PORT);
});