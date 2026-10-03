const profileContainer =
    document.getElementById("student-profile");


export function displayStudentProfile(student) {

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


    const studentStatus =
        document.createElement("p");

    studentStatus.textContent =
        "Status: " + (student.status || "active");

    profileContainer.appendChild(studentStatus);


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