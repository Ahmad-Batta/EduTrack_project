const attendanceContainer =
    document.getElementById("attendance-container");


export function getStudentAttendance(
    attendance,
    studentId
) {

    const studentAttendance =
        attendance.filter(function(record) {

            return record.student_id === studentId;

        });

    return studentAttendance;

}


export function countPresent(studentAttendance) {

    const presentRecords =
        studentAttendance.filter(function(record) {

            return record.status === "present";

        });

    return presentRecords.length;

}


export function countAbsent(studentAttendance) {

    const absentRecords =
        studentAttendance.filter(function(record) {

            return record.status === "absent";

        });

    return absentRecords.length;

}


export function countLate(studentAttendance) {

    const lateRecords =
        studentAttendance.filter(function(record) {

            return record.status === "late";

        });

    return lateRecords.length;

}


export function calculateAttendanceRate(
    present,
    total
) {

    if (total === 0) {

        return 0;

    }

    return (present / total) * 100;

}


export function calculateAbsenceRate(
    absent,
    total
) {

    if (total === 0) {

        return 0;

    }

    return (absent / total) * 100;

}


export function displayAttendance(
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