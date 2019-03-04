Simple webserver with chat functionality via WebSocket made for low.js/Node.JS

Run with bin/low lowjs-webserver-example/index.js from lowjs directory
and then open the links given with the web browser.

The https link will give a certificate warning, which is correct, because
the certificate is self-signed.

In node_modules you can find the following modules, transpiled to ES5 via
TypeScript:

ws:		6.1.0
async_limiter:	1.0.0

The package.json is NOT included, so a npm install does not replace the
transpiled files with the non-transpiled versions.

On neonious one you can alternatively not copy node_modules and install ws
from the graphical package manager. This has the side effect of faster
program startup as the packages from the package manager are packed more
efficiently than separate files.