# Getting Started with Create React App

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you're on your own.

You don't have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn't feel obligated to use this feature. However we understand that this tool wouldn't be useful if you couldn't customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)


In practice, consistency is about being adaptable. Don't have much time? Scale it down. Don't have much energy? Do the easy version. Find different ways to show up depending on the circumstances. Let your habits change shape to meet the demands of the day.

Adaptability is the way of consistency.”

James Clear

Questions for next meeting:
Am I building this with python, javascript
Bot will be in python, monitoring in javascript
Before we build bot we need to build react page to understand data
What is sdk: software development kit
Quickstart, 
Unauthenticated at first
Make the repo
Make repo
And take notes
	

    /Users/treesaabraham/Documents/kalshi_trading
 
 Questions for tmr: 
 1. Are we being selective of which markets we'll be looking at?
    There are several:
    Politics
    Sports
    Culture
    Crypto
    Climate
    Economics
    Mentions
     Companies

Looking at all of them
https://docs.kalshi.com/getting_started/quick_start_create_order
talk to lorenzo about making the account

I know that there are older markets, so what's the cut off point for year the market was made
cuttoff will do 03/172025



Remember: There are many markets within a series. Use pagination page to get through all of them: 

ok, so just connect straight to kalshi market through api and then display it on the react page?
make sure to check with lorenzo what front end and back end for react page should look like

-not right now, work on that later

Get api keys 
make an account officially unath, quick start

prediction market are whimsical
add api keys in environemtn commit environment gitignore .env files



Here’s the short version, cleaned up so it matches how Kalshi actually works:
To-do list for Kalshi API credentials
Create a Kalshi account if you do not already have one.
Generate your account API credentials in Kalshi’s developer/settings area.
Download and save the private key file somewhere secure on your computer.
Create a .env.local file in the project root.
Store the credential values in .env.local:
REACT_APP_KALSHI_API_KEY_ID=...
REACT_APP_KALSHI_PRIVATE_KEY_PATH=...
Update .gitignore so .env files never get committed.
Create a .env.example with fake placeholder values only.
Use public market-data endpoints first since market data does not need auth.
Save authenticated requests for backend work later so the private key is never exposed in React.
Tiny but important correction, because words matter and APIs are petty:
you are not getting an API key for each market
you are getting one set of account-level API credentials to access authenticated endpoints
And the public market-data part is based on the Kalshi quick start you linked, which says market data can be accessed without API keys