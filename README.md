# Ikonex Academy - School Management System

Ikonex Academy is a modern, secure, and feature-rich School Management System (SMS) designed to streamline academic operations. Built with a sleek, minimalist **Slate-Grey** visual style, the platform allows administrators to manage class streams, students, curriculum lists, scoring grids, and automated report card calculations.

---

## Key Features

1. **Academic Dashboard**
   - Live KPI metric monitors tracking student enrollment, active class streams, course catalogs, pass rates, and academy-wide mean scores.
   - Stream Performance analysis charts with real-time progress indicators.
   - Academic leaderboard displaying top-performing students.

2. **Responsive Layout**
   - Adaptive design configured for desktops, tablets, and mobile phones.
   - Interactive sliding sidebar navigation menu triggered by a mobile burger button.

3. **Secure Authentication**
   - High-performance glassmorphic Login screen featuring customized, floating, school-themed background particles.
   - Stateful session management utilizing **Firebase Authentication** on the client side.
   - Enterprise-grade API protection on the Express server using the **Firebase Admin SDK** to verify JWT Bearer ID tokens.

4. **Class Streams & Roster**
   - Organize and assign class streams, room configurations, and designated class teachers.
   - Register, update, and manage student enrollment folders.

5. **Curriculum & Subject Catalog**
   - Map curriculum subjects to departments and assign them to specific class streams.

6. **Scoring Grid (Gradebook)**
   - Enter Continuous Assessment (CA, max 30) and Final Exam (max 70) scores.
   - Batch input operations for fast grading.

7. **Rankings Engine**
   - Configurable grade bands and remark boundaries.
   - Automated dense ranking calculations to determine stream-wise positions.
   - PDF report card downloads with grade breakdowns and registrar signatures.

---

## Technology Stack

- **Frontend:** React 19, TypeScript, Vite 6, Tailwind CSS v4, Lucide Icons
- **Backend:** Node.js, Express, Firebase Admin SDK
- **Database:** PostgreSQL (Neon DB relational mapping)
- **Auth Provider:** Firebase Authentication
