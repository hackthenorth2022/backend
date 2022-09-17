const { Pool } = require("pg");

let pool;

const initTable = async (p) => {
  const client = await p.connect();
  console.log("Initializing table...");
  try {
    await client.query(
      `CREATE TABLE IF NOT EXISTS Rosetta (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          timeStamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          userId int8,
          word varchar(255),
          processed varchar(300)
        )`
    );
  } catch (err) {
    console.log(err.message);
    console.log(err.stack);
  } finally {
    client.release();
  }
};

const insertAccounts = async (p, userId, word, processed) => {
  const client = await p.connect();
  console.log("Hey! You successfully connected to your CockroachDB cluster.");
  try {
    await client.query(
      "INSERT INTO rosetta (userId, word, processed) VALUES ($1, $2, $3);",
      [userId, word, processed]
    );
    console.log(`Created new account with ${word}.`);
  } catch (err) {
    console.log(err.stack);
  } finally {
    client.release();
  }
};

const getPrevWeeksData = async (p, userId) => {
  const client = await p.connect();
  let data = [];
  console.log("Hey! You successfully connected to your CockroachDB cluster.");
  try {
    data = await client.query(
      "SELECT * FROM rosetta WHERE timestamp > current_date - 7 AND userid = $1;", [userId]);
    console.log(`DATA FETCHED`);
  } catch (err) {
    console.log(err.stack);
  } finally {
    client.release();
    return data["rows"]
  }
};

exports.handler = async (event, context) => {

  let body = {
    message: "Success",
  };
  let statusCode = 200;
  const headers = {
    "Content-Type": "application/json"
  };

  try {

    if (!pool) {
      const connectionString = process.env.DATABASE_URL;
      pool = new Pool({
        connectionString,
        application_name: "$ docs_lambda_node",
        max: 1,
      });
    }
  
    let init = await initTable(pool);
    // let insert = await insertAccounts(pool, "Hello World", "A 'Hello, World!' program is generally a computer program that ignores any input and outputs or displays a message similar to 'Hello, World!'. A small piece of code in most general-purpose programming languages, this program is used to illustrate a language's basic syntax.");
  
    switch (event.routeKey) {
      case "GET /{userid}":
        // event.pathParameters.id
        body = await getPrevWeeksData(pool, event.pathParameters.userid);
        break;
      case "POST /{userid}":
        // event.pathParameters.id
        let requestJSON = JSON.parse(event.body);
        let len = requestJSON.words.length
        for(var i = 0; i < len; i++) {
          let elem = requestJSON.words[i];
          console.log(elem);
          await insertAccounts(pool, event.pathParameters.userid, elem.word, elem.response);
        }
        break;
      case "POST /":
        break;
      default:
        throw new Error(`Unsupported route: "${event.routeKey}"`);
    }
  } catch (err) {
    statusCode = 400;
    body = err.message;
  } finally {
    body = JSON.stringify(body);
  }

  return {
    statusCode,
    body,
    headers
  };    
};
