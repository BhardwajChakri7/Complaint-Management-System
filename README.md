# Complaint Care — Complaint Management System

A full-stack web application for managing student complaints in a college environment. Students submit complaints, an ML model classifies them by category and priority, and they are auto-assigned to staff teams.

---

## Project Structure

```
Capstone Project/
├── Capstone_BE/        # Flask REST API (Python)
└── Capstone_FE/        # React frontend (Vite + Tailwind)
```

---

## Tech Stack

| Layer       | Technology                              |
|-------------|------------------------------------------|
| Frontend    | React, Vite, Tailwind CSS                |
| Backend     | Flask, SQLAlchemy, PostgreSQL (Neon)     |
| ML Model    | TF-IDF + SVM (BERT Based Classification) |
| Auth        | JWT                                      |
| Storage     | Cloudinary (attachments)                 |
| Email       | Flask-Mail (Gmail)                       |
| AI Chatbot  | Google Gemini API                        |
| Deployment  | Vercel (FE), Docker (BE)                 |

---

## Features

- Student signup / login with JWT auth
- Submit complaints with title, description, and file attachments
- ML auto-classification of complaints into category and priority
  - Categories: Academic, Technical, Hostel/Mess, Maintenance
  - Priorities: urgent, high, medium, low
  - Method: BERT Based Classification (TF-IDF + SVM)
- Auto-assignment engine — round-robin across Team A / B / C
- Staff dashboard — view, accept, and resolve assigned complaints
- Admin dashboard — full oversight, staff management, reports
- AI chatbot assistant powered by Gemini
- Email notifications on complaint submission and status updates
- PDF report generation
- SLA tracking (48-hour deadline per complaint)

---

## ML Classification

Complaints are classified using a trained TF-IDF + SVM pipeline:

- Input: complaint title + description (combined)
- Output: predicted category + priority
- Training data: `Capstone_BE/trained_models/cmsdata.csv` (1000 samples)
- Models saved in: `Capstone_BE/trained_models/`
- Category accuracy: 100% | Priority accuracy: 90.5%

To retrain:
```bash
cd Capstone_BE
python trained_models/train_bert.py
```

---

## Getting Started

### Backend

```bash
cd Capstone_BE
pip install -r requirements.txt
python server.py
```

Runs on `http://localhost:6969`

### Frontend

```bash
cd Capstone_FE
npm install
npm run dev
```

Runs on `http://localhost:5173`

---

## Environment Variables

### Capstone_BE/.env
```
NEON_URI=<postgresql connection string>
JWT_TOKEN=<secret key>
GEMINI_API=<google gemini api key>
CLOUD_NAME=<cloudinary cloud name>
CLOUD_API_KEY=<cloudinary api key>
CLOUD_API_SECRET=<cloudinary api secret>
EMAIL_USER=<gmail address>
EMAIL_PASS=<gmail app password>
```

### Capstone_FE/.env
```
VITE_API_URL=http://localhost:6969
```

---

## API Overview

| Method | Endpoint                        | Description                  |
|--------|---------------------------------|------------------------------|
| POST   | /api/auth/signup                | Student registration         |
| POST   | /api/auth/login                 | Student login                |
| POST   | /api/complaints/submit          | Submit a complaint           |
| GET    | /api/complaints/my              | Get student's complaints     |
| POST   | /api/ml/classify                | Classify complaint text      |
| GET    | /api/ml/status                  | ML model status              |
| GET    | /api/staff/complaints           | Staff complaint queue        |
| PUT    | /api/staff/complaints/:id       | Update complaint status      |
| GET    | /api/admin/complaints           | Admin — all complaints       |
| GET    | /api/admin/staff                | Admin — staff management     |
| POST   | /api/chatbot/chat               | AI chatbot                   |

---

## Roles

- **Student** — submit and track complaints
- **Staff** — view assigned complaints, update status
- **Admin** — full system access, reports, staff management
