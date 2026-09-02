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

const addMarksButton =
    document.getElementById(
        "addMarksButton"
    );


// =================================
// Marks Form DOM Elements
// =================================

const marksFormSection =
    document.getElementById(
        "marksFormSection"
    );

const marksForm =
    document.getElementById(
        "marksForm"
    );

const marksFormTitle =
    document.getElementById(
        "marksFormTitle"
    );

const marksFormMessage =
    document.getElementById(
        "marksFormMessage"
    );

const marksSubject =
    document.getElementById(
        "marksSubject"
    );

const marksExam =
    document.getElementById(
        "marksExam"
    );

const marksValue =
    document.getElementById(
        "marksValue"
    );

const saveMarksButton =
    document.getElementById(
        "saveMarksButton"
    );

const cancelMarksButton =
    document.getElementById(
        "cancelMarksButton"
    );


// =================================
// Student Data
// =================================

let students = [];


// =================================
// Current Selected Student
// =================================

let selectedStudentId = null;


// =================================
// Current Marks
// =================================

let currentMarks = [];


// =================================
// Editing Mark
// =================================

let editingMarkId = null;


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

    editingMarkId =
        null;


    marksManagementSection.style.display =
        "block";


    marksFormSection.style.display =
        "none";


    selectedStudentInfo.textContent =
        `${student.name || "Unnamed Student"} • PRN: ${student.prn}`;


    marksMessage.textContent =
        "Loading marks...";


    marksTable.innerHTML = "";


    marksManagementSection.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });


    await loadStudentMarks(
        studentId
    );

}


// =================================
// Display Marks
// =================================

function displayMarks(
    marks
) {

    marksTable.innerHTML = "";


    currentMarks =
        Array.isArray(marks)
            ? marks
            : [];


    if (
        currentMarks.length === 0
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


    currentMarks.forEach(
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

            const marksDisplay =
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
                    ${marksDisplay}
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
                        data-mark-action="edit"
                        data-mark-id="${mark.id}"
                    >
                        Edit
                    </button>

                    <button
                        class="admin-action-button"
                        data-mark-action="delete"
                        data-mark-id="${mark.id}"
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


    // =============================
    // Edit Buttons
    // =============================

    const editButtons =
        marksTable.querySelectorAll(
            '[data-mark-action="edit"]'
        );


    editButtons.forEach(
        button => {

            button.addEventListener(
                "click",
                function () {

                    const markId =
                        Number(
                            button.dataset.markId
                        );


                    openEditMarksForm(
                        markId
                    );

                }
            );

        }
    );


    // =============================
    // Delete Buttons
    // =============================

    const deleteButtons =
        marksTable.querySelectorAll(
            '[data-mark-action="delete"]'
        );


    deleteButtons.forEach(
        button => {

            button.addEventListener(
                "click",
                function () {

                    const markId =
                        Number(
                            button.dataset.markId
                        );


                    deleteMark(
                        markId
                    );

                }
            );

        }
    );

}


// =================================
// Open Add Marks Form
// =================================

addMarksButton.addEventListener(
    "click",
    function () {

        if (
            selectedStudentId === null
        ) {

            return;

        }


        editingMarkId =
            null;


        marksForm.reset();


        marksFormTitle.textContent =
            "Add Marks";


        marksFormMessage.textContent =
            "";


        saveMarksButton.textContent =
            "Save Marks";


        marksFormSection.style.display =
            "block";


        marksFormSection.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });

    }
);


// =================================
// Open Edit Marks Form
// =================================

function openEditMarksForm(
    markId
) {

    const mark =
        currentMarks.find(
            item =>
                Number(item.id) ===
                Number(markId)
        );


    if (!mark) {

        return;

    }


    editingMarkId =
        Number(markId);


    marksFormTitle.textContent =
        "Edit Marks";


    marksFormMessage.textContent =
        "";


    marksSubject.value =
        mark.subject || "";


    marksExam.value =
        mark.exam || "";


    marksValue.value =
        mark.marks === null ||
        mark.marks === undefined
            ? ""
            : mark.marks;


    saveMarksButton.textContent =
        "Save Changes";


    marksFormSection.style.display =
        "block";


    marksFormSection.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });

}


// =================================
// Cancel Marks Form
// =================================

cancelMarksButton.addEventListener(
    "click",
    function () {

        marksForm.reset();

        marksFormMessage.textContent =
            "";

        editingMarkId =
            null;

        marksFormSection.style.display =
            "none";

    }
);


// =================================
// Save Marks
// =================================

marksForm.addEventListener(
    "submit",
    async function (event) {

        event.preventDefault();


        if (
            selectedStudentId === null
        ) {

            marksFormMessage.textContent =
                "Please select a student first.";

            return;

        }


        const subject =
            marksSubject.value.trim();

        const exam =
            marksExam.value;

        const marks =
            Number(
                marksValue.value
            );


        // =============================
        // Frontend Validation
        // =============================

        if (subject === "") {

            marksFormMessage.textContent =
                "Subject is required.";

            return;

        }


        if (
            !["TA1", "MSE", "ESE"].includes(
                exam
            )
        ) {

            marksFormMessage.textContent =
                "Please select a valid exam.";

            return;

        }


        if (
            !Number.isInteger(marks) ||
            marks < 0
        ) {

            marksFormMessage.textContent =
                "Marks must be a valid number greater than or equal to 0.";

            return;

        }


        try {

            saveMarksButton.disabled =
                true;


            saveMarksButton.textContent =
                editingMarkId === null
                    ? "Saving..."
                    : "Updating...";


            marksFormMessage.textContent =
                editingMarkId === null
                    ? "Adding marks..."
                    : "Updating marks...";


            // =============================
            // ADD MARKS
            // =============================

            if (
                editingMarkId === null
            ) {

                const response =
                    await fetch(
                        `${API_BASE_URL}/admin/students/${selectedStudentId}/marks`,
                        {
                            method: "POST",

                            headers: {

                                "Content-Type":
                                    "application/json",

                                "Authorization":
                                    `Bearer ${authToken}`

                            },

                            body: JSON.stringify({

                                subject:
                                    subject,

                                exam:
                                    exam,

                                marks:
                                    marks

                            })

                        }
                    );


                if (
                    response.status === 401
                ) {

                    logoutUser();

                    return;

                }


                const data =
                    await response.json();


                if (
                    response.status === 403
                ) {

                    marksFormMessage.textContent =
                        data.detail ||
                        "Admin permission required.";

                    return;

                }


                if (!response.ok) {

                    marksFormMessage.textContent =
                        data.detail ||
                        "Unable to add marks.";

                    return;

                }


                marksFormMessage.textContent =
                    "Marks added successfully.";

            }


            // =============================
            // EDIT MARKS
            // =============================

            else {

                const response =
                    await fetch(
                        `${API_BASE_URL}/admin/marks/${editingMarkId}`,
                        {
                            method: "PATCH",

                            headers: {

                                "Content-Type":
                                    "application/json",

                                "Authorization":
                                    `Bearer ${authToken}`

                            },

                            body: JSON.stringify({

                                subject:
                                    subject,

                                exam:
                                    exam,

                                marks:
                                    marks

                            })

                        }
                    );


                if (
                    response.status === 401
                ) {

                    logoutUser();

                    return;

                }


                const data =
                    await response.json();


                if (
                    response.status === 403
                ) {

                    marksFormMessage.textContent =
                        data.detail ||
                        "Admin permission required.";

                    return;

                }


                if (!response.ok) {

                    marksFormMessage.textContent =
                        data.detail ||
                        "Unable to update marks.";

                    return;

                }


                marksFormMessage.textContent =
                    "Marks updated successfully.";

            }


            // =============================
            // Reload Marks
            // =============================

            await loadStudentMarks(
                selectedStudentId
            );


            // =============================
            // Reset Form State
            // =============================

            marksForm.reset();

            editingMarkId =
                null;


            saveMarksButton.textContent =
                "Save Marks";


            // =============================
            // Hide Form
            // =============================

            setTimeout(
                function () {

                    marksFormSection.style.display =
                        "none";

                    marksFormMessage.textContent =
                        "";

                },
                700
            );

        }

        catch (error) {

            console.error(error);

            marksFormMessage.textContent =
                "Unable to connect to the server.";

        }

        finally {

            saveMarksButton.disabled =
                false;

            if (
                editingMarkId === null
            ) {

                saveMarksButton.textContent =
                    "Save Marks";

            }

            else {

                saveMarksButton.textContent =
                    "Save Changes";

            }

        }

    }
);


// =================================
// Load Student Marks
// =================================

async function loadStudentMarks(
    studentId
) {

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


        if (
            response.status === 401
        ) {

            logoutUser();

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
            data.marks
        );


        marksMessage.textContent =
            "";

    }

    catch (error) {

        console.error(error);

        marksMessage.textContent =
            "Unable to load marks.";

    }

}


// =================================
// Delete Mark
// =================================

async function deleteMark(
    markId
) {

    const mark =
        currentMarks.find(
            item =>
                Number(item.id) ===
                Number(markId)
        );


    if (!mark) {

        return;

    }


    // =================================
    // Confirmation
    // =================================

    const confirmed =
        confirm(
            `Are you sure you want to delete ${mark.subject} - ${mark.exam} (${mark.marks ?? "No marks"})?`
        );


    if (!confirmed) {

        return;

    }


    try {

        marksMessage.textContent =
            "Deleting mark...";


        const response =
            await fetch(
                `${API_BASE_URL}/admin/marks/${markId}`,
                {
                    method: "DELETE",

                    headers: {
                        "Authorization":
                            `Bearer ${authToken}`
                    }
                }
            );


        // =============================
        // Authentication
        // =============================

        if (
            response.status === 401
        ) {

            logoutUser();

            return;

        }


        const data =
            await response.json();


        // =============================
        // Permission
        // =============================

        if (
            response.status === 403
        ) {

            marksMessage.textContent =
                data.detail ||
                "Admin permission required.";

            return;

        }


        // =============================
        // Other Errors
        // =============================

        if (!response.ok) {

            marksMessage.textContent =
                data.detail ||
                "Unable to delete mark.";

            return;

        }


        // =============================
        // Success
        // =============================

        marksMessage.textContent =
            "Mark deleted successfully.";


        // Refresh table

        await loadStudentMarks(
            selectedStudentId
        );

    }

    catch (error) {

        console.error(error);

        marksMessage.textContent =
            "Unable to connect to the server.";

    }

}


// =================================
// Close Marks Management
// =================================

closeMarksButton.addEventListener(
    "click",
    function () {

        marksManagementSection.style.display =
            "none";


        marksFormSection.style.display =
            "none";


        marksForm.reset();


        marksFormMessage.textContent =
            "";


        selectedStudentId =
            null;


        editingMarkId =
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