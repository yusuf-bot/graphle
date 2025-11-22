# Graphle - Mathematical Function Guessing Game

A full-stack web application where users guess mathematical functions by looking at their graphs. Features daily challenges, multiple difficulty levels, and practice mode.

## Features

- **Daily Challenges**: New challenges every day with 4 difficulty levels
- **Difficulty Levels**:
  - Easy: 1-2 simple terms
  - Medium: 2-3 moderate terms
  - Hard: 2-3 complex terms with larger coefficients
  - Very Hard: 3-4 terms with all function types
- **Practice Mode**: Unlimited practice at any difficulty
- **Create & Share**: Make custom challenges and share with friends
- **User Statistics**: Track your progress and scores
- **Persistent Storage**: Daily completions and user stats saved in SQLite database

## Tech Stack

**Backend:**
- Python/Flask
- SQLite database
- RESTful API

**Frontend:**
- Vanilla JavaScript
- Desmos Graphing Calculator API
- HTML/CSS with glassmorphism design

## Project Structure

```
graphle/
├── server.py           # Flask backend server
├── graphle.db          # SQLite database (auto-created)
├── requirements.txt    # Python dependencies
├── static/
│   ├── index.html     # Main HTML file
│   └── app.js         # Frontend JavaScript logic
└── README.md          # This file
```

## Installation & Setup

### Prerequisites
- Python 3.8 or higher
- pip (Python package manager)

### Step 1: Install Dependencies

```bash
pip install -r requirements.txt
```

### Step 2: Create Project Structure

Create the following folder structure:
```
graphle/
├── server.py
├── requirements.txt
└── static/
    ├── index.html
    └── app.js
```

Place the files in their respective locations:
- `server.py` in the root directory
- `index.html` and `app.js` in the `static/` folder

### Step 3: Run the Server

```bash
python server.py
```

The server will start on `http://localhost:5000`

### Step 4: Access the Application

Open your browser and navigate to:
```
http://localhost:5000
```

## API Endpoints

### Daily Challenges

- `GET /api/daily` - Get today's daily challenge metadata
- `GET /api/daily/<difficulty>` - Get specific difficulty challenge
- `POST /api/daily/check` - Check user's daily completions
- `POST /api/daily/submit` - Submit completed daily challenge

### Practice Mode

- `GET /api/practice/<difficulty>` - Generate practice function

### User Stats

- `GET /api/stats/<user_id>` - Get user statistics

## Database Schema

### daily_challenges
- `date` (TEXT PRIMARY KEY)
- `easy_function` (TEXT)
- `medium_function` (TEXT)
- `hard_function` (TEXT)
- `very_hard_function` (TEXT)

### user_stats
- `user_id` (TEXT PRIMARY KEY)
- `total_score` (INTEGER)
- `games_played` (INTEGER)
- `easy_completed` (INTEGER)
- `medium_completed` (INTEGER)
- `hard_completed` (INTEGER)
- `very_hard_completed` (INTEGER)
- `daily_streak` (INTEGER)
- `last_daily_date` (TEXT)

### daily_completions
- `user_id` (TEXT)
- `date` (TEXT)
- `difficulty` (TEXT)
- `score` (INTEGER)
- `attempts` (INTEGER)

## Game Mechanics

### Scoring System

Base scores by difficulty:
- Easy: 100 points
- Medium: 200 points
- Hard: 300 points
- Very Hard: 500 points

**Penalties:**
- -10 points per additional attempt (after first)
- -25 points per hint used

Minimum score: 10 points

### Hints

Each challenge provides 2 hints:
1. **Hint 1**: Number of terms and function types
2. **Hint 2**: Coefficient ranges and constant offset

### Function Syntax

Players input functions using:
- `+`, `-` for addition/subtraction
- `*` for multiplication
- `^` for exponents (e.g., `x^2`)
- `sin(x)`, `cos(x)` for trigonometric functions
- `log(x)` or `ln(x)` for natural logarithm
- `sqrt(x)` for square root

Example: `5*x^2+10*sin(2*x)-20`

## Customization

### Adding New Difficulty Levels

Edit the `generate_function()` method in `server.py` to add or modify difficulty parameters.

### Changing Desmos API Key

Update the API key in `index.html`:
```html
<script src="https://www.desmos.com/api/v1.9/calculator.js?apiKey=YOUR_API_KEY"></script>
```

### Adjusting Graph Bounds

Modify `calculator.setMathBounds()` in `app.js`:
```javascript
calculator.setMathBounds({
    left: -50,
    right: 50,
    bottom: -100,
    top: 100
});
```

## Deployment

### For Production Deployment:

1. **Update API_BASE** in `app.js`:
   ```javascript
   const API_BASE = 'https://your-domain.com/api';
   ```

2. **Use Production WSGI Server**:
   ```bash
   pip install gunicorn
   gunicorn -w 4 -b 0.0.0.0:5000 server:app
   ```

3. **Set up CORS** properly in `server.py` for your domain

4. **Use PostgreSQL** instead of SQLite for better concurrency

5. **Add SSL/HTTPS** for secure connections

## UI Changes Implemented

✅ Header positioned at 10% from left (not 50%)
✅ User preview line color: #0000FF (solid blue, not dashed)
✅ Increased feedback font size (18px)
✅ Y-axis centered on graph
✅ Improved answer validation (95% similarity threshold)
✅ Readable answer format (not LaTeX)

## Future Enhancements

- Leaderboards
- User authentication
- Social sharing with preview images
- Achievement badges
- Multiplayer mode
- Custom time-based challenges
- Mobile app version

## License

MIT License - Feel free to use for personal projects!

## Support

For issues or questions, please open an issue on the project repository.