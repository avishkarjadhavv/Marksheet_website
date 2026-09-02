const API_URL = "https://marksheet-website-tdkw.vercel.app/api/marks";

const prnInput = document.getElementById("prn");
const subjectSelect = document.getElementById("subject");
const examSelect = document.getElementById("exam");

const filterButton = document.getElementById("filterButton");
const resetButton = document.getElementById("resetButton");

const marksTable = document.getElementById("marksTable");
const resultCount = document.getElementById("resultCount");

let allMarks = [];


/*
    Load all marks from the API
*/
async function loadMarks() {

    try {

        const response = await fetch(API_URL);

        if (!response.ok) {
            throw new Error("Failed to fetch marks");
        }

        allMarks = await response.json();

        displayMarks(allMarks);

        populateFilters(allMarks);

    } catch (error) {

        console.error(error);

        marksTable.innerHTML = `
            <tr>
                <td colspan="5">
                    Unable to load marks
                </td>
            </tr>
        `;
    }
}


/*
    Display marks in the table
*/
function displayMarks(data) {

    marksTable.innerHTML = "";

    resultCount.textContent = `Showing ${data.length} record(s)`;


    if (data.length === 0) {

        marksTable.innerHTML = `
            <tr>
                <td colspan="5">
                    No records found
                </td>
            </tr>
        `;

        return;
    }


    data.forEach(mark => {

        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${mark.prn}</td>

            <td>${mark.subject}</td>

            <td>${mark.exam}</td>

            <td>${mark.marks ?? "—"}</td>

            <td>${mark.is_pass === null
                ? "—"
                : mark.is_pass
                    ? "Yes"
                    : "No"
            }</td>
        `;

        marksTable.appendChild(row);

    });
}


/*
    Create Subject and Exam dropdown options
*/
function populateFilters(data) {

    const subjects = [...new Set(
        data.map(mark => mark.subject)
    )];

    const exams = [...new Set(
        data.map(mark => mark.exam)
    )];


    subjects.sort();
    exams.sort();


    subjectSelect.innerHTML = `
        <option value="">All Subjects</option>
    `;

    examSelect.innerHTML = `
        <option value="">All Exams</option>
    `;


    subjects.forEach(subject => {

        const option = document.createElement("option");

        option.value = subject;
        option.textContent = subject;

        subjectSelect.appendChild(option);

    });


    exams.forEach(exam => {

        const option = document.createElement("option");

        option.value = exam;
        option.textContent = exam;

        examSelect.appendChild(option);

    });
}


/*
    Apply filters
*/
async function applyFilters() {

    const prn = prnInput.value.trim();
    const subject = subjectSelect.value;
    const exam = examSelect.value;


    const params = new URLSearchParams();


    if (prn) {
        params.append("prn", prn);
    }

    if (subject) {
        params.append("subject", subject);
    }

    if (exam) {
        params.append("exam", exam);
    }


    const url = params.toString()
        ? `${API_URL}?${params.toString()}`
        : API_URL;


    try {

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error("Failed to fetch filtered marks");
        }

        const data = await response.json();

        displayMarks(data);

    } catch (error) {

        console.error(error);

        marksTable.innerHTML = `
            <tr>
                <td colspan="5">
                    Error loading data
                </td>
            </tr>
        `;
    }
}


/*
    Reset filters
*/
function resetFilters() {

    prnInput.value = "";

    subjectSelect.value = "";

    examSelect.value = "";

    displayMarks(allMarks);
}


/*
    Button events
*/
filterButton.addEventListener(
    "click",
    applyFilters
);

resetButton.addEventListener(
    "click",
    resetFilters
);


/*
    Load data when website opens
*/
loadMarks();