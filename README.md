# ANZAC Management System

A comprehensive military unit management system built for Arma Reforger, designed to streamline personnel management, training operations, qualifications tracking, and event scheduling for military simulation units.

## Features

### Personnel Management
- **Personnel Roster**: Track unit members with detailed profiles including callsigns, ranks, contact information, and service status
- **Rank System**: Military rank hierarchy with promotion tracking and history
- **Status Tracking**: Monitor personnel status (Active, Inactive, Leave, Discharged)
- **Personnel Qualifications**: Track awarded qualifications with expiry dates and certification history

### Training & Qualifications
- **Schools System**: Organize qualifications into training schools with assigned instructors
- **Qualification Management**: Create and manage military qualifications with school assignments
- **Qualification Matrix**: Visual overview of personnel qualifications across the unit
- **Instructor Assignments**: Assign system users as instructors to specific schools

### Event & Calendar Management
- **Event Scheduling**: Schedule training sessions, operations, and unit events
- **Calendar View**: Week and month views of scheduled events
- **Event Types**: Categorize events (training, operations, meetings) with color coding
- **Server Management**: Track which server hosts each event
- **Participant Tracking**: Manage event enrollments and attendance
- **Booking Codes**: Auto-generated codes for event coordination

### User & Role Management
- **Role-Based Access Control**: Four user roles with different permission levels
  - **Super Admin**: Full system access
  - **Administrator**: Manage all content and users
  - **Game Master**: Manage events and operations
  - **Instructor**: Manage training and qualifications
- **Secure Authentication**: NextAuth-based login system with password hashing
- **Password Management**: Force password changes and password reset functionality

### Dashboard & Analytics
- **Overview Dashboard**: Real-time statistics on personnel, instructors, and game masters
- **Upcoming Events**: Quick view of next scheduled event
- **Week Schedule**: Detailed view of all events for the current week
- **Recent Promotions**: Track latest rank changes
- **Activity Monitoring**: System-wide activity overview

## Tech Stack

### Frontend
- **Next.js 15**: React framework with App Router
- **React 19**: Latest React features
- **TypeScript**: Type-safe development
- **Tailwind CSS 4**: Utility-first CSS framework
- **ShadCN UI**: Customizable component library with Radix UI primitives
- **Lucide React**: Icon library
- **Montserrat**: Default typography font

### Backend & Database
- **Convex**: Real-time database and backend platform
- **NextAuth v5**: Authentication solution
- **bcryptjs**: Password hashing

### Development Tools
- **ESLint**: Code linting
- **Turbopack**: Fast bundler for development
- **TypeScript 5**: Latest TypeScript features

## Getting Started

### Development Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Start Convex dev server: `npm run convex:dev`
4. Start Next.js dev server: `npm run dev`
5. Access the application at `http://localhost:3000`

### Verifying Production Readiness

Before deploying to production, run the verification script:

```bash
npm run verify-deployment
```

This checks:
- Git status
- Migration functions
- Schema configuration
- Environment variables
- Required scripts
- Documentation

## Documentation

- **[Migration Guide](./src/docs/MIGRATION.md)**: Complete guide for migrating the application, database, and deployment to new accounts (Convex and Vercel)

## License

This project is private and proprietary to the ANZAC unit + DecoyDesignz.

---