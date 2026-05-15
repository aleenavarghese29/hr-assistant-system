# HR Assistant System

A comprehensive, AI-powered Human Resources management platform featuring dynamic policy enforcement, intelligent salary slip generation, intuitive chat interfaces, and detailed analytics for both employees and administrators.

---

## Features
- **AI-Powered Chat Assistant**: Intelligent virtual assistant for querying HR policies, leaves, and company information.
- **Role-Based Access Control (RBAC)**: Secure access with dedicated views for Administrators and Employees.
- **Leave & Holiday Management**: Integrated calendar view for tracking employee leaves and company holidays.
- **Dynamic Salary Management**: Automated payroll computation engine and salary slip generation.
- **Policy Engine**: Dynamic enforcement and management of company HR directives and rules.
- **Modern UI/UX**: Responsive frontend built with React and Vite for a seamless experience.

---

## Tech Stack

**Frontend**
- React.js with TypeScript
- Vite (Build Tool)
- CSS (Modern UI styling)

**Backend**
- Python 3
- Django Framework
- SQLite Database
- Custom AI/LLM Integration

---

## Project Structure

```text
hr-assistant-system/
├── backend/                  # Django backend application
│   ├── core_project/         # Django core settings and configurations
│   ├── hr_engine/            # Main HR application (Models, Views, Logic)
│   ├── scripts/              # Helper and seeding scripts
│   ├── manage.py             # Django management script
│   └── requirements.txt      # Python dependencies
├── web-app/                  # React frontend application
│   ├── public/               # Static assets
│   ├── src/                  # React components, styles, and logic
│   │   ├── components/       # Reusable UI components (Dashboards, Chat, Calendar)
│   │   ├── assets/           # Application images and icons
│   │   └── main.tsx          # Application entry point
│   ├── package.json          # Node.js dependencies
│   ├── tsconfig.json         # TypeScript configurations
│   └── vite.config.ts        # Vite configuration
├── .gitignore                # Git ignore configuration
└── README.md                 # Project documentation
```

---

## Setup Instructions

### Clone Repository
To get started, clone the repository to your local machine:
```bash
git clone https://github.com/aleenavarghese29/hr-assistant-system.git
cd hr-assistant-system
```

---

### Install Dependencies

#### 1. Frontend Setup
Navigate to the `web-app` directory and install the necessary Node modules:
```bash
cd web-app
npm install
```

#### 2. Backend Setup
Navigate to the `backend` directory, set up your Python virtual environment, and install dependencies:
```bash
cd backend

# Create and activate virtual environment (Windows)
python -m venv venv
venv\Scripts\activate

# Create and activate virtual environment (Mac/Linux)
python3 -m venv venv
source venv/bin/activate

# Install requirements
pip install -r requirements.txt
```

---

### Environment Variables & API Key Setup

1. **Backend Environment**
   Create a `.env` file inside the `backend` directory.
   
2. **Add API Keys**
   Open the `backend/.env` file and securely add your necessary API keys and environment variables:
   ```env
   # Example .env configuration
   LLM_API_KEY=your_secure_api_key_here
   DJANGO_SECRET_KEY=your_django_secret_key
   DEBUG=True
   ```

3. **Frontend Environment (if applicable)**
   Create a `.env` file inside the `web-app` directory for any React environment variables.

---

### Run Application

#### Start the Backend Server
Make sure your virtual environment is activated and you are in the `backend` directory:
```bash
# Run database migrations (if needed)
python manage.py migrate

# Start the Django server
python manage.py runserver
```

#### Start the Frontend Server
Open a **new terminal tab**, navigate to the `web-app` directory, and start the development server:
```bash
cd web-app
npm run dev
```

---

## Important Notes

⚠️ **Security Best Practices:**
- **Never upload `.env` files**: Ensure your `.env` files are included in `.gitignore` to prevent leaking sensitive information.
- **Never upload `node_modules` or `venv`**: These directories are bulky and specific to your local machine. Let the package managers handle them.
- **Keep API keys secure**: Do not hardcode API keys or credentials directly within your source code. Always use environment variables.
