# NoorCare

**NoorCare** is a modern employee management system designed to streamline attendance, reporting, and departmental oversight within your organization. Built with React, TypeScript, Tailwind CSS, and shadcn/ui, NoorCare delivers a responsive and efficient experience for both employees and administrators.

## ✨ Key Features

- **Smart Check-in/Check-out System** with 9 AM reset for proper night shift overtime handling
- **Shift Management** - Day Shift (9 AM - 4 PM) and Night Shift (4 PM - 12 AM)
- **Overtime Tracking** - Accurate overtime calculation across midnight for night shifts
- **Performance Monitoring** - Real-time performance tracking and reporting
- **Role-based Access** - Different interfaces for employees and administrators
- **Media Buyer Dashboard** - Calendar management and designer task assignment for Media Buyers
- **Responsive Design** - Works seamlessly on desktop and mobile devices

### 🌙 Night Shift Overtime Support

NoorCare features a **9 AM reset system** instead of traditional midnight reset, ensuring:
- Night shift workers who work past midnight have their entire shift counted as one work day
- Accurate overtime calculation for shifts spanning across midnight
- Example: Check-in 6/2 4 PM, work until 6/3 3 AM = 11 hours same work day (8 regular + 3 overtime)

📖 **[Read detailed documentation](./NIGHT_SHIFT_OVERTIME_GUIDE.md)**

### 🎨 Media Buyer Functionality

Media Buyers have access to specialized tools:
- **Calendar Management**: Create, edit, and manage calendar events
- **Designer Task Assignment**: Assign tasks specifically to designers
- **Task Monitoring**: Track progress and status of assigned design tasks
- **Workflow Coordination**: Streamline design project management

📖 **[Read Media Buyer Guide](./MEDIA_BUYER_GUIDE.md)**

## 🌐 Live Project

**URL**: [https://yourdomain.com](https://yourdomain.com)  
_Replace this with the actual deployed URL._

---

## 📦 Technologies Used

- **Vite** – Fast build tool and development server
- **TypeScript** – Static type checking for scalable code
- **React** – Component-based UI development
- **Tailwind CSS** – Utility-first CSS framework
- **shadcn/ui** – Accessible and elegant UI components

---

## 🚀 Getting Started

Follow the steps below to set up the project locally:

### Prerequisites

- **Node.js** and **npm** installed  
  _(Recommended: Install via [nvm](https://github.com/nvm-sh/nvm#installing-and-updating))_

---

### Installation

```sh
# 1. Clone the repository
git clone <YOUR_GIT_URL>

# 2. Navigate into the project directory
cd NoorCare

# 3. Install dependencies
npm install

# 4. Start the development server
npm run dev
