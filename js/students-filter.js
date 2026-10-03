export function searchStudents(students, searchText) {

    const filteredStudents =
        students.filter(function(student) {

            const fullName =
                student.first_name +
                " " +
                student.last_name;

            return (

                fullName
                    .toLowerCase()
                    .includes(searchText.toLowerCase())

                ||

                String(student.University_id)
                    .includes(searchText)

            );

        });

    return filteredStudents;

}


export function filterStudents(students, filterValue) {

    if (filterValue === "all") {

        return students;

    }


    const filteredStudents =
        students.filter(function(student) {

            const studentStatus =
                student.status || "active";

            return studentStatus === filterValue;

        });


    return filteredStudents;

}