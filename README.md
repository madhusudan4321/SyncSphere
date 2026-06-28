# SyncSphere 🌐

A full-stack social media application inspired by Instagram, built with vanilla HTML/CSS/JavaScript on the frontend and Node.js/Express/MongoDB on the backend.

## 🌍 Live Demo
[![Live Demo](https://img.shields.io/badge/Live-Demo-blue)](https://syncsphere-frontend.onrender.com/)

## Steps To Run k8s deployed web app:
- Turn on docker
- run command: minikube start
- Then run this one : minikube service ingress-nginx-controller -n ingress-nginx --url
- you will get the url right now that url is without hostname..!

---

## 📱 Features

### Authentication
- User registration with username, email and password
- Secure login with JWT token authentication
- Forgot password with OTP verification via email
- Auto login on page refresh

### Feed & Posts
- Instagram-style photo feed
- Upload photos with captions
- Like and unlike posts
- View posts from followed users
- Pull to refresh feed

### Profile
- Personal profile with post grid
- Edit profile (name, bio, website)
- Followers and following count
- Public and private account toggle
- Hamburger menu with settings

### Follow System
- Follow and unfollow users
- Follow requests for private accounts
- Accept or decline follow requests
- Follow request notifications on profile

### Messaging
- Real-time chat between users
- Message request system
- Accept or decline message requests
- Chat threads list
- Auto reply simulation

### Search
- Search users by username or name
- View any user's profile from search

### Privacy & Safety
- Private account mode
- Block and unblock users
- Report users with reason selection
- Blocked users management list
- Message requests from non-followers

### UI/UX
- Instagram-inspired design
- Fully responsive for mobile and desktop
- Pull to refresh on all tabs
- Auto refresh every 60 seconds
- Bottom navigation bar
- Toast notifications
- Loading spinners

---

## 🛠️ Tech Stack

### Frontend
- HTML5
- CSS3
- Vanilla JavaScript
- Google Fonts (Playfair Display + DM Sans)

### Backend
- Node.js
- Express.js
- MongoDB (Atlas)
- Mongoose ODM

### Packages Used
| Package | Purpose |
|---------|---------|
| express | Web framework |
| mongoose | MongoDB ODM |
| bcryptjs | Password hashing |
| jsonwebtoken | JWT authentication |
| multer | File uploads |
| cors | Cross origin requests |
| dotenv | Environment variables |
| nodemailer | Email sending |
| axios | HTTP requests |
| nodemon | Development server |

### Deployment
- Frontend: Render (Static Site)
- Backend: Render (Web Service)
- Database: MongoDB Atlas (Cloud)
- Email: Brevo API

---

## 📁 Project Structure
SyncSphere/
├── backend/
│   ├── config/
│   │   └── db.js                 # MongoDB connection
│   ├── middleware/
│   │   └── auth.js               # JWT middleware
│   ├── models/
│   │   ├── User.js               # User schema
│   │   ├── Post.js               # Post schema
│   │   ├── Message.js            # Message schema
│   │   └── MessageRequest.js     # Message request schema
│   ├── routes/
│   │   ├── auth.js               # Login & register
│   │   ├── users.js              # User operations
│   │   ├── posts.js              # Post operations
│   │   ├── messages.js           # Chat & requests
│   │   └── forgot.js             # Password reset OTP
│   ├── uploads/                  # Uploaded images
│   ├── .env                      # Environment variables
│   ├── .env.example              # Environment template
│   ├── package.json
│   └── server.js                 # Entry point
│
└── frontend/
├── css/
│   └── style.css             # All styles
├── js/
│   ├── api.js                # API helper & utilities
│   ├── auth.js               # Login & register logic
│   ├── feed.js               # Feed & post upload
│   ├── search.js             # User search
│   ├── chat.js               # Messaging system
│   ├── profile.js            # Profile management
│   ├── refresh.js            # Pull to refresh
│   └── forgot.js             # Forgot password flow
├── logo.png                  # App logo
└── index.html                # Main HTML file

---

## 🚀 Getting Started

### Prerequisites
- Node.js v16 or above
- MongoDB (local or Atlas)
- Git

### Installation

**1. Clone the repository**
```bash
git clone https://github.com/yourusername/SyncSphere.git
cd SyncSphere
```

**2. Install backend dependencies**
```bash
cd backend
npm install
```

**3. Create `.env` file in backend folder**

**4. Start the backend**
```bash
npm run dev
```

**5. Open the frontend**
- Open `frontend/index.html` in your browser
- Or use VS Code Live Server extension

---

## 🔑 Environment Variables

| Variable | Description |
|----------|-------------|
| MONGO_URI | MongoDB connection string |
| JWT_SECRET | Secret key for JWT tokens |
| PORT | Backend server port (default 5000) |
| EMAIL_USER | Gmail address for sending emails |
| BREVO_API_KEY | Brevo API key for OTP emails |

---

## 📡 API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Register new user |
| POST | /api/auth/login | Login user |
| POST | /api/forgot/send-otp | Send OTP to email |
| POST | /api/forgot/verify-otp | Verify OTP |
| POST | /api/forgot/reset-password | Reset password |

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/users/search?q= | Search users |
| GET | /api/users/:username | Get user profile |
| PUT | /api/users/profile/update | Update profile |
| PUT | /api/users/privacy/toggle | Toggle private/public |
| POST | /api/users/:id/follow | Follow or unfollow |
| POST | /api/users/:id/block | Block user |
| POST | /api/users/:id/unblock | Unblock user |
| POST | /api/users/:id/report | Report user |
| GET | /api/users/blocked/list | Get blocked users |
| GET | /api/users/follow-requests/list | Get follow requests |
| PUT | /api/users/follow-requests/:id/accept | Accept follow request |
| PUT | /api/users/follow-requests/:id/decline | Decline follow request |

### Posts
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/posts/feed | Get feed posts |
| POST | /api/posts | Create new post |
| POST | /api/posts/:id/like | Like or unlike post |
| DELETE | /api/posts/:id | Delete post |

### Messages
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/messages/threads | Get chat threads |
| GET | /api/messages/requests | Get message requests |
| GET | /api/messages/:userId | Get conversation |
| POST | /api/messages | Send message |
| POST | /api/messages/request | Send message request |
| PUT | /api/messages/request/:id/accept | Accept message request |
| PUT | /api/messages/request/:id/decline | Decline message request |

---

## 🔒 Security Features
- Passwords hashed using bcryptjs
- JWT token authentication on all protected routes
- Environment variables for all secrets
- CORS configured for frontend domain
- Private account system
- Block and report functionality
- Message request system

---

## 📸 Screenshots

> Add your screenshots here

---

## 🗺️ Roadmap

- [ ] Notification system
- [ ] Post comments
- [ ] Stories feature
- [ ] Login with username
- [ ] Online/offline status
- [ ] Read receipts in chat
- [ ] Typing indicator
- [ ] Save/bookmark posts
- [ ] Explore page
- [ ] Hashtag support
- [ ] Multiple images per post
- [ ] Email verification on signup
- [ ] Change password from profile

---

## 🤝 Contributing

Pull requests are welcome. For major changes please open an issue first to discuss what you would like to change.

---

## 📄 License

This project is licensed under the MIT License.

---

## 👨‍💻 Developer

Built by **Madhusudan Yadav**

- GitHub: [@madhusudan4321](https://github.com/madhusudan4321)

---

> SyncSphere — Connect, Share, Sync 🌐

