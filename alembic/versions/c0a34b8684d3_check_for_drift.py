"""check for drift

Revision ID: c0a34b8684d3
Revises: 9feb167e534d
Create Date: 2026-09-27 23:01:13.065273

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c0a34b8684d3'
down_revision: Union[str, Sequence[str], None] = '9feb167e534d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column('users', 'Name', new_column_name='name')

def downgrade() -> None:
    op.alter_column('users', 'name', new_column_name='Name')
