const API_BASE_URL =
    "https://marksheet-website-tdkw.vercel.app/api";


const token =
    localStorage.getItem("authToken");


const studentData =
    localStorage.getItem("student");


/*
    Check authentication
*/

if (!token || !studentData) {

    window.location.href =
        "index.html";

}


/*
    Get HTML elements
*/

const studentName =
    document.getElementById("studentName");


const studentNameHeading =
    document.getElementById(
        "studentNameHeading"
    );


const studentPrn =
    document.getElementById("studentPrn");


const studentRole =
    document.getElementById("studentRole");


const subjectCount =
    document.getElementById("subjectCount");


const totalMarks =
    document.getElementById("totalMarks");


const passedCount =
    document.getElementById("passedCount");


const failedCount =
    document.getElementById("failedCount");


const marksTable =
    document.getElementById("marksTable");


const dashboardMessage =
    document.getElementById(
        "dashboardMessage"
    );


const logoutButton =
    document.getElementById(
        "logoutButton"
    );


/*
    Read student information
*/

const student =
    JSON.parse(studentData);


studentName.textContent =
    student.name || "Student";


studentNameHeading.textContent =
    student.name || "Student";


studentPrn.textContent =
    student.prn || "—";


studentRole.textContent =
    student.role || "student";


/*
    Load student's marks
*/

async function loadMyMarks() {

    dashboardMessage.textContent =
        "Loading your marks...";


    try {

        const response =
            await fetch(
                `${API_BASE_URL}/my-marks`,
                {
                    method: "GET",

                    headers: {
                        "Authorization":
                            `Bearer ${token}`
                    }
                }
            );


        /*
            Token expired or invalid
        */

        if (response.status === 401) {

            localStorage.removeItem(
                "authToken"
            );

            localStorage.removeItem(
                "student"
            );

            window.location.href =
                "index.html";

            return;
        }


        /*
            Other errors
        */

        if (!response.ok) {

            throw new Error(
                "Failed to load marks"
            );

        }


        const marks =
            await response.json();


        dashboardMessage.textContent =
            "";


        displayMarks(marks);


    } catch (error) {

        console.error(error);

        dashboardMessage.textContent =
            "Unable to load marks. Please try again.";

    }

}


/*
    Display marks
*/

function displayMarks(marks) {

    marksTable.innerHTML = "";


    /*
        No marks
    */

    if (marks.length === 0) {

        subjectCount.textContent =
            "0";

        totalMarks.textContent =
            "0";

        passedCount.textContent =
            "0";

        failedCount.textContent =
            "0";


        marksTable.innerHTML = `
            <tr>
                <td
                    colspan="4"
                    class="empty-message"
                >
                    No marks available.
                </td>
            </tr>
        `;

        return;
    }


    /*
        Records containing marks
    */

    const validMarks =
        marks.filter(
            mark =>
                mark.marks !== null
                &&
                mark.marks !== undefined
        );


    /*
        Calculate total marks
    */

    const total =
        validMarks.reduce(
            (sum, mark) =>
                sum + Number(mark.marks),
            0
        );


    /*
        Count passed and failed records
    */

    const passed =
        marks.filter(
            mark =>
                mark.is_pass === true
        ).length;


    const failed =
        marks.filter(
            mark =>
                mark.is_pass === false
        ).length;


    /*
        Update statistics
    */

    subjectCount.textContent =
        new Set(
            marks.map(
                mark => mark.subject
            )
        ).size;


    totalMarks.textContent =
        total;


    passedCount.textContent =
        passed;


    failedCount.textContent =
        failed;


    /*
        Create table rows
    */

    marks.forEach(mark => {

        const row =
            document.createElement("tr");


        let resultText =
            "—";


        let resultClass =
            "result-pending";


        if (mark.is_pass === true) {

            resultText =
                "PASS";

            resultClass =
                "result-pass";

        }


        if (mark.is_pass === false) {

            resultText =
                "FAIL";

            resultClass =
                "result-fail";

        }


        row.innerHTML = `

            <td>
                <strong>
                    ${mark.subject}
                </strong>
            </td>

            <td>
                ${mark.exam}
            </td>

            <td>
                ${
                    mark.marks === null
                        ? "—"
                        : mark.marks
                }
            </td>

            <td>

                <span
                    class="result-badge ${resultClass}"
                >
                    ${resultText}
                </span>

            </td>

        `;


        marksTable.appendChild(row);

    });

}


/*
    Logout
*/

logoutButton.addEventListener(
    "click",
    function () {

        localStorage.removeItem(
            "authToken"
        );

        localStorage.removeItem(
            "student"
        );


        window.location.href =
            "index.html";

    }
);


/*
    Start loading marks
*/

loadMyMarks();