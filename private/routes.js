const jwt = require('jsonwebtoken');
const { getStateKey } = require('../state');

const router = require('express').Router();

router.use(routeProtectionMiddleware);

router.get('/', function(req, res) {
    res.send(`
        <h1>Private</h1>
        <p>This is a private route.</p>
        <p>It requires a valid access token to be viewed.</p>
        
        <a href="/">Home</a>
    `);
});

function routeProtectionMiddleware(req, res, next) {
    console.log(`from route protection: ${JSON.stringify(getStateKey("access_token"))}`);
    if (!getStateKey("access_token")) {
        res.redirect('/login?redirect=/private');
        return;
    }

    jwt.verify(getStateKey("access_token"), process.env.KEYCLOAK_REALM_PUBLIC_KEY, (err, decoded) => {
        if (err) {
            console.log(err);
            res.redirect('/');
            return;
        }

        console.log(`token verified: ${JSON.stringify(decoded)}`)
        next();
    })
}

module.exports = router;