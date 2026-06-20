# BigQuery Release Pulse

BigQuery Release Pulse is a premium web application designed to aggregate, organize, and share Google Cloud BigQuery release notes. The app fetches the live Atom feed from Google Cloud and splits daily updates into clear, structured items. Users can search and filter the updates, and easily draft and post updates directly to X (Twitter) using a built-in real-time post composer.

## Features

*   **Live Release Notes Dashboard**: Real-time aggregation of Google Cloud BigQuery release notes.
*   **Intelligent Parsing**: Automatically separates daily updates by change type (e.g., Feature, Change, Deprecation, Announcement) for improved readability.
*   **Search & Type Filters**: Instant full-text search and filtering by update types via clean, glowing category tags.
*   **Manual Sync / Refresh**: Includes a smooth refresh spinner button to pull live updates from the official Google Cloud feed.
*   **X (Twitter) Share Composer**:
    *   **Live Preview**: Real-time rendering of your post matching the exact layout of a post on X/Twitter.
    *   **Tone Templates**: Multiple quick templates (💼 Professional, 🚀 Hype, 📝 Summary, ⚡ Minimal) to instantly write the draft.
    *   **Character Budget Track**: Precise character count progress ring showing remaining character budget out of 280.
    *   **One-Click Intent**: Integrates with Twitter's official Web Share Intent to post immediately.

## Tech Stack

*   **Backend**: Python, Flask
*   **Frontend**: Plain Vanilla HTML5, CSS3, JavaScript (ES6)
*   **Aesthetics**: Glassmorphic UI with glowing mesh radial gradients and interactive animations
*   **Tools**: Antigravity CLI (`agy`), GitHub CLI (`gh`)

## Development History with Antigravity CLI

This project was built pair-programming with the agentic coding assistant **Antigravity CLI** (`agy`):

1.  **Installed Antigravity CLI**: Configured the CLI tools locally on Windows.
2.  **Authenticated**: Logged in to the Google account workspace using Google OAuth.
3.  **Checked Environment & Version**: Run `agy --version` to check the version of the agent client.
4.  **Checked Models**: Run `agy models` to check the list of available Gemini models.
5.  **Launched interactive session**: Started `agy` to initialize the project environment.
6.  **Generated Application**: Commanded Antigravity to build a Python Flask backend and a modern glassmorphic vanilla JS/CSS frontend.
7.  **Tested locally**: Started the development server and validated functionality at `http://127.0.0.1:5000/`.
8.  **Pushed to GitHub**: Initialized Git, added files, committed, and linked to the remote GitHub repository.

## Running Locally

To get a local copy up and running, follow these steps:

### Prerequisites
Make sure you have Python 3 installed.

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/oindrilam/bigquery-release-pulse.git
   ```
2. Navigate to the project directory:
   ```bash
   cd bigquery-release-pulse
   ```
3. Install the required dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Run the Flask application:
   ```bash
   python app.py
   ```
5. Open your browser and navigate to:
   **[http://127.0.0.1:5000/](http://127.0.0.1:5000/)**
