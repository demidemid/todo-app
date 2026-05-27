# 📝 Todo App

A modern offline-first todo application built with React, TypeScript, Vite, and Firebase.

## Features

- ✅ **Offline-First**: Works seamlessly offline with automatic sync when online
- 🔐 **Firebase Authentication**: Secure login with email/password
- ☁️ **Real-time Sync**: Automatic synchronization with Firestore
- 📱 **Responsive Design**: Works great on desktop and mobile
- ⚡ **Fast & Modern**: Built with Vite and React for optimal performance
- 🎨 **Beautiful UI**: Clean and intuitive user interface

## Tech Stack

- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite
- **Backend**: Firebase (Auth + Firestore)
- **Styling**: CSS3

## Prerequisites

- Node.js 16+ and npm
- Firebase account (free tier available at [firebase.google.com](https://firebase.google.com))

## Setup Instructions

### 1. Clone the repository

```bash
git clone <repository-url>
cd todo-app
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up Firebase project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a new project (or use existing)
3. Enable Authentication (Email/Password)
4. Create a Firestore Database
5. Copy your Firebase config

Important for sign-up/login:
- Open Firebase Console -> Authentication -> Sign-in method
- Enable provider `Email/Password`
- (Optional) Add your domain in Authentication -> Settings -> Authorized domains for production

### 4. Configure environment variables

1. Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

2. Fill in your Firebase config values:

```
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### 5. Set up Firestore rules

Add these security rules to your Firestore:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /todos/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
      allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
    }
  }
}
```

## Running the App

### Development mode

```bash
npm run dev
```

The app will start at `http://localhost:5173`

### Build for production

```bash
npm run build
```

### Preview production build

```bash
npm run preview
```

## Usage

1. **Sign Up**: Create an account with your email and password
2. **Add Todos**: Type in the input field and click "Add"
3. **Check Off**: Click the checkbox to mark todos as completed
4. **Delete**: Click "Delete" to remove a todo
5. **Offline**: All changes are saved locally and synced when online
6. **Logout**: Click logout to sign out

## Project Structure

```
src/
├── components/
│   ├── Login.tsx          # Authentication component
│   ├── Login.css
│   ├── TodoList.tsx       # Todo list component
│   └── TodoList.css
├── hooks/
│   ├── useTodos.ts        # Custom hook for todo operations
│   └── useComments.ts     # Custom hook for todo comments
├── types/
│   └── todo.ts            # TypeScript types
├── firebase.ts            # Firebase configuration
├── App.tsx                # Main app component
├── App.css
├── main.tsx
└── index.css
```

## Firestore Schema

```javascript
// todos collection
{
  userId: string,          // User UID (Firebase Auth)
  title: string,           // Todo title
  description?: string,    // Optional description
  comments?: [             // Optional comments stored inside todo doc
    {
      id: string,
      todoId: string,
      userId: string,
      userEmail?: string,
      text: string,
      createdAt: Timestamp
    }
  ],
  completed: boolean,      // Completion status
  createdAt: Timestamp,    // Creation date
  updatedAt: Timestamp     // Last update date
}
```

Comments are stored in the todo document itself (field comments) so they follow the same access rules as todos.

## Offline Functionality

This app uses Firestore's built-in offline persistence:
- Changes made offline are automatically stored in IndexedDB
- When connection is restored, changes are synced to Firestore
- No additional setup required - it works out of the box!

## Security

- Firebase Authentication protects user accounts
- Firestore rules ensure users can only access their own todos
- All data is encrypted in transit and at rest

## Deployment

### Deploy to GitHub Pages

1. Push this repository to GitHub.
2. In repository settings, open **Pages** and set **Source** to **GitHub Actions**.
3. In repository settings, open **Secrets and variables -> Actions** and add these repository variables (you can still store them as Actions secrets for convenience):

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

Note: these `VITE_FIREBASE_*` values are bundled into the client build and are visible in the deployed JavaScript. They are configuration values, not confidential server secrets. Security must rely on Firebase Authentication and Firestore Security Rules.

4. Push to `main` (or run the workflow manually in Actions).
5. Deployment workflow: `.github/workflows/deploy-pages.yml`.
6. Your site URL will be available in the workflow output (typically `https://<user>.github.io/<repo>/`).

### Deploy to Firebase Hosting

1. Install Firebase CLI:
```bash
npm install -g firebase-tools
```

2. Build the app:
```bash
npm run build
```

3. Initialize Firebase:
```bash
firebase init hosting
```

4. Deploy:
```bash
firebase deploy
```

## License

This project is open source and available under the MIT License.

## Support

For issues or questions, please open an issue on GitHub.

Happy organizing! 📝✨


The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
