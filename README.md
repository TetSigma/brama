# Brama

Brama is an AI assistance platform for government services for the City of Lublin.

## Development

Install dependencies once from the repository root:

```sh
npm install
```

Run the web app and API together:

```sh
npm run dev
```

If you use `devenv`, enter the shell and start both processes with:

```sh
devenv shell
devenv up
```

Default local services:

- Web: `http://localhost:5173`
- API: `http://localhost:4000`

## Backend deployment from your machine

Backend deployment is handled manually with `npm run deploy:be`. The command
checks, builds, syncs the repo to the server over SSH, installs npm dependencies
on the server, restarts the `lublin-assistant` systemd service, and verifies the
health endpoint.

Create a local deployment config from the example:

```sh
cp .env.deploy.example .env.deploy
```

Then fill in `DEPLOY_HOST`, `DEPLOY_USER`, and `DEPLOY_PATH`. The `.env.deploy`
file is ignored by git.
