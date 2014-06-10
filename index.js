'use strict';

var koa = require('koa'),
    Q   = require('q'),
    app = koa();

var request = Q.denodeify(require('request'));
var port = process.env.PORT || 8080;

var geolocation = {
    getCityAsync: function(ip) {
        var address = ip || '';
        var endpoint = 'http://geoip.smart-ip.net/json/' + address;

        return request(endpoint).then(function(params) {
            return JSON.parse(params[0].body);
        });
    }
};

var weather = {
    getForecastAsync: function(city, country) {
        var q = city + ',' + country;
        var endpoint = 'http://api.openweathermap.org/data/2.5/weather?units=metric&q=' + q;

        return request(endpoint).then(function(params) {
            return JSON.parse(params[0].body);
        });
    }
};

app.use(function *(){
    var ip = this.query['ip'] || this.req.ip;
    var city = yield geolocation.getCityAsync(ip);
    var forecast = yield weather.getForecastAsync(city.city, city.countryCode);
    var temperature = Math.round(forecast.main.temp);

    var response = {
        city: city.city,
        temperature: temperature,
        message: 'Today, ' + city.city + ' will be ' + temperature + ' degrees.'
    };

    this.type = 'application/json; charset=utf-8';
    this.body = response;
});

app.listen(port);
console.log('Koa server listening on port ' + port);
