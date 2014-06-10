# weather

An example Weather API response: given an IP it tracks down the 

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

Here's a sample endpoint to try it out:

`http://koa-weather.herokuapp.com?ip=8.8.8.8`

If you *omit* the GET parameter then the *requester's IP* is used.

[1]: http://koajs.com/