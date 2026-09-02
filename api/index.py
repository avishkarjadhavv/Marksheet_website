from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field
from pwdlib import PasswordHash

import jwt
import os

from datetime import datetime, timedelta, timezone

from api.database import get_connection


app = FastAPI()


# =================================
# CORS
# =================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# =================================
# Authentication Configuration
# =================================

password_hash = PasswordHash.recommended()

SECRET_KEY = os.getenv(
    "JWT_SECRET",
    "development-secret-change-this"
)

ALGORITHM = "HS256"

security = HTTPBearer()


# =================================
# Request Models
# =================================

class LoginRequest(BaseModel):
    prn: str
    password: str


class BlockRequest(BaseModel):
    is_blocked: bool


class ResetPasswordRequest(BaseModel):
    new_password: str = Field(
        min_length=8,
        max_length=128
    )


# =================================
# Get Current User
# =================================

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


# =================================
# Get Current Admin
# =================================

def get_current_admin(
    current_user: dict = Depends(get_current_user)
):

    if current_user["role"] != "admin":

        raise HTTPException(
            status_code=403,
            detail="Admin access required"
        )

    return current_user


# =================================
# Home
# =================================

@app.get("/api")
def home():

    return {
        "message": "Marksheet API is running"
    }


# =================================
# Get Marks
# =================================

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

        conditions.append(
            "prn = %s"
        )

        values.append(prn)


    if subject:

        conditions.append(
            "subject = %s"
        )

        values.append(subject)


    if exam:

        conditions.append(
            "exam = %s"
        )

        values.append(exam)


    if conditions:

        query += (
            " WHERE "
            + " AND ".join(conditions)
        )


    cursor.execute(
        query,
        values
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


# =================================
# Login
# =================================

@app.post("/api/login")
def login(
    request: LoginRequest
):

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


    # =================================
    # Check Blocked Account
    # =================================

    if is_blocked:

        raise HTTPException(
            status_code=403,
            detail=(
                "Your account has been blocked. "
                "Please contact the administrator."
            )
        )


    # =================================
    # Verify Password
    # =================================

    if not password_hash.verify(
        request.password,
        stored_password_hash
    ):

        raise HTTPException(
            status_code=401,
            detail="Invalid PRN or password"
        )


    # =================================
    # Create JWT
    # =================================

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


# =================================
# Get My Marks
# =================================

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


# =================================
# Admin Test
# =================================

@app.get("/api/admin/test")
def admin_test(
    current_admin: dict = Depends(get_current_admin)
):

    return {

        "message":
            "Admin authorization successful",

        "admin":
            current_admin

    }


# =================================
# Get All Students
# =================================

@app.get("/api/admin/students")
def get_all_students(
    current_admin: dict = Depends(get_current_admin)
):

    connection = get_connection()
    cursor = connection.cursor()


    query = """
        SELECT
            id,
            prn,
            name,
            role,
            is_blocked,
            created_at
        FROM students
        ORDER BY id
    """


    cursor.execute(query)

    rows = cursor.fetchall()

    cursor.close()
    connection.close()


    result = []


    for row in rows:

        result.append({

            "id": row[0],

            "prn": row[1],

            "name": row[2],

            "role": row[3],

            "is_blocked": row[4],

            "created_at": row[5]

        })


    return result


# =================================
# Block / Unblock Student
# =================================

@app.patch(
    "/api/admin/students/{student_id}/block"
)
def block_unblock_student(

    student_id: int,

    request: BlockRequest,

    current_admin: dict = Depends(
        get_current_admin
    )

):

    # =================================
    # Prevent Admin Self-Modification
    # =================================

    if student_id == current_admin["student_id"]:

        raise HTTPException(
            status_code=400,
            detail="You cannot block your own admin account."
        )


    connection = get_connection()
    cursor = connection.cursor()


    # =================================
    # Find Student
    # =================================

    query = """
        SELECT
            id,
            prn,
            name,
            role,
            is_blocked
        FROM students
        WHERE id = %s
    """


    cursor.execute(
        query,
        (student_id,)
    )


    student = cursor.fetchone()


    if student is None:

        cursor.close()
        connection.close()

        raise HTTPException(
            status_code=404,
            detail="Student not found"
        )


    # =================================
    # Prevent Admin Blocking
    # =================================

    if student[3] == "admin":

        cursor.close()
        connection.close()

        raise HTTPException(
            status_code=400,
            detail="Admin accounts cannot be blocked."
        )


    # =================================
    # Update Block Status
    # =================================

    update_query = """
        UPDATE students
        SET is_blocked = %s
        WHERE id = %s
    """


    cursor.execute(
        update_query,
        (
            request.is_blocked,
            student_id
        )
    )


    connection.commit()

    cursor.close()
    connection.close()


    status_text = (
        "blocked"
        if request.is_blocked
        else "unblocked"
    )


    return {

        "message":
            f"Student {status_text} successfully",

        "student": {

            "id": student[0],

            "prn": student[1],

            "name": student[2],

            "role": student[3],

            "is_blocked":
                request.is_blocked

        }

    }


# =================================
# Reset Student Password
# =================================

@app.patch(
    "/api/admin/students/{student_id}/password"
)
def reset_student_password(

    student_id: int,

    request: ResetPasswordRequest,

    current_admin: dict = Depends(
        get_current_admin
    )

):

    # =================================
    # Prevent Admin Self-Modification
    # =================================

    if student_id == current_admin["student_id"]:

        raise HTTPException(
            status_code=400,
            detail="You cannot reset your own admin password here."
        )


    connection = get_connection()
    cursor = connection.cursor()


    # =================================
    # Find Student
    # =================================

    query = """
        SELECT
            id,
            prn,
            name,
            role
        FROM students
        WHERE id = %s
    """


    cursor.execute(
        query,
        (student_id,)
    )


    student = cursor.fetchone()


    if student is None:

        cursor.close()
        connection.close()

        raise HTTPException(
            status_code=404,
            detail="Student not found"
        )


    # =================================
    # Prevent Admin Password Reset
    # =================================

    if student[3] == "admin":

        cursor.close()
        connection.close()

        raise HTTPException(
            status_code=400,
            detail="Admin passwords cannot be reset from this endpoint."
        )


    # =================================
    # Hash New Password
    # =================================

    new_password_hash = password_hash.hash(
            request.new_password
        )


    # =================================
    # Update Password
    # =================================

    update_query = """
        UPDATE students
        SET password_hash = %s
        WHERE id = %s
    """


    cursor.execute(
        update_query,
        (
            new_password_hash,
            student_id
        )
    )


    connection.commit()

    cursor.close()
    connection.close()


    # =================================
    # Response
    # =================================

    return {

        "message":
            "Student password reset successfully",

        "student": {

            "id": student[0],

            "prn": student[1],

            "name": student[2]

        }

    }