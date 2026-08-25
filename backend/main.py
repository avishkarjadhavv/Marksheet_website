from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import get_connection

app = FastAPI()

# Allow our frontend to communicate with the API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def home():
    return {"message": "Marksheet API is running"}


@app.get("/api/marks")
def get_marks(
    prn: str | None = None,
    subject: str | None = None,
    exam: str | None = None
):
    connection = get_connection()
    cursor = connection.cursor()

    query = """
        SELECT prn, subject, exam, marks, is_pass
        FROM marksheet
    """

    conditions = []
    values = []

    if prn:
        conditions.append("prn = %s")
        values.append(prn)

    if subject:
        conditions.append("subject = %s")
        values.append(subject)

    if exam:
        conditions.append("exam = %s")
        values.append(exam)

    if conditions:
        query += " WHERE " + " AND ".join(conditions)

    cursor.execute(query, values)

    rows = cursor.fetchall()

    cursor.close()
    connection.close()

    result = []

    for row in rows:
        result.append({
            "prn": row[0],
            "subject": row[1],
            "exam": row[2],
            "marks": row[3],
            "is_pass": row[4]
        })

    return result