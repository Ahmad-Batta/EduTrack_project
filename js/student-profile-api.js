export async function getStudents() {

    try {

        const response =
            await fetch("http://localhost:3000/students");

        const data =
            await response.json();

        return data;

    } catch (error) {

        console.log(error);

        return [];

    }

}


export async function getAttendance() {

    try {

        const response =
            await fetch("http://localhost:3000/attendance");

        const data =
            await response.json();

        return data;

    } catch (error) {

        console.log(error);

        return [];

    }

}


export async function getGrades() {

    try {

        const response =
            await fetch("http://localhost:3000/grades");

        const data =
            await response.json();

        return data;

    } catch (error) {

        console.log(error);

        return [];

    }

}


export async function getCourses() {

    try {

        const response =
            await fetch("http://localhost:3000/courses");

        const data =
            await response.json();

        return data;

    } catch (error) {

        console.log(error);

        return [];

    }

}