from sqlalchemy import Column, Integer, String, Date, Boolean, ForeignKey, Table
from sqlalchemy.orm import relationship
from database import Base


class Article(Base):
    __tablename__ = "articles"

    id_article = Column(Integer, primary_key=True, index=True, server_default="nextval('articles_id_article_seq')")
    title = Column(String, nullable=False)
    journal = Column(String, nullable=False)
    voulume = Column(String, nullable=False)  # Nota: typo en "volume", pero respetamos BD
    pages = Column(String, nullable=False)
    number = Column(String)
    keywords = Column(String)
    doi = Column(String)
    resume = Column(String)
    id_article_type = Column(Integer, ForeignKey("articles_types.id_article_type"), nullable=True)
    report_date = Column(Date)
    issn = Column(String)
    id_country = Column(Integer, ForeignKey("countries.id_country"), nullable=True)
    month_only = Column(Integer, default=1, nullable=False)
    year_only = Column(Integer, default=2009, nullable=False)
    id_project = Column(Integer)
    only_date = Column(Date)
    id_group = Column(Integer)
    published = Column(Boolean, default=True, nullable=False)
    publicated = Column(Boolean, default=False, nullable=False)

    # Relaciones
    country = relationship("Country", foreign_keys=[id_country])
    article_type = relationship("ArticleType", foreign_keys=[id_article_type])
    authors = relationship(
        "Integrant",
        secondary="articles_authors",
        back_populates="articles"
    )

# Tabla intermedia (opcional, pero útil para operaciones directas)
articles_authors = Table(
    "articles_authors",
    Base.metadata,
    Column(
        "id_article_author",
        Integer,
        primary_key=True,
        server_default="nextval('articles_authors_id_article_author_seq')"
    ),
    Column("id_article", Integer, ForeignKey("articles.id_article")),
    Column("id_author", Integer, ForeignKey("integrant.id_integrant"))
)