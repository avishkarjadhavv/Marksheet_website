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


// =================================
// Current User
// =================================

let currentUser;

try {

    currentUser =
        JSON.parse(studentData);

} catch (error) {

    localStorage.removeItem(
        "authToken"
    );

    localStorage.removeItem(
        "student"
    );

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
    document.getElementById(
        "totalStudents"
    );

const activeStudents =
    document.getElementById(
        "activeStudents"
    );

const blockedStudents =
    document.getElementById(
        "blockedStudents"
    );

const adminCount =
    document.getElementById(
        "adminCount"
    );

const studentsTable =
    document.getElementById(
        "studentsTable"
    );

const studentSearch =
    document.getElementById(
        "studentSearch"
    );

const adminMessage =
    document.getElementById(
        "adminMessage"
    );

const logoutButton =
    document.getElementById(
        "logoutButton"
    );


// =================================
// Marks Management DOM Elements
// =================================

const marksManagementSection =
    document.getElementById(
        "marksManagementSection"
    );

const selectedStudentInfo =
    document.getElementById(
        "selectedStudentInfo"
    );

const marksMessage =
    document.getElementById(
        "marksMessage"
    );

const marksTable =
    document.getElementById(
        "marksTable"
    );

const closeMarksButton =
    document.getElementById(
        "closeMarksButton"
    );


// =================================
// Student Data
// =================================

let students = [];


// =================================
// Current Marks Student
// =================================

let selectedStudentId = null;


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

            logoutUser();

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

        displayStudents(
            students
        );

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

function displayStudents(
    studentList
) {

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


    studentList.forEach(
        student => {

            const row =
                document.createElement(
                    "tr"
                );


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


            if (
                student.role ===
                "admin"
            ) {

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
                        data-action="marks"
                        data-id="${student.id}"
                    >
                        View Marks
                    </button>

                    <button
                        class="admin-action-button"
                        data-action="block"
                        data-id="${student.id}"
                        data-blocked="${student.is_blocked}"
                    >
                        ${buttonText}
                    </button>

                    <button
                        class="admin-action-button"
                        data-action="password"
                        data-id="${student.id}"
                    >
                        Reset Password
                    </button>

                `;

            }


            // =============================
            // Row
            // =============================

            row.innerHTML = `

                <td>
                    ${escapeHTML(
                        student.prn
                    )}
                </td>

                <td>
                    ${escapeHTML(
                        student.name ||
                        "Unnamed Student"
                    )}
                </td>

                <td>
                    <span class="role-badge">
                        ${escapeHTML(
                            student.role
                        )}
                    </span>
                </td>

                <td>
                    <span
                        class="${statusClass}"
                    >
                        ${statusText}
                    </span>
                </td>

                <td>
                    ${actionHTML}
                </td>

            `;


            studentsTable.appendChild(
                row
            );

        }
    );


    // =============================
    // Action Buttons
    // =============================

    const actionButtons =
        document.querySelectorAll(
            ".admin-action-button"
        );


    actionButtons.forEach(
        button => {

            if (button.disabled) {

                return;

            }


            button.addEventListener(
                "click",
                function () {

                    const action =
                        button.dataset.action;


                    const studentId =
                        Number(
                            button.dataset.id
                        );


                    // =========================
                    // View Marks
                    // =========================

                    if (
                        action ===
                        "marks"
                    ) {

                        openMarksManagement(
                            studentId
                        );

                    }


                    // =========================
                    // Block / Unblock
                    // =========================

                    if (
                        action ===
                        "block"
                    ) {

                        const currentlyBlocked =
                            button.dataset.blocked ===
                            "true";


                        toggleStudentBlock(
                            studentId,
                            currentlyBlocked
                        );

                    }


                    // =========================
                    // Reset Password
                    // =========================

                    if (
                        action ===
                        "password"
                    ) {

                        resetStudentPassword(
                            studentId
                        );

                    }

                }
            );

        }
    );

}


// =================================
// Open Marks Management
// =================================

async function openMarksManagement(
    studentId
) {

    const student =
        students.find(
            item =>
                item.id ===
                studentId
        );


    if (!student) {

        return;

    }


    selectedStudentId =
        studentId;


    marksManagementSection.style.display =
        "block";


    selectedStudentInfo.textContent =
        `${student.name || "Unnamed Student"} • PRN: ${student.prn}`;


    marksMessage.textContent =
        "Loading marks...";


    marksTable.innerHTML = "";


    // Scroll to marks section

    marksManagementSection.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });


    try {

        const response =
            await fetch(
                `${API_BASE_URL}/admin/students/${studentId}/marks`,
                {
                    method: "GET",

                    headers: {
                        "Authorization":
                            `Bearer ${authToken}`
                    }
                }
            );


        // =============================
        // Authentication
        // =============================

        if (response.status === 401) {

            logoutUser();

            return;

        }


        // =============================
        // Permission
        // =============================

        if (response.status === 403) {

            marksMessage.textContent =
                "Admin permission required.";

            return;

        }


        const data =
            await response.json();


        if (!response.ok) {

            marksMessage.textContent =
                data.detail ||
                "Unable to load marks.";

            return;

        }


        displayMarks(
            data
        );


        marksMessage.textContent =
            "";


    }

    catch (error) {

        console.error(error);

        marksMessage.textContent =
            "Unable to connect to the server.";

    }

}


// =================================
// Display Marks
// =================================

function displayMarks(
    marks
) {

    marksTable.innerHTML = "";


    if (
        !Array.isArray(marks) ||
        marks.length === 0
    ) {

        marksTable.innerHTML = `
            <tr>
                <td colspan="5">
                    No marks records found.
                </td>
            </tr>
        `;

        return;

    }


    marks.forEach(
        mark => {

            const row =
                document.createElement(
                    "tr"
                );


            // =============================
            // Result
            // =============================

            let resultText = "—";

            let resultClass = "";


            if (
                mark.is_pass === true
            ) {

                resultText = "PASS";

                resultClass =
                    "pass-badge";

            }

            else if (
                mark.is_pass === false
            ) {

                resultText = "FAIL";

                resultClass =
                    "fail-badge";

            }


            // =============================
            // Marks
            // =============================

            const marksValue =
                mark.marks === null ||
                mark.marks === undefined
                    ? "—"
                    : mark.marks;


            // =============================
            // Row
            // =============================

            row.innerHTML = `

                <td>
                    ${escapeHTML(
                        mark.subject
                    )}
                </td>

                <td>
                    ${escapeHTML(
                        mark.exam
                    )}
                </td>

                <td>
                    ${marksValue}
                </td>

                <td>
                    ${
                        resultClass
                            ? `
                                <span
                                    class="${resultClass}"
                                >
                                    ${resultText}
                                </span>
                            `
                            : resultText
                    }
                </td>

                <td>
                    <button
                        class="admin-action-button"
                        disabled
                    >
                        Edit
                    </button>

                    <button
                        class="admin-action-button"
                        disabled
                    >
                        Delete
                    </button>
                </td>

            `;


            marksTable.appendChild(
                row
            );

        }
    );

}


// =================================
// Close Marks Management
// =================================

closeMarksButton.addEventListener(
    "click",
    function () {

        marksManagementSection.style.display =
            "none";


        selectedStudentId =
            null;

    }
);


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
                item.id ===
                studentId
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

        if (
            response.status ===
            401
        ) {

            logoutUser();

            return;

        }


        if (
            response.status ===
            403
        ) {

            adminMessage.textContent =
                "Admin permission required.";

            return;

        }


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
// Reset Student Password
// =================================

async function resetStudentPassword(
    studentId
) {

    const student =
        students.find(
            item =>
                item.id ===
                studentId
        );


    if (!student) {

        return;

    }


    // =================================
    // Ask For New Password
    // =================================

    const newPassword =
        prompt(
            `Enter a new password for ${student.name || student.prn}:\n\nMinimum 8 characters.`
        );


    // User cancelled

    if (newPassword === null) {

        return;

    }


    // =================================
    // Validate Password
    // =================================

    if (
        newPassword.length < 8
    ) {

        alert(
            "Password must contain at least 8 characters."
        );

        return;

    }


    if (
        newPassword.length > 128
    ) {

        alert(
            "Password cannot contain more than 128 characters."
        );

        return;

    }


    // =================================
    // Confirm Password
    // =================================

    const confirmPassword =
        prompt(
            "Confirm the new password:"
        );


    if (
        confirmPassword ===
        null
    ) {

        return;

    }


    if (
        newPassword !==
        confirmPassword
    ) {

        alert(
            "Passwords do not match."
        );

        return;

    }


    // =================================
    // Final Confirmation
    // =================================

    const confirmed =
        confirm(
            `Reset the password for ${student.name || student.prn}?`
        );


    if (!confirmed) {

        return;

    }


    try {

        adminMessage.textContent =
            "Resetting password...";


        const response =
            await fetch(
                `${API_BASE_URL}/admin/students/${studentId}/password`,
                {
                    method: "PATCH",

                    headers: {

                        "Content-Type":
                            "application/json",

                        "Authorization":
                            `Bearer ${authToken}`

                    },

                    body: JSON.stringify({

                        new_password:
                            newPassword

                    })

                }
            );


        const data =
            await response.json();


        // =============================
        // Authentication Error
        // =============================

        if (
            response.status ===
            401
        ) {

            logoutUser();

            return;

        }


        // =============================
        // Permission Error
        // =============================

        if (
            response.status ===
            403
        ) {

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
                "Unable to reset password.";

            return;

        }


        // =============================
        // Success
        // =============================

        adminMessage.textContent =
            data.message;

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


    if (
        searchValue === ""
    ) {

        displayStudents(
            students
        );

        return;

    }


    const filteredStudents =
        students.filter(
            student => {

                const prn =
                    String(
                        student.prn ||
                        ""
                    ).toLowerCase();


                const name =
                    String(
                        student.name ||
                        ""
                    ).toLowerCase();


                return (
                    prn.includes(
                        searchValue
                    ) ||
                    name.includes(
                        searchValue
                    )
                );

            }
        );


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

        logoutUser();

    }
);


// =================================
// Logout Helper
// =================================

function logoutUser() {

    localStorage.removeItem(
        "authToken"
    );

    localStorage.removeItem(
        "student"
    );

    window.location.href =
        "index.html";

}


// =================================
// HTML Escape Helper
// =================================

function escapeHTML(value) {

    return String(value)
        .replaceAll(
            "&",
            "&amp;"
        )
        .replaceAll(
            "<",
            "&lt;"
        )
        .replaceAll(
            ">",
            "&gt;"
        )
        .replaceAll(
            '"',
            "&quot;"
        )
        .replaceAll(
            "'",
            "&#039;"
        );

}


// =================================
// Start Dashboard
// =================================

loadStudents();