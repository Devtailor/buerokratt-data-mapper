# DataMapper

Testing handlebars and javascript functionality.

## Docker

To run the application using docker run:

```
docker-compose up -d
```

## Handlebars

Handlebars files go to `views` directory.

Example on how to access handlebars in browser:

```
http://localhost:3000/hbs/my/restful/url/myFile
```

## Javascript

Javascript files go to `js` directory.

Example on how to access javascript files in browser:

```
http://localhost:3000/js/my/restful/url/myScript
```

_Note!_ URL must not end with `.js` extension.

## Local Development

To develop the DataMapper, it's recommended to have [nvm](https://github.com/nvm-sh/nvm) installed, which will ensure you
have the correct node and npm versions.

```bash
# Install the required node version
nvm install

# Switch to the required node version
nvm use

# Install node dependencies
npm install

# Run the API
npm start
```

## Code quality

### Formatting

```bash
npm run format         # Check if the code is formatted, without making changes
npm run format:fix     # Format the code
```

### Linting

```bash
npm run lint           # Check for linting issues, without making changes
npm run lint:fix       # Automatically fix linting issues
```

### Tests

Tests are written in TypeScript (and the project should be migrated to TypeScript in the future too). Available npm scripts:

```bash
npm test               # Run tests in watch mode
npm run test:run       # Run tests once
npm run test:coverage  # Run tests with coverage
```

## Continuous Integration

Format, lint, test, and build checks are run on every commit to PRs that are **not** in Draft status. These checks are configured in [this workflow](.github/workflows/run-checks.yml).
