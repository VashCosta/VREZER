# 🚀 VREZER AI - Resume Analyser & Career Strategist

**VREZER** is a cutting-edge career intelligence workstation that leverages the power of **Google Gemini AI** to transform static resumes into dynamic, data-driven career roadmaps. Designed for the high-velocity Indian IT industry, it provides actionable insights, ATS optimization, and strategic career trajectory mapping.

---

## ✨ Key Features
- **📊 Precision ATS Scoring**: Real-time evaluation of resume effectiveness and keyword richness.
- **🗺️ Career Trajectory Mapping**: Predicts 3-tier career paths (Baseline, Growth, Elite) over 5 years.
- **💡 Skill Gap Analysis**: Identifies critical missing competencies and provides improvement roadmaps.
- **📍 Regional Hub Intelligence**: Automatically maps candidates to the best-fit Indian IT hubs (Bengaluru, Hyderabad, Pune, etc.).
- **🎭 Cinematic Dashboard**: A high-velocity, modern UI with dark mode shifting and premium HDR aesthetics.

---

## 🛠 Tech Stack
- **Backend**: Spring Boot (Java)
- **Frontend/Serverless**: Node.js & Netlify Functions
- **AI Engine**: Google Gemini API (1.5 Flash/Pro)
- **Styling**: Vanilla CSS with modern glassmorphism

---

## 🚀 Deployment & Local Setup

The project is optimized for **Netlify Serverless** architecture, but also includes a **Spring Boot** backend for alternative deployment environments.

### 🌐 Netlify Deployment (Recommended)
1.  **Connect** your repository to Netlify.
2.  **Environment Variables**: Add `GEMINI_API_KEY` in Netlify Dashboard.
3.  **Build Settings**:
    - Build Command: `npm run build`
    - Publish Directory: `public`
    - Functions Directory: `netlify/functions`
4.  **Local Test**: Run `netlify dev` (requires Netlify CLI).

### ☕ Spring Boot Setup
1.  Ensure you have **Java 17+** and **Maven** installed.
2.  Set the environment variable `VONE_CORE_KEY` with your Gemini API Key.
3.  Run the application:
    ```bash
    mvn spring-boot:run
    ```
4.  The server will start on `http://localhost:8085`.

---

## 🔑 Configuration
The application requires a **Google Cloud / AI Studio** API key to function.

| Variable | Description |
| :--- | :--- |
| `GEMINI_API_KEY` | Used by Netlify Functions |
| `VONE_CORE_KEY` | Used by Spring Boot Backend |

---

## 📁 Project Structure
- `/public`: Frontend assets and dashboard UI.
- `/netlify/functions`: Serverless API endpoints for AI analysis.
- `/src`: Original Spring Boot Java source code.
- `pom.xml`: Maven configuration.

---

## 📜 License
Published under the **MIT License**. See `LICENSE` for details.

---

*Built with ❤️ for the next generation of IT professionals.*
