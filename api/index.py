from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from pwdlib import PasswordHash

import jwt
import os

from datetime import datetime, timedelta, timezone

from api.database import get_connection


app = FastAPI()


# --------------------------------------------------
# CORS
# --------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# --------------------------------------------------
# Authentication configuration
# --------------------------------------------------

password_hash = PasswordHash.recommended()

SECRET_KEY = os.getenv(
    "JWT_SECRET",
    "development-secret-change-this"
)

ALGORITHM = "HS256"

security = HTTPBearer()


# --------------------------------------------------
# Request models
# --------------------------------------------------

class LoginRequest(BaseModel):
    prn: str
    password: str


# --------------------------------------------------
# Verify JWT token
# --------------------------------------------------

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):

    token = credentials.credentials

    try:

        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM]
        )

        student_id = payload.get("student_id")
        prn = payload.get("prn")
        role = payload.get("role")

        if student_id is None or prn is None:
            raise HTTPException(
                status_code=401,
                detail="Invalid authentication token"
            )

        return {
            "student_id": student_id,
            "prn": prn,
            "role": role
        }

    except jwt.ExpiredSignatureError:

        raise HTTPException(
            status_code=401,
            detail="Authentication token has expired"
        )

    except jwt.InvalidTokenError:

        raise HTTPException(
            status_code=401,
            detail="Invalid authentication token"
        )


# --------------------------------------------------
# Home endpoint
# --------------------------------------------------

@app.get("/api")
def home():

    return {
        "message": "Marksheet API is running"
    }


# --------------------------------------------------
# PUBLIC MARKS ENDPOINT
# --------------------------------------------------
# This endpoint is kept temporarily for development.
# Later we will remove or protect it.
# --------------------------------------------------

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


# --------------------------------------------------
# STUDENT LOGIN
# --------------------------------------------------

@app.post("/api/login")
def login(request: LoginRequest):

    connection = get_connection()
    cursor = connection.cursor()

    query = """
        SELECT
            id,
            prn,
            password_hash,
            name,
            role,
            is_blocked
        FROM students
        WHERE prn = %s
    """

    cursor.execute(
        query,
        (request.prn,)
    )

    student = cursor.fetchone()

    cursor.close()
    connection.close()


    # Student does not exist
    if student is None:

        raise HTTPException(
            status_code=401,
            detail="Invalid PRN or password"
        )


    student_id = student[0]
    prn = student[1]
    stored_password_hash = student[2]
    name = student[3]
    role = student[4]
    is_blocked = student[5]


    # Check blocked account
    if is_blocked:

        raise HTTPException(
            status_code=403,
            detail="Your account has been blocked. Please contact the administrator."
        )


    # Verify password
    if not password_hash.verify(
        request.password,
        stored_password_hash
    ):

        raise HTTPException(
            status_code=401,
            detail="Invalid PRN or password"
        )


    # JWT expiration
    expiration = (
        datetime.now(timezone.utc)
        + timedelta(hours=12)
    )


    token_data = {
        "student_id": student_id,
        "prn": prn,
        "role": role,
        "exp": expiration
    }


    token = jwt.encode(
        token_data,
        SECRET_KEY,
        algorithm=ALGORITHM
    )


    return {

        "message": "Login successful",

        "token": token,

        "student": {
            "id": student_id,
            "prn": prn,
            "name": name,
            "role": role
        }
    }


# --------------------------------------------------
# GET LOGGED-IN STUDENT'S MARKS
# --------------------------------------------------

@app.get("/api/my-marks")
def get_my_marks(
    current_user: dict = Depends(get_current_user)
):

    student_prn = current_user["prn"]


    connection = get_connection()
    cursor = connection.cursor()


    query = """
        SELECT
            prn,
            subject,
            exam,
            marks,
            is_pass
        FROM marksheet
        WHERE prn = %s
    """


    cursor.execute(
        query,
        (student_prn,)
    )


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