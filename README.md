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

````
# Install the required node version
nvm install

# Switch to the required node version
nvm use

# Install node dependencies
npm install

# Run the API
npm start

## Tests

Tests are written in TypeScript (and the project should be migrated to TypeScript in the future too). Available npm scripts:

```bash
npm test          # Run tests in watch mode
npm run test:run  # Run tests once
npm run test:coverage  # Run tests with coverage
````
