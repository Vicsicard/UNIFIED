# **📄 Product Requirements Document (PRD)**

## **Project: Self Cast Studios – AI Voice Interview System**

---

## **🧠 Project Overview**

The goal is to replace the current 60-minute Zoom-based brand storytelling workshop with an intelligent AI-powered voice interviewer. This system will use Vapi.ai to conduct phone-based interviews, capture structured transcript data, and automatically route responses through the existing Self Cast Studios content pipeline.

To streamline the entire pipeline, this PRD also outlines the unification of Apps 1 (Transcript Builder), 2 (Style Profiler), and 3 (Content Generator Suite) into a single backend hosted on Render.

---

## **✅ Objectives**

* Enable clients to complete their onboarding interview via phone, 24/7  
* Automate transcription, content extraction, and content generation  
* Eliminate the need for manual interviews, Zoom calls, or human scheduling  
* Maintain emotional depth and narrative integrity through GPT-4-driven prompts  
* Unify all app workflows under one modular, scalable backend

---

## **📞 Core User Flow**

1. **Client receives or initiates a phone call** to the Self Cast AI Interviewer  
2. **Vapi.ai** handles voice input/output, speaking questions and transcribing answers  
3. **GPT-4** dynamically manages the question script, including follow-ups  
4. **Call concludes**, and Vapi sends the full transcript \+ metadata to a unified backend hosted on **Render**  
5. **Backend** triggers internal services:  
   * Transcript Builder  
   * Style Profiler  
   * Content Generator Suite  
6. **Final output** (bio, quote cards, blogs, social posts) saved to MongoDB  
7. (Optional) Review/approval in a web dashboard

---

## **🧱 Unified Architecture Overview**

### **Application Structure**

self-cast-studios/  
├── api/                      \# Main API endpoints  
│   ├── routes/  
│   │   ├── interviews.js     \# Interview management endpoints  
│   │   ├── transcripts.js    \# Transcript processing endpoints  
│   │   ├── profiles.js       \# Style profile endpoints  
│   │   └── content.js        \# Content generation endpoints  
│   └── webhooks/  
│       └── vapi.js           \# Vapi.ai webhook handler  
├── services/  
│   ├── vapi/                 \# Vapi.ai integration service  
│   ├── transcript/           \# Transcript processing (from App 1\)  
│   ├── style/                \# Style profiling (from App 2\)  
│   └── content/              \# Content generation (from App 3\)  
├── models/                   \# Database models  
├── utils/                    \# Shared utilities  
└── config/                   \# Configuration files

### **Data Flow**

Two entry points (upload or phone) both converge into the same unified processing pipeline:

* Traditional: Upload → Transcribe → Chunk → Style → Content  
* AI Voice: Call → Transcribe (via Vapi) → Chunk → Style → Content

---

## **⚙️ Tech Stack**

| Component | Tool | Purpose |
| ----- | ----- | ----- |
| Voice AI | Vapi.ai | Real-time phone-based voice interaction |
| LLM | OpenAI GPT-4 | Interview logic, follow-ups, summarization |
| TTS/STT | Built-in (Vapi) | Speaks questions, transcribes responses |
| Backend API | Node.js on Render | Unified microservices and API routes |
| Database | MongoDB Atlas | Stores transcripts, profiles, content |
| File Storage | Render disk/S3 | Audio and markdown file storage |
| Optional UI | Next.js (Render) | Admin interface for reviewing content |

---

## **🔧 Functional Requirements**

### **Vapi.ai Voice Interview Service**

* Phone call handling (inbound or outbound)  
* Uses GPT-4 with dynamic prompt flow  
* Sends transcript \+ metadata to webhook  
* Tracks session progress

### **Transcript Processing Service (App 1\)**

* Accepts uploads or Vapi transcripts  
* Chunks data into Q\&A format  
* Generates chunk metadata

### **Style Profiling Service (App 2\)**

* Analyzes chunks for tone, values, themes, emotional tone, and relatability  
* Outputs `style_profile.md`

### **Content Generation Service (App 3\)**

* Generates:  
  * Bio/About section  
  * Brand Quotes  
  * Blog Content  
  * Social Media Posts (LinkedIn, X, IG, FB)  
* Saves all outputs to MongoDB under `content_drafts`

### **Unified API Layer**

* RESTful endpoints for all internal services  
* Webhook receiver for Vapi callbacks  
* Status tracking and response handling

### **Database Schema (MongoDB)**

Collections:

* `interviews`  
* `transcripts`  
* `profiles`  
* `content`  
* `clients`

---

## **🧪 Non-Functional Requirements**

* Uptime: 99.9% on Render  
* Security: Recorded calls stored securely  
* TTL: Indefinite data retention unless removed  
* Rate Limits: Monitor OpenAI API usage  
* Voice Tone: Warm, human-like TTS (custom voice optional)

---

## **📈 KPIs**

* % of users who complete onboarding without human interaction  
* Time from call completion to content availability  
* Transcript accuracy vs. true response  
* Quality rating of generated content

---

## **🗓️ Implementation Plan**

### **Phase 1: Core Integration**

* Set up unified repo structure  
* Migrate logic from Apps 1, 2, 3 into services/  
* Create REST API endpoints and models

### **Phase 2: Voice Integration**

* Configure Vapi agent and prompt  
* Implement `/webhooks/vapi.js` endpoint  
* Route data into processing pipeline

### **Phase 3: Workflow Optimization**

* Add async processing and error recovery  
* Central logging, analytics  
* Retry logic and fallback support

### **Phase 4: Admin Dashboard (Optional)**

* Content review and approval UI  
* Session management  
* User login and roles

---

## **🧩 Deliverables**

* Unified backend app hosted on Render  
* Vapi-configured AI phone interviewer  
* MongoDB-backed transcript and content storage  
* Automation for Apps 1–3 logic  
* (Optional) Admin dashboard for content approval

