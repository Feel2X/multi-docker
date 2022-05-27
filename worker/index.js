const keys = require("./keys");
const redis = require("redis");

const redisClient = redis.createClient({
    host: keys.redisHost,
    port: keys.redisPort,
    retry_strategy: () => 1000  // if connection is lost, try reconnecting once every 1000ms
});

const sub = redisClient.duplicate()

// function to calculate the fibonacci number of a given index
function fib(index) {
    if (index < 2) return 1;
    return fib(index - 1) + fib(index - 2) // "fibonacci recursive solution"
}

sub.on("message", (channel, message) => { // for each new value added to redis, calculate fib
    redisClient.hset("values", message, fib(parseInt(message)));
});
sub.subscribe("insert");