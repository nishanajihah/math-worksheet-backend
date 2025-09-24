# Math Worksheet Backend

A Node.js Express backend API that serves as the central data layer for math worksheet applications. This backend is designed as part of a **decoupled architecture** that can seamlessly serve multiple frontend applications including:

- **[math-worksheet-vue](https://github.com/nishanajihah/math-worksheet-vue)** - Vue.js implementation
- **[math-worksheet-react](https://github.com/nishanajihah/math-worksheet-react)** - React.js implementation

## Architecture Overview

This backend API follows a **decoupled/headless architecture** pattern, providing:

- **Framework Agnostic**: Can serve any frontend technology (Vue, React, Angular, etc.)
- **Scalable Design**: Single backend serving multiple client applications
- **Consistent Data Layer**: Ensures all frontends receive identical data and functionality
- **Independent Development**: Frontend and backend teams can work independently

## Features

- **Question Management**: Serves math rounding questions with multiple choice answers
- **Score Tracking**: Stores and retrieves high scores across all connected frontends
- **CORS Support**: Configured for cross-origin requests from multiple frontend applications
- **RESTful API**: Clean, consistent endpoints for seamless frontend integration

## Technologies Used

- **Node.js**: JavaScript runtime environment
- **Express.js**: Web application framework
- **CORS**: Cross-Origin Resource Sharing middleware
- **Nodemon**: Development tool for auto-restarting the server

## Installation

1. Clone the repository:

      ```bash
      git clone <your-repository-url>
      cd math-worksheet-backend
      ```

2. Install dependencies:

      ```bash
      npm install
      ```

3. Start the development server:

      ```bash
      npm start
      ```

The server will start on port 3000 by default.

## API Endpoints

### Questions

- `GET /api/questions` - Retrieve all math questions
- `GET /api/questions/:id` - Retrieve a specific question by ID

### High Scores

- `GET /api/scores` - Retrieve all high scores
- `POST /api/scores` - Submit a new high score
- `PUT /api/scores/:id` - Update an existing score
- `DELETE /api/scores/:id` - Delete a score

## Question Format

Each question follows this structure:

```json
{
  "id": "q1",
  "question": "17",
  "correctAnswer": "20",
  "choices": ["10", "20", "17"]
}
```

## Development

### Prerequisites

- Node.js (version 14 or higher)
- npm or yarn package manager

### Running in Development Mode

```bash
npm run dev
```

This uses nodemon to automatically restart the server when files change.

## Project Structure

```text
math-worksheet-backend/
├── server.js          # Main server file with API endpoints
├── package.json       # Project dependencies and scripts
├── .gitignore         # Git ignore file
└── README.md          # Project documentation
```

## Connected Frontend Projects

This backend serves the following frontend applications:

- **[math-worksheet-vue](https://github.com/nishanajihah/math-worksheet-vue)** - Vue.js implementation
- **[math-worksheet-react](https://github.com/nishanajihah/math-worksheet-react)** - React.js implementation

Both frontends consume the same API endpoints, ensuring consistent functionality across different frameworks.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/new-feature`)
3. Commit your changes (`git commit -am 'Add some feature'`)
4. Push to the branch (`git push origin feature/new-feature`)
5. Create a new Pull Request

## Show Your Support

If you found this project helpful, please give it a ⭐ on GitHub!

[![GitHub stars](https://img.shields.io/github/stars/nishanajihah/math-worksheet-vue?style=social)](https://github.com/nishanajihah/math-worksheet-vue/stargazers)

## License & Contact

MIT License | Develop by [Nisha Najihah](https://github.com/nishanajihah)  
Email: <nishanajihah.dev@gmail.com>
