# 🎯 HireLens AI - Next-Gen AI Recruitment Platform

HireLens AI is a B2B SaaS recruitment platform that helps recruiters hire candidates based on **deep semantic understanding** instead of traditional keyword matching. The platform combines intelligent resume screening, AI-powered candidate evaluation, interactive visual analytics, and automated recruiter workflows into one seamless experience.

---

# 🚀 The Problem

Traditional ATS platforms suffer from several limitations:

- **High AI Costs** – Every uploaded resume is sent to an LLM, significantly increasing inference costs.
- **Keyword-Based Screening** – Good candidates are rejected simply because they don't use exact keywords.
- **Manual Hiring Workflow** – Recruiters spend hours reviewing resumes and writing repetitive emails.
- **Poor Candidate Comparison** – Reading hundreds of resumes individually makes ranking candidates difficult.

---

# 💡 Our Solution

## 🛡️ Smart Python Gatekeeper

Before any AI call is made, HireLens AI filters resumes locally using Python.

- Duplicate Resume Detection (SHA-256)
- Invalid/Corrupt PDF Detection
- Multi-page Resume Filtering
- Lightweight ATS Similarity Score (TF-IDF)

This reduces unnecessary AI processing and saves approximately **40% of LLM token costs**.

---

## 🧠 Deep Semantic AI Analysis

Instead of matching keywords, HireLens AI evaluates resumes across five semantic dimensions:

- Technical Depth
- Project Impact
- Career Progression
- Resume Quality
- Risk Assessment

Powered by:

- LangChain
- Groq API
- Llama 3.1
- Structured Pydantic Outputs

---

## 📊 Visual Decision Dashboard

Recruiters shouldn't have to read hundreds of PDFs.

HireLens AI provides an interactive analytics dashboard where recruiters can instantly compare candidates.

Features include:

- Interactive Candidate Leaderboard
- AI Score Comparison Charts
- Candidate Ranking
- One-click navigation from chart to candidate report
- Visual comparison instead of manual resume reading

---

## 📧 AI-Powered Recruiter Outreach

Once decisions are made, recruiters can:

- Generate personalized interview emails
- Generate personalized rejection emails
- Edit before sending
- Send emails directly via SMTP

---

# 📸 Application Preview

## 1. Authentication

Premium split-screen authentication experience.

```text
assets/login.png
```

---

## 2. Dashboard

Recruiters configure job context and upload resumes.

The Python Gatekeeper validates every resume before AI processing.

```text
assets/dashboard.png
```

---

## 3. AI Audit Dashboard

Interactive candidate comparison dashboard featuring:

- Leaderboard
- AI reasoning
- Semantic analysis
- Graphs & Charts
- Approve / Reject workflow

```text
assets/audit.png
```

---

# ⚡ Core Features

- JWT Authentication
- Resume Upload
- Job Context Management
- Smart Python Gatekeeper
- Deep Semantic AI Resume Analysis
- Interactive Candidate Leaderboard
- Visual Graph Dashboard
- AI Candidate Ranking
- Automated Interview Emails
- Automated Rejection Emails
- Real-time Processing
- Responsive Dashboard

---

# 🛠 Tech Stack

## Backend

- FastAPI
- Python
- PostgreSQL
- SQLAlchemy
- Alembic
- LangChain
- Groq API
- Llama 3.1
- Pydantic
- PyMuPDF
- Scikit-learn
- JWT Authentication

---

## Frontend

- React
- Vite
- Tailwind CSS
- Recharts
- React Router
- Axios

---

# 🏗 System Workflow

## Step 1 — Resume Intake

Recruiters upload one or multiple resumes.

↓

## Step 2 — Python Gatekeeper

Every resume passes through local validation.

- Duplicate Detection
- Corrupt PDF Detection
- Page Count Validation
- TF-IDF Similarity Score

↓

## Step 3 — AI Semantic Analysis

Validated resumes are processed using LangChain and Groq.

The AI evaluates candidates on five semantic dimensions.

↓

## Step 4 — Candidate Ranking

Backend calculates weighted scores and assigns:

- STRONG_FIT
- MAYBE
- NO

↓

## Step 5 — Visual Dashboard

Recruiters compare candidates using:

- Leaderboard
- Charts
- AI Reasoning
- Candidate Cards

↓

## Step 6 — Recruiter Decision

Recruiter can:

- Approve
- Reject
- Shortlist

↓

## Step 7 — AI Email Generation

Automatically generates personalized emails and sends them via SMTP.

---

# ⚙ Installation

## Backend

```bash
cd backend

python -m venv venv

# Windows
venv\Scripts\activate

# Linux / macOS
source venv/bin/activate

pip install -r requirements.txt

alembic upgrade head

uvicorn app.main:app --reload
```

Backend runs at:

```
http://localhost:8000
```

Swagger:

```
http://localhost:8000/docs
```

---

## Frontend

```bash
cd frontend

npm install

npm run dev
```

Frontend runs at:

```
http://localhost:5173
```

---

# 🔑 Environment Variables

```env
DATABASE_URL=
SECRET_KEY=
GROQ_API_KEY=

SMTP_SERVER=
SMTP_PORT=
SMTP_USERNAME=
SMTP_PASSWORD=

FRONTEND_URL=
COOKIE_DOMAIN=
```

---

# 🧪 Running Tests

```bash
cd backend

pytest tests -v
```

---

# 📂 Project Structure

```text
hirelens-ai
│
│── backend/
│   ├── app/
│   |   ├── ai/
│   |   ├── api/
│   |   ├── core/
│   |   ├── models/
│   |   |── schemas/
│   |   ├── services/
│   |   └── main.py
│   |
|   ├── tests/
|   |── alembic/
│
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   ├── components/
│   │   ├── context/
│   │   ├── pages/
│   │   ├── App.jsx
│   │   |── main.jsx
│   │
│   ├── package.json
│   └── vite.config.js
│
├── README.md
```

---

# 🎯 Why HireLens AI?

Unlike traditional ATS systems that depend on keyword matching, HireLens AI understands resumes through **deep semantic analysis**. Combined with intelligent preprocessing, visual analytics, AI-powered ranking, and automated recruiter communication, it enables recruiters to make faster, smarter, and more accurate hiring decisions.

