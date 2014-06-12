'use strict';

var koa         = require('koa'),
    Q           = require('q'),
    app         = koa();

var request     = Q.denodeify(require('request')),
    port        = process.env.PORT || 8080;

var redisUrl = process.env.REDIS_URL || process.env.REDISTOGO_URL;

if (redisUrl) {
    var rtg     = require('url').parse(redisUrl);
    var redis   = require('redis').createClient(rtg.port, rtg.hostname);

    if (process.env.REDISTOGO_URL) {
        redis.auth(rtg.auth.split(":")[1]);
    }
} else {
    var redis   = require('redis').createClient();
}

/**
 * Maps a Redis Cache service.
 *
 * Some methods, like `get` and `set` are wrapped
 * with promises so the results can be yielded
 * from Koa's middlewares.
 * 
 * @type {Object}
 */
var Cache = {
    redis: {
        get: Q.denodeify(redis.get.bind(redis)),
        set: Q.denodeify(redis.set.bind(redis))
    },
    ttl: 120,
    get: function(key) {
        return this.redis.get(key).then(function(value) {
            return JSON.parse(value);
        });
    },
    set: function(key, value) {
        return this.redis.set(key, JSON.stringify(value)).then(function(value) {
            return value;
        });
    },
    expire: function(key, ttl) {
        redis.expire(key, this.ttl || ttl);
    },
};

/**
 * Geolocation service.
 *
 * Right now it will send requests to http://geoip.smart-ip.net
 * since the others Open Source APIs out there doesn't return a city field
 * on their JSON responses.
 * 
 * @type {Object}
 */
var Geolocation = {
    /**
     * Given an IP address it will query an online, slow
     * API and it will give it back wrapped as a promise.
     * 
     * @param  {int} ip     The IP Address, can be IPv4 or IPv6
     * @return {Promise}    The promise of a GET request to the API Endpoint
     */
    getCityAsync: function(ip) {
        var address = (ip === "::1" || ip === undefined) ? '' : ip;
        var endpoint = 'http://geoip.smart-ip.net/json/' + address;

        return request(endpoint).then(function(params) {
            return JSON.parse(params[0].body);
        });
    }   
};

/**
 * Weather service.
 *
 * It uses OpenWeatherMap[1]'s API to obtain weather data.
 * Right now we're querying by using City Name and Country Code, but it 
 * could be easily extended to use coordinates / City IDs too.
 *
 * [1]: http://www.openweathermap.com/
 * 
 * @type {Object}
 */
var Weather = {
    /**
     * Queries OpenWeatherMap by city name and country. The result values are
     * automatically converted using the metric system (sorry, Fahrenheit).
     * 
     * @param  {string} city     City name. London, Rome, Whatever.
     * @param  {string} country  Country code in Two letters (eg. `IT`)
     * @return {Promise}         The promise of a GET request to the API Endpoint
     */
    getForecastAsync: function(city, country) {
        var q = city + ',' + country;
        var endpoint = 'http://api.openweathermap.org/data/2.5/weather?units=metric&q=' + q;

        return request(endpoint).then(function(params) {
            return JSON.parse(params[0].body);
        });
    }
};

app.proxy = true;

//
// Response Time Header Middleware 
// 
app.use(function *(next) {
    var start = new Date;
    yield next;
    var end = new Date - start;
    this.set('X-Response-Time', end + 'ms');
});

//
// Dumb Logger Middleware
//
app.use(function *(next) {
    var start = new Date;
    yield next;
    var ms = new Date - start;
    console.log('[%s] %s %s - %s ms', this.ip, this.method, this.url, ms);
});

//
// Main Response Middleware
//
app.use(function *(next) {
    var ip = this.query['ip'] || this.ip;
    var cached = yield Cache.get(ip);

    if (cached) {
        var response = cached;        
    } else {
        var response = yield next;

        yield Cache.set(ip, response);
        Cache.expire(ip);
    }

    this.type = 'application/json; charset=utf-8';
    this.body = response;
});

//
// Async Services Call Middleware
//
app.use(function *(){
    var ip = this.query['ip'] || this.ip;
    var city = yield Geolocation.getCityAsync(ip); 
    var forecast = yield Weather.getForecastAsync(city.city, city.countryCode);
    var temperature = Math.round(forecast.main.temp);

    var response = {
        ip: ip,
        city: city.city,
        temperature: temperature,
        message: 'Today, ' + city.city + ' will be ' + temperature + ' degrees.'
    };

    return response;
});

app.listen(port);
console.log('Koa server listening on port ' + port);