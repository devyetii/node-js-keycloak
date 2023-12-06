const dotenv = require('dotenv');
const express = require('express');
const fs = require('fs');
const { getState, setStateKey, getStateKey, clearState } = require('./state');

dotenv.config();

const app = express();

// access /private route group with access token
const privateRouter = require('./private/routes');
app.use('/private', privateRouter);

const keycloakPublicKey = fs.readFileSync('./key.pem', 'utf8');
process.env.KEYCLOAK_REALM_PUBLIC_KEY = keycloakPublicKey;

app.get('/', (req, res) => {
    res.send(buildPage(getState()));
});

app.get('/login', (req, res) => {
    const client_id = process.env.KEYCLOAK_CLIENT_ID;
    const response_type = 'code';
    const state = JSON.stringify(req.query)
    const redirect_uri = `http://localhost:${process.env.PORT}/callback`;
    const scope = 'openid';

    // Use a url builder to create the login url
    const url = new URL(
        `${process.env.KEYCLOAK_BASE}/realms/${process.env.KEYCLOAK_REALM}/protocol/openid-connect/auth`
    );
    url.searchParams.append('client_id', client_id);
    url.searchParams.append('response_type', response_type);
    url.searchParams.append('redirect_uri', redirect_uri);
    url.searchParams.append('state', state);
    url.searchParams.append('scope', scope);


    res.redirect(url);
})

app.get('/callback', (req, res) => {
    console.log(`from callback, state: ${JSON.stringify(JSON.parse(req.query.state))}`);
    if (req.query && req.query.code) setStateKey("code", req.query.code)
    if (req.query && req.query.access_token) setStateKey(access_token = req.query.access_token)
    
    // generates infinite redirect loop because token still not set. I'm just demonestrating "state" field
    // const redirect_url = req.query.state ? JSON.parse(req.query.state).redirect : '/';
    res.redirect("/");
})

app.get("/introspect", (req, res) => {
    const access_token = getStateKey(access_token);
    const url = new URL(
        `${process.env.KEYCLOAK_BASE}/realms/${process.env.KEYCLOAK_REALM}/protocol/openid-connect/token/introspect`
    );

    const payload = new URLSearchParams();
    payload.append('client_id', process.env.KEYCLOAK_CLIENT_ID);
    payload.append('client_secret', process.env.KEYCLOAK_CLIENT_SECRET);
    payload.append('token', access_token);

    fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: payload.toString(),
    })
    .then(response => response.json())
    .then(data => {
        console.log(`from introspect: ${JSON.stringify(data)}`);
        // The response will contain the user info
        // Use the user info to build a page
        setStateKey("latest_introspect", data);
        res.redirect('/');
    })
    .catch(error => {
        console.log(error);
        res.redirect('/');
    })
})

app.get('/get-access-token', (req, res) => {
    const code = getStateKey("code");
    const client_id = process.env.KEYCLOAK_CLIENT_ID;
    const client_secret = process.env.KEYCLOAK_CLIENT_SECRET;
    const redirect_uri = `http://localhost:${process.env.PORT}/callback`;

    // Use a url builder to create the token url
    const url = `${process.env.KEYCLOAK_BASE}/realms/${process.env.KEYCLOAK_REALM}/protocol/openid-connect/token`
    const payload = new URLSearchParams();
    payload.append('code', code);
    payload.append('client_id', client_id);
    payload.append('client_secret', client_secret);
    payload.append('redirect_uri', redirect_uri);
    payload.append('grant_type', 'authorization_code');

    console.log(`from get access token: ${url}`);

    // Use the fetch API to make a POST request to the token endpoint
    fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: payload.toString(),
    })
    .then(response => response.json())
    .then(data => {
        // The response will contain an access_token and refresh_token
        // Use the access_token to make a request to the user info endpoint
        console.log(`from get access token response: ${JSON.stringify(data)}`);
        setStateKey("access_token", data.access_token);
        setStateKey("id_token", data.id_token);
        setStateKey("refresh_token", data.refresh_token);
        res.redirect('/');
    })
    .catch(error => {
        console.log(error);
        res.redirect('/');
    })
})

app.get('/get-user-info', (req, res) => {
    const access_token = getStateKey("access_token");
    const url = new URL(
        `${process.env.KEYCLOAK_BASE}/realms/${process.env.KEYCLOAK_REALM}/protocol/openid-connect/userinfo`
    );
    fetch(url, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${access_token}`
        }
    })
    .then(response => response.json())
    .then(data => {
        console.log(`from get user info: ${data}`);
        // The response will contain the user info
        // Use the user info to build a page
        setStateKey("user_info", data);
        res.redirect('/');
    })
    .catch(error => {
        console.log(error);
        res.redirect('/');
    })
})

app.get('/logout', (req, res) => {
    const client_id = process.env.KEYCLOAK_CLIENT_ID;
    const redirect_uri = `http://localhost:${process.env.PORT}/`;

    // Use a url builder to create the logout url
    const url = new URL(
        `${process.env.KEYCLOAK_BASE}/realms/${process.env.KEYCLOAK_REALM}/protocol/openid-connect/logout`
    );
    
    const payload = new URLSearchParams();
    payload.append('client_id', client_id);
    payload.append('client_secret', process.env.KEYCLOAK_CLIENT_SECRET);
    payload.append('redirect_uri', redirect_uri);
    payload.append('refresh_token', getStateKey("refresh_token"));

    fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: payload.toString(),
    })
    .then(response => response.text())
    .then(response => {
        console.log(`from logout: ${response}`);
        clearState();
        res.redirect('/');
    }).catch(error => {
        console.log(error);
        res.redirect('/');
    })
})

app.listen(process.env.PORT, () => {
    console.log(`Express app listening on port ${process.env.PORT}`);
});

function buildPage(params) {
    const loginButton = `<button onclick="window.location.href = '/login?redirect=/';">Login</button>`;
    const codeView = `<p>Code: ${params.code}</p>`;
    const accessTokenGetButton = `<button onclick="window.location.href = '/get-access-token';" ${params.code ? "" : "disabled"}>Get Access Token</button>`;
    const accessTokenView = `<p>Access Token: ${params.access_token}</p>`;
    const idTokenView = `<p>ID Token: ${params.id_token}</p>`;
    const refreshTokenView = `<p>Refresh Token: ${params.refresh_token}</p>`;
    const accessTokenIntrospectButton = `<button onclick="window.location.href = '/introspect';" ${params.access_token ? "" : "disabled"}>Introspect Access Token</button>`;
    const accessTokenIntrospectView = `<p>Introspect Access Token: ${JSON.stringify(params.latest_introspect)}</p>`;
    const userInfoButton = `<button onclick="window.location.href = '/get-user-info';" ${params.access_token ? "" : "disabled"}>Get User Info</button>`;
    const userInfoView = `<p>User Info: ${JSON.stringify(params.user_info)}</p>`;
    const logoutButton = `<button onclick="window.location.href = '/logout';" ${params.access_token ? "" : "disabled"}>Logout</button>`;

    return `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Express App</title>
        </head>
        <body>
            <h1>Connection to Keycloak</h1>
            <p>Keycloak Base: ${process.env.KEYCLOAK_BASE}</p>
            <p>Keycloak Realm: ${process.env.KEYCLOAK_REALM}</p>
            <p>Keycloak Client ID: ${process.env.KEYCLOAK_CLIENT_ID}</p>
            <p>Keycloak Client Secret: ${process.env.KEYCLOAK_CLIENT_SECRET}</p>
            <p>Keycloak Public Key: ${process.env.KEYCLOAK_REALM_PUBLIC_KEY}</p>
            <p>State: ${JSON.stringify(params)}</p>

            <div>
                <h2>Keycloak Actions</h2>
                <div>
                    ${params.code ? codeView : loginButton}
                </div>
                <br />
                <div>
                    ${params.access_token ? accessTokenView + "<br />" + idTokenView + "<br />" + refreshTokenView : accessTokenGetButton}
                </div>
                <br />
                <div>
                    ${accessTokenIntrospectButton}
                    <br />
                    ${params.latest_introspect ? accessTokenIntrospectView : ""}
                </div>
                <br />
                <div>
                    ${params.user_info ? userInfoView : userInfoButton}
                </div>
                <br />
                <div>
                    ${logoutButton}
                </div>
            </div>

            <div>
                <h2> Endpoint </h2>
                <div>
                    <a href="/private/">/private</a>
                </div>
            </div>
        </body>
        </html>
    `;
}
