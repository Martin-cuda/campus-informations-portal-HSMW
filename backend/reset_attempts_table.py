from sqlalchemy import Column, Integer, String, DateTime, Index
from datenbank import Base
from datetime import datetime

class PasswordResetAttempt(Base):
    __tablename__ = "password_reset_attempts"

    id = Column(Integer, primary_key=True)
    username = Column(String, index=True)
    ip = Column(String, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index(
            "idx_reset_lookup",
            "username",
            "ip",
            "created_at"
        ),
    )
