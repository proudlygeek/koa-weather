'use strict';

var koa         = require('koa'),
    Q           = require('q'),
    app         = koa();

var request     = Q.denodeify(require('request')),
    port        = process.env.PORT || 8080;

if (process.env.REDISTOGO_URL) {
    var rtg     = require('url').parse(process.env.REDISTOGO_URL);
    var redis   = require('redis').createClient(rtg.port, rtg.hostname);

    redis.auth(rgt.auth.split(":")[1]);
} else {
    var redis   = require('redis').createClient();
}

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

var Geolocation = {
    getCityAsync: function(ip) {
        var address = (ip === "::1" || ip === undefined) ? '' : ip;
        var endpoint = 'http://geoip.smart-ip.net/json/' + address;

        return request(endpoint).then(function(params) {
            return JSON.parse(params[0].body);
        });
    }   
};

var Weather = {
    getForecastAsync: function(city, country) {
        var q = city + ',' + country;
        var endpoint = 'http://api.openweathermap.org/data/2.5/weather?units=metric&q=' + q;

        return request(endpoint).then(function(params) {
            return JSON.parse(params[0].body);
        });
    }
};

app.proxy = true;

app.use(function *(next) {
    var start = new Date;
    yield next;
    var end = new Date - start;
    this.set('X-Response-Time', end + 'ms');
});

app.use(function *(next) {
    var start = new Date;
    yield next;
    var ms = new Date - start;
    console.log('[%s] %s %s - %s ms', this.ip, this.method, this.url, ms);
});

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