# Hosting Guide: Vercel & Render

Your project is now prepared for production hosting using **Vercel** for the React frontend and **Render** (or any WSGI host) for the Django backend.

## 1. Frontend: Hosting on Vercel

### Setup
1. Connect your GitHub repository to [Vercel](https://vercel.com/new).
2. Set the **Root Directory** to `frontend`.
3. Vercel should auto-detect the **Build Command** (`npm run build`) and **Output Directory** (`build`).
4. **Environment Variables**: In Vercel Project Settings, add:
   - `REACT_APP_API_BASE_URL`: Your backend URL (e.g., `https://petals-and-floras.onrender.com/api/` or `https://your-app.vercel.app/api/`).

### Clean URLs & Routing
The `frontend/vercel.json` file handles SPA routing. If you want to proxy `/api/` calls to a different domain (like Render), you can update the `destination` field in `frontend/vercel.json`, but ensure you do NOT use brackets `[...]` as Vercel will fail to parse them.

Example proxy in `frontend/vercel.json`:
```json
{
  "source": "/api/(.*)",
  "destination": "https://your-backend-url.onrender.com/api/$1"
}
```

## 2. Backend: Hosting on Render / Railway

### Environment Variables
Configure the following in your host's dashboard:
- `DJANGO_SECRET_KEY`: A long, random string.
- `DJANGO_ALLOWED_HOSTS`: `your-backend.onrender.com,your-frontend.vercel.app`
- `DJANGO_CORS_ALLOWED_ORIGINS`: `https://your-frontend.vercel.app`
- `DJANGO_CSRF_TRUSTED_ORIGINS`: `https://your-frontend.vercel.app`
- `DJANGO_DEBUG`: `False`
- `MONGO_URI`: Your production MongoDB connection string.
- `RAZORPAY_KEY_ID`: Your live/test Razorpay key.
- `RAZORPAY_KEY_SECRET`: Your Razorpay secret.

### Requirements & Procfile
- I created `backend/requirements.txt` with all necessary packages.
- I created `backend/Procfile` for Render's web process.

## 3. Database Considerations
- **SQLite**: Since Vercel/Render file systems are ephemeral, **Persistent SQLite will not work**. You should migrate to **PostgreSQL** or use a managed database service.
- **MongoDB**: Ensure your production `MONGO_URI` is accessible from the backend host.

---
### Summary of Files Created/Updated:
- `vercel.json` (Root): Configuration for Vercel monorepo deployment.
- `frontend/vercel.json`: Handles SPA routing for the React app.
- `backend/requirements.txt`: List of dependencies for production.
- `backend/Procfile`: Command to start the server on platforms like Render.
- `backend/config/settings.py`: Updated for static files (`WhiteNoise`) and security.
