const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
dotenv.config();
app.use(cors());
app.use(express.json());

const port = process.env.PORT || 5000;
const uri = process.env.MONGODB_URI;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();

    const db = client.db("IdeaVault");
    const ideaVualtCollection = db.collection("ideas");

    // 1. All idea gates and filtering endpoints
    app.get("/ideas", async (req, res) => {
      try {
        const { search, category, startDate, endDate } = req.query;
        let query = {};

        // Search Filter
        if (search) {
          query.title = { $regex: search, $options: "i" };
        }

        // Category Filter
        if (category && category !== "All") {
          query.category = category;
        }

        // Date Range Filter
        if (startDate || endDate) {
          query.createdAt = {};
          if (startDate && startDate.trim() !== "")
            query.createdAt.$gte = new Date(startDate);
          if (endDate && endDate.trim() !== "")
            query.createdAt.$lte = new Date(endDate);

          if (Object.keys(query.createdAt).length === 0) {
            delete query.createdAt;
          }
        }

        const ideas = await ideaVualtCollection.find(query).toArray();
        res.send(ideas);
      } catch (error) {
        res.status(500).send({ message: error.message });
      }
    });

    // 2. Endpoint to get a specific idea
    app.get("/ideas/:id", async (req, res) => {
      try {
        const id = req.params.id;
        if (!ObjectId.isValid(id)) {
          return res.status(400).send({ message: "Invalid ID format" });
        }
        const query = { _id: new ObjectId(id) };
        const result = await ideaVualtCollection.findOne(query);

        if (!result) {
          return res.status(404).send({ message: "Idea not found" });
        }
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: error.message });
      }
    });

    // 3. Endpoint for creating new ideas
    app.post("/ideas", async (req, res) => {
      try {
        const ideasData = req.body;

        if (!ideasData.createdAt) {
          ideasData.createdAt = new Date();
        }
        const result = await ideaVualtCollection.insertOne(ideasData);
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: error.message });
      }
    });

    // 4.Endpoint for adding comments
    app.post("/ideas/:id/comments", async (req, res) => {
      try {
        const id = req.params.id;
        const commentData = req.body;

        if (!ObjectId.isValid(id)) {
          return res.status(400).send({ message: "Invalid ID format" });
        }

        const newComment = {
          _id: new ObjectId(),
          userName: commentData.userName,
          userEmail: commentData.userEmail,
          text: commentData.text,
          timestamp: new Date().toISOString(),
        };

        const filter = { _id: new ObjectId(id) };
        const updateDoc = {
          $push: { comments: newComment },
        };

        const result = await ideaVualtCollection.updateOne(filter, updateDoc);
        if (result.modifiedCount > 0) {
          res.status(201).send({ success: true, comment: newComment });
        } else {
          res
            .status(400)
            .send({ success: false, message: "Failed to add comment" });
        }
      } catch (error) {
        res.status(500).send({ message: error.message });
      }
    });

    // 5. Comment editing endpoint
    app.patch("/ideas/:id/comments/:commentId", async (req, res) => {
      try {
        const { id, commentId } = req.params;
        const { text } = req.body;

        if (!ObjectId.isValid(id) || !ObjectId.isValid(commentId)) {
          return res.status(400).send({ message: "Invalid ID format" });
        }

        const filter = {
          _id: new ObjectId(id),
          "comments._id": new ObjectId(commentId),
        };
        const updateDoc = {
          $set: {
            "comments.$.text": text,
            "comments.$.timestamp": new Date().toISOString(),
          },
        };

        const result = await ideaVualtCollection.updateOne(filter, updateDoc);
        if (result.modifiedCount > 0) {
          res.send({ success: true, message: "Comment updated successfully" });
        } else {
          res.status(400).send({
            success: false,
            message: "No changes made or comment not found",
          });
        }
      } catch (error) {
        res.status(500).send({ message: error.message });
      }
    });

    // 6. Endpoint for deleting comments
    app.delete("/ideas/:id/comments/:commentId", async (req, res) => {
      try {
        const { id, commentId } = req.params;

        if (!ObjectId.isValid(id) || !ObjectId.isValid(commentId)) {
          return res.status(400).send({ message: "Invalid ID format" });
        }

        const filter = { _id: new ObjectId(id) };
        const updateDoc = {
          $pull: {
            comments: { _id: new ObjectId(commentId) },
          },
        };

        const result = await ideaVualtCollection.updateOne(filter, updateDoc);
        if (result.modifiedCount > 0) {
          res.send({ success: true, message: "Comment deleted successfully" });
        } else {
          res
            .status(400)
            .send({ success: false, message: "Comment not found" });
        }
      } catch (error) {
        res.status(500).send({ message: error.message });
      }
    });



    // Endpoints to Get Trending Ideas
    app.get("/trending-ideas", async (req, res) => {
      try {
        const result = await ideaVualtCollection.find().limit(6).toArray();

        res.send(result);
      } catch (error) {
        console.error("Error fetching trending ideas:", error);
        res.status(500).send({ message: "Internal Server Error" });
      }
    });



    // 1. Fetch ideas only from logged in users (My Ideas)
    app.get("/my-ideas", async (req, res) => {
      try {
        const email = req.query.email;
        if (!email) {
          return res
            .status(400)
            .send({ success: false, message: "Email is required" });
        }

        const sampleDoc = await ideaVualtCollection.findOne({});

        const query = { userEmail: email };
        const result = await ideaVualtCollection.find(query).toArray();

        console.log(
          `[My Ideas] Strict Mode: Found ${result.length} ideas for ${email}`,
        );
        res.send(result);
      } catch (error) {
        console.error("Detailed Backend Error:", error);
        res
          .status(500)
          .send({ success: false, message: "Internal server error" });
      }
    });

    // ✏️ ২. নির্দিষ্টアレンジメント আপডেট করা (Update Idea Blueprint)
    app.patch("/ideas/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) };
        const updatedData = req.body;

        const updateDoc = {
          $set: {
            title: updatedData.title,
            shortDesc: updatedData.shortDesc,
            category: updatedData.category,
            budget: updatedData.budget,
            targetAudience: updatedData.targetAudience,
            description: updatedData.description,
            updatedAt: new Date().toISOString(),
          },
        };

        // 🎯 ideasCollection বদলে ideaVualtCollection করা হলো
        const result = await ideaVualtCollection.updateOne(filter, updateDoc);

        if (result.modifiedCount > 0) {
          res.send({
            success: true,
            message: "Architecture updated successfully",
          });
        } else {
          res.status(400).send({
            success: false,
            message: "No changes made or idea not found",
          });
        }
      } catch (error) {
        console.error("Error updating idea:", error);
        res.status(500).send({ message: "Internal server error" });
      }
    });

    // ৩. নির্দিষ্ট আইডিয়া স্থায়ীভাবে ডিলিট করা (Purge Concept) FIXED
    app.delete("/ideas/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };

        // 🎯 ideasCollection বদলে ideaVualtCollection করা হলো
        const result = await ideaVualtCollection.deleteOne(query);

        if (result.deletedCount > 0) {
          res.send({
            success: true,
            message: "Concept permanently wiped from database",
          });
        } else {
          res
            .status(404)
            .send({ success: false, message: "Concept not found" });
        }
      } catch (error) {
        console.error("Error deleting idea:", error);
        res.status(500).send({ message: "Internal server error" });
      }
    });

    // 💬 ৪. ইউজারের কমেন্ট করা আইডিয়াগুলো নিয়ে আসা (My Interactions)
    app.get("/my-interactions", async (req, res) => {
      try {
        const email = req.query.email;
        if (!email) {
          return res
            .status(400)
            .send({ success: false, message: "Email is required" });
        }

        // 🎯 MongoDB $elemMatch অপারেটর দিয়ে comments অ্যারের ভেতর ইমেইল খোঁজা হচ্ছে
        const query = {
          comments: {
            $elemMatch: { userEmail: email },
          },
        };

        const result = await ideaVualtCollection.find(query).toArray();

        console.log(
          `[Interactions] Found ${result.length} commented ideas for ${email}`,
        );
        res.send(result);
      } catch (error) {
        console.error("Error fetching interactions:", error);
        res
          .status(500)
          .send({ success: false, message: "Internal server error" });
      }
    });

    // 👤 ৫. ইউজারের প্রোফাইল ডাটা আপডেট করা (Profile Management)
    app.patch("/update-profile", async (req, res) => {
      try {
        const { email, name, image } = req.body;

        if (!email) {
          return res
            .status(400)
            .send({ success: false, message: "User email is required" });
        }

        const filter = { email: email };
        const updateDoc = {
          $set: {
            name: name,
            image: image,
            updatedAt: new Date(),
          },
        };

        const result = await client
          .db("ideaVaultAuth")
          .collection("user")
          .updateOne(filter, updateDoc);

        if (result.modifiedCount > 0 || result.matchedCount > 0) {
          res.send({
            success: true,
            message: "Profile synchronized successfully!",
          });
        } else {
          res
            .status(400)
            .send({ success: false, message: "No modifications executed." });
        }
      } catch (error) {
        console.error("Profile Update Error:", error);
        res
          .status(500)
          .send({ success: false, message: "Internal server error" });
      }
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!",
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

// Check API
app.get("/", (req, res) => {
  res.send("Hello Server!");
});

// API END POINT
app.listen(port, () => {
  console.log(`Server running on this port: ${port}`);
});
