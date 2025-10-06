# DEVELOPMENT


## Idea

Kandown is a backlog for your small project, data stored as one file within the project repository.


### What should it provide?

- UI with drag and drop support
- Easy and intuitive usage
- Requirements should be easy to install

### What should it not provide?

- Webpage, which requires to upload/download state
- file format that is not human readable
- complex setup (hard to install)


## Options considered

- Webpage which mounts local file system and provides UI
    - Pros:
        - Easy to use
        - No installation required
        - Could be hosted on GitHub pages
    - Cons:
      - Not offline capable (maybe use as PWA?)
      - Security issues (access to local file system)
      - Only Chrome supported (other browsers do not support file system access)

- Desktop application
  - Pros:
      - Easy to use
      - Offline capable
  - Cons:
      - Hard to install (need to provide binaries for different OS)
      - Hard to develop (need to use framework like Electron, Tauri, ...)

- CLI application with webserver
  - Pros:
      - Medium hard to install (only Python required, use uv)
      - Offline capable
  - Cons:
      - Not as easy to use as desktop application (need to start server and open browser)
      - Need to install Python and dependencies

> V1 decided for CLI application with webserver


## Other "feature" discussions

### Pasting images

Pasting images from clipboard should be supported.

- Storing them as base64 in the YAML file does bloat the file.
- Storing them as files in a subfolder is more complex to handle (need to manage files, delete unused files, ...)
- Maybe support both options and let the user decide?

> V1 starts with base64 in YAML file, add option to store as file later


## Technologies

- Backend
  - Python (For sure! 😅)
  - Flask (Lightweight web framework, but might struggle with sse or websockets, requires threading)
      - FastAPI could be an option but is harder to start from program
      - Quart might be an alternative to circumvent single threaded Flask

- Frontend
  - Vanilla JS (No framework, keep it simple)
  - or use PuePy (Vue.js in Python, adds complexity, but is Python)
    - PuePy 

> V1 decided for Vanilla JS, maybe add PuePy later if needed








