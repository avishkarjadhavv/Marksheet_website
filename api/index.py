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
    allow_origins=["https://marksheet-website1.vercel.app"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# =================================
# Authentication Configuration
# =================================

password_hash = PasswordHash.recommended()

SECRET_KEY = os.getenv("JWT_SECRET")

if not SECRET_KEY:
    raise RuntimeError("JWT_SECRET environment variable is not set")

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


class MarksCreateRequest(BaseModel):
    subject: str = Field(
        min_length=1,
        max_length=100
    )

    exam: str = Field(
        min_length=1,
        max_length=50
    )

    marks: int | None = Field(
        default=None,
        ge=0
    )


class MarksUpdateRequest(BaseModel):
    subject: str | None = Field(
        default=None,
        min_length=1,
        max_length=100
    )

    exam: str | None = Field(
        default=None,
        min_length=1,
        max_length=50
    )

    marks: int | None = Field(
        default=None,
        ge=0
    )


# =================================
# Pass/Fail Calculation
# =================================

def calculate_is_pass(
    subject: str,
    exam: str,
    marks: int | None
):

    # No marks = no result
    if marks is None:

        return None


    exam = exam.strip().upper()

    subject = subject.strip().upper()


    # =================================
    # TA1
    # =================================

    if exam == "TA1":

        if subject == "OS":

            return marks >= 12

        else:

            return marks >= 8


    # =================================
    # MSE
    # =================================

    if exam == "MSE":

        return marks >= 12


    # =================================
    # ESE
    # =================================

    if exam == "ESE":

        # ESE passing criteria currently unknown
        return None


    # =================================
    # Unknown Exam
    # =================================

    return None


# =================================
# Get Current User
# =================================

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(
        security
    )
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

        # Check current account status in database
        with get_connection() as connection:

            with connection.cursor() as cursor:

                cursor.execute(
                    """
                    SELECT is_blocked
                    FROM students
                    WHERE id = %s
                    """,
                    (student_id,)
                )

                student = cursor.fetchone()

        if student is None:

            raise HTTPException(
                status_code=401,
                detail="Student account not found"
            )

        if student[0]:

            raise HTTPException(
                status_code=403,
                detail="Your account has been blocked"
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
# Login
# =================================

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
        (request.prn.strip(),)
    )

    student = cursor.fetchone()

    cursor.close()
    connection.close()

    if student is None:

        raise HTTPException(
            status_code=401,
            detail="Invalid PRN or password"
        )

    if not password_hash.verify(
        request.password,
        student[2]
    ):

        raise HTTPException(
            status_code=401,
            detail="Invalid PRN or password"
        )

    if student[5]:

        raise HTTPException(
            status_code=403,
            detail="Your account has been blocked"
        )

    token_payload = {
        "student_id": student[0],
        "prn": student[1],
        "role": student[4],
        "exp": datetime.now(timezone.utc) + timedelta(hours=24)
    }

    token = jwt.encode(
        token_payload,
        SECRET_KEY,
        algorithm=ALGORITHM
    )

    return {
        "token": token,
        "token_type": "bearer",
        "student": {
            "id": student[0],
            "prn": student[1],
            "name": student[3],
            "role": student[4]
        }
    }


# =================================
# Get Current Admin
# =================================

def get_current_admin(
    current_user: dict = Depends(
        get_current_user
    )
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
# Get My Marks
# =================================

@app.get("/api/my-marks")
def get_my_marks(

    current_user: dict = Depends(
        get_current_user
    )

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
        ORDER BY id
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

    current_admin: dict = Depends(
        get_current_admin
    )

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

    current_admin: dict = Depends(
        get_current_admin
    )

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
    # Update Status
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
            detail=(
                "You cannot reset your own admin "
                "password here."
            )
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
            detail=(
                "Admin passwords cannot be reset "
                "from this endpoint."
            )
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


    return {

        "message":
            "Student password reset successfully",

        "student": {

            "id": student[0],

            "prn": student[1],

            "name": student[2]

        }

    }


# =================================
# Get Student Marks - Admin
# =================================

@app.get(
    "/api/admin/students/{student_id}/marks"
)
def get_student_marks(

    student_id: int,

    current_admin: dict = Depends(
        get_current_admin
    )

):

    connection = get_connection()

    cursor = connection.cursor()


    # =================================
    # Check Student
    # =================================

    student_query = """
        SELECT
            id,
            prn,
            name
        FROM students
        WHERE id = %s
    """


    cursor.execute(
        student_query,
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
    # Get Marks
    # =================================

    marks_query = """
        SELECT
            id,
            prn,
            subject,
            exam,
            marks,
            is_pass
        FROM marksheet
        WHERE prn = %s
        ORDER BY id
    """


    cursor.execute(
        marks_query,
        (student[1],)
    )


    rows = cursor.fetchall()


    cursor.close()

    connection.close()


    result = []


    for row in rows:

        result.append({

            "id": row[0],

            "prn": row[1],

            "subject": row[2],

            "exam": row[3],

            "marks": row[4],

            "is_pass": row[5]

        })


    return {

        "student": {

            "id": student[0],

            "prn": student[1],

            "name": student[2]

        },

        "marks": result

    }


# =================================
# Add Student Mark
# =================================

@app.post(
    "/api/admin/students/{student_id}/marks"
)
def add_student_mark(

    student_id: int,

    request: MarksCreateRequest,

    current_admin: dict = Depends(
        get_current_admin
    )

):

    subject = request.subject.strip()

    exam = request.exam.strip().upper()


    if not subject:

        raise HTTPException(
            status_code=400,
            detail="Subject cannot be empty"
        )


    if exam not in (
        "TA1",
        "MSE",
        "ESE"
    ):

        raise HTTPException(
            status_code=400,
            detail=(
                "Exam must be TA1, MSE, or ESE."
            )
        )


    connection = get_connection()

    cursor = connection.cursor()


    # =================================
    # Find Student
    # =================================

    student_query = """
        SELECT
            id,
            prn,
            name
        FROM students
        WHERE id = %s
    """


    cursor.execute(
        student_query,
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
    # Prevent Duplicate Mark
    # =================================

    duplicate_query = """
        SELECT id
        FROM marksheet
        WHERE
            prn = %s
            AND LOWER(subject) = LOWER(%s)
            AND UPPER(exam) = UPPER(%s)
    """


    cursor.execute(
        duplicate_query,
        (
            student[1],
            subject,
            exam
        )
    )


    duplicate = cursor.fetchone()


    if duplicate is not None:

        cursor.close()

        connection.close()

        raise HTTPException(
            status_code=409,
            detail=(
                "Marks for this subject and exam "
                "already exist. Edit the existing record."
            )
        )


    # =================================
    # Calculate Result
    # =================================

    is_pass = calculate_is_pass(
        subject,
        exam,
        request.marks
    )


    # =================================
    # Insert Mark
    # =================================

    insert_query = """
        INSERT INTO marksheet
        (
            prn,
            subject,
            exam,
            marks,
            is_pass
        )
        VALUES
        (
            %s,
            %s,
            %s,
            %s,
            %s
        )
        RETURNING
            id,
            prn,
            subject,
            exam,
            marks,
            is_pass
    """


    cursor.execute(
        insert_query,
        (
            student[1],
            subject,
            exam,
            request.marks,
            is_pass
        )
    )


    new_mark = cursor.fetchone()


    connection.commit()


    cursor.close()

    connection.close()


    return {

        "message":
            "Marks added successfully",

        "mark": {

            "id": new_mark[0],

            "prn": new_mark[1],

            "subject": new_mark[2],

            "exam": new_mark[3],

            "marks": new_mark[4],

            "is_pass": new_mark[5]

        }

    }


# =================================
# Update Mark
# =================================

@app.patch(
    "/api/admin/marks/{mark_id}"
)
def update_student_mark(

    mark_id: int,

    request: MarksUpdateRequest,

    current_admin: dict = Depends(
        get_current_admin
    )

):

    connection = get_connection()

    cursor = connection.cursor()


    # =================================
    # Find Existing Mark
    # =================================

    query = """
        SELECT
            id,
            prn,
            subject,
            exam,
            marks
        FROM marksheet
        WHERE id = %s
    """


    cursor.execute(
        query,
        (mark_id,)
    )


    existing_mark = cursor.fetchone()


    if existing_mark is None:

        cursor.close()

        connection.close()

        raise HTTPException(
            status_code=404,
            detail="Marks record not found"
        )


    # =================================
    # Keep Existing Values
    # =================================

    new_subject = (
        request.subject.strip()
        if request.subject is not None
        else existing_mark[2]
    )


    new_exam = (
        request.exam.strip().upper()
        if request.exam is not None
        else existing_mark[3]
    )


    new_marks = request.marks


    # =================================
    # Validate Exam
    # =================================

    if new_exam not in (
        "TA1",
        "MSE",
        "ESE"
    ):

        cursor.close()

        connection.close()

        raise HTTPException(
            status_code=400,
            detail=(
                "Exam must be TA1, MSE, or ESE."
            )
        )


    # =================================
    # Check Duplicate
    # =================================

    duplicate_query = """
        SELECT id
        FROM marksheet
        WHERE
            prn = %s
            AND LOWER(subject) = LOWER(%s)
            AND UPPER(exam) = UPPER(%s)
            AND id <> %s
    """


    cursor.execute(
        duplicate_query,
        (
            existing_mark[1],
            new_subject,
            new_exam,
            mark_id
        )
    )


    duplicate = cursor.fetchone()


    if duplicate is not None:

        cursor.close()

        connection.close()

        raise HTTPException(
            status_code=409,
            detail=(
                "Another marks record already exists "
                "for this subject and exam."
            )
        )


    # =================================
    # Calculate Result
    # =================================

    is_pass = calculate_is_pass(
        new_subject,
        new_exam,
        new_marks
    )


    # =================================
    # Update Database
    # =================================

    update_query = """
        UPDATE marksheet
        SET
            subject = %s,
            exam = %s,
            marks = %s,
            is_pass = %s
        WHERE id = %s
        RETURNING
            id,
            prn,
            subject,
            exam,
            marks,
            is_pass
    """


    cursor.execute(
        update_query,
        (
            new_subject,
            new_exam,
            new_marks,
            is_pass,
            mark_id
        )
    )


    updated_mark = cursor.fetchone()


    connection.commit()


    cursor.close()

    connection.close()


    return {

        "message":
            "Marks updated successfully",

        "mark": {

            "id": updated_mark[0],

            "prn": updated_mark[1],

            "subject": updated_mark[2],

            "exam": updated_mark[3],

            "marks": updated_mark[4],

            "is_pass": updated_mark[5]

        }

    }


# =================================
# Delete Mark
# =================================

@app.delete(
    "/api/admin/marks/{mark_id}"
)
def delete_student_mark(

    mark_id: int,

    current_admin: dict = Depends(
        get_current_admin
    )

):

    connection = get_connection()

    cursor = connection.cursor()


    # =================================
    # Find Mark
    # =================================

    query = """
        SELECT
            id,
            prn,
            subject,
            exam,
            marks,
            is_pass
        FROM marksheet
        WHERE id = %s
    """


    cursor.execute(
        query,
        (mark_id,)
    )


    mark = cursor.fetchone()


    if mark is None:

        cursor.close()

        connection.close()

        raise HTTPException(
            status_code=404,
            detail="Marks record not found"
        )


    # =================================
    # Delete
    # =================================

    delete_query = """
        DELETE FROM marksheet
        WHERE id = %s
    """


    cursor.execute(
        delete_query,
        (mark_id,)
    )


    connection.commit()


    cursor.close()

    connection.close()


    return {

        "message":
            "Marks deleted successfully",

        "mark": {

            "id": mark[0],

            "prn": mark[1],

            "subject": mark[2],

            "exam": mark[3],

            "marks": mark[4],

            "is_pass": mark[5]

        }

    }