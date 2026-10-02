

const studentsContainer =
    document.getElementById("students-container");


async function getStudents() {

    try {

        const response = await fetch("../data/studentsDB.json");

        const data = await response.json();

        return data.students;

    } catch (error) {

        console.log(error);

    }

}// بجيب البيانات


function displayStudent(student) {

    const card = document.createElement("div");

    card.className = "student-card";

    const studentName = document.createElement("h2");

    card.textContent =
        student.first_name + " " + student.last_name;

        card.appendChild(studentName);


        const studentId = document.createElement("p");

          studentId.textContent =
          "Student ID: " + student.University_id;

card.appendChild(studentId);

const studentMajor = document.createElement("p");

        studentMajor.textContent =
             "Major: " + student.major;

card.appendChild(studentMajor);

const studentUniversity = document.createElement("p");

studentUniversity.textContent =
    "University: " + student.University;

card.appendChild(studentUniversity);

const studentEmail = document.createElement("p");

studentEmail.textContent =
    "Email: " + student.email;

card.appendChild(studentEmail);



const viewButton = document.createElement("button");

viewButton.textContent = "View Profile";

viewButton.addEventListener("click", function() {
    
     window.location.href =
        "student-profile.html?id=" + student.id;

});

card.appendChild(viewButton);





    studentsContainer.appendChild(card);

}  // transform ther obj to card


async function startStudentsPage() {

    const students = await getStudents();

    students.forEach(function(student) {
        displayStudent(student);
    });

}// هون بتشغل الصفحة شو بدي اعمل في البيانات الي جبتها عشان مبدئFunction Responsibility



startStudentsPage();


















