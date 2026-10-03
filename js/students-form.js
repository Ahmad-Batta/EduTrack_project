export function getStudentFormData(
    editingStudentId,
    allStudents
) {

    const firstName =
        document.getElementById("first-name-input").value;

    const lastName =
        document.getElementById("last-name-input").value;

    const universityId =
        document.getElementById("university-id-input").value;

    const email =
        document.getElementById("email-input").value;

    const gender =
        document.getElementById("gender-input").value;

    const major =
        document.getElementById("major-input").value;

    const university =
        document.getElementById("university-input").value;

    const currentUser = JSON.parse(
        sessionStorage.getItem("session") ||
        sessionStorage.getItem("currentUser") ||
        localStorage.getItem("currentInstructor") ||
        "{}"
    );

    const instructorId =
        document.getElementById("instructor-id-input").value || currentUser.id || "";


    let status =
        "active";


    if (editingStudentId !== null) {

        const currentStudent =
            allStudents.find(function(student) {

                return student.id === editingStudentId;

            });


        if (currentStudent) {

            status =
                currentStudent.status || "active";

        }

    }


    const student = {

        first_name: firstName,
        last_name: lastName,
        University_id: universityId,
        email: email,
        gender: gender,
        status: status,
        major: major,
        University: university,
        instructor_id: instructorId

    };


    return student;

}


export function loadStudentToForm(
    student,
    saveStudentButton,
    addStudentForm
) {

    document.getElementById("first-name-input").value =
        student.first_name;

    document.getElementById("last-name-input").value =
        student.last_name;

    document.getElementById("university-id-input").value =
        student.University_id;

    document.getElementById("email-input").value =
        student.email;

    document.getElementById("gender-input").value =
        student.gender || "";

    document.getElementById("major-input").value =
        student.major;

    document.getElementById("university-input").value =
        student.University;

    document.getElementById("instructor-id-input").value =
        student.instructor_id || "";


    saveStudentButton.textContent =
        "Update Student";


    addStudentForm.hidden =
        false;

}


export function clearStudentForm(
    saveStudentButton
) {

    const currentUser = JSON.parse(
        sessionStorage.getItem("session") ||
        sessionStorage.getItem("currentUser") ||
        localStorage.getItem("currentInstructor") ||
        "{}"
    );

    document.getElementById("first-name-input").value =
        "";

    document.getElementById("last-name-input").value =
        "";

    document.getElementById("university-id-input").value =
        "";

    document.getElementById("email-input").value =
        "";

    document.getElementById("gender-input").value =
        "";

    document.getElementById("major-input").value =
        "";

    document.getElementById("university-input").value =
        "";

    document.getElementById("instructor-id-input").value =
        currentUser.id || "";


    saveStudentButton.textContent =
        "Save Student";

}