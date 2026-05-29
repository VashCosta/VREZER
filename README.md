# VREZER - AI Resume Analyser & Career Intelligence

VREZER is an AI-powered Spring Boot application that performs strategic career intelligence analysis based on user uploaded resumes. Built using the Gemini AI Engine to forecast career trajectory, calculate ATS scores, and perform comprehensive SWOT analysis for Indian IT industry standard roles.

## Features
- **Java Spring Boot Backend**: Robust backend using Spring Boot for REST APIs and file parsing.
- **Advanced Resume Parsing**: Uses Apache PDFBox to read resume content accurately.
- **Gemini AI Integration**: Communicates directly with Google's Gemini Models to analyze standard resumes and score against market standards.
- **Modern User Interface**: Fully responsive, dark-mode dynamic frontend served directly via Spring Boot.

## Prerequisites
- Java 17 or later
- Maven 3.6+

## Setup Instructions

1. **Clone the repository**:
   ```bash
   git clone <repository_url>
   cd ResumeAnalyser
   ```

2. **Configure API Key**:
   The AI engine requires a Google Gemini API Key. Set the `VONE_CORE_KEY` environment variable before starting the server.

   **On Windows (PowerShell):**
   ```powershell
   $env:VONE_CORE_KEY="your-gemini-api-key-here"
   ```

   **On Windows (Command Prompt):**
   ```cmd
   set VONE_CORE_KEY="your-gemini-api-key-here"
   ```

   **On macOS/Linux:**
   ```bash
   export VONE_CORE_KEY="your-gemini-api-key-here"
   ```

3. **Build and Run**:
   Compile the Java application and run it via Maven.
   ```bash
   mvn clean spring-boot:run
   ```
   *Alternatively, run the `Application.java` file directly from your IDE.*

4. **Access the application**:
   Open a web browser and navigate to [http://localhost:8085](http://localhost:8085).
