# group/routes.py
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from database import SessionLocal
from . import crud, schemas

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

router = APIRouter(
    prefix="/groups",
    tags=["groups"]
)

@router.get("/", response_model=List[schemas.Group])
def read_groups(
    skip: int = 0,
    limit: int = 100,
    id_admin: Optional[int] = Query(None),
    search: Optional[str] = Query(None, description="Search in name, subjects or problems"),
    db: Session = Depends(get_db)
):
    try:
        return crud.get_groups(db, skip=skip, limit=limit, search=search, id_admin= id_admin)
    except Exception as e:
        print(e),
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{group_id}", response_model=schemas.Group)
def read_group(group_id: int, db: Session = Depends(get_db)):
    db_group = crud.get_group(db, group_id)
    if db_group is None:
        raise HTTPException(status_code=404, detail="Group not found")
    return db_group

@router.post("/", response_model=schemas.Group)
def create_group(group: schemas.GroupCreate, db: Session = Depends(get_db)):
    # Asegurar fechas si no se pasan
    if not group.create_date:
        group.create_date = datetime.utcnow()
    if not group.update_date:
        group.update_date = datetime.utcnow()
    try:
        return crud.create_group(db=db, group=group)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as i:
        print(i)
        raise HTTPException(status_code=500, detail="Internal server error")

@router.put("/{group_id}", response_model=schemas.Group)
def update_group(group_id: int, group: schemas.GroupUpdate, db: Session = Depends(get_db)):
    try:
        db_group = crud.update_group(db, group_id, group)
        if db_group is None:
            raise HTTPException(status_code=404, detail="Group not found")
        return db_group
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as i:
        print(i)
        raise HTTPException(status_code=500, detail="Internal server error")

@router.delete("/{group_id}", response_model=schemas.GroupDelete)
def delete_group(group_id: int, db: Session = Depends(get_db)):
    
    db_group = crud.delete_group(db, group_id)
    if db_group is None:
        raise HTTPException(status_code=404, detail="Group not found")
    
    return db_group

@router.get("/count/faculty", response_model=list[schemas.GroupCountByFaculty])
def get_group_count_by_faculty_endpoint(db: Session = Depends(get_db)):
    return crud.get_group_count_by_faculty(db)

@router.get("/count/by_members", response_model=list[schemas.GroupWithMemberCount])
def get_groups_with_member_count_endpoint(db: Session = Depends(get_db)):
    return crud.get_groups_with_member_count(db)