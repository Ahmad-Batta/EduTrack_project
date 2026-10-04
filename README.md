# EduTrack

**EduTrack** is a web-based academic management platform that helps instructors manage students, courses, assignments, quizzes, grades, attendance, and academic activities from one place.

## 🎨 Figma Design

[View the EduTrack Figma Design](https://www.figma.com/make/c3XMwKvV3Z4p0NjqgBd2NG/Build-EduTrack-Interactive-App?p=f&t=t6hJ9I6gLCL1Yzrx-0)

## ✨ Features

* 🔐 **Authentication**

  * Instructor registration and login
  * Session management
  * Logout
  * Instructor profile management

* 📊 **Dashboard**

  * Student and course statistics
  * Grades and attendance overview
  * Performance analytics

* 👨‍🎓 **Student Management**

  * Add, view, edit, and delete students
  * Search and filter students
  * Student profiles
  * Grades and attendance

* 📚 **Course Management**

  * Create, view, edit, and delete courses
  * Manage enrolled students

* 📝 **Assignments**

  * Create, view, edit, and delete assignments
  * Manage assignment dates, scores, and status

* 🧠 **Quizzes**

  * Create, view, edit, and delete quizzes
  * Manage quiz dates, duration, and marks
  * View quiz results

* 📅 **Attendance**

  * Track student attendance
  * View attendance records

* 📢 **Events & Announcements**

  * Manage and display important academic events and announcements

* 🕒 **Activity History**

  * Track and view instructor activities

## 🛠️ Technologies

* HTML5
* CSS3
* JavaScript (ES6+)
* JSON Server
* REST API
* LocalStorage
* SessionStorage
* Git & GitHub

## 📁 Project Structure

```text
EduTrack/
│
├── css/              # Stylesheets
├── js/               # JavaScript modules
├── pages/             # Application pages
├── studentImages/     # Student images
├── db.json            # JSON Server database
├── index.html         # Main entry page
└── README.md
```

## 🚀 Getting Started

### Prerequisites

Make sure you have:

* [Node.js](https://nodejs.org/)
* npm
* Visual Studio Code
* Live Server extension

### 1. Clone the repository

```bash
git clone <repository-url>
cd EduTrack
```

### 2. Start JSON Server

```bash
npx json-server@0.17.4 db.json --port 3000
```

The API will run at:

```text
http://localhost:3000
```

### 3. Run the application

Open the project in Visual Studio Code and launch it using **Live Server**.

Start with:

```text
index.html
```

Make sure JSON Server is running while using features that require database access.

## 🔄 CRUD Operations

EduTrack uses CRUD operations throughout the application:

* **Create** — Add students, courses, assignments, and quizzes
* **Read** — View academic and student information
* **Update** — Edit existing records
* **Delete** — Remove records

## 💾 Data Storage

The project uses:

* **JSON Server** for the REST API and database
* **db.json** for storing application data
* **sessionStorage** for session-related information
* **localStorage** for selected client-side data

## 🎯 Project Purpose

EduTrack was created as an educational project to demonstrate practical skills in:

* Frontend web development
* JavaScript
* REST APIs
* CRUD operations
* Authentication
* Data management
* Data visualization
* Responsive UI design

## 📄 License

This project was created for educational purposes.
