export function validateStudent(
    student,
    allStudents,
    editingStudentId
) {

    if (student.first_name.trim() === "") {

        alert("First Name is required.");
        return false;

    }


    if (student.last_name.trim() === "") {

        alert("Last Name is required.");
        return false;

    }


    if (student.University_id.trim() === "") {

        alert("Student ID is required.");
        return false;

    }


    // Student ID must contain numbers only
    const studentIdPattern =
        /^[0-9]+$/;


    if (!studentIdPattern.test(student.University_id)) {

        alert("Student ID must contain numbers only.");
        return false;

    }


    // Student ID must contain exactly 9 digits
    if (student.University_id.length !== 9) {

        alert("Student ID must contain exactly 9 digits.");
        return false;

    }


    // Check if Student ID already exists
    const duplicateStudent =
        allStudents.find(function(existingStudent) {

            return (

                String(existingStudent.University_id) ===
                    String(student.University_id)

                &&

                existingStudent.id !==
                    editingStudentId

            );

        });


    if (duplicateStudent) {

        alert("Student ID already exists.");
        return false;

    }


    if (student.email.trim() === "") {

        alert("Email is required.");
        return false;

    }


    // Check email format
    const emailPattern =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


    if (!emailPattern.test(student.email)) {

        alert("Please enter a valid email address.");
        return false;

    }


    if (student.gender === "") {

        alert("Please select Gender.");
        return false;

    }


    if (student.major.trim() === "") {

        alert("Major is required.");
        return false;

    }


    if (student.University.trim() === "") {

        alert("University is required.");
        return false;

    }


    if (student.instructor_id.trim() === "") {

        alert("Instructor ID is required.");
        return false;

    }


    return true;

}
