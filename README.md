# HumanHelpBridge 🛡️

**HumanHelpBridge** is a Gemini-powered universal bridge that converts messy, unstructured human inputs (voice transcripts, medical logs, disaster reports) into structured, verifiable, life-saving JSON actions.

Built for the **PromptWars Hackathon**, this application leverages the power of Gemini 3 to provide real-time extraction and protocol generation for high-stakes human help operations.

## 🚀 Features

- **Chaos Input Bridge:** Paste unstructured text or logs for immediate analysis.
- **Voice Protocol:** Real-time speech-to-text recognition using the Web Speech API.
- **Structured Action Dashboard:** Automatic extraction of incident IDs, domains, urgency levels, and specific action payloads.
- **Incident History:** Persistent, real-time logging of all processed bridges via Google Firestore.
- **Secure RBAC:** Role-Based Access Control ensuring user data privacy and admin oversight.
- **Thematic UI:** A professional "Technical Dashboard" aesthetic with dynamic hero images and motion animations.

## 🛠️ Tech Stack

- **Frontend:** React 19, TypeScript, Tailwind CSS, Motion, Lucide Icons.
- **AI Engine:** Google Gemini 3 (Flash) via `@google/genai`.
- **Backend:** Google Firebase (Authentication & Firestore).
- **Deployment:** Google Cloud Run.

## 📦 Setup & Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/venkatamunireddy/Prompwars-hackathon.git
   cd Prompwars-hackathon
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Create a `.env` file and add your Gemini API Key:
   ```env
   GEMINI_API_KEY=your_api_key_here
   ```

4. **Firebase Configuration:**
   Ensure `firebase-applet-config.json` is present in the root directory with your Firebase project credentials.

5. **Run Development Server:**
   ```bash
   npm run dev
   ```

## 🛡️ Security Rules

The application uses strict Firestore Security Rules to prevent unauthorized access. Only the document owner and the designated admin (`venkat16333@gmail.com`) can read or modify incident records.

## 📄 License

This project is licensed under the Apache-2.0 License.
