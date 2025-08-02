# /project/__init__.py
import os 
from flask import Flask, jsonify
from .config import Config
from .extensions import db, migrate, login_manager, cors
from .models.user import User

def create_app(config_class=Config):
    """
    Application factory function to create and configure the Flask app.
    """
    app = Flask(__name__, instance_relative_config=True)
    app.config.from_object(config_class)
    
    # Ensure the instance folder exists
    try:
        os.makedirs(app.instance_path)
    except OSError:
        pass

    # Initialize extensions
    db.init_app(app)
    migrate.init_app(app, db)
    login_manager.init_app(app)
    # Configure CORS to allow credentials (cookies) from our frontend origin
    cors.init_app(app, supports_credentials=True, resources={r"/api/*": {"origins": "http://localhost:5173"}})

    @login_manager.user_loader
    def load_user(user_id):
        return User.query.get(int(user_id))

    # Register Blueprints
    from .auth.routes import auth_bp
    app.register_blueprint(auth_bp)

    # A simple health check route
    @app.route('/api/health')
    def health_check():
        return jsonify({"status": "ok"}), 200

    return app