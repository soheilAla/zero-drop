from datetime import datetime

from sqlalchemy import DateTime, Integer, LargeBinary, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Drop(Base):
    __tablename__ = "drops"

    id: Mapped[str] = mapped_column(primary_key=True)

    ciphertext: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)

    content_iv: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)

    kdf_salt: Mapped[bytes | None] = mapped_column(LargeBinary, nullable=True)

    crypto_version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )

    remaining_views: Mapped[int | None] = mapped_column(
        Integer, nullable=True, default=None
    )

    size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
