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
            type: "doughnut",

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
                        ],

                        backgroundColor: [
                            "#1B2CC1",
                            "#E05263",
                            "#7692FF"
                        ],

                        borderColor: [
                            "#FFFFFF",
                            "#FFFFFF",
                            "#FFFFFF"
                        ],

                        borderWidth: 4,

                        hoverOffset: 12
                    }
                ]

            },

            options: {

                responsive: true,

                maintainAspectRatio: false,

                cutout: "68%",

                plugins: {

                    legend: {

                        position: "bottom",

                        labels: {

                            usePointStyle: true,

                            pointStyle: "circle",

                            padding: 18,

                            color: "#091540",

                            font: {

                                size: 12,
                                weight: "600"

                            }

                        }

                    },

                    tooltip: {

                        backgroundColor: "#091540",

                        titleColor: "#FFFFFF",

                        bodyColor: "#FFFFFF",

                        padding: 12,

                        cornerRadius: 10

                    }

                },

                animation: {

                    duration: 900,

                    easing: "easeOutQuart"

                }

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
                        label: "Grade",

                        data: grades,

                        backgroundColor:
                            "#7692FF",

                        borderColor:
                            "#1B2CC1",

                        borderWidth: 1.5,

                        borderRadius: 10,

                        borderSkipped: false,

                        hoverBackgroundColor:
                            "#1B2CC1",

                        barThickness: 34
                    }
                ]

            },

            options: {

                responsive: true,

                maintainAspectRatio: false,

                scales: {

                    x: {

                        grid: {

                            display: false

                        },

                        ticks: {

                            color: "#71809D",

                            font: {

                                size: 11,
                                weight: "600"

                            }

                        }

                    },

                    y: {

                        beginAtZero: true,

                        max: 100,

                        grid: {

                            color:
                                "rgba(118, 146, 255, 0.12)"

                        },

                        ticks: {

                            color: "#71809D",

                            stepSize: 20,

                            font: {

                                size: 11

                            }

                        }

                    }

                },

                plugins: {

                    legend: {

                        display: false

                    },

                    tooltip: {

                        backgroundColor:
                            "#091540",

                        titleColor:
                            "#FFFFFF",

                        bodyColor:
                            "#FFFFFF",

                        padding: 12,

                        cornerRadius: 10,

                        displayColors: false

                    }

                },

                animation: {

                    duration: 900,

                    easing: "easeOutQuart"

                }

            }

        }
    );

}