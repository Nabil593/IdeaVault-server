# 🖥️ IdeaVault Server – Backend API Gateway

This repository houses the robust, secure, and production-ready RESTful API backend for **IdeaVault**. Engineered using Node.js, Express, and MongoDB, this server handles all business logic, manages complex database queries, authenticates requests securely through BetterAuth and JWT session validation, and serves optimized data layers to the Next.js client application.

**Live Link:** [Deploying Link Goes Here](https://idea-vault-client-ten.vercel.app/)  
**Client-Side Repository:** [Link to Client Repo](https://idea-vault-server-gamma.vercel.app/)

---

## ⚡ Key Backend Features

* **Custom JWT Verification Layer:** Features a standalone `verifyJWT` authorization middleware that inspects inbound HTTP headers for standard `Bearer` tokens, blocking unauthorized requests and protecting sensitive user interaction streams.
* **Advanced Multi-Param Filter Engine:** Powers the main marketplace feed (`GET /ideas`) via multi-layered query lookups including case-insensitive search (`$regex` with `$options: "i"`), exact category matching, and conditional ISO date-range parameters (`$gte` / `$lte`).
* **Atomic Array Operations for Interactions:** Avoids heavy document re-writes by leveraging native MongoDB atomic mutators like `$push` and `$pull` to manage comment arrays directly inside target documents with sub-document `ObjectId` isolation.
* **Multi-Tenant Database Architecture:** Isolates platform business features inside the core `IdeaVault.ideas` collection, while handling profile and identity synchronization directly within the separate `ideaVaultAuth.user` table schema.
* **Rigid Error Handling & Validation:** Validates hexagonal `ObjectId` strings across incoming params using `ObjectId.isValid()` checks to prevent application crashes and unexpected database runtime errors.

---

## 🛠️ Technology Stack & Engineering Modules

* **Runtime Environment:** Node.js
* **Backend Framework:** Express.js (Restful routing middleware, JSON request parsing, and CORS configuration)
* **Database Management:** MongoDB Native Driver (Using `MongoClient` with strict `ServerApiVersion.v1` validation configurations)
* **Token Security:** `jsonwebtoken` for parsing client session states
* **Configuration:** `dotenv` for securing environment keys

---

## 🔀 API Endpoints Architecture

### 🔑 Base & Auth Management
* `GET /` → Simple root health check returning standard server confirmation.
* `PATCH /update-profile` → Syncs third-party authenticated data components (`name`, `image`) directly into the `ideaVaultAuth.user` storage cluster using an email identifier.

### 💡 Startup Idea Routes (`/ideas`)
* `GET /ideas` → Multi-query entry point. Accurately filters concepts through optional query parameters: `search`, `category`, `startDate`, and `endDate`.
* `GET /trending-ideas` → Returns top startup concepts constrained to exactly 6 records using high-performance `.limit(6)` aggregation.
* `GET /ideas/:id` → Individual document lookup. Verifies structural database layout before returning a single concept entity.
* `POST /ideas` → Instantiates new idea entries with automated backend generation of `createdAt` timestamps.
* `PATCH /ideas/:id` → Custom data updater that targets specific schema variables (`title`, `shortDesc`, `category`, `budget`, `targetAudience`, `description`) through atomic `$set` structures.
* `DELETE /ideas/:id` → Drops a specific idea entity permanently using a unique `ObjectId`.

### 💬 Platform Comment & Interaction Routes
* `POST /ideas/:id/comments` *(Protected)* → Generates a unique sub-document entry with isolated time markers and arrays it into a concept block using `$push`.
* `PATCH /ideas/:id/comments/:commentId` *(Protected)* → Modifies specific embedded comments in-place using positional array filters (`comments.$.text`).
* `DELETE /ideas/:id/comments/:commentId` *(Protected)* → Cleanses unwanted feedback blocks from a parent structure using the native `$pull` mechanism.
* `GET /my-interactions` → Locates and returns an aggregate array of all external startup ideas a logged-in user has contributed comments to via advanced `$elemMatch` indexing queries.

---

## 🤝 Contact & Support
If you have any questions or want to discuss this project, feel free to reach out:

*   **Developer:** Shariea Reza Nabil
*   **LinkedIn:** [https://www.linkedin.com/in/shariea-reza-nabil/]
*   **Email:** [nabilreza183@gmail.com]
