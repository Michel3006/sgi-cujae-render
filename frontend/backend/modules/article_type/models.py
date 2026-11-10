from sqlalchemy import Column, Integer, String
from database import Base

class ArticleType(Base):
    __tablename__ = "articles_types"

    id_article_type = Column(
        Integer,
        primary_key=True,
        index=True,
        server_default="nextval('articles_types_id_article_type_seq')"
    )
    name = Column(String, nullable=True)