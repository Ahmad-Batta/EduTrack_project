# EduTrack — Quizzes, Courses & Activity History

## Run
1. Backend:  `npx json-server@0.17.4 db.json --port 3000`
2. Frontend: open `quizzes.html` or `courses.html` with VS Code Live Server (any static server).

## Structure
```
edutrack/
├── db.json                (quizzes, courses, students, results, activities)
├── quizzes.html
├── courses.html
├── css/   base.css (shared) · quizzes.css · courses.css
└── js/    utils · auth · api · activityLogger · activityView · quizzes · courses
```
Scripts load in this order: utils → auth → api → activityLogger → (activityView) → page script.

## Features
Quizzes: list, search, create/edit (date, time, duration, total marks), archive/unarchive, delete, per-student results, quiz analytics.
Courses: list, add/edit/delete (cascade), enroll/remove students, enrolled list, course analytics.
Activity: log helper, full history, recent activities (scoped per instructor).
