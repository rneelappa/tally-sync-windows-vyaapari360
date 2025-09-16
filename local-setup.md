# 🏠 Local Development Setup

## Overview
This guide sets up everything locally for development and testing before deploying to Railway.

## 🗄️ Local Database Options

### Option 1: PostgreSQL (Recommended)
1. **Install PostgreSQL**:
   - Download from: https://www.postgresql.org/download/windows/
   - Install with default settings
   - Remember the password you set for 'postgres' user

2. **Create Database**:
   ```sql
   CREATE DATABASE tally_local;
   ```

### Option 2: SQLite (Simpler for testing)
- No installation required
- File-based database
- Good for development/testing

## 🚀 Quick Setup Commands

### For PostgreSQL:
```bash
# Install PostgreSQL and create database
# Then run:
npm install pg
```

### For SQLite:
```bash
# Install SQLite
npm install sqlite3
```

## 📁 Local Configuration Files
- `local-config.json` - Local database settings
- `local-server.js` - Local server with database integration
- `local-database.js` - Database connection and operations

## 🔧 Environment Setup
1. Copy `.env.example` to `.env.local`
2. Update database connection settings
3. Run database schema creation
4. Start local server
5. Test Tally integration

## 📊 Testing Flow
1. Tally (localhost:9000) → Local Server (localhost:3000) → Local Database
2. All data processing happens locally
3. Easy debugging and development
4. When ready, deploy to Railway with same code
