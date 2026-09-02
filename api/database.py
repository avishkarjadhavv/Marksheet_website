import os
import psycopg
from dotenv import load_dotenv


load_dotenv()


def get_connection():

    database_host = os.getenv("DB_HOST")

    # Local PostgreSQL
    if database_host in ("localhost", "127.0.0.1"):
        return psycopg.connect(
            host=database_host,
            port=os.getenv("DB_PORT", "5432"),
            dbname=os.getenv("DB_NAME"),
            user=os.getenv("DB_USER"),
            password=os.getenv("DB_PASSWORD"),
            sslmode="disable"
        )

    # Neon / production PostgreSQL
    return psycopg.connect(
        host=database_host,
        port=os.getenv("DB_PORT"),
        dbname=os.getenv("DB_NAME"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
        sslmode="require"
    )