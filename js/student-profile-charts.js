export function displayAttendanceChart(
    present,
    absent,
    late
) {

    const chartElement =
        document.getElementById("attendance-chart");


    new Chart(
        chartElement,
        {
            type: "bar",

            data: {

                labels: [
                    "Present",
                    "Absent",
                    "Late"
                ],

                datasets: [
                    {
                        label: "Attendance",
                        data: [
                            present,
                            absent,
                            late
                        ]
                    }
                ]

            }

        }
    );

}


export function displayGradesChart(
    studentGrades
) {

    const chartElement =
        document.getElementById("grades-chart");


    const labels =
        studentGrades.map(function(record) {

            return record.course_id;

        });


    const grades =
        studentGrades.map(function(record) {

            return record.grade;

        });


    new Chart(
        chartElement,
        {
            type: "bar",

            data: {

                labels: labels,

                datasets: [
                    {
                        label: "Grades",
                        data: grades
                    }
                ]

            }

        }
    );

}