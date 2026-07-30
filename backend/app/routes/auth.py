from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from passlib.context import CryptContext
import jwt
from ..database import get_db
from ..models import User
from ..schemas import LoginRequest, TokenResponse
from ..config import settings

router = APIRouter(prefix="/api/auth", tags=["auth"])
pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")
security = HTTPBearer()


def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_expire_minutes)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    token = credentials.credentials
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        username = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

    result = await db.execute(select(User).where(User.username == username))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return user


@router.post("/login", response_model=TokenResponse)
async def login(request: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.username == request.username))
    user = result.scalar_one_or_none()
    if not user or not pwd_context.verify(request.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token({"sub": user.username, "id": user.id, "admin": user.is_admin})
    return TokenResponse(access_token=token)


@router.get("/me")
async def get_me(user: User = Depends(get_current_user)):
    return {
        "id": user.id,
        "username": user.username,
        "is_admin": user.is_admin,
    }


@router.post("/setup", response_model=TokenResponse)
async def setup_admin(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.is_admin == True))
    existing = result.scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail="Admin already exists")

    admin = User(
        username="admin",
        password_hash=pwd_context.hash("admin"),
        is_admin=True,
    )
    db.add(admin)
    await db.flush()

    token = create_access_token({"sub": admin.username, "id": admin.id, "admin": admin.is_admin})
    return TokenResponse(access_token=token)


@router.post("/register", response_model=TokenResponse)
async def register(request: LoginRequest, db: AsyncSession = Depends(get_db)):
    if len(request.username) < 3:
        raise HTTPException(status_code=400, detail="Username must be at least 3 characters")
    if len(request.password) < 4:
        raise HTTPException(status_code=400, detail="Password must be at least 4 characters")

    result = await db.execute(select(User).where(User.username == request.username))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Username already exists")

    user = User(
        username=request.username,
        password_hash=pwd_context.hash(request.password),
        is_admin=False,
    )
    db.add(user)
    await db.flush()

    token = create_access_token({"sub": user.username, "id": user.id, "admin": user.is_admin})
    return TokenResponse(access_token=token)


@router.put("/change-password")
async def change_password(
    old_password: str,
    new_password: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not pwd_context.verify(old_password, user.password_hash):
        raise HTTPException(status_code=400, detail="Old password is incorrect")
    user.password_hash = pwd_context.hash(new_password)
    await db.flush()
    return {"message": "Password changed"}
