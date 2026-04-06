# Netlify Deployment Guide for VREZER 2.0

This project has been optimized for **Netlify Serverless** architecture.

## 🚀 One-Click Deployment
1. Connect your repository to Netlify.
2. Netlify will automatically detect the `netlify.toml` settings.
3. **Build settings**:
   - **Build command**: `npm run build`
   - **Publish directory**: `public`
   - **Functions directory**: `netlify/functions`

## 🔑 Required Configuration
You **MUST** add the following environment variable in the Netlify Dashboard (**Site settings > Build & deploy > Environment**):

| Key | Value | Description |
| :--- | :--- | :--- |
| `GEMINI_API_KEY` | `your_api_key_here` | Your Google AI Studio (Gemini) API Key |

## 🛠 Local Development
To test the Netlify environment locally:
1. Install Netlify CLI: `npm install -g netlify-cli`
2. Run development server: `netlify dev`
3. Access the site at `http://localhost:8888`

## 📁 Architecture Note
The `src/` folder and `pom.xml` are part of the original Spring Boot architecture. They are **not used** by Netlify and can be safely ignored or archived. The active code for Netlify resides in `/public` and `/netlify`.
