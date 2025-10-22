# 🔥 LeetCode Streak API

A REST API service designed to track and manage LeetCode streaks with timezone awareness and group collaboration features. This project solves the problem of LeetCode's official streak system not accounting for user timezones, which often causes users to lose their streaks unfairly.

## 📖 Overview

**LeetCode Streak API** is an open-source backend service that stores LeetCode user data and maintains a comprehensive history of:
- Daily solving streaks (with timezone support)
- Solved problems history
- User statistics and profiles
- Group challenges with friends

The API fetches official user data directly from LeetCode's GraphQL API and provides enhanced features that the official platform doesn't offer.

### Why This Project?

1. **Timezone Problem**: LeetCode's official streak system doesn't consider user timezones, making it easy to lose streaks even when solving problems daily in your local time.
2. **Group Streaks**: Connect with friends and maintain group streaks together, creating a collaborative competitive environment.
3. **Historical Data**: Keep a permanent record of your solving history and streak progress.

---

## 🚀 Features

- ✅ User authentication via LeetCode username
- ✅ Automatic sync with LeetCode's official API
- ✅ Timezone-aware streak tracking
- ✅ Historical streak data
- ✅ Individual and group statistics
- ✅ Problem submission tracking
- ✅ Group creation and management
- ✅ RESTful API architecture

---

## 🛠️ Tech Stack

- **Framework**: [NestJS](https://nestjs.com/) (Node.js)
- **Language**: TypeScript
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Authentication**: JWT
- **Package Manager**: pnpm
- **Date Handling**: date-fns, date-fns-tz
- **Validation**: class-validator, class-transformer

---

## 📦 Installation

### Prerequisites

- Node.js (v18 or higher)
- PostgreSQL database
- pnpm (recommended) or npm

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/darwingtx/LeetCodeStreak-Backend.git
   cd leetcode-streak-backend
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Configure environment variables**
   
   Create a `.env` file in the root directory:
   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/leetcode_streak"
   JWT_SECRET="your-secret-key"
   PORT=3000
   ```

4. **Run database migrations**
   ```bash
   pnpm prisma migrate dev
   ```

5. **Generate Prisma Client**
   ```bash
   pnpm prisma generate
   ```

---

## 🏃 Running the Application

### Development Mode
```bash
pnpm run start:dev
```

### Production Mode
```bash
pnpm run build
pnpm run start:prod
```

### Debug Mode
```bash
pnpm run start:debug
```

The API will be available at `http://localhost:3000`

---

## 📡 API Endpoints

### Authentication
- `GET /auth/login/:username` - Login/Register with LeetCode username

### User Management
- `GET /user/profile/:id` - Get user profile by username
- `PATCH /user/update/:username` - Update user timezone
  ```json
  {
    "timezone": "America/New_York"
  }
  ```

### Streak Management
- `GET /streak/:id` - Get user streak data
- `PATCH /streak/update/:id` - Update streak (with timezone)
  ```json
  {
    "timezone": "America/New_York"
  }
  ```
- `POST /streak/:id/reset` - Reset user streak
- `PATCH /streak/updateall/:id` - Update all streak data for user
- `POST /streak/updatebd/:id` - Sync streak data from database

### Groups
- `[To be implemented]` - Group creation and management endpoints are in development

### Submissions
- `[To be implemented]` - Submission tracking endpoints are in development

### Statistics
- `[To be implemented]` - Statistics endpoints are in development

---

## 🗃️ Database Schema

The application uses Prisma ORM with the following main models:

- **User**: LeetCode user profiles and statistics
- **UserSubmission**: Individual problem submissions
- **StreakHistory**: Daily streak records
- **Group**: Study/challenge groups
- **UserGroup**: Group membership
- **GroupStreakHistory**: Group streak tracking
- **SyncLog**: API sync logs

For detailed schema, check `/prisma/schema.prisma`

---

## 🧪 Testing

```bash
# Unit tests
pnpm run test

# E2E tests
pnpm run test:e2e

# Test coverage
pnpm run test:cov
```

---

## 🤝 Contributing

We welcome contributions from the community! This is an open-source project and we'd love your help to make it better.

### How to Contribute

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Commit your changes**
   ```bash
   git commit -m 'Add some amazing feature'
   ```
4. **Push to the branch**
   ```bash
   git push origin feature/amazing-feature
   ```
5. **Open a Pull Request**

### Contribution Ideas

- 🐛 Bug fixes
- ✨ New features (submissions tracking, statistics, etc.)
- 📝 Documentation improvements
- 🎨 UI/Frontend development
- 🧪 Test coverage
- 🌐 Internationalization
- ⚡ Performance optimizations

---

## 📋 Roadmap

- [ ] Complete group management functionality
- [ ] Implement submission tracking endpoints
- [ ] Add statistics and analytics endpoints
- [ ] Create scheduled tasks for automatic syncs
- [ ] Build notification system for streak reminders
- [ ] Develop frontend application
- [ ] Add support for more platforms (CodeForces, HackerRank, etc.)
- [ ] Implement achievement/badge system

---

---

## 👥 Community

- **Report bugs**: [GitHub Issues](https://github.com/darwingtx/LeetCodeStreak-Backend/issues)
- **Discussions**: [GitHub Discussions](https://github.com/darwingtx/LeetCodeStreak-Backend/discussions)

---

## 🙏 Acknowledgments

- Built with [NestJS](https://nestjs.com/)
- Data sourced from [LeetCode](https://leetcode.com/)
- Inspired by the need for better streak tracking

---

## 👤 Author

**Darwin Castaño**
- GitHub: [@darwingtx](https://github.com/darwingtx)

---

**Made with ❤️ by developers, for developers**

*Keep your streak alive, no matter your timezone!* 🌍⏰

[![Powered by DartNode](https://dartnode.com/branding/DN-Open-Source-sm.png)](https://dartnode.com "Powered by DartNode - Free VPS for Open Source")
