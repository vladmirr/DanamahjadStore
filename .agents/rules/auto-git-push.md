# Automatic Git Commit and Push

Whenever any changes are made to the codebase:
1. Verify the code with a build check (`npm run build`).
2. Automatically stage, commit with a descriptive message, and push directly to GitHub (`origin main`):
   `git add .`
   `git commit -m "<descriptive message>"`
   `git push origin main`
Do not wait for the user to ask to push.
