# /project/auth/routes.py

from flask import Blueprint, request, jsonify
from flask_login import login_user, logout_user, current_user, login_required
from project.models.user import User, UserRole
from project.extensions import db

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

@auth_bp.route('/register', methods=['POST'])
@login_required # Only logged-in admins can create new users
def register():
    """
    Registers a new user. Restricted to ADMIN users.
    """
    if current_user.role != UserRole.ADMIN:
        return jsonify({"message": "Permission denied"}), 403

    data = request.get_json()
    if not data or not 'username' in data or not 'password' in data or not 'email' in data:
        return jsonify({"message": "Missing username, email, or password"}), 400

    if User.query.filter_by(username=data['username']).first():
        return jsonify({"message": "Username already exists"}), 409
        
    if User.query.filter_by(email=data['email']).first():
        return jsonify({"message": "Email already exists"}), 409

    user = User(
        username=data['username'],
        email=data['email'],
        # The role can be optionally provided, defaults to USER
        role=UserRole(data.get('role', 'user').lower())
    )
    user.set_password(data['password'])
    db.session.add(user)
    db.session.commit()

    return jsonify({"message": "User registered successfully"}), 201

@auth_bp.route('/login', methods=['POST'])
def login():
    """
    Logs in a user and creates a session.
    """
    data = request.get_json()
    if not data or not 'username' in data or not 'password' in data:
        return jsonify({"message": "Missing username or password"}), 400

    user = User.query.filter_by(username=data['username']).first()

    if user is None or not user.check_password(data['password']):
        return jsonify({"message": "Invalid username or password"}), 401
    
    # remember=True keeps the user logged in across browser sessions
    login_user(user, remember=True)
    
    return jsonify({
        "message": "Login successful",
        "user": {
            "id": user.id,
            "username": user.username,
            "role": user.role.value
        }
    }), 200

@auth_bp.route('/logout', methods=['POST'])
@login_required
def logout():
    """
    Logs out the current user and clears the session.
    """
    logout_user()
    return jsonify({"message": "Logout successful"}), 200
    
@auth_bp.route('/status', methods=['GET'])
@login_required
def status():
    """
    Returns the status and info of the currently logged-in user.
    """
    return jsonify({
        "isAuthenticated": True,
        "user": {
            "id": current_user.id,
            "username": current_user.username,
            "role": current_user.role.value
        }
    })