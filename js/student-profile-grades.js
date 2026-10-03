const gradesAnalytics =
    document.getElementById("grades-analytics");

const gradesContainer =
    document.getElementById("grades-container");


export function getStudentGrades(
    grades,
    studentId
) {

    const studentGrades =
        grades.filter(function(record) {

            return record.student_id === studentId;

        });

    return studentGrades;

}


function findCourse(courseId, courses) {

    const course =
        courses.find(function(course) {

            return course.id === courseId;

        });

    return course;

}


export function displayGrades(
    studentGrades,
    courses
) {

    if (studentGrades.length === 0) {

        gradesContainer.textContent =
            "No grades found for this student.";

        return;

    }

    studentGrades.forEach(function(record) {

        const course =
            findCourse(
                record.course_id,
                courses
            );

        const gradeElement =
            document.createElement("p");

        if (course) {

            gradeElement.textContent =
                course.name +
                " - Grade: " +
                record.grade +
                " - Semester: " +
                record.semester;

        } else {

            gradeElement.textContent =
                "Course ID: " +
                record.course_id +
                " - Grade: " +
                record.grade;

        }

        gradesContainer.appendChild(
            gradeElement
        );

    });

}


export function calculateAverageGrade(
    studentGrades
) {

    if (studentGrades.length === 0) {

        return 0;

    }

    let total = 0;

    studentGrades.forEach(function(record) {

        total += record.grade;

    });

    return total / studentGrades.length;

}


export function getHighestGrade(
    studentGrades
) {

    if (studentGrades.length === 0) {

        return 0;

    }

    let highest =
        studentGrades[0].grade;

    studentGrades.forEach(function(record) {

        if (record.grade > highest) {

            highest = record.grade;

        }

    });

    return highest;

}


export function getLowestGrade(
    studentGrades
) {

    if (studentGrades.length === 0) {

        return 0;

    }

    let lowest =
        studentGrades[0].grade;

    studentGrades.forEach(function(record) {

        if (record.grade < lowest) {

            lowest = record.grade;

        }

    });

    return lowest;

}


export function displayGradesAnalytics(
    studentGrades,
    average,
    highest,
    lowest,
    passed,
    failed,
    performanceStatus
) {

    if (studentGrades.length === 0) {

        gradesAnalytics.textContent =
            "No academic performance data available.";

        return;

    }

    const coursesCount =
        document.createElement("p");

    coursesCount.textContent =
        "Courses: " +
        studentGrades.length;

    gradesAnalytics.appendChild(
        coursesCount
    );


    const averageElement =
        document.createElement("p");

    averageElement.textContent =
        "Average Grade: " +
        average.toFixed(1);

    gradesAnalytics.appendChild(
        averageElement
    );


    const highestElement =
        document.createElement("p");

    highestElement.textContent =
        "Highest Grade: " +
        highest;

    gradesAnalytics.appendChild(
        highestElement
    );


    const lowestElement =
        document.createElement("p");

    lowestElement.textContent =
        "Lowest Grade: " +
        lowest;

    gradesAnalytics.appendChild(
        lowestElement
    );


    const passedElement =
        document.createElement("p");

    passedElement.textContent =
        "Passed Courses: " +
        passed;

    gradesAnalytics.appendChild(
        passedElement
    );


    const failedElement =
        document.createElement("p");

    failedElement.textContent =
        "Failed Courses: " +
        failed;

    gradesAnalytics.appendChild(
        failedElement
    );


    const performanceElement =
        document.createElement("p");

    performanceElement.textContent =
        "Performance Status: " +
        performanceStatus;

    gradesAnalytics.appendChild(
        performanceElement
    );

}


export function countPassedCourses(
    studentGrades
) {

    const passedCourses =
        studentGrades.filter(
            function(record) {

                return record.grade >= 50;

            }
        );

    return passedCourses.length;

}


export function countFailedCourses(
    studentGrades
) {

    const failedCourses =
        studentGrades.filter(
            function(record) {

                return record.grade < 50;

            }
        );

    return failedCourses.length;

}


export function getPerformanceStatus(
    average
) {

    if (average >= 90) {

        return "Excellent";

    }

    if (average >= 80) {

        return "Very Good";

    }

    if (average >= 70) {

        return "Good";

    }

    if (average >= 60) {

        return "Pass";

    }

    return "Needs Improvement";

}