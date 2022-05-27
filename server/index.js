const keys = require("./keys")

// Express App Setup
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(bodyParser.json()); // parse incoming requests and convert the body into a json object

// Postgres Client Setup
const { Pool } = require("pg");
const pgClient = new Pool({
    user: keys.pgUser,
    host: keys.pgHost,
    database: keys.pgDatabase,
    password: keys.pgPassword,
    port: keys.pgPort
});
pgClient.on("error", () => console.log("Lost PG connection"));
// for each new user connection, create a table to store all the indices submitted by the user
pgClient.on("connect", (client) => {
    client
        .query("CREATE TABLE IF NOT EXISTS values (number INT)") // name of the table: "values", with dtype=int
        .catch((err) => console.log(err));
});

// Redis Client Setup
const redis = require("redis");
const redisClient = redis.createClient({
    host: keys.redisHost,
    port: keys.redisPort,
    retry_strategy: () => 1000
});
const redisPublisher = redisClient.duplicate();

// Express route handlers
app.get("/", (req, res) => {
    res.send("Hi");
});

app.get("/values/all", async (req, res) => {
    const values = await pgClient.query("SELECT * from values"); // get all information
    res.send(values.rows);
});

app.get("/values/current", async (req, res) => {
    redisClient.hgetall("values", (err, values) => {
        res.send(values);
    });
});

app.post("/values", async (req, res) => {
    const index = req.body.index;

    if (parseInt(index) > 40) { // high values lead to really long processing times for calculating fibonacci numbers
        return res.status(422).send("Index too high");
    }

    redisClient.hset("values", index, "Nothing yet!");
    redisPublisher.publish("insert", index); // wake up the worker process
    pgClient.query("INSERT INTO values(number) VALUES($1)", [index]);

    res.send({ working: true });
});

app.listen(5000, () => {
    console.log("Listening to port 5000")
})