const API_BASE_URL =
    "https://marksheet-website-tdkw.vercel.app/api";


// =================================
// Authentication
// =================================

const authToken =
    localStorage.getItem("authToken");

const studentData =
    localStorage.getItem("student");


if (!authToken || !studentData) {

    window.location.href =
        "index.html";

}


let currentUser;

try {

    currentUser =
        JSON.parse(studentData);

} catch (error) {

    localStorage.removeItem("authToken");
    localStorage.removeItem("student");

    window.location.href =
        "index.html";

}


// =================================
// Admin Check
// =================================

if (currentUser.role !== "admin") {

    alert("Admin access required.");

    window.location.href =
        "dashboard.html";

}


// =================================
// DOM Elements
// =================================

const totalStudents =
    document.getElementById("totalStudents");

const activeStudents =
    document.getElementById("activeStudents");

const blockedStudents =
    document.getElementById("blockedStudents");

const adminCount =
    document.getElementById("adminCount");

const studentsTable =
    document.getElementById("studentsTable");

const studentSearch =
    document.getElementById("studentSearch");

const adminMessage =
    document.getElementById("adminMessage");

const logoutButton =
    document.getElementById("logoutButton");


// =================================
// Student Data
// =================================

let students = [];


// =================================
// Load Students
// =================================

async function loadStudents() {

    try {

        adminMessage.textContent =
            "Loading students...";


        const response =
            await fetch(
                `${API_BASE_URL}/admin/students`,
                {
                    method: "GET",

                    headers: {
                        "Authorization":
                            `Bearer ${authToken}`
                    }
                }
            );


        // =============================
        // Token Expired / Invalid
        // =============================

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


        // =============================
        // Not Admin
        // =============================

        if (response.status === 403) {

            adminMessage.textContent =
                "You do not have admin permission.";

            return;

        }


        if (!response.ok) {

            throw new Error(
                "Failed to load students."
            );

        }


        students =
            await response.json();


        adminMessage.textContent =
            "";


        updateStatistics();

        displayStudents(students);

    }

    catch (error) {

        console.error(error);

        adminMessage.textContent =
            "Unable to load students. Please try again.";

    }

}


// =================================
// Update Statistics
// =================================

function updateStatistics() {

    const total =
        students.length;


    const blocked =
        students.filter(
            student =>
                student.is_blocked === true
        ).length;


    const active =
        students.filter(
            student =>
                student.is_blocked === false
        ).length;


    const admins =
        students.filter(
            student =>
                student.role === "admin"
        ).length;


    totalStudents.textContent =
        total;

    activeStudents.textContent =
        active;

    blockedStudents.textContent =
        blocked;

    adminCount.textContent =
        admins;

}


// =================================
// Display Students
// =================================

function displayStudents(studentList) {

    studentsTable.innerHTML = "";


    if (studentList.length === 0) {

        studentsTable.innerHTML = `
            <tr>
                <td colspan="5">
                    No students found.
                </td>
            </tr>
        `;

        return;

    }


    studentList.forEach(student => {

        const row =
            document.createElement("tr");


        // =============================
        // Status
        // =============================

        const statusText =
            student.is_blocked
                ? "BLOCKED"
                : "ACTIVE";


        const statusClass =
            student.is_blocked
                ? "fail-badge"
                : "pass-badge";


        // =============================
        // Action
        // =============================

        let actionHTML = "";


        if (student.role === "admin") {

            actionHTML = `
                <button
                    class="admin-action-button"
                    disabled
                >
                    Admin
                </button>
            `;

        } else {

            const buttonText =
                student.is_blocked
                    ? "Unblock"
                    : "Block";


            actionHTML = `
                <button
                    class="admin-action-button"
                    data-id="${student.id}"
                    data-blocked="${student.is_blocked}"
                >
                    ${buttonText}
                </button>
            `;

        }


        // =============================
        // Row
        // =============================

        row.innerHTML = `

            <td>
                ${escapeHTML(student.prn)}
            </td>

            <td>
                ${escapeHTML(
                    student.name ||
                    "Unnamed Student"
                )}
            </td>

            <td>
                <span class="role-badge">
                    ${escapeHTML(student.role)}
                </span>
            </td>

            <td>
                <span class="${statusClass}">
                    ${statusText}
                </span>
            </td>

            <td>
                ${actionHTML}
            </td>

        `;


        studentsTable.appendChild(row);

    });


    // =============================
    // Add Action Listeners
    // =============================

    const actionButtons =
        document.querySelectorAll(
            ".admin-action-button"
        );


    actionButtons.forEach(button => {

        if (button.disabled) {
            return;
        }


        button.addEventListener(
            "click",
            function () {

                const studentId =
                    Number(
                        button.dataset.id
                    );


                const currentlyBlocked =
                    button.dataset.blocked === "true";


                toggleStudentBlock(
                    studentId,
                    currentlyBlocked
                );

            }
        );

    });

}


// =================================
// Block / Unblock Student
// =================================

async function toggleStudentBlock(
    studentId,
    currentlyBlocked
) {

    const student =
        students.find(
            item =>
                item.id === studentId
        );


    if (!student) {

        return;

    }


    const newBlockedStatus =
        !currentlyBlocked;


    const action =
        newBlockedStatus
            ? "block"
            : "unblock";


    const confirmed =
        confirm(
            `Are you sure you want to ${action} ${student.name || student.prn}?`
        );


    if (!confirmed) {

        return;

    }


    try {

        adminMessage.textContent =
            newBlockedStatus
                ? "Blocking student..."
                : "Unblocking student...";


        const response =
            await fetch(
                `${API_BASE_URL}/admin/students/${studentId}/block`,
                {
                    method: "PATCH",

                    headers: {

                        "Content-Type":
                            "application/json",

                        "Authorization":
                            `Bearer ${authToken}`

                    },

                    body: JSON.stringify({

                        is_blocked:
                            newBlockedStatus

                    })

                }
            );


        const data =
            await response.json();


        // =============================
        // Authentication Error
        // =============================

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


        // =============================
        // Permission Error
        // =============================

        if (response.status === 403) {

            adminMessage.textContent =
                "Admin permission required.";

            return;

        }


        // =============================
        // Other Errors
        // =============================

        if (!response.ok) {

            adminMessage.textContent =
                data.detail ||
                "Unable to update student.";

            return;

        }


        // =============================
        // Update Local Data
        // =============================

        student.is_blocked =
            data.student.is_blocked;


        adminMessage.textContent =
            data.message;


        // =============================
        // Refresh Dashboard
        // =============================

        updateStatistics();

        applyCurrentSearch();

    }

    catch (error) {

        console.error(error);

        adminMessage.textContent =
            "Unable to connect to the server.";

    }

}


// =================================
// Search
// =================================

studentSearch.addEventListener(
    "input",
    function () {

        applyCurrentSearch();

    }
);


// =================================
// Apply Search
// =================================

function applyCurrentSearch() {

    const searchValue =
        studentSearch.value
            .trim()
            .toLowerCase();


    if (searchValue === "") {

        displayStudents(students);

        return;

    }


    const filteredStudents =
        students.filter(student => {

            const prn =
                String(
                    student.prn || ""
                ).toLowerCase();


            const name =
                String(
                    student.name || ""
                ).toLowerCase();


            return (
                prn.includes(searchValue) ||
                name.includes(searchValue)
            );

        });


    displayStudents(
        filteredStudents
    );

}


// =================================
// Logout
// =================================

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


// =================================
// HTML Escape Helper
// =================================

function escapeHTML(value) {

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}


// =================================
// Start Dashboard
// =================================

loadStudents();