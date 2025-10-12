# ANZAC Management System

A comprehensive military unit management application for tracking personnel, qualifications, training schedules, and operational events.

## Features

- **Personnel Management** - Track unit members, ranks, and service records
- **Qualification Tracking** - Manage military qualifications and certifications
- **Training Schools** - Organize qualifications by training schools
- **Calendar System** - Schedule and manage training events and operations
- **Role-Based Access** - Super Admin, Administrator, Game Master, and Instructor roles
- **Secure Authentication** - NextAuth.js with credential-based login
- **Real-time Updates** - Convex backend for instant data synchronization

## Tech Stack

- **Frontend:** Next.js 15 (App Router), React 19, TypeScript
- **Backend:** Convex (serverless backend with real-time database)
- **Authentication:** NextAuth.js v5
- **UI Components:** shadcn/ui (Radix UI + Tailwind CSS)
- **Styling:** Tailwind CSS 4
- **Deployment:** Vercel

## Getting Started

### Prerequisites

- Node.js 20 or higher
- npm or yarn
- Convex account (free tier available)

### Installation

1. **Clone the repository:**
   ```bash
   git clone <your-repo-url>
   cd anzac-management-app
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up Convex:**
   ```bash
   npx convex dev
   ```
   This will:
   - Create a new Convex project (or link to existing)
   - Generate your development URL
   - Deploy your database schema
   - Start the Convex dev server

4. **Configure environment variables:**
   
   Create `.env.local` in the project root:
   ```bash
   # Generate this secret
   NEXTAUTH_SECRET=your-secret-here
   
   # From step 3 (convex dev output)
   NEXT_PUBLIC_CONVEX_URL=https://your-dev-deployment.convex.cloud
   ```

   Generate `NEXTAUTH_SECRET`:
   ```bash
   openssl rand -base64 32
   ```

5. **Create initial admin user:**
   ```bash
   npm run create-admin
   ```
   Follow the instructions to create your admin user in the Convex dashboard.

6. **Start the development server:**
   ```bash
   npm run dev
   ```

7. **Open your browser:**
   Navigate to http://localhost:3000 and log in with your admin credentials.

## Project Structure

```
anzac-management-app/
├── convex/                 # Convex backend (database schema, queries, mutations)
│   ├── schema.ts          # Database schema definitions
│   ├── personnel.ts       # Personnel queries/mutations
│   ├── qualifications.ts  # Qualification management
│   ├── events.ts          # Calendar event management
│   └── ...
├── src/
│   ├── app/               # Next.js App Router pages
│   │   ├── dashboard/     # Main application dashboard
│   │   ├── login/         # Authentication pages
│   │   └── api/           # API routes (NextAuth)
│   ├── components/        # React components
│   │   ├── dashboard/     # Dashboard-specific components
│   │   └── ui/            # shadcn/ui components
│   ├── lib/               # Utility functions
│   ├── providers/         # React context providers
│   ├── types/             # TypeScript type definitions
│   └── auth.ts            # NextAuth configuration
├── scripts/               # Admin scripts
│   ├── create-admin.ts    # Create initial admin user
│   └── reset-admin-password.ts  # Password recovery
└── public/                # Static assets
```

## Available Scripts

### Development
- `npm run dev` - Start Next.js development server
- `npm run convex:dev` - Start Convex dev server
- `npm run build` - Build production bundle
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Admin Scripts
- `npm run create-admin` - Create initial super admin user
- `npm run reset-admin-password` - Reset admin password (manual)
- `npm run reset-admin-password:auto` - Reset admin password (automated)

See `scripts/README.md` for detailed admin script documentation.

## User Roles

### Super Admin
- Full system access
- Manage all users and roles
- System configuration
- Emergency recovery access

### Administrator
- Manage personnel and qualifications
- Create and manage events
- View reports and analytics
- Assign instructors to schools

### Game Master
- Create and manage game events
- View personnel and qualifications
- Manage event participants

### Instructor
- Manage assigned school qualifications
- Award qualifications to personnel
- View training schedules
- Limited personnel access

## Database Schema

### Core Tables

- **systemUsers** - Application users with login credentials
- **userRoles** - User role assignments (many-to-many)
- **personnel** - Unit members (no login capability)
- **ranks** - Military rank structure
- **schools** - Training schools/organizations
- **qualifications** - Military qualifications/certifications
- **personnelQualifications** - Awarded qualifications (junction)
- **events** - Calendar events and training activities
- **eventParticipants** - Event enrollment (junction)
- **eventInstructors** - Event instructors/GMs (junction)

See `convex/schema.ts` for complete schema definitions.

## Security Features

- **Password Hashing** - bcrypt with application-specific salt
- **JWT Sessions** - Secure token-based authentication
- **Role-Based Access Control** - Granular permissions system
- **Security Headers** - CSP, HSTS, X-Frame-Options, etc.
- **Protected Routes** - Middleware-based route protection
- **Password Requirements** - Enforced strong password policy
- **Session Management** - 30-day max age with forced password changes

## Deployment

See `DEPLOYMENT.md` for comprehensive production deployment instructions.

### Quick Deploy to Vercel

1. **Deploy Convex production:**
   ```bash
   npx convex deploy
   ```

2. **Deploy to Vercel:**
   ```bash
   vercel --prod
   ```

3. **Add environment variables in Vercel dashboard:**
   - `NEXTAUTH_SECRET` - Generate new secret for production
   - `NEXT_PUBLIC_CONVEX_URL` - Production Convex URL from step 1

4. **Create admin user:**
   ```bash
   npm run create-admin
   ```

## Development Guidelines

### Code Style
- TypeScript strict mode enabled
- ESLint for code quality
- Prettier for formatting (if configured)
- Follow existing component patterns

### Component Principles
- Use shadcn/ui components where possible
- Follow existing style guidelines
- Use Montserrat font family
- Prefer solid colors over gradients
- Responsive design for all screen sizes

### Database Queries
- Use Convex queries for reads
- Use Convex mutations for writes
- Implement proper error handling
- Validate all inputs with Zod schemas

## Troubleshooting

### Common Issues

**"Convex connection failed"**
- Ensure `NEXT_PUBLIC_CONVEX_URL` is set correctly
- Check that `npx convex dev` is running
- Verify Convex deployment status

**"Invalid credentials"**
- Verify admin user exists in Convex dashboard
- Check password hash matches
- Ensure `NEXTAUTH_SECRET` is set

**Build errors**
- Clear `.next` folder: `rm -rf .next`
- Clear `node_modules`: `rm -rf node_modules && npm install`
- Check TypeScript errors: `npx tsc --noEmit`

**Linter errors**
- Run: `npm run lint`
- Fix automatically where possible
- Review and update code as needed

## Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit pull request
5. Ensure all checks pass

## License

This project is proprietary software for ANZAC unit management.

## Support

For issues, questions, or feature requests:
- Review documentation in `docs/` folder
- Check `scripts/README.md` for admin tools
- Review Convex documentation: https://docs.convex.dev
- Review Next.js documentation: https://nextjs.org/docs

## Acknowledgments

- Built with Next.js, React, and Convex
- UI components from shadcn/ui
- Authentication via NextAuth.js
- Hosted on Vercel

---

**Version:** 0.1.0
**Last Updated:** October 2025

