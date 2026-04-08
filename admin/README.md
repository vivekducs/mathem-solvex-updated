# 🛠️ Admin Panel – Question Management System

This admin panel is part of the full-stack Question & Answer platform.  
It enables administrators to **manage questions, filters, and content efficiently** with a scalable and production-ready architecture.

---

## 🚀 Features

### 📌 Question Management
- Add new questions with rich text (TinyMCE)
- Edit existing questions
- Delete questions
- Upload images for:
  - Questions
  - Options
  - Explanations

---

### 🔍 Advanced Filtering & Search
- Filter by:
  - Exam (NIMCET, CUET PG, JEE, etc.)
  - Subject
  - Year
- Full-text search support
- Server-side filtering for performance

---

### 📄 Pagination System
- Server-side pagination
- Configurable page size
- **Direct page navigation (Go to page)**
- Previous / Next navigation

---

### 💾 State Persistence (UX Optimization)
- Current page is preserved using `sessionStorage`
- Refresh-safe pagination
- No unnecessary resets after navigation

---

### 🔃 Sorting System
- Sort by:
  - Question Number
  - Exam
  - Subject
  - Year
- Toggle ascending / descending order

---

## 🧠 Architecture Overview

### Frontend Stack
- React (Vite)
- React Router v6
- Context API (Auth)
- TinyMCE Editor
- Lucide Icons
- CSS Modules

---

### Backend Integration
- REST API (Node.js + Express)
- MongoDB (Mongoose)
- Protected routes via JWT authentication

---


---

## 🔗 Routing Design

| Route | Description |
|------|------------|
| `/admin/questions` | Question list page |
| `/admin/questions/add` | Add new question |
| `/admin/questions/edit/:id` | Edit existing question |

---

## ⚙️ Key Design Decisions

### 1. Shared Add/Edit Component
- Single component (`AddQuestionPage`)
- Uses `useParams()` to detect edit mode
- Reduces duplication and improves maintainability

---

### 2. Server-Side Pagination
- Avoids loading large datasets
- Improves performance and scalability
- Supports filters + sorting efficiently

---

### 3. Session-Based State Persistence
- Stores current page in `sessionStorage`
- Ensures seamless navigation experience
- Avoids user frustration after refresh

---

### 4. Separation of Concerns
- **List Page** → Handles pagination & filters
- **Add/Edit Page** → Handles form & submission only

---

## 🧪 Error Handling

- Toast-based notifications (`react-hot-toast`)
- Graceful API failure handling
- Defensive UI rendering (loading states, empty states)

---

## 🔐 Security

- Protected routes using authentication middleware
- API access controlled via JWT
- Admin-only access enforced

---

## 📈 Performance Optimizations

- Debounced search input (`useDebounce`)
- Server-side filtering & sorting
- Minimal re-renders using `useCallback`

---

## 🛠️ Setup Instructions

```bash
# Install dependencies
npm install

# Start development server
npm run dev
