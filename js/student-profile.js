const profileContainer =
    document.getElementById("student-profile");

    const attendanceContainer =
    document.getElementById("attendance-container");


const params =
    new URLSearchParams(window.location.search);


const studentId =
    params.get("id");


async function getStudents() {

    try {

        const response =
            await fetch("../data/studentsDB.json");

        const data =
            await response.json();

        return data.students;

    } catch (error) {

        console.log(error);
          return [];

    }

}


function findStudent(students) {

    const student =
        students.find(function(student) {

            return student.id === studentId;

        });

    return student;

}

function displayStudentProfile(student) {

    const studentName =
        document.createElement("h2");

    studentName.textContent =
        student.first_name + " " + student.last_name;

    profileContainer.appendChild(studentName);


    const studentUniversityId =
        document.createElement("p");

    studentUniversityId.textContent =
        "Student ID: " + student.University_id;

    profileContainer.appendChild(studentUniversityId);


    const studentEmail =
        document.createElement("p");

    studentEmail.textContent =
        "Email: " + student.email;

    profileContainer.appendChild(studentEmail);


    const studentGender =
        document.createElement("p");

    studentGender.textContent =
        "Gender: " + student.gender;

    profileContainer.appendChild(studentGender);


    const studentUniversity =
        document.createElement("p");

    studentUniversity.textContent =
        "University: " + student.University;

    profileContainer.appendChild(studentUniversity);


    const studentMajor =
        document.createElement("p");

    studentMajor.textContent =
        "Major: " + student.major;

    profileContainer.appendChild(studentMajor);

}





async function getAttendance() {

    try {

        const response =
            await fetch("../data/attendance.json");

        const data =
            await response.json();

        return data.attendance;

    } catch (error) {

        console.log(error);
          return [];

    }

}


function getStudentAttendance(attendance) {

    const studentAttendance =
        attendance.filter(function(record) {

            return record.student_id === studentId;

            

        });

    return studentAttendance;

}


function countPresent(studentAttendance) {

    const presentRecords =
        studentAttendance.filter(function(record) {

            return record.status === "present";

        });

    return presentRecords.length;

}

function countAbsent(studentAttendance) {

    const absentRecords =
        studentAttendance.filter(function(record) {

            return record.status === "absent";

        });

    return absentRecords.length;

}

function countLate(studentAttendance) {

    const lateRecords =
        studentAttendance.filter(function(record) {

            return record.status === "late";

        });

    return lateRecords.length;

}


function calculateAttendanceRate(present, total) {

    if (total === 0) {
        return 0;
    }

    return (present / total) * 100;

}

function calculateAbsenceRate(absent, total) {

    if (total === 0) {
        return 0;
    }

    return (absent / total) * 100;

}

function displayAttendance(
    present,
    absent,
    late,
    attendanceRate,
    absenceRate
) {

    const presentElement =
        document.createElement("p");

    presentElement.textContent =
        "Present: " + present;

    attendanceContainer.appendChild(presentElement);


    const absentElement =
        document.createElement("p");

    absentElement.textContent =
        "Absent: " + absent;

    attendanceContainer.appendChild(absentElement);


    const lateElement =
        document.createElement("p");

    lateElement.textContent =
        "Late: " + late;

    attendanceContainer.appendChild(lateElement);


    const attendanceRateElement =
        document.createElement("p");

    attendanceRateElement.textContent =
        "Attendance Rate: " +
        attendanceRate.toFixed(1) +
        "%";

    attendanceContainer.appendChild(attendanceRateElement);


    const absenceRateElement =
        document.createElement("p");

    absenceRateElement.textContent =
        "Absence Rate: " +
        absenceRate.toFixed(1) +
        "%";

    attendanceContainer.appendChild(absenceRateElement);

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
        getStudentAttendance(attendance);


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

}



startProfilePage();