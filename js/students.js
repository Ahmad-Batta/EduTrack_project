import { requireAuth, renderTopNav, getCurrentUser } from "./layout.js";

requireAuth();
renderTopNav("students");

import {
    getStudents,
    addStudent,
    updateStudent
} from "./students-api.js";


import {
    searchStudents,
    filterStudents
} from "./students-filter.js";


import {
    validateStudent
} from "./students-validation.js";


import {
    getStudentFormData,
    loadStudentToForm,
    clearStudentForm
} from "./students-form.js";



const studentsContainer =
    document.getElementById("students-container");

const searchInput =
    document.getElementById("search-input");

const filterSelect =
    document.getElementById("filter-select");

const noStudentsMessage =
    document.getElementById("no-students-message");

const addStudentButton =
    document.getElementById("add-student-btn");

const addStudentForm =
    document.getElementById("add-student-form");

const saveStudentButton =
    document.getElementById("save-student-btn");



let allStudents = [];

let editingStudentId = null;



function displayStudent(student) {

    const card =
        document.createElement("div");

    card.className =
        "student-card";


    const studentName =
        document.createElement("h2");

    studentName.textContent =
        student.first_name + " " + student.last_name;

    card.appendChild(studentName);


    const studentId =
        document.createElement("p");

    studentId.textContent =
        "Student ID: " + student.University_id;

    card.appendChild(studentId);


    const studentMajor =
        document.createElement("p");

    studentMajor.textContent =
        "Major: " + student.major;

    card.appendChild(studentMajor);


    const studentUniversity =
        document.createElement("p");

    studentUniversity.textContent =
        "University: " + student.University;

    card.appendChild(studentUniversity);


    const studentEmail =
        document.createElement("p");

    studentEmail.textContent =
        "Email: " + student.email;

    card.appendChild(studentEmail);


    const studentStatus =
        document.createElement("p");

    studentStatus.textContent =
        "Status: " + (student.status || "active");

    card.appendChild(studentStatus);


    const viewButton =
        document.createElement("button");

    viewButton.textContent =
        "View Profile";

    viewButton.addEventListener("click", function() {

        window.location.href =
            "student-profile.html?id=" + student.id;

    });

    card.appendChild(viewButton);


    const editButton =
        document.createElement("button");

    editButton.textContent =
        "Edit";

    editButton.addEventListener("click", function() {

        loadStudentToForm(
            student,
            saveStudentButton,
            addStudentForm
        );

        editingStudentId =
            student.id;

    });

    card.appendChild(editButton);


    // Soft Delete - Archive / Restore
    const archiveButton =
        document.createElement("button");

    if ((student.status || "active") === "archived") {

        archiveButton.textContent =
            "Restore";

    } else {

        archiveButton.textContent =
            "Archive";

    }


    archiveButton.addEventListener("click", function() {

        if ((student.status || "active") === "archived") {

            restoreStudent(student.id);

        } else {

            archiveStudent(student.id);

        }

    });

    card.appendChild(archiveButton);


    // Hard Delete
    const deleteButton =
        document.createElement("button");

    deleteButton.textContent =
        "Delete";

    deleteButton.addEventListener("click", function() {

        deleteStudent(student.id);

    });

    card.appendChild(deleteButton);


    studentsContainer.appendChild(card);

}// transform ther obj to card// transform ther obj to card



function clearStudents() {

    studentsContainer.innerHTML = "";

}



function displayStudents(students) {

    clearStudents();

    if (students.length === 0) {

        noStudentsMessage.hidden = false;

        return;

    }

    noStudentsMessage.hidden = true;

    students.forEach(function(student) {

        displayStudent(student);

    });

}



function applyStudentFilters() {

    const searchText =
        searchInput.value;

    const filterValue =
        filterSelect.value;


    let students =
        allStudents;


    students =
        searchStudents(
            students,
            searchText
        );


    students =
        filterStudents(
            students,
            filterValue
        );


    displayStudents(students);

}



// Soft Delete
async function archiveStudent(id) {

    const confirmArchive =
        confirm(
            "Are you sure you want to archive this student?"
        );


    if (!confirmArchive) {

        return;

    }


    try {

        const response =
            await fetch(
                "http://localhost:3000/students/" + id,
                {

                    method: "PATCH",

                    headers: {

                        "Content-Type":
                            "application/json"

                    },

                    body:
                        JSON.stringify({
                            status: "archived"
                        })

                }
            );


        if (!response.ok) {

            console.log("Archive failed");

            return;

        }


        const updatedStudent =
            await response.json();


        const studentIndex =
            allStudents.findIndex(
                function(student) {

                    return student.id === id;

                }
            );


        if (studentIndex !== -1) {

            allStudents[studentIndex] =
                updatedStudent;

        }


        applyStudentFilters();

    } catch (error) {

        console.log(error);

    }

}



// Restore Soft Deleted Student
async function restoreStudent(id) {

    try {

        const response =
            await fetch(
                "http://localhost:3000/students/" + id,
                {

                    method: "PATCH",

                    headers: {

                        "Content-Type":
                            "application/json"

                    },

                    body:
                        JSON.stringify({
                            status: "active"
                        })

                }
            );


        if (!response.ok) {

            console.log("Restore failed");

            return;

        }


        const updatedStudent =
            await response.json();


        const studentIndex =
            allStudents.findIndex(
                function(student) {

                    return student.id === id;

                }
            );


        if (studentIndex !== -1) {

            allStudents[studentIndex] =
                updatedStudent;

        }


        applyStudentFilters();

    } catch (error) {

        console.log(error);

    }

}



// Hard Delete
async function deleteStudent(id) {

    const confirmDelete =
        confirm(
            "Are you sure you want to permanently delete this student?"
        );


    if (!confirmDelete) {

        return;

    }


    try {

        const response =
            await fetch(
                "http://localhost:3000/students/" + id,
                {

                    method: "DELETE"

                }
            );


        if (!response.ok) {

            console.log("Delete failed");

            return;

        }


        allStudents =
            allStudents.filter(function(student) {

                return student.id !== id;

            });


        applyStudentFilters();

    } catch (error) {

        console.log(error);

    }

}



searchInput.addEventListener("input", function() {

    applyStudentFilters();

});



filterSelect.addEventListener("change", function() {

    applyStudentFilters();

});



addStudentButton.addEventListener("click", function() {

    clearStudentForm(
        saveStudentButton
    );

    editingStudentId =
        null;

    addStudentForm.hidden =
        false;

});



// لما نضغط Save Student نجيب البيانات ونضيف الطالب
saveStudentButton.addEventListener(
    "click",
    async function() {

        const student =
            getStudentFormData(
                editingStudentId,
                allStudents
            );


        if (!validateStudent(
            student,
            allStudents,
            editingStudentId
        )) {

            return;

        }


        if (editingStudentId === null) {

            const newStudent =
                await addStudent(student);


            if (!newStudent) {

                return;

            }


            allStudents.push(newStudent);

        } else {

            const currentEditingStudentId =
                editingStudentId;


            const updatedStudent =
                await updateStudent(
                    currentEditingStudentId,
                    student
                );


            if (!updatedStudent) {

                return;

            }


            const studentIndex =
                allStudents.findIndex(
                    function(student) {

                        return student.id ===
                            currentEditingStudentId;

                    }
                );


            if (studentIndex !== -1) {

                allStudents[studentIndex] =
                    updatedStudent;

            }

        }


        clearStudentForm(
            saveStudentButton
        );

        editingStudentId =
            null;


        applyStudentFilters();


        addStudentForm.hidden =
            true;

    }
);



// هون بتشغل الصفحة شو بدي اعمل في البيانات الي جبتها عشان مبدئFunction Responsibility
async function startStudentsPage() {

    const user = getCurrentUser() || {};

    const students =
        await getStudents();


    if (user.id) {
        allStudents = students.filter(function(student) {
            return String(student.instructor_id || student.trainerId) === String(user.id);
        });
    } else {
        allStudents = students;
    }


    applyStudentFilters();

}



startStudentsPage();