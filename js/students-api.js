const studentsUrl =
    "http://localhost:3000/students";


export async function getStudents() {

    try {

        const response =
            await fetch(studentsUrl);

        const data =
            await response.json();

        return data;

    } catch (error) {

        console.log(error);

        return [];

    }

}// بجيب البيانات


export async function addStudent(student) {

    try {

        const response =
            await fetch(
                studentsUrl,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify(student)
                }
            );

        const data =
            await response.json();

        return data;

    } catch (error) {

        console.log(error);

        return null;

    }

}


export async function updateStudent(id, student) {

    try {

        const response =
            await fetch(
                studentsUrl + "/" + id,
                {
                    method: "PUT",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify(student)
                }
            );

        const data =
            await response.json();

        return data;

    } catch (error) {

        console.log(error);

        return null;

    }

}


