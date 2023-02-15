# Laravel

We've created a Laravel package to make integrating Laravel and Hocuspocus seamless.

You can find details about it here: [ueberdosis/hocuspocus-laravel](https://github.com/ueberdosis/hocuspocus-laravel)

## Custom integration

The primary storage for Hocuspocus must be as a Y.Doc Uint8Array binary. At the moment, there are no compatible PHP libraries to read the YJS format therefore we have two options to access the data: save the data in a Laravel compatible format such as JSON _in addition_ to the primary storage, or create a seperate nodejs server with an API to read the primary storage, parse the YJS format and return it to Laravel.

_Note: Do not be tempted to store the Y.Doc as JSON and recreate it as YJS binary when the user connects. This will cause issues with merging of updates and content will duplicate on new connections. The data must be stored as binary to make use of the YJS format._

### Saving the data in primary storage

Use Laravels migration system to create a table to store the YJS binaries:
```
return new class extends Migration
{
    public function up()
    {
        Schema::create('documents', function (Blueprint $table) {
            $table->id();
            $table->binary('data');
        });
    }
    public function down()
    {
        Schema::dropIfExists('documents');
    }
};
```

In the Hocuspoucs server, you can use the dotenv library to retrieve the DB login details from `.env`:
```
import mysql from 'mysql2';
import dotenv from 'dotenv';

dotenv.config()

const pool = mysql.createPool({
    connectionLimit: 100, //important
    host: '127.0.0.1',
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    debug: false
});
```

And then use the [database extension](https://tiptap.dev/hocuspocus/api/extensions/database) to store and retrieve the binary using `pool.query`.

### Option 1: Additionally storing the data in another format

Use the [webhook extension](https://tiptap.dev/hocuspocus/api/extensions/webhook) to send requests to Laravel when the document is updated, with the document in JSON format.

### Option 2: Retrieve the data on demand using a seperate nodejs daemon (advanced)

Create a nodejs server using the http module:
```
const server = http.createServer(
...
).listen(3000, '127.0.0.1')
```

Use the dotenv package as above to retireve the mysql login details and perform the mysql request. You can then use the YJS library to parse the binary data (`Y.applyUpdate(doc, row.data)`). You are free to format it in whatever way is needed and then return it to Laravel.

### Auth integration

You can use the webhook extension for auth - rejecting the `onConnect` request will cause the Hocuspocus server to disconnect - however for security critical applications it is better to use a custom `onAuthenicate` hook as an attacker may be able to retrieve some data from the Hocuspocus server before the `onConnect` hook is rejected.

To authenticate with the Laravel server we can use Laravel's built in authentication system using the session cookie and a CSRF token. Add an onAuthenticate hook to your Hocuspocus server script which passes along the headers (and therefore the session cookie) and add the CSRF token to a request to the Laravel server:
```
const hocusServer = Server.configure({
  ...
  onAuthenticate(data) {
        return new Promise((resolve, reject) => {
            const headers = data.requestHeaders;
            headers["X-CSRF-TOKEN"] = data.token;

            axios.get(
                process.env.APP_URL + '/api/hocus',
                { headers: headers },
            ).then(function (response) {
                if (response.status === 200)
                    resolve()
                else
                    reject()
            }).catch(function (error) {
                reject()
            })
        })
    },
```

And add a CSRF token to the request in the provider:
```
const provider = new HocuspocusProvider({
  ...
  token: '{{ csrf_token() }}',
```

Finally, add a route in `api.php` to respond to the request. We can respond with an empty response and just use the request status to verify the authentication (i.e status code 200 or 403). This example uses the built-in Laravel middleware to verify the session cookie and csrf token. You can add any further middleware here as needed such as `verified` or any custom middleware:
```
Route::middleware(['web', 'auth'])->get('/hocus', function (Request $request) {
    return response('');
});
```

That's it!
