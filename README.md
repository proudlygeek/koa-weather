# Koa Weather API

An example Weather API response: given an IP it tracks down the Local City Weather Temperature. 

It uses Node.js 0.11.x Harmony Generators and Koa Framework[1].

## Usage
You will need Node 0.11.x to run the server. 
If you want to just try it out you can quickly deploy a dokku container / heroku application.

To deploy it on Heroku just:

```bash
heroku apps:create
heroku addons:add redistogo:nano
git push heroku master
```

## Example

Here's a sample endpoint to try it out:

```bash
curl http://koa-weather.herokuapp.com?ip=8.8.8.8
```

will send a JSON Response like this:

```json
{"ip":"8.8.8.8","city":"Mountain View","temperature":14,"message":"Today, Mountain View will be 14 degrees."}
```

If you *omit* the GET parameter then the *requester's IP* is used:

```bash
curl http://koa-weather.herokuapp.com
```

will return:

```json
{"ip":"xx.xx.xx.xx","city":"Rome","temperature":26,"message":"Today, Rome will be 26 degrees."}
```

## License
MIT

[1]: http://koajs.com/
