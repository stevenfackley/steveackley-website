# /project/extensions.py

from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_login import LoginManager
from flask_cors import CORS

db = SQLAlchemy()
migrate = Migrate()
login_manager = LoginManager()
cors = CORS()

# This tells Flask-Login where to redirect users if they try to access a protected page without being logged in.
# Since our frontend will handle this, we'll return a 401 error instead of redirecting.
@login_manager.unauthorized_handler
def unauthorized():
    from flask import jsonify
    return jsonify({"message": "Authentication required."}), 401