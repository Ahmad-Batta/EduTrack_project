
import {
    getStudents,
    getAttendance,
    getGrades,
    getCourses
} from "./student-profile-api.js";

import {
    getStudentAttendance,
    countPresent,
    countAbsent,
    countLate,
    calculateAttendanceRate,
    calculateAbsenceRate,
    displayAttendance
} from "./student-profile-attendance.js";

import {
    getStudentGrades,
    displayGrades,
    calculateAverageGrade,
    getHighestGrade,
    getLowestGrade,
    displayGradesAnalytics,
    countPassedCourses,
    countFailedCourses,
    getPerformanceStatus
} from "./student-profile-grades.js";



import {
    displayStudentProfile
} from "./student-profile-ui.js";



import {
    displayAttendanceChart,
    displayGradesChart
} from "./student-profile-charts.js";

const profileContainer =
    document.getElementById("student-profile");

    



const params =
    new URLSearchParams(window.location.search);


const studentId =
    params.get("id");





function findStudent(students) {

    const student =
        students.find(function(student) {

            return student.id === studentId;

        });

    return student;

}





async function startProfilePage() {

    const students =
        await getStudents();

    const student =
        findStudent(students);

    if (!student) {

        profileContainer.textContent =
            "Student not found";

        return;

    }

    displayStudentProfile(student);


    const attendance =
        await getAttendance();


    const studentAttendance =
         getStudentAttendance(
        attendance,
        studentId
    );


    const present =
        countPresent(studentAttendance);

    const absent =
        countAbsent(studentAttendance);

    const late =
        countLate(studentAttendance);


    const total =
        studentAttendance.length;


    const attendanceRate =
        calculateAttendanceRate(present, total);

    const absenceRate =
        calculateAbsenceRate(absent, total);


    displayAttendance(
        present,
        absent,
        late,
        attendanceRate,
        absenceRate
    );

    displayAttendanceChart(
    present,
    absent,
    late
);


const grades =
    await getGrades();

const studentGrades =
    getStudentGrades(
        grades,
        studentId
    );

const courses =
    await getCourses();

const average =
    calculateAverageGrade(studentGrades);

const highest =
    getHighestGrade(studentGrades);

const lowest =
    getLowestGrade(studentGrades);

const passed =
    countPassedCourses(studentGrades);

const failed =
    countFailedCourses(studentGrades);

const performanceStatus =
    getPerformanceStatus(average);

displayGradesAnalytics(
    studentGrades,
    average,
    highest,
    lowest,
    passed,
    failed,
    performanceStatus
);

displayGrades(
    studentGrades,
    courses
);
   
displayGradesChart(
    studentGrades
);




}



startProfilePage();