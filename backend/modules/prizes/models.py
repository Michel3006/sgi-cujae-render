# prizes/models.py
from sqlalchemy import Column, Integer, String, Date, Boolean, ForeignKey, Table
from sqlalchemy.orm import relationship
from database import Base
from modules.prizes_type.models import PrizeType


class Prize(Base):
    __tablename__ = "prizes"

    id_prize = Column(
        Integer,
        primary_key=True,
        index=True,
        server_default="nextval('prizes_id_prize_seq')"
    )
    title = Column(String, nullable=False)
    grant_institution = Column(String, nullable=False)
    keywords = Column(String)
    resume = Column(String)
    id_prize_type = Column(Integer, ForeignKey("prizes_types.id_prize_type"), nullable=True)
    report_date = Column(Date)
    id_country = Column(Integer, ForeignKey("countries.id_country"), nullable=True)
    month_only = Column(Integer, default=1, nullable=False)
    year_only = Column(Integer, default=2009, nullable=False)
    id_project = Column(Integer)
    only_date = Column(Date)
    id_group = Column(Integer)
    publicated = Column(Boolean, default=False, nullable=False)

    # Relaciones
    country = relationship("Country", foreign_keys=[id_country])
    prize_type = relationship(PrizeType, foreign_keys=[id_prize_type])
    authors = relationship(
        "Integrant",
        secondary="prizes_authors",
        back_populates="prizes"
    )

# Tabla intermedia
prizes_authors = Table(
    "prizes_authors",
    Base.metadata,
    Column("id_prize_author", Integer, primary_key=True, server_default="nextval('prizes_authors_id_prize_author_seq')"),
    Column("id_prize", Integer, ForeignKey("prizes.id_prize")),
    Column("id_author", Integer, ForeignKey("integrant.id_integrant")),
    extend_existing=True
)