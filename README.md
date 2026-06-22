# 🖥️ FlexPulse — Fitness & Gym Management Platform (Server Side Engine)

## 📌 Project Summary
This repository serves as the robust REST API backend engine powering the FlexPulse platform. Engineered using Node.js and Express, the server handles critical tasks such as role-based access control (RBAC), multi-layered JWT verification, database persistence through MongoDB, and secure payment aggregation with Stripe. It features high-efficiency database queries, custom middleware to handle administrative restrictions (soft blocking), and advanced MongoDB aggregation pipelines to safely decouple booking data from transactional systems. The server is optimized to ensure low-latency data transmission, strict data validation, and flawless production stability.

---

## 🚀 Live API Endpoints
- **Production Base URL:** [https://fitnexus-client.vercel.app/]
- **Client Application Repository:** [https://github.com/ranakhan-25/FitNexus-client]

---

## 🔒 Core Backend Features
- **Express 5 Runtime Environment:** Built on the modern Express routing engine for fast asynchronous handling and performance.
- **JWT Authorization Guards:** Custom-built token verification middleware checking system roles (User -> Trainer -> Admin) via secure browser token passing.
- **Stripe Checkout Pipeline:** Highly optimized backend generation of payment intents and unique session tokens calculating automated monetary logic in cents.
- **Complex MongoDB Aggregation Pipelines:** Employs advanced `$lookup`, type casting (`$toObjectId`), and fallback fields (`$ifNull`) to securely preserve transactional user histories.
- **Administrative Action Restrictor (Soft Blocking):** Implements system-wide blockers that automatically intercept requests from restricted users to protect mutation routes.
- **Structured Error Handling:** Implements robust global error handlers to ensure the production build never encounters fatal crashes or CORS errors.

---

## 🛠️ Tech Stack & Packages Used

- **Express** (Routing & Server Framework)
- **MongoDB Native Driver** (Database Connection & Complex Queries)
- **Stripe SDK** (Payment Lifecycle Verification)
- **Jose / JsonWebToken** (Token signatures & Encryption)
- **CORS** (Cross-Origin Resource Sharing control)
- **Dotenv** (Process Environment Abstraction)
- **Nodemon** (Automated Development hot-reloading)

---
