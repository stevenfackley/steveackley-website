# /project/models/user.py

from project.extensions import db
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash
import enum

class UserRole(enum.Enum):
    ADMIN = 'admin'
    USER = 'user'

class User(UserMixin, db.Model):
    """
    User model for storing user accounts.
    Includes password hashing and role management.
    """
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(64), index=True, unique=True, nullable=False)
    email = db.Column(db.String(120), index=True, unique=True, nullable=False)
    password_hash = db.Column(db.String(256))
    role = db.Column(db.Enum(UserRole), default=UserRole.USER, nullable=False)

    def set_password(self, password):
        """Creates a hashed password."""
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        """Checks a password against the stored hash."""
        return check_password_hash(self.password_hash, password)

    def __repr__(self):
        return f'<User {self.username}>'