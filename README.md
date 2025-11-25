# Code Editor – Realtime Collaborative Editor, Compiler & Chat

A powerful cloud-based **real-time collaborative code editor** with multi-language execution, live chat, real-time file management, audio communication, and AI integration.  
Made by **Shahanur Islam Shagor**.

---

## 🌐 Online Browser Version

You can use the live online version here:

👉 **https://code-editor.ru**

---

## 🚀 Features

### 🔥 Real-time Collaboration
- Socket-powered **room-based collaboration**
- Live **synced code** and file changes
- Real-time **chat system**
- Multi-user editing

### ⚙️ Multi-language Code Execution
- Supports **all languages** via **Piston API**
- Python executed via:  
  `cloud.code-editor.ru`
- Python fully supports:
  - Installed modules
  - Chart & graph generation

### 🤖 AI Integration (ChatGPT / Deepseek / Gemini)
Add your API keys in:

```

src/api/chatgpt.ts
src/api/deepseek.ts
src/api/gemini.ts

```

### 📁 Real-time File Management
- Create / delete / rename files & folders
- Syncs instantly for all users online

### 🖥️ Terminal Management
Customizable terminal backend.  
Modify:

```

src/api/codeeditorcloud.ts
src/components/sidebar/sidebar.tsx

```

### 🎙️ Live Audio Communication
WebRTC-powered voice chat:

- One-to-many
- Many-to-many  
File location:

```

src/utils/webrtc.ts

```

### 🗺️ Custom Key Mapping
You can customize shortcut mapping in:

```

src/utils/CustomMapping.ts

````

---

## 🛠️ Technology Stack

### Frontend
- React.js + Vite
- TypeScript
- Monaco Editor
- Socket.io client
- WebRTC

### Backend
- Node.js
- PHP (execution + terminal)
- Piston API
- Custom Python execution backend

---

## 📦 Installation

Clone repository:

```bash
git clone https://github.com/smshagor-dev/code-editor.git
cd code-editor
````

Install dependencies:

```bash
npm install
# or
yarn install
```

Run:

```bash
npm run dev
# or
yarn dev
```

---

## 🔧 Environment Setup 
If you have backend then change url or use my backend

Create `.env` file:

```
VITE_BACKEND_URL=https://cloud.coderpoint.ru
# VITE_BACKEND_URL=http://localhost:3000
```

---

## 🤖 AI Setup

Set your AI API keys:

```
src/api/chatgpt.ts
src/api/deepseek.ts
src/api/gemini.ts
```

---

## 🐍 Python Execution Backend

Default Python backend:

```
cloud.code-editor.ru
```

If you want to use your **own backend**, update:

```
src/api/codeeditorcloud.ts
src/context/RunCodeContext.tsx
```

---

## 🖥️ Terminal Configuration

To fully customize terminal behavior:

```
src/api/codeeditorcloud.ts
src/components/sidebar/sidebar.tsx
```

---

## 🎙️ WebRTC Audio Communication

File:

```
src/utils/webrtc.ts
```

Supports:

* Room-based audio chat
* One-to-many + many-to-many communication

---

## 🗺️ Custom Shortcut Mapping

Update:

```
src/utils/CustomMapping.ts
```

---

## 📞 Backend / Database Support

If you need:

* Custom backend
* Database setup
* Python execution server
  You can contact me:

👉 **[https://smshagor.com/page/contact](https://smshagor.com/page/contact)**

---

## 👨‍💻 Developer

**Shahanur Islam Shagor**
GitHub: [https://github.com/smshagor-dev](https://github.com/smshagor-dev)

```

---

If you want, I can also generate:

✅ `CONTRIBUTING.md`  
✅ `LICENSE`  
✅ `API Documentation`  
✅ A professional GitHub banner  

Just tell me!
```
