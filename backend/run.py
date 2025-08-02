# /run.py

from project import create_app

app = create_app()

if __name__ == '__main__':
    # This is for development only.
    # In production, Gunicorn will run the app.
    app.run(debug=True, port=5000)