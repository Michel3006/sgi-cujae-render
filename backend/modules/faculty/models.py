# faculty/models.py
from sqlalchemy import Column, Integer, String
from database import Base

class Faculty(Base):
    __tablename__ = "faculty"

    id_faculty = Column(Integer, primary_key=True, index=True, server_default="nextval('faculty_id_faculty_seq')")
    name = Column(String, nullable=False)
    fullname = Column(String, nullable=True)